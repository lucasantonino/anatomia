import * as THREE from 'three';
import type { AnatomySystem } from '../core/schema/anatomy';
import type { AnatomyRegistry } from '../core/anatomy/registry';
import {
  formatLateralityLabelPtBr,
  isMuscleGhostMode,
  type ViewerStore,
} from '../core/state/viewerStore';

export const HOVER_SWITCH_HYSTERESIS_MS = 55;
export const HOVER_CLEAR_HYSTERESIS_MS = 70;
export const CAMERA_SETTLE_DELAY_MS = 80;
export const TAP_MAX_DISTANCE_PX = 8;
export const TAP_MAX_DURATION_MS = 350;

export interface HoverHysteresisOptions {
  readonly switchDelayMs?: number;
  readonly clearDelayMs?: number;
  readonly cameraSettleDelayMs?: number;
}

export interface HoverTransitionResult {
  readonly committedId: string | null;
  readonly changed: boolean;
  readonly pendingDelayMs: number | null;
}

export interface TapGestureInput {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly durationMs: number;
  readonly maxActivePointers: number;
  readonly exceededMoveThreshold?: boolean;
}

/**
 * Função pura: determina quais sistemas anatômicos são elegíveis para raycasting.
 * Regra ADR-006 (modo "músculo fantasma"): quando `Ambos` está ativo e
 * `muscleOpacity <= 0.25`, exclui a camada muscular para permitir selecionar ossos
 * diretamente através da musculatura translúcida.
 */
export function getRaycastEligibleSystems(
  visibleSystems: ReadonlySet<AnatomySystem>,
  muscleOpacity: number,
): AnatomySystem[] {
  const eligible: AnatomySystem[] = [];
  if (visibleSystems.has('skeletal')) {
    eligible.push('skeletal');
  }
  if (
    visibleSystems.has('muscular') &&
    !isMuscleGhostMode({ visibleSystems, muscleOpacity })
  ) {
    eligible.push('muscular');
  }
  return eligible;
}

/**
 * Máquina de estados pura de histerese anti-tremor para hover no desktop:
 * - Entrada a partir do vazio (`null -> A`): imediata
 * - Troca entre estruturas adjacentes (`A -> B`): exige estabilidade >= 55 ms
 * - Saída para o vazio (`A -> null`): exige estabilidade >= 70 ms
 * - Movimento de câmera: suspensão imediata e respiro de 80 ms após `end`
 */
export class HoverHysteresisController {
  private readonly switchDelayMs: number;
  private readonly clearDelayMs: number;
  private readonly cameraSettleDelayMs: number;

  private committedId: string | null = null;
  private pendingId: string | null | undefined = undefined;
  private pendingSinceMs = 0;
  private isCameraMoving = false;
  private resumeAfterMs = 0;

  public constructor(options: HoverHysteresisOptions = {}) {
    this.switchDelayMs = options.switchDelayMs ?? HOVER_SWITCH_HYSTERESIS_MS;
    this.clearDelayMs = options.clearDelayMs ?? HOVER_CLEAR_HYSTERESIS_MS;
    this.cameraSettleDelayMs =
      options.cameraSettleDelayMs ?? CAMERA_SETTLE_DELAY_MS;
  }

  public getCommittedId(): string | null {
    return this.committedId;
  }

  public isSuspended(nowMs: number): boolean {
    return this.isCameraMoving || nowMs < this.resumeAfterMs;
  }

  public onCameraStart(): HoverTransitionResult {
    this.isCameraMoving = true;
    this.pendingId = undefined;

    const changed = this.committedId !== null;
    this.committedId = null;

    return {
      committedId: null,
      changed,
      pendingDelayMs: null,
    };
  }

  public onCameraEnd(nowMs: number): void {
    this.isCameraMoving = false;
    this.resumeAfterMs = nowMs + this.cameraSettleDelayMs;
  }

  public evaluate(
    candidateId: string | null,
    nowMs: number,
  ): HoverTransitionResult {
    if (this.isSuspended(nowMs)) {
      this.pendingId = undefined;
      const changed = this.committedId !== null;
      this.committedId = null;
      return {
        committedId: null,
        changed,
        pendingDelayMs: null,
      };
    }

    if (candidateId === this.committedId) {
      this.pendingId = undefined;
      return {
        committedId: this.committedId,
        changed: false,
        pendingDelayMs: null,
      };
    }

    // Entrada limpa a partir do fundo vazio: resposta imediata
    if (this.committedId === null && candidateId !== null) {
      this.committedId = candidateId;
      this.pendingId = undefined;
      return {
        committedId: candidateId,
        changed: true,
        pendingDelayMs: null,
      };
    }

    const requiredDelay =
      candidateId === null ? this.clearDelayMs : this.switchDelayMs;

    if (this.pendingId !== candidateId) {
      this.pendingId = candidateId;
      this.pendingSinceMs = nowMs;
      return {
        committedId: this.committedId,
        changed: false,
        pendingDelayMs: requiredDelay,
      };
    }

    const elapsed = nowMs - this.pendingSinceMs;
    if (elapsed >= requiredDelay) {
      this.committedId = candidateId;
      this.pendingId = undefined;
      return {
        committedId: this.committedId,
        changed: true,
        pendingDelayMs: null,
      };
    }

    return {
      committedId: this.committedId,
      changed: false,
      pendingDelayMs: requiredDelay - elapsed,
    };
  }

  public flush(nowMs: number): HoverTransitionResult {
    if (this.pendingId === undefined) {
      return {
        committedId: this.committedId,
        changed: false,
        pendingDelayMs: null,
      };
    }
    return this.evaluate(this.pendingId, nowMs);
  }

  public forceClear(): HoverTransitionResult {
    this.pendingId = undefined;
    const changed = this.committedId !== null;
    this.committedId = null;
    return {
      committedId: null,
      changed,
      pendingDelayMs: null,
    };
  }

  public syncCommitted(id: string | null): void {
    if (this.committedId !== id) {
      this.committedId = id;
      if (this.pendingId === id) {
        this.pendingId = undefined;
      }
    }
  }
}

/**
 * Função pura: classifica se um gesto de ponteiro satisfaz os critérios de toque
 * simples (RF-06): ponteiro único, deslocamento euclidiano <= 8 px e duração < 350 ms.
 */
export function evaluateTapGesture(
  input: TapGestureInput,
  maxDistancePx: number = TAP_MAX_DISTANCE_PX,
  maxDurationMs: number = TAP_MAX_DURATION_MS,
): boolean {
  if (input.maxActivePointers > 1) {
    return false;
  }
  if (input.exceededMoveThreshold) {
    return false;
  }
  if (!Number.isFinite(input.durationMs) || input.durationMs < 0 || input.durationMs >= maxDurationMs) {
    return false;
  }
  const distance = Math.hypot(
    input.endX - input.startX,
    input.endY - input.startY,
  );
  return Number.isFinite(distance) && distance <= maxDistancePx;
}

/**
 * Classificador puro de gestos multi-ponteiro (Tap vs. Drag / Pinça).
 * Qualquer segundo dedo simultâneo ou arrasto > 8 px invalida o toque até que
 * todos os ponteiros sejam liberados.
 */
export class TapGestureClassifier {
  private readonly maxDistancePx: number;
  private readonly maxDurationMs: number;

  private readonly activePointers = new Set<number>();
  private candidatePointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startTimeMs = 0;
  private invalidated = false;
  private maxActivePointers = 0;

  public constructor(
    maxDistancePx: number = TAP_MAX_DISTANCE_PX,
    maxDurationMs: number = TAP_MAX_DURATION_MS,
  ) {
    this.maxDistancePx = maxDistancePx;
    this.maxDurationMs = maxDurationMs;
  }

  public getActivePointerCount(): number {
    return this.activePointers.size;
  }

  public onPointerDown(
    pointerId: number,
    x: number,
    y: number,
    nowMs: number,
  ): void {
    this.activePointers.add(pointerId);

    if (this.activePointers.size === 1) {
      this.candidatePointerId = pointerId;
      this.startX = x;
      this.startY = y;
      this.startTimeMs = nowMs;
      this.invalidated = false;
      this.maxActivePointers = 1;
      return;
    }

    this.invalidated = true;
    this.maxActivePointers = Math.max(
      this.maxActivePointers,
      this.activePointers.size,
    );
  }

  public onPointerMove(pointerId: number, x: number, y: number): void {
    if (!this.activePointers.has(pointerId)) {
      return;
    }
    if (pointerId === this.candidatePointerId && !this.invalidated) {
      const distance = Math.hypot(x - this.startX, y - this.startY);
      if (distance > this.maxDistancePx) {
        this.invalidated = true;
      }
    }
  }

  public onPointerUp(
    pointerId: number,
    x: number,
    y: number,
    nowMs: number,
  ): boolean {
    const activeBeforeUp = this.activePointers.size;
    this.activePointers.delete(pointerId);

    const isEligibleCandidate =
      pointerId === this.candidatePointerId &&
      !this.invalidated &&
      activeBeforeUp === 1 &&
      this.maxActivePointers === 1;

    const isTap = isEligibleCandidate
      ? evaluateTapGesture(
          {
            startX: this.startX,
            startY: this.startY,
            endX: x,
            endY: y,
            durationMs: nowMs - this.startTimeMs,
            maxActivePointers: this.maxActivePointers,
            exceededMoveThreshold: this.invalidated,
          },
          this.maxDistancePx,
          this.maxDurationMs,
        )
      : false;

    if (this.activePointers.size === 0) {
      this.resetCandidate();
    }

    return isTap;
  }

  public onPointerCancel(pointerId: number): void {
    this.activePointers.delete(pointerId);
    this.invalidated = true;
    if (this.activePointers.size === 0) {
      this.resetCandidate();
    }
  }

  public reset(): void {
    this.activePointers.clear();
    this.resetCandidate();
  }

  private resetCandidate(): void {
    this.candidatePointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.startTimeMs = 0;
    this.invalidated = false;
    this.maxActivePointers = 0;
  }
}

export interface InteractionControllerOptions {
  readonly canvas: HTMLCanvasElement;
  readonly camera: THREE.Camera;
  readonly store: ViewerStore;
  readonly getSystemRoot: (system: AnatomySystem) => THREE.Object3D | null;
  readonly getRegistry: () => AnatomyRegistry;
}

function resolveAnatomyIdFromObject(object: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = object;
  while (current !== null) {
    const id = current.userData?.anatomyId;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Controlador imperativo de raycasting sob demanda, hover com histerese e
 * diferenciação toque/clique vs. órbita/pinça no elemento `<canvas>`.
 */
export class InteractionController {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.Camera;
  private readonly store: ViewerStore;
  private readonly getSystemRoot: (system: AnatomySystem) => THREE.Object3D | null;
  private readonly getRegistry: () => AnatomyRegistry;

  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly hysteresis = new HoverHysteresisController();
  private readonly tapClassifier = new TapGestureClassifier();

  private pendingHoverTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeStore: (() => void) | null = null;
  private disposed = false;

  public constructor(options: InteractionControllerOptions) {
    this.canvas = options.canvas;
    this.camera = options.camera;
    this.store = options.store;
    this.getSystemRoot = options.getSystemRoot;
    this.getRegistry = options.getRegistry;

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);

    this.unsubscribeStore = this.store.subscribe(() => {
      this.hysteresis.syncCommitted(this.store.getState().hoveredId);
    });
  }

  public notifyCameraStart(): void {
    if (this.disposed) {
      return;
    }
    this.clearPendingHoverTimer();
    const result = this.hysteresis.onCameraStart();
    if (result.changed) {
      this.store.setHoveredId(null);
    }
  }

  public notifyCameraEnd(): void {
    if (this.disposed) {
      return;
    }
    this.hysteresis.onCameraEnd(performance.now());
  }

  private clearPendingHoverTimer(): void {
    if (this.pendingHoverTimer !== null) {
      clearTimeout(this.pendingHoverTimer);
      this.pendingHoverTimer = null;
    }
  }

  private schedulePendingHoverFlush(delayMs: number): void {
    this.clearPendingHoverTimer();
    const safeDelay = Math.max(1, Math.ceil(delayMs));
    this.pendingHoverTimer = setTimeout(() => {
      this.pendingHoverTimer = null;
      if (this.disposed) {
        return;
      }
      const result = this.hysteresis.flush(performance.now());
      if (result.changed) {
        this.store.setHoveredId(result.committedId);
      } else if (result.pendingDelayMs !== null) {
        this.schedulePendingHoverFlush(result.pendingDelayMs);
      }
    }, safeDelay);
  }

  private raycastAnatomyAt(clientX: number, clientY: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const state = this.store.getState();
    const eligibleSystems = getRaycastEligibleSystems(
      state.visibleSystems,
      state.muscleOpacity,
    );

    const targets: THREE.Object3D[] = [];
    for (const system of eligibleSystems) {
      const root = this.getSystemRoot(system);
      if (root && root.visible) {
        targets.push(root);
      }
    }

    if (targets.length === 0) {
      return null;
    }

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const intersections = this.raycaster.intersectObjects(targets, true);

    for (const hit of intersections) {
      if (!hit.object.visible) {
        continue;
      }
      const anatomyId = resolveAnatomyIdFromObject(hit.object);
      if (anatomyId !== null) {
        return anatomyId;
      }
    }

    return null;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.disposed) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    this.tapClassifier.onPointerDown(
      event.pointerId,
      event.clientX,
      event.clientY,
      event.timeStamp || performance.now(),
    );
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.disposed) {
      return;
    }

    if (this.tapClassifier.getActivePointerCount() > 0) {
      this.tapClassifier.onPointerMove(
        event.pointerId,
        event.clientX,
        event.clientY,
      );
    }

    // Raycasting de hover somente para mouse em repouso (sem botão pressionado)
    if (event.pointerType !== 'mouse' || event.buttons !== 0) {
      return;
    }

    const now = performance.now();
    if (this.hysteresis.isSuspended(now)) {
      return;
    }

    const hitId = this.raycastAnatomyAt(event.clientX, event.clientY);
    const result = this.hysteresis.evaluate(hitId, now);

    if (result.changed) {
      this.clearPendingHoverTimer();
      this.store.setHoveredId(result.committedId);
    } else if (result.pendingDelayMs !== null) {
      this.schedulePendingHoverFlush(result.pendingDelayMs);
    } else {
      this.clearPendingHoverTimer();
    }
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.disposed) {
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const isTap = this.tapClassifier.onPointerUp(
      event.pointerId,
      event.clientX,
      event.clientY,
      event.timeStamp || performance.now(),
    );

    if (!isTap) {
      return;
    }

    const hitId = this.raycastAnatomyAt(event.clientX, event.clientY);
    if (hitId === null) {
      this.store.clearSelection();
      return;
    }

    const structure = this.getRegistry().getById(hitId);
    const announcement = structure
      ? `Selecionado: ${structure.displayName['pt-BR']}, ${structure.displayName.la}, ${formatLateralityLabelPtBr(structure.laterality)}`
      : undefined;

    this.store.setSelectedId(hitId, announcement);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.disposed) {
      return;
    }
    this.tapClassifier.onPointerCancel(event.pointerId);
  };

  private readonly handlePointerLeave = (): void => {
    if (this.disposed) {
      return;
    }
    this.clearPendingHoverTimer();
    const result = this.hysteresis.forceClear();
    if (result.changed) {
      this.store.setHoveredId(null);
    }
  };

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearPendingHoverTimer();
    this.tapClassifier.reset();
    this.hysteresis.forceClear();

    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);

    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
  }
}
