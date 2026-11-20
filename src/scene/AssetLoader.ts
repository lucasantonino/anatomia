import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import {
  CoverageMatrixSchema,
  ManifestSchema,
  MetadataDocumentSchema,
  isSafeAssetUrl,
  type AnatomySystem,
  type CoverageMatrix,
  type Manifest,
  type MetadataDocument,
} from '../core/schema/anatomy';
import {
  AnatomyRegistry,
  createAnatomyRegistry,
  createEmptyAnatomyRegistry,
} from '../core/anatomy/registry';
import type { ViewerStore } from '../core/state/viewerStore';

export const DEFAULT_MANIFEST_URL = '/assets/v1/manifest.json';

export interface LoadedSystemAsset {
  readonly system: AnatomySystem;
  readonly root: THREE.Group;
  readonly meshes: readonly THREE.Mesh[];
  readonly meshesByAnatomyId: ReadonlyMap<string, readonly THREE.Mesh[]>;
}

export interface CatalogSnapshot {
  readonly manifest: Manifest | null;
  readonly metadata: MetadataDocument | null;
  readonly coverageMatrix: CoverageMatrix | null;
  readonly registry: AnatomyRegistry;
}

export interface AssetLoaderOptions {
  readonly store: ViewerStore;
  readonly manifestUrl?: string;
  readonly onCatalogUpdated?: (snapshot: CatalogSnapshot) => void;
  readonly onSystemLoaded?: (asset: LoadedSystemAsset) => void;
}

function getReadableErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

/**
 * Converte um caminho lógico canônico de ativo (ex: `/assets/v1/manifest.json`)
 * na URL de rede correta considerando o `BASE_URL` configurado pelo Vite
 * (essencial para ambientes com subdiretórios como GitHub Pages).
 */
export function resolveNetworkAssetUrl(
  logicalUrl: string,
  baseUrl: string = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/',
): string {
  if (
    logicalUrl.startsWith('http://') ||
    logicalUrl.startsWith('https://') ||
    logicalUrl.startsWith('blob:') ||
    logicalUrl.startsWith('data:')
  ) {
    return logicalUrl;
  }

  // Quando baseUrl for relativo ('./' ou ''), remove a barra inicial para resolver relativo ao documento
  if (baseUrl === './' || baseUrl === '') {
    return logicalUrl.startsWith('/') ? logicalUrl.slice(1) : logicalUrl;
  }

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = logicalUrl.startsWith('/') ? logicalUrl : `/${logicalUrl}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function fetchJsonSafe(url: string, signal: AbortSignal): Promise<unknown> {
  if (!isSafeAssetUrl(url)) {
    throw new Error(`URL de ativo bloqueada pela política de segurança: "${url}".`);
  }

  const networkUrl = resolveNetworkAssetUrl(url);
  const response = await fetch(networkUrl, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao carregar "${url}".`);
  }
  return response.json();
}

async function fetchBinaryWithProgress(
  url: string,
  expectedBytes: number,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
): Promise<ArrayBuffer> {
  if (!isSafeAssetUrl(url)) {
    throw new Error(`URL de ativo 3D bloqueada pela política de segurança: "${url}".`);
  }

  const networkUrl = resolveNetworkAssetUrl(url);
  const response = await fetch(networkUrl, { signal });
  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao carregar ativo 3D "${url}".`);
  }

  const headerLength = Number(response.headers.get('content-length') ?? 0);
  const totalBytes = headerLength > 0 ? headerLength : expectedBytes;

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress(90);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
      receivedBytes += value.byteLength;
      if (totalBytes > 0) {
        const downloadPct = Math.min(90, Math.round((receivedBytes / totalBytes) * 90));
        onProgress(downloadPct);
      }
    }
  }

  const combined = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  onProgress(90);
  return combined.buffer;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * Carregador validado (Zod), progressivo (esqueleto -> músculos) e resiliente
 * sobre GLTFLoader + MeshoptDecoder local (sem CDN externa).
 *
 * IMPORTANTE: `sceneOriginOffset` já está embutido (baked) nos vértices dos .glb
 * no build de ativos; nunca reaplicar `sceneOriginOffset` como translação em runtime.
 */
export class AssetLoader {
  private readonly store: ViewerStore;
  private readonly manifestUrl: string;
  private readonly onCatalogUpdated?: (snapshot: CatalogSnapshot) => void;
  private readonly onSystemLoaded?: (asset: LoadedSystemAsset) => void;

  private readonly gltfLoader: GLTFLoader;
  private meshoptReadyPromise: Promise<void> | null = null;

  private catalogSnapshot: CatalogSnapshot = {
    manifest: null,
    metadata: null,
    coverageMatrix: null,
    registry: createEmptyAnatomyRegistry(),
  };

  private activeControllers = new Set<AbortController>();
  private inFlightSystems = new Set<AnatomySystem>();
  private catalogLoadPromise: Promise<CatalogSnapshot | null> | null = null;
  private sessionId = 0;
  private disposed = false;

  public constructor(options: AssetLoaderOptions) {
    this.store = options.store;
    this.manifestUrl = options.manifestUrl ?? DEFAULT_MANIFEST_URL;
    this.onCatalogUpdated = options.onCatalogUpdated;
    this.onSystemLoaded = options.onSystemLoaded;
    this.gltfLoader = new GLTFLoader();
  }

  public getCatalogSnapshot(): CatalogSnapshot {
    return this.catalogSnapshot;
  }

  private async ensureMeshoptReady(): Promise<void> {
    if (!this.meshoptReadyPromise) {
      this.meshoptReadyPromise = MeshoptDecoder.ready.then(() => {
        this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
      });
    }
    await this.meshoptReadyPromise;
  }

  private createController(): AbortController {
    const controller = new AbortController();
    this.activeControllers.add(controller);
    return controller;
  }

  private releaseController(controller: AbortController): void {
    this.activeControllers.delete(controller);
  }

  private isSessionStale(session: number): boolean {
    return this.disposed || session !== this.sessionId;
  }

  /**
   * Carrega e valida `manifest.json`, `metadata-v1.json` e `coverage-matrix.json`
   * sem exigir contexto WebGL 2 — garante que `StructureDrawer` e `CreditsModal`
   * permaneçam úteis mesmo no modo de fallback sem WebGL.
   */
  public async loadCatalogOnly(): Promise<CatalogSnapshot | null> {
    if (this.disposed) {
      return null;
    }

    if (this.catalogSnapshot.manifest && this.catalogSnapshot.metadata) {
      return this.catalogSnapshot;
    }

    if (this.catalogLoadPromise) {
      return this.catalogLoadPromise;
    }

    const session = this.sessionId;
    const controller = this.createController();

    this.store.setManifestStatus('loading');

    const run = async (): Promise<CatalogSnapshot | null> => {
      try {
        const rawManifest = await fetchJsonSafe(this.manifestUrl, controller.signal);
        if (this.isSessionStale(session)) {
          return null;
        }
        const manifest = ManifestSchema.parse(rawManifest);

        const rawMetadata = await fetchJsonSafe(manifest.metadataUrl, controller.signal);
        if (this.isSessionStale(session)) {
          return null;
        }
        const metadata = MetadataDocumentSchema.parse(rawMetadata);

        if (
          manifest.assetVersion !== metadata.assetVersion ||
          manifest.metadataVersion !== metadata.metadataVersion
        ) {
          throw new Error(
            `Incompatibilidade de versão entre manifest (${manifest.assetVersion}/${manifest.metadataVersion}) e metadata (${metadata.assetVersion}/${metadata.metadataVersion}).`,
          );
        }

        let coverageMatrix: CoverageMatrix | null = null;
        try {
          const rawCoverage = await fetchJsonSafe(
            manifest.coverageMatrixUrl,
            controller.signal,
          );
          if (!this.isSessionStale(session)) {
            coverageMatrix = CoverageMatrixSchema.parse(rawCoverage);
          }
        } catch (coverageError) {
          if (isAbortError(coverageError)) {
            return null;
          }
          // Matriz de cobertura é complementar na UI; falha isolada não bloqueia a cena 3D.
          coverageMatrix = null;
        }

        if (this.isSessionStale(session)) {
          return null;
        }

        const registry = createAnatomyRegistry(metadata);
        this.catalogSnapshot = {
          manifest,
          metadata,
          coverageMatrix,
          registry,
        };

        this.store.setManifestStatus('loaded');
        this.onCatalogUpdated?.(this.catalogSnapshot);
        return this.catalogSnapshot;
      } catch (error) {
        if (this.isSessionStale(session) || isAbortError(error)) {
          return null;
        }
        const message = getReadableErrorMessage(
          error,
          'Não foi possível carregar o catálogo anatômico.',
        );
        this.store.setManifestStatus('error');
        this.store.setSystemLoadState('skeletal', {
          status: 'error',
          progress: 0,
          errorMessage: message,
        });
        this.store.setSystemLoadState('muscular', {
          status: 'error',
          progress: 0,
          errorMessage: message,
        });
        this.store.announce(
          'Falha ao carregar os dados anatômicos. Use Tentar novamente.',
        );
        return null;
      } finally {
        this.releaseController(controller);
        this.catalogLoadPromise = null;
      }
    };

    this.catalogLoadPromise = run();
    return this.catalogLoadPromise;
  }

  /**
   * Executa o carregamento progressivo completo:
   * 1) Catálogo JSON validado via Zod
   * 2) Sistema esquelético (libera interação imediata)
   * 3) Sistema muscular (falha isolada mantém o esqueleto interativo)
   */
  public async loadAll(): Promise<void> {
    if (this.disposed) {
      return;
    }

    const catalog = await this.loadCatalogOnly();
    if (!catalog || this.disposed) {
      return;
    }

    await this.loadSystem('skeletal');
    if (this.disposed) {
      return;
    }

    await this.loadSystem('muscular');
  }

  /**
   * Carrega (ou recarrega) isoladamente um sistema anatômico (`skeletal` ou `muscular`).
   */
  public async loadSystem(system: AnatomySystem): Promise<LoadedSystemAsset | null> {
    if (this.disposed || this.inFlightSystems.has(system)) {
      return null;
    }

    const catalog =
      this.catalogSnapshot.manifest && this.catalogSnapshot.metadata
        ? this.catalogSnapshot
        : await this.loadCatalogOnly();

    if (!catalog?.manifest || this.disposed) {
      return null;
    }

    const session = this.sessionId;
    const systemSpec = catalog.manifest.systems[system];
    const controller = this.createController();
    this.inFlightSystems.add(system);

    this.store.setSystemLoadState(system, {
      status: 'loading',
      progress: 0,
      errorMessage: null,
    });

    try {
      await this.ensureMeshoptReady();
      if (this.isSessionStale(session)) {
        return null;
      }

      const arrayBuffer = await fetchBinaryWithProgress(
        systemSpec.url,
        systemSpec.bytes,
        controller.signal,
        (percent) => {
          if (!this.isSessionStale(session)) {
            this.store.setSystemLoadState(system, { progress: percent });
          }
        },
      );

      if (this.isSessionStale(session)) {
        return null;
      }

      const gltf = await this.gltfLoader.parseAsync(arrayBuffer, '');
      if (this.isSessionStale(session)) {
        disposeGltfScene(gltf.scene);
        return null;
      }

      const asset = this.extractAndAnnotateSystem(
        system,
        gltf.scene,
        catalog.registry,
      );

      this.onSystemLoaded?.(asset);
      this.store.setSystemLoadState(system, {
        status: 'loaded',
        progress: 100,
        errorMessage: null,
      });

      const layerLabel = system === 'skeletal' ? 'Esqueleto' : 'Musculatura';
      this.store.announce(`${layerLabel} carregado com sucesso.`);

      return asset;
    } catch (error) {
      if (this.isSessionStale(session) || isAbortError(error)) {
        return null;
      }

      const layerLabel = system === 'skeletal' ? 'esqueleto' : 'musculatura';
      const detail = getReadableErrorMessage(
        error,
        `Falha ao carregar a camada de ${layerLabel}.`,
      );
      this.store.setSystemLoadState(system, {
        status: 'error',
        errorMessage: detail,
      });
      this.store.announce(
        `Não foi possível carregar a camada de ${layerLabel}. Tente novamente.`,
      );
      return null;
    } finally {
      this.inFlightSystems.delete(system);
      this.releaseController(controller);
    }
  }

  public async retrySystem(system: AnatomySystem): Promise<LoadedSystemAsset | null> {
    if (this.disposed) {
      return null;
    }
    return this.loadSystem(system);
  }

  public async retryAll(): Promise<void> {
    if (this.disposed) {
      return;
    }

    const loadState = this.store.getState().loadState;
    if (loadState.manifest !== 'loaded' || !this.catalogSnapshot.manifest) {
      await this.loadAll();
      return;
    }

    if (loadState.skeletal.status !== 'loaded') {
      await this.loadSystem('skeletal');
    }
    if (this.disposed) {
      return;
    }
    if (loadState.muscular.status !== 'loaded') {
      await this.loadSystem('muscular');
    }
  }

  private extractAndAnnotateSystem(
    system: AnatomySystem,
    gltfRoot: THREE.Group,
    registry: AnatomyRegistry,
  ): LoadedSystemAsset {
    const meshes: THREE.Mesh[] = [];
    const meshesByAnatomyId = new Map<string, THREE.Mesh[]>();

    gltfRoot.name = `${system}-root`;

    gltfRoot.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }

      const extrasAnatomyId =
        typeof object.userData?.anatomyId === 'string'
          ? object.userData.anatomyId
          : typeof object.parent?.userData?.anatomyId === 'string'
            ? object.parent.userData.anatomyId
            : undefined;

      const resolvedAnatomyId =
        extrasAnatomyId ??
        registry.getByMeshNode(object.name) ??
        (object.parent ? registry.getByMeshNode(object.parent.name) : undefined);

      if (!resolvedAnatomyId) {
        return;
      }

      const metadata = registry.getById(resolvedAnatomyId);
      if (!metadata) {
        throw new Error(
          `Malha "${object.name}" referencia anatomyId inexistente nos metadados: "${resolvedAnatomyId}".`,
        );
      }
      if (metadata.system !== system) {
        throw new Error(
          `Malha "${object.name}" (${resolvedAnatomyId}) pertence ao sistema "${metadata.system}", mas foi carregada em "${system}".`,
        );
      }

      object.userData.anatomyId = metadata.anatomyId;
      object.userData.system = metadata.system;
      object.userData.meshNode = object.name;

      meshes.push(object);
      const list = meshesByAnatomyId.get(metadata.anatomyId);
      if (list) {
        list.push(object);
      } else {
        meshesByAnatomyId.set(metadata.anatomyId, [object]);
      }
    });

    if (meshes.length === 0) {
      throw new Error(
        `Nenhuma malha anatômica identificável encontrada no ativo "${system}".`,
      );
    }

    return {
      system,
      root: gltfRoot,
      meshes,
      meshesByAnatomyId,
    };
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.sessionId += 1;

    for (const controller of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();
    this.inFlightSystems.clear();
    this.catalogLoadPromise = null;
  }
}

function disposeGltfScene(root: THREE.Object3D): void {
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
