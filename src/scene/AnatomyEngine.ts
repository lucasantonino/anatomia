import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { AnatomySystem, StructureMetadata, Vec3 } from '../core/schema/anatomy';
import { createEmptyAnatomyRegistry } from '../core/anatomy/registry';
import {
  getActiveAnatomyId,
  viewerStore,
  type QualityMode,
  type ViewerStore,
} from '../core/state/viewerStore';
import {
  AssetLoader,
  DEFAULT_MANIFEST_URL,
  type CatalogSnapshot,
  type LoadedSystemAsset,
} from './AssetLoader';
import { MaterialManager } from './MaterialManager';
import { InteractionController } from './InteractionController';
import {
  LabelProjector,
  type LabelDomElements,
  type SafeInsets,
} from './LabelProjector';

const CAMERA_FOV_DEG = 38;
const CAMERA_NEAR = 0.02;
const CAMERA_FAR = 20;
const ORBIT_MIN_POLAR_RAD = 0.15;
const ORBIT_MAX_POLAR_RAD = Math.PI - 0.15;
const ORBIT_DAMPING_FACTOR = 0.08;

const DEFAULT_RESET_DURATION_MS = 420;
const DEFAULT_FOCUS_DURATION_MS = 450;

const ADAPTIVE_LOW_FPS_THRESHOLD = 26;
const ADAPTIVE_LOW_FPS_DURATION_MS = 2000;
const MAX_AUTO_DPR = 2;

export interface AnatomyEngineOptions {
  readonly store?: ViewerStore;
  readonly manifestUrl?: string;
}

export interface CameraPoseSnapshot {
  readonly position: Vec3;
  readonly target: Vec3;
}

interface CameraAnimation {
  readonly startTimeMs: number;
  readonly durationMs: number;
  readonly fromPosition: THREE.Vector3;
  readonly toPosition: THREE.Vector3;
  readonly fromTarget: THREE.Vector3;
  readonly toTarget: THREE.Vector3;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(t: number): number {
  const inv = 1 - Math.min(1, Math.max(0, t));
  return 1 - inv * inv * inv;
}

function acquireWebGL2Context(
  canvas: HTMLCanvasElement,
): WebGL2RenderingContext | null {
  if (typeof WebGL2RenderingContext === 'undefined') {
    return null;
  }
  try {
    const context = canvas.getContext('webgl2', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    if (context && context instanceof WebGL2RenderingContext) {
      return context;
    }
    return null;
  } catch {
    return null;
  }
}

function computeStructureFocusDirection(structure: StructureMetadata): THREE.Vector3 {
  if (structure.focusDirection) {
    const [fx, fy, fz] = structure.focusDirection;
    const vec = new THREE.Vector3(fx, fy, fz);
    if (vec.lengthSq() > 1e-8) {
      return vec.normalize();
    }
  }

  // Fallback geométrico externo seguro (evita atravessar o tórax)
  const lateralX =
    structure.laterality === 'left'
      ? 0.45
      : structure.laterality === 'right'
        ? -0.45
        : 0;
  return new THREE.Vector3(lateralX, 0.14, 0.88).normalize();
}

function disposeObjectHierarchy(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }
    object.geometry?.dispose();
    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        material.dispose();
      }
    } else {
      object.material?.dispose();
    }
  });
}

/**
 * Fachada imperativa do motor 3D WebGL 2 (Three.js direto), completamente
 * desacoplada de React e segura contra montagens duplicadas (`StrictMode`).
 */
export class AnatomyEngine {
  private readonly store: ViewerStore;
  private readonly manifestUrl: string;

  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;

  private assetLoader: AssetLoader | null = null;
  private materialManager: MaterialManager | null = null;
  private interactionController: InteractionController | null = null;
  private readonly labelProjector = new LabelProjector();

  private readonly systemRoots: Record<AnatomySystem, THREE.Group | null> = {
    skeletal: null,
    muscular: null,
  };

  private catalogSnapshot: CatalogSnapshot = {
    manifest: null,
    metadata: null,
    coverageMatrix: null,
    registry: createEmptyAnatomyRegistry(),
  };
  private readonly catalogListeners = new Set<() => void>();

  private resizeObserver: ResizeObserver | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private rafId: number | null = null;

  private mounted = false;
  private webglReady = false;
  private hasFramedInitialModel = false;
  private contextLost = false;
  private pausedForVisibility = false;

  // Enquadramento padrão e limites espaciais derivados da bounding sphere real
  private readonly modelCenter = new THREE.Vector3(0, 0, 0);
  private modelRadius = 0.55;
  private readonly defaultCameraTarget = new THREE.Vector3(0, 0, 0);
  private readonly defaultCameraPosition = new THREE.Vector3(0, 0.04, 1.45);
  private activeCameraAnimation: CameraAnimation | null = null;

  // Monitoramento adaptativo de DPR
  private adaptiveReducedDpr = false;
  private lastQualityMode: QualityMode = 'auto';
  private currentPixelRatio = 1;
  private lastFrameTimeMs = 0;
  private emaFrameDeltaMs = 16.67;
  private lowFpsAccumulatedMs = 0;

  // Vetores temporários pré-alocados (evita GC no loop/navegação)
  private readonly tmpOffset = new THREE.Vector3();
  private readonly tmpSpherical = new THREE.Spherical();
  private readonly tmpPanDelta = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly tmpUp = new THREE.Vector3();
  private readonly tmpClampBefore = new THREE.Vector3();

  public constructor(options: AnatomyEngineOptions = {}) {
    this.store = options.store ?? viewerStore;
    this.manifestUrl = options.manifestUrl ?? DEFAULT_MANIFEST_URL;
  }

  /**
   * Snapshot referencialmente estável do catálogo carregado (compatível com
   * `useSyncExternalStore` na camada React).
   */
  public readonly getCatalogSnapshot = (): CatalogSnapshot => {
    return this.catalogSnapshot;
  };

  public readonly subscribeCatalog = (listener: () => void): (() => void) => {
    this.catalogListeners.add(listener);
    return () => {
      this.catalogListeners.delete(listener);
    };
  };

  public getCanvasElement(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getCameraSnapshot(): CameraPoseSnapshot | null {
    if (!this.camera || !this.controls) {
      return null;
    }
    return {
      position: [
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      ],
      target: [
        this.controls.target.x,
        this.controls.target.y,
        this.controls.target.z,
      ],
    };
  }

  /**
   * Monta o motor 3D no contêiner HTML. Idempotente e segura sob React StrictMode.
   * Caso WebGL 2 não esteja disponível, atualiza `webglStatus = 'unsupported'` e
   * ainda carrega o catálogo JSON para manter `StructureDrawer` e `CreditsModal` úteis.
   */
  public mount(
    container: HTMLElement,
    labelElements?: LabelDomElements | null,
  ): void {
    if (this.mounted && this.container === container) {
      if (labelElements !== undefined) {
        this.labelProjector.attachElements(labelElements);
      }
      return;
    }

    if (this.mounted) {
      this.dispose();
    }

    this.mounted = true;
    this.container = container;
    this.contextLost = false;
    this.pausedForVisibility =
      typeof document !== 'undefined' && document.hidden === true;
    this.adaptiveReducedDpr = false;
    this.hasFramedInitialModel = false;
    this.lastFrameTimeMs = 0;
    this.emaFrameDeltaMs = 16.67;
    this.lowFpsAccumulatedMs = 0;

    if (labelElements !== undefined) {
      this.labelProjector.attachElements(labelElements);
    }

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-hidden', 'true');

    const gl = acquireWebGL2Context(canvas);
    if (!gl) {
      this.webglReady = false;
      this.store.setWebGLStatus('unsupported');
      this.assetLoader = new AssetLoader({
        store: this.store,
        manifestUrl: this.manifestUrl,
        onCatalogUpdated: this.handleCatalogUpdated,
      });
      void this.assetLoader.loadCatalogOnly();
      return;
    }

    container.appendChild(canvas);
    this.canvas = canvas;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setSize(width, height, false);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.setupClinicalLighting(scene);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV_DEG,
      width / height,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    camera.position.copy(this.defaultCameraPosition);
    camera.lookAt(this.defaultCameraTarget);
    this.camera = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = ORBIT_DAMPING_FACTOR;
    controls.minPolarAngle = ORBIT_MIN_POLAR_RAD;
    controls.maxPolarAngle = ORBIT_MAX_POLAR_RAD;
    controls.minDistance = Math.max(0.15, this.modelRadius * 0.6);
    controls.maxDistance = Math.max(2.0, this.modelRadius * 5.0);
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.target.copy(this.defaultCameraTarget);
    controls.addEventListener('start', this.handleControlsStart);
    controls.addEventListener('end', this.handleControlsEnd);
    controls.update();
    this.controls = controls;

    this.materialManager = new MaterialManager();
    this.interactionController = new InteractionController({
      canvas,
      camera,
      store: this.store,
      getSystemRoot: (system) => this.systemRoots[system],
      getRegistry: () => this.catalogSnapshot.registry,
    });

    this.labelProjector.setViewport(width, height);
    this.applyPixelRatio();

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
      false,
    );

    if (typeof document !== 'undefined') {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
        false,
      );
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        this.resize(entry.contentRect.width, entry.contentRect.height);
      });
      this.resizeObserver.observe(container);
    }

    this.unsubscribeStore = this.store.subscribe(this.handleStoreChange);
    this.handleStoreChange();

    this.webglReady = true;
    this.store.setWebGLStatus('ready');

    this.assetLoader = new AssetLoader({
      store: this.store,
      manifestUrl: this.manifestUrl,
      onCatalogUpdated: this.handleCatalogUpdated,
      onSystemLoaded: this.handleSystemLoaded,
    });
    void this.assetLoader.loadAll();

    this.startLoopIfActive();
  }

  public attachLabelElements(elements: LabelDomElements | null): void {
    this.labelProjector.attachElements(elements);
  }

  public setSafeInsets(insets: Partial<SafeInsets>): void {
    this.labelProjector.setSafeInsets(insets);
  }

  /**
   * Restaura posição, alvo e zoom iniciais sem alterar as camadas ativas (RF-02).
   */
  public resetView(): void {
    if (!this.camera || !this.controls) {
      return;
    }

    if (prefersReducedMotion()) {
      this.cancelCameraAnimation();
      this.camera.position.copy(this.defaultCameraPosition);
      this.controls.target.copy(this.defaultCameraTarget);
      this.controls.update();
      return;
    }

    this.startCameraAnimation(
      this.defaultCameraPosition,
      this.defaultCameraTarget,
      DEFAULT_RESET_DURATION_MS,
    );
  }

  /**
   * Enquadra suavemente (ou instantaneamente sob `prefers-reduced-motion`) uma
   * estrutura anatômica específica usando `structure.focusDirection` calibrado
   * para aproximar pelo lado anatômico externo mais legível.
   */
  public focusStructure(anatomyId: string): void {
    if (!this.camera || !this.controls) {
      return;
    }

    const structure = this.catalogSnapshot.registry.getById(anatomyId);
    if (!structure) {
      return;
    }

    const { min, max } = structure.boundingBox;
    const target = new THREE.Vector3(
      (min[0] + max[0]) * 0.5,
      (min[1] + max[1]) * 0.5,
      (min[2] + max[2]) * 0.5,
    );

    const sizeX = max[0] - min[0];
    const sizeY = max[1] - min[1];
    const sizeZ = max[2] - min[2];
    const radius = Math.max(0.055, Math.hypot(sizeX, sizeY, sizeZ) * 0.5);

    const direction = computeStructureFocusDirection(structure);
    const halfVFov = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const halfHFov = Math.atan(
      Math.tan(halfVFov) * Math.max(0.35, this.camera.aspect),
    );
    const effectiveHalfFov = Math.min(halfVFov, halfHFov);
    const idealDistance = (radius / Math.sin(effectiveHalfFov)) * 1.45;
    const distance = THREE.MathUtils.clamp(
      idealDistance,
      this.controls.minDistance,
      this.controls.maxDistance,
    );

    const goalPosition = target.clone().addScaledVector(direction, distance);

    if (prefersReducedMotion()) {
      this.cancelCameraAnimation();
      this.camera.position.copy(goalPosition);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }

    this.startCameraAnimation(goalPosition, target, DEFAULT_FOCUS_DURATION_MS);
  }

  /**
   * Rotaciona a câmera via teclado ao redor do alvo atual (RF-02 / WCAG 2.2 AA).
   */
  public nudgeOrbit(deltaAzimuthRad: number, deltaPolarRad: number): void {
    if (!this.camera || !this.controls) {
      return;
    }
    this.cancelCameraAnimation();

    this.tmpOffset.copy(this.camera.position).sub(this.controls.target);
    this.tmpSpherical.setFromVector3(this.tmpOffset);
    this.tmpSpherical.theta += deltaAzimuthRad;
    this.tmpSpherical.phi = THREE.MathUtils.clamp(
      this.tmpSpherical.phi + deltaPolarRad,
      this.controls.minPolarAngle,
      this.controls.maxPolarAngle,
    );
    this.tmpOffset.setFromSpherical(this.tmpSpherical);
    this.camera.position.copy(this.controls.target).add(this.tmpOffset);
    this.controls.update();
  }

  /**
   * Desloca o enquadramento (pan) via teclado respeitando o limite espacial seguro.
   */
  public nudgePan(deltaX: number, deltaY: number): void {
    if (!this.camera || !this.controls) {
      return;
    }
    this.cancelCameraAnimation();

    const distance = this.camera.position.distanceTo(this.controls.target);
    const panScale = Math.max(0.04, distance * 0.08);

    this.tmpRight.setFromMatrixColumn(this.camera.matrix, 0).normalize();
    this.tmpUp.setFromMatrixColumn(this.camera.matrix, 1).normalize();

    this.tmpPanDelta
      .set(0, 0, 0)
      .addScaledVector(this.tmpRight, deltaX * panScale)
      .addScaledVector(this.tmpUp, deltaY * panScale);

    this.camera.position.add(this.tmpPanDelta);
    this.controls.target.add(this.tmpPanDelta);
    this.clampPanTarget();
    this.controls.update();
  }

  /**
   * Aproxima (`scaleFactor < 1`) ou afasta (`scaleFactor > 1`) a câmera via teclado.
   */
  public nudgeZoom(scaleFactor: number): void {
    if (!this.camera || !this.controls || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
      return;
    }
    this.cancelCameraAnimation();

    this.tmpOffset.copy(this.camera.position).sub(this.controls.target);
    const nextLength = THREE.MathUtils.clamp(
      this.tmpOffset.length() * scaleFactor,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    if (this.tmpOffset.lengthSq() > 1e-8) {
      this.tmpOffset.setLength(nextLength);
      this.camera.position.copy(this.controls.target).add(this.tmpOffset);
      this.controls.update();
    }
  }

  public async retrySystem(system: AnatomySystem): Promise<void> {
    if (!this.assetLoader) {
      return;
    }
    if (!this.webglReady) {
      await this.assetLoader.loadCatalogOnly();
      return;
    }
    await this.assetLoader.retrySystem(system);
  }

  public async retryAll(): Promise<void> {
    if (!this.assetLoader) {
      return;
    }
    if (!this.webglReady) {
      await this.assetLoader.loadCatalogOnly();
      return;
    }
    await this.assetLoader.retryAll();
  }

  private setupClinicalLighting(scene: THREE.Scene): void {
    const hemisphere = new THREE.HemisphereLight(0xf4f6fa, 0x1b1e26, 0.55);
    scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.45);
    keyLight.position.set(1.6, 2.2, 2.6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbe6ff, 0.65);
    fillLight.position.set(-2.2, 0.8, 1.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
    rimLight.position.set(0.0, 1.4, -2.6);
    scene.add(rimLight);
  }

  private readonly handleCatalogUpdated = (snapshot: CatalogSnapshot): void => {
    this.catalogSnapshot = snapshot;
    for (const listener of this.catalogListeners) {
      listener();
    }
  };

  private readonly handleSystemLoaded = (asset: LoadedSystemAsset): void => {
    if (!this.mounted || !this.scene || !this.materialManager) {
      disposeObjectHierarchy(asset.root);
      return;
    }

    // Remove eventual versão anterior (ex.: após retry) sem vazar recursos GPU
    const previousRoot = this.systemRoots[asset.system];
    if (previousRoot) {
      this.scene.remove(previousRoot);
      disposeObjectHierarchy(previousRoot);
    }

    this.materialManager.registerSystemMeshes(
      asset.system,
      asset.meshesByAnatomyId,
    );

    const visibleSystems = this.store.getState().visibleSystems;
    asset.root.visible = visibleSystems.has(asset.system);

    this.systemRoots[asset.system] = asset.root;
    this.scene.add(asset.root);

    this.updateModelBoundsAndFraming(!this.hasFramedInitialModel);
    this.hasFramedInitialModel = true;
  };

  private updateModelBoundsAndFraming(applyInitialCameraPose: boolean): void {
    if (!this.camera || !this.controls) {
      return;
    }

    const box = new THREE.Box3();
    for (const system of ['skeletal', 'muscular'] as const) {
      const root = this.systemRoots[system];
      if (root) {
        box.expandByObject(root);
      }
    }

    if (box.isEmpty()) {
      return;
    }

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const size = new THREE.Vector3();
    box.getSize(size);

    this.modelCenter.copy(sphere.center);
    this.modelRadius = Math.max(0.2, sphere.radius);

    this.controls.minDistance = Math.max(0.15, this.modelRadius * 0.6);
    this.controls.maxDistance = Math.max(2.0, this.modelRadius * 5.0);

    const width = Math.max(1, this.container?.clientWidth ?? 1280);
    const height = Math.max(1, this.container?.clientHeight ?? 720);
    const aspect = Math.max(0.45, width / height);
    const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov * 0.5);

    const distVertical = (size.y * 0.5) / Math.tan(halfFovRad);
    const distHorizontal = (size.x * 0.5) / (Math.tan(halfFovRad) * aspect);
    const defaultDistance = Math.max(distVertical, distHorizontal, this.modelRadius * 1.45) * 1.38;

    const targetYOffset = aspect >= 1 ? -size.y * 0.08 : 0;
    this.defaultCameraTarget.set(
      this.modelCenter.x,
      this.modelCenter.y + targetYOffset,
      this.modelCenter.z,
    );
    this.defaultCameraPosition.set(
      this.modelCenter.x,
      this.defaultCameraTarget.y + size.y * 0.03,
      this.modelCenter.z + defaultDistance,
    );

    if (applyInitialCameraPose) {
      this.camera.position.copy(this.defaultCameraPosition);
      this.controls.target.copy(this.defaultCameraTarget);
      this.controls.update();
    }
  }

  private clampPanTarget(): void {
    if (!this.camera || !this.controls) {
      return;
    }

    const maxPanRadius = Math.max(0.4, this.modelRadius * 1.35);
    this.tmpOffset.copy(this.controls.target).sub(this.modelCenter);
    const dist = this.tmpOffset.length();
    if (dist > maxPanRadius) {
      this.tmpClampBefore.copy(this.controls.target);
      this.tmpOffset.setLength(maxPanRadius);
      this.controls.target.copy(this.modelCenter).add(this.tmpOffset);
      this.tmpClampBefore.sub(this.controls.target);
      this.camera.position.sub(this.tmpClampBefore);
    }
  }

  private startCameraAnimation(
    toPosition: THREE.Vector3,
    toTarget: THREE.Vector3,
    durationMs: number,
  ): void {
    if (!this.camera || !this.controls) {
      return;
    }
    this.activeCameraAnimation = {
      startTimeMs: performance.now(),
      durationMs,
      fromPosition: this.camera.position.clone(),
      toPosition: toPosition.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: toTarget.clone(),
    };
  }

  private cancelCameraAnimation(): void {
    this.activeCameraAnimation = null;
  }

  private stepCameraAnimation(nowMs: number): void {
    if (!this.activeCameraAnimation || !this.camera || !this.controls) {
      return;
    }

    const anim = this.activeCameraAnimation;
    const rawT =
      anim.durationMs > 0 ? (nowMs - anim.startTimeMs) / anim.durationMs : 1;
    const eased = easeOutCubic(rawT);

    this.camera.position.lerpVectors(anim.fromPosition, anim.toPosition, eased);
    this.controls.target.lerpVectors(anim.fromTarget, anim.toTarget, eased);

    if (rawT >= 1) {
      this.camera.position.copy(anim.toPosition);
      this.controls.target.copy(anim.toTarget);
      this.activeCameraAnimation = null;
    }
  }

  private applyPixelRatio(): void {
    if (!this.renderer) {
      return;
    }
    const qualityMode = this.store.getState().qualityMode;
    const deviceDpr =
      typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
        ? window.devicePixelRatio
        : 1;

    const targetDpr =
      qualityMode === 'reduced' || this.adaptiveReducedDpr
        ? 1
        : Math.min(Math.max(1, deviceDpr), MAX_AUTO_DPR);

    if (targetDpr !== this.currentPixelRatio) {
      this.currentPixelRatio = targetDpr;
      this.renderer.setPixelRatio(targetDpr);
    }
  }

  private trackAdaptiveFps(nowMs: number): void {
    if (this.lastFrameTimeMs === 0) {
      this.lastFrameTimeMs = nowMs;
      return;
    }

    const deltaMs = nowMs - this.lastFrameTimeMs;
    this.lastFrameTimeMs = nowMs;

    // Ignora picos isolados de troca de aba ou compilação inicial de shaders
    if (deltaMs <= 0 || deltaMs > 500) {
      return;
    }

    this.emaFrameDeltaMs = this.emaFrameDeltaMs * 0.85 + deltaMs * 0.15;

    if (
      this.store.getState().qualityMode !== 'auto' ||
      this.adaptiveReducedDpr ||
      this.currentPixelRatio <= 1
    ) {
      this.lowFpsAccumulatedMs = 0;
      return;
    }

    const currentFps = 1000 / this.emaFrameDeltaMs;
    if (currentFps < ADAPTIVE_LOW_FPS_THRESHOLD) {
      this.lowFpsAccumulatedMs += deltaMs;
      if (this.lowFpsAccumulatedMs >= ADAPTIVE_LOW_FPS_DURATION_MS) {
        this.adaptiveReducedDpr = true;
        this.lowFpsAccumulatedMs = 0;
        this.applyPixelRatio();
        this.store.announce(
          'Qualidade gráfica ajustada automaticamente para manter fluidez.',
        );
      }
    } else {
      this.lowFpsAccumulatedMs = 0;
    }
  }

  private resize(rawWidth: number, rawHeight: number): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    const width = Math.max(1, Math.floor(rawWidth));
    const height = Math.max(1, Math.floor(rawHeight));

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.labelProjector.setViewport(width, height);
  }

  private readonly handleStoreChange = (): void => {
    if (!this.mounted) {
      return;
    }

    const state = this.store.getState();

    if (this.systemRoots.skeletal) {
      this.systemRoots.skeletal.visible = state.visibleSystems.has('skeletal');
    }
    if (this.systemRoots.muscular) {
      this.systemRoots.muscular.visible = state.visibleSystems.has('muscular');
    }

    if (this.materialManager) {
      this.materialManager.applyLayerAppearance(
        state.visibleSystems,
        state.muscleOpacity,
      );
      this.materialManager.syncHighlights(state.hoveredId, state.selectedId);
    }

    if (
      state.qualityMode === 'auto' &&
      this.lastQualityMode === 'reduced'
    ) {
      this.adaptiveReducedDpr = false;
      this.lowFpsAccumulatedMs = 0;
    }
    this.lastQualityMode = state.qualityMode;
    this.applyPixelRatio();

    if (getActiveAnatomyId(state) === null) {
      this.labelProjector.hide();
    }
  };

  private readonly handleControlsStart = (): void => {
    this.cancelCameraAnimation();
    this.interactionController?.notifyCameraStart();
  };

  private readonly handleControlsEnd = (): void => {
    this.interactionController?.notifyCameraEnd();
  };

  private readonly handleVisibilityChange = (): void => {
    if (!this.mounted) {
      return;
    }
    this.pausedForVisibility =
      typeof document !== 'undefined' && document.hidden === true;

    if (this.pausedForVisibility) {
      this.stopLoop();
      this.lastFrameTimeMs = 0;
      this.lowFpsAccumulatedMs = 0;
      return;
    }

    this.lastFrameTimeMs = 0;
    this.startLoopIfActive();
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.contextLost = true;
    this.stopLoop();
    this.labelProjector.hide();
    this.store.setWebGLStatus('context_lost');
  };

  private readonly handleContextRestored = (): void => {
    if (!this.mounted) {
      return;
    }
    this.contextLost = false;
    this.store.setWebGLStatus('ready');
    this.materialManager?.reapplyAll();
    this.handleStoreChange();
    if (this.container) {
      this.resize(this.container.clientWidth, this.container.clientHeight);
    }
    this.lastFrameTimeMs = 0;
    this.startLoopIfActive();
  };

  private startLoopIfActive(): void {
    if (
      !this.mounted ||
      !this.webglReady ||
      this.contextLost ||
      this.pausedForVisibility ||
      this.rafId !== null
    ) {
      return;
    }
    this.rafId = requestAnimationFrame(this.renderFrame);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private readonly renderFrame = (nowMs: number): void => {
    this.rafId = null;

    if (
      !this.mounted ||
      !this.renderer ||
      !this.scene ||
      !this.camera ||
      !this.controls ||
      this.contextLost ||
      this.pausedForVisibility
    ) {
      return;
    }

    this.trackAdaptiveFps(nowMs);
    this.stepCameraAnimation(nowMs);
    this.controls.update();
    this.clampPanTarget();

    this.renderer.render(this.scene, this.camera);

    const activeAnatomyId = getActiveAnatomyId(this.store.getState());
    if (activeAnatomyId !== null) {
      const structure = this.catalogSnapshot.registry.getById(activeAnatomyId);
      this.labelProjector.update(structure?.labelAnchor ?? null, this.camera);
    } else {
      this.labelProjector.hide();
    }

    this.rafId = requestAnimationFrame(this.renderFrame);
  };

  /**
   * Libera 100% dos recursos WebGL, listeners, observers e requisições ativas.
   * Idempotente (seguro chamar múltiplas vezes).
   */
  public dispose(): void {
    if (!this.mounted) {
      return;
    }
    this.mounted = false;
    this.webglReady = false;
    this.contextLost = false;
    this.cancelCameraAnimation();
    this.stopLoop();

    this.assetLoader?.dispose();
    this.assetLoader = null;

    this.interactionController?.dispose();
    this.interactionController = null;

    this.labelProjector.dispose();

    this.unsubscribeStore?.();
    this.unsubscribeStore = null;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (typeof document !== 'undefined') {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange,
        false,
      );
    }

    if (this.canvas) {
      this.canvas.removeEventListener(
        'webglcontextlost',
        this.handleContextLost,
        false,
      );
      this.canvas.removeEventListener(
        'webglcontextrestored',
        this.handleContextRestored,
        false,
      );
    }

    if (this.controls) {
      this.controls.removeEventListener('start', this.handleControlsStart);
      this.controls.removeEventListener('end', this.handleControlsEnd);
      this.controls.dispose();
      this.controls = null;
    }

    for (const system of ['skeletal', 'muscular'] as const) {
      const root = this.systemRoots[system];
      if (root) {
        this.scene?.remove(root);
        disposeObjectHierarchy(root);
        this.systemRoots[system] = null;
      }
    }

    this.materialManager?.dispose();
    this.materialManager = null;

    if (this.scene) {
      this.scene.clear();
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }

    this.canvas = null;
    this.camera = null;
    this.container = null;
    this.hasFramedInitialModel = false;
  }
}
