import type {
  AnatomySystem,
  Laterality,
  StructureMetadata,
} from '../schema/anatomy';

export const MIN_MUSCLE_OPACITY = 0.15;
export const MAX_MUSCLE_OPACITY = 1.0;
export const DEFAULT_MUSCLE_OPACITY = 1.0;
export const MUSCLE_GHOST_OPACITY_THRESHOLD = 0.25;

export type { AnatomySystem } from '../schema/anatomy';
export type LayerMode = 'muscular' | 'skeletal' | 'both';
export type QualityMode = 'auto' | 'reduced';
export type SystemLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type WebGLStatus = 'initializing' | 'ready' | 'unsupported' | 'context_lost';

export interface SystemLoadState {
  readonly status: SystemLoadStatus;
  readonly progress: number;
  readonly errorMessage: string | null;
}

export interface ViewerLoadState {
  readonly manifest: SystemLoadStatus;
  readonly skeletal: SystemLoadState;
  readonly muscular: SystemLoadState;
}

export interface ViewerState {
  readonly visibleSystems: ReadonlySet<AnatomySystem>;
  readonly muscleOpacity: number;
  readonly hoveredId: string | null;
  readonly selectedId: string | null;
  readonly qualityMode: QualityMode;
  readonly webglStatus: WebGLStatus;
  readonly loadState: ViewerLoadState;
  readonly drawerOpen: boolean;
  readonly helpOpen: boolean;
  readonly creditsOpen: boolean;
  readonly announcement: string;
  readonly announcementSeq: number;
}

export type StructureSelectionInput = Pick<
  StructureMetadata,
  'anatomyId' | 'system' | 'displayName' | 'laterality'
>;

export type SystemResolver = (anatomyId: string) => AnatomySystem | undefined;

export interface SelectStructureResult {
  readonly selected: boolean;
  readonly layerRevealed: boolean;
  readonly reason: 'ok' | 'system_not_loaded' | 'system_error';
}

export type ViewerStoreListener = () => void;

export interface ViewerStore {
  readonly getState: () => ViewerState;
  readonly subscribe: (listener: ViewerStoreListener) => () => void;
  readonly setLayerMode: (mode: LayerMode, resolveSystem?: SystemResolver) => void;
  readonly toggleMuscles: (resolveSystem?: SystemResolver) => void;
  readonly setMuscleOpacity: (value: number) => void;
  readonly setHoveredId: (id: string | null, resolveSystem?: SystemResolver) => void;
  readonly setSelectedId: (
    id: string | null,
    announcementText?: string,
    resolveSystem?: SystemResolver,
  ) => void;
  readonly clearSelection: () => void;
  readonly selectStructure: (structure: StructureSelectionInput) => SelectStructureResult;
  readonly setManifestStatus: (status: SystemLoadStatus) => void;
  readonly setSystemLoadState: (
    system: AnatomySystem,
    patch: Partial<SystemLoadState>,
  ) => void;
  readonly setQualityMode: (mode: QualityMode, announcementText?: string) => void;
  readonly setWebGLStatus: (status: WebGLStatus, announcementText?: string) => void;
  readonly setDrawerOpen: (open: boolean) => void;
  readonly setHelpOpen: (open: boolean) => void;
  readonly setCreditsOpen: (open: boolean) => void;
  readonly closeAllModals: () => void;
  readonly announce: (message: string) => void;
  readonly reset: () => void;
}

/**
 * Faz clamp seguro da opacidade muscular para [0.15, 1.0] removendo ruído
 * de ponto flutuante (ex.: 0.15 + 0.10 -> 0.25).
 */
export function clampMuscleOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MUSCLE_OPACITY;
  }
  const clamped = Math.min(MAX_MUSCLE_OPACITY, Math.max(MIN_MUSCLE_OPACITY, value));
  return Math.round(clamped * 10000) / 10000;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(Math.min(100, Math.max(0, value)));
}

/**
 * Infere deterministicamente o sistema anatômico a partir do prefixo canônico
 * de um anatomyId (`bone.*` -> `'skeletal'`, `muscle.*` -> `'muscular'`).
 */
export function inferSystemFromAnatomyId(anatomyId: string): AnatomySystem | undefined {
  if (anatomyId.startsWith('bone.')) {
    return 'skeletal';
  }
  if (anatomyId.startsWith('muscle.')) {
    return 'muscular';
  }
  return undefined;
}

function resolveAnatomySystem(
  anatomyId: string | null,
  resolveSystem?: SystemResolver,
): AnatomySystem | undefined {
  if (anatomyId === null) {
    return undefined;
  }
  return resolveSystem?.(anatomyId) ?? inferSystemFromAnatomyId(anatomyId);
}

/**
 * Formata lateralidade em PT-BR neutro em gênero para anúncios acessíveis.
 */
export function formatLateralityLabelPtBr(laterality: Laterality): string {
  switch (laterality) {
    case 'right':
      return 'lado direito';
    case 'left':
      return 'lado esquerdo';
    case 'midline':
      return 'linha média';
  }
}

function formatLayerModeAnnouncement(mode: LayerMode): string {
  switch (mode) {
    case 'skeletal':
      return 'Camada alterada para Somente ossos';
    case 'muscular':
      return 'Camada alterada para Somente músculos';
    case 'both':
      return 'Camada alterada para Músculos e ossos';
  }
}

function createVisibleSystemsForMode(mode: LayerMode): ReadonlySet<AnatomySystem> {
  switch (mode) {
    case 'muscular':
      return new Set<AnatomySystem>(['muscular']);
    case 'skeletal':
      return new Set<AnatomySystem>(['skeletal']);
    case 'both':
      return new Set<AnatomySystem>(['muscular', 'skeletal']);
  }
}

/**
 * Deriva o modo de camadas a partir da fonte única de verdade `visibleSystems`.
 */
export function deriveLayerMode(visibleSystems: ReadonlySet<AnatomySystem>): LayerMode {
  const hasMuscular = visibleSystems.has('muscular');
  const hasSkeletal = visibleSystems.has('skeletal');

  if (hasMuscular && hasSkeletal) {
    return 'both';
  }
  if (hasMuscular) {
    return 'muscular';
  }
  return 'skeletal';
}

/**
 * Resolve o identificador anatômico atualmente ativo para a etiqueta 2D:
 * hover temporário no desktop tem precedência sobre seleção fixada.
 */
export function getActiveAnatomyId(
  state: Pick<ViewerState, 'hoveredId' | 'selectedId'>,
): string | null {
  return state.hoveredId ?? state.selectedId;
}

export function isMusclesVisible(state: Pick<ViewerState, 'visibleSystems'>): boolean {
  return state.visibleSystems.has('muscular');
}

export function isBonesVisible(state: Pick<ViewerState, 'visibleSystems'>): boolean {
  return state.visibleSystems.has('skeletal');
}

/**
 * Retorna verdadeiro quando o modo "Ambos" está ativo com opacidade muscular <= 25%,
 * habilitando seleção direta (raycasting) dos ossos subjacentes.
 */
export function isMuscleGhostMode(
  state: Pick<ViewerState, 'visibleSystems' | 'muscleOpacity'>,
): boolean {
  return (
    deriveLayerMode(state.visibleSystems) === 'both' &&
    state.muscleOpacity <= MUSCLE_GHOST_OPACITY_THRESHOLD
  );
}

function createInitialSystemLoadState(): SystemLoadState {
  return {
    status: 'idle',
    progress: 0,
    errorMessage: null,
  };
}

export function createInitialViewerState(): ViewerState {
  return {
    visibleSystems: new Set<AnatomySystem>(['muscular', 'skeletal']),
    muscleOpacity: DEFAULT_MUSCLE_OPACITY,
    hoveredId: null,
    selectedId: null,
    qualityMode: 'auto',
    webglStatus: 'initializing',
    loadState: {
      manifest: 'idle',
      skeletal: createInitialSystemLoadState(),
      muscular: createInitialSystemLoadState(),
    },
    drawerOpen: false,
    helpOpen: false,
    creditsOpen: false,
    announcement: '',
    announcementSeq: 0,
  };
}

function normalizeInitialVisibleSystems(
  systems?: ReadonlySet<AnatomySystem>,
): ReadonlySet<AnatomySystem> {
  if (!systems || systems.size === 0) {
    return new Set<AnatomySystem>(['muscular', 'skeletal']);
  }
  const normalized = new Set<AnatomySystem>();
  if (systems.has('muscular')) {
    normalized.add('muscular');
  }
  if (systems.has('skeletal')) {
    normalized.add('skeletal');
  }
  return normalized.size > 0
    ? normalized
    : new Set<AnatomySystem>(['muscular', 'skeletal']);
}

/**
 * Fábrica da store única reativa de visualização, compatível com `useSyncExternalStore`
 * (estabilidade referencial estrita: só gera novo snapshot quando há mudança efetiva).
 */
export function createViewerStore(
  initialOverrides?: Partial<ViewerState>,
): ViewerStore {
  const buildInitialState = (): ViewerState => {
    const base = createInitialViewerState();
    if (!initialOverrides) {
      return base;
    }

    const visibleSystems = normalizeInitialVisibleSystems(
      initialOverrides.visibleSystems,
    );
    const muscleOpacity =
      initialOverrides.muscleOpacity !== undefined
        ? clampMuscleOpacity(initialOverrides.muscleOpacity)
        : base.muscleOpacity;

    const loadState: ViewerLoadState = initialOverrides.loadState
      ? {
          manifest: initialOverrides.loadState.manifest,
          skeletal: {
            status: initialOverrides.loadState.skeletal.status,
            progress: clampProgress(initialOverrides.loadState.skeletal.progress),
            errorMessage: initialOverrides.loadState.skeletal.errorMessage,
          },
          muscular: {
            status: initialOverrides.loadState.muscular.status,
            progress: clampProgress(initialOverrides.loadState.muscular.progress),
            errorMessage: initialOverrides.loadState.muscular.errorMessage,
          },
        }
      : base.loadState;

    const helpOpen = initialOverrides.helpOpen ?? base.helpOpen;
    const creditsOpen = helpOpen
      ? false
      : (initialOverrides.creditsOpen ?? base.creditsOpen);

    return {
      ...base,
      ...initialOverrides,
      visibleSystems,
      muscleOpacity,
      loadState,
      helpOpen,
      creditsOpen,
    };
  };

  let state: ViewerState = buildInitialState();
  const listeners = new Set<ViewerStoreListener>();

  const commit = (nextState: ViewerState): void => {
    if (nextState === state) {
      return;
    }
    state = nextState;
    for (const listener of listeners) {
      listener();
    }
  };

  const getState = (): ViewerState => state;

  const subscribe = (listener: ViewerStoreListener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const setLayerMode = (mode: LayerMode, resolveSystem?: SystemResolver): void => {
    if (deriveLayerMode(state.visibleSystems) === mode) {
      return;
    }

    const nextVisibleSystems = createVisibleSystemsForMode(mode);
    const hoveredSystem = resolveAnatomySystem(state.hoveredId, resolveSystem);
    const selectedSystem = resolveAnatomySystem(state.selectedId, resolveSystem);

    const nextHoveredId =
      hoveredSystem !== undefined && !nextVisibleSystems.has(hoveredSystem)
        ? null
        : state.hoveredId;
    const nextSelectedId =
      selectedSystem !== undefined && !nextVisibleSystems.has(selectedSystem)
        ? null
        : state.selectedId;

    commit({
      ...state,
      visibleSystems: nextVisibleSystems,
      hoveredId: nextHoveredId,
      selectedId: nextSelectedId,
      announcement: formatLayerModeAnnouncement(mode),
      announcementSeq: state.announcementSeq + 1,
    });
  };

  const toggleMuscles = (resolveSystem?: SystemResolver): void => {
    if (state.visibleSystems.has('muscular')) {
      setLayerMode('skeletal', resolveSystem);
      return;
    }
    setLayerMode('both', resolveSystem);
  };

  const setMuscleOpacity = (value: number): void => {
    const nextOpacity = clampMuscleOpacity(value);
    if (nextOpacity === state.muscleOpacity) {
      return;
    }

    commit({
      ...state,
      muscleOpacity: nextOpacity,
    });
  };

  const setHoveredId = (
    id: string | null,
    resolveSystem?: SystemResolver,
  ): void => {
    if (id !== null) {
      const system = resolveAnatomySystem(id, resolveSystem);
      if (system !== undefined && !state.visibleSystems.has(system)) {
        return;
      }
    }

    if (id === state.hoveredId) {
      return;
    }

    commit({
      ...state,
      hoveredId: id,
    });
  };

  const setSelectedId = (
    id: string | null,
    announcementText?: string,
    resolveSystem?: SystemResolver,
  ): void => {
    if (id !== null) {
      const system = resolveAnatomySystem(id, resolveSystem);
      if (system !== undefined && !state.visibleSystems.has(system)) {
        return;
      }
    }

    const trimmedAnnouncement = announcementText?.trim();
    const hasAnnouncement =
      trimmedAnnouncement !== undefined && trimmedAnnouncement.length > 0;

    if (id === state.selectedId && !hasAnnouncement) {
      return;
    }

    commit({
      ...state,
      selectedId: id,
      announcement: hasAnnouncement ? trimmedAnnouncement : state.announcement,
      announcementSeq: hasAnnouncement
        ? state.announcementSeq + 1
        : state.announcementSeq,
    });
  };

  const clearSelection = (): void => {
    if (state.selectedId === null) {
      return;
    }

    commit({
      ...state,
      selectedId: null,
    });
  };

  const selectStructure = (
    structure: StructureSelectionInput,
  ): SelectStructureResult => {
    const systemLoad = state.loadState[structure.system];
    const layerLabel = structure.system === 'muscular' ? 'muscular' : 'óssea';

    if (systemLoad.status === 'error') {
      commit({
        ...state,
        announcement: `Não foi possível selecionar ${structure.displayName['pt-BR']}: a camada ${layerLabel} falhou ao carregar.`,
        announcementSeq: state.announcementSeq + 1,
      });
      return {
        selected: false,
        layerRevealed: false,
        reason: 'system_error',
      };
    }

    if (systemLoad.status !== 'loaded') {
      const statusDetail =
        systemLoad.status === 'loading'
          ? `A camada ${layerLabel} ainda está carregando.`
          : `A camada ${layerLabel} ainda não está carregada.`;
      commit({
        ...state,
        announcement: statusDetail,
        announcementSeq: state.announcementSeq + 1,
      });
      return {
        selected: false,
        layerRevealed: false,
        reason: 'system_not_loaded',
      };
    }

    const layerRevealed = !state.visibleSystems.has(structure.system);
    const nextVisibleSystems = layerRevealed
      ? new Set<AnatomySystem>([...state.visibleSystems, structure.system])
      : state.visibleSystems;

    const lateralityLabel = formatLateralityLabelPtBr(structure.laterality);
    const baseAnnouncement = `Selecionado: ${structure.displayName['pt-BR']}, ${structure.displayName.la}, ${lateralityLabel}`;
    const fullAnnouncement = layerRevealed
      ? `${baseAnnouncement}. Camada ${layerLabel} exibida.`
      : baseAnnouncement;

    commit({
      ...state,
      visibleSystems: nextVisibleSystems,
      selectedId: structure.anatomyId,
      announcement: fullAnnouncement,
      announcementSeq: state.announcementSeq + 1,
    });

    return {
      selected: true,
      layerRevealed,
      reason: 'ok',
    };
  };

  const setManifestStatus = (status: SystemLoadStatus): void => {
    if (state.loadState.manifest === status) {
      return;
    }

    commit({
      ...state,
      loadState: {
        ...state.loadState,
        manifest: status,
      },
    });
  };

  const setSystemLoadState = (
    system: AnatomySystem,
    patch: Partial<SystemLoadState>,
  ): void => {
    const current = state.loadState[system];
    const nextStatus = patch.status ?? current.status;
    const rawProgress =
      patch.progress !== undefined
        ? patch.progress
        : nextStatus === 'loaded'
          ? 100
          : current.progress;
    const nextProgress = clampProgress(rawProgress);

    let nextErrorMessage: string | null;
    if (patch.errorMessage !== undefined) {
      nextErrorMessage = patch.errorMessage;
    } else if (nextStatus === 'loading' || nextStatus === 'loaded') {
      nextErrorMessage = null;
    } else {
      nextErrorMessage = current.errorMessage;
    }

    if (
      nextStatus === current.status &&
      nextProgress === current.progress &&
      nextErrorMessage === current.errorMessage
    ) {
      return;
    }

    commit({
      ...state,
      loadState: {
        ...state.loadState,
        [system]: {
          status: nextStatus,
          progress: nextProgress,
          errorMessage: nextErrorMessage,
        },
      },
    });
  };

  const setQualityMode = (mode: QualityMode, announcementText?: string): void => {
    const modeChanged = mode !== state.qualityMode;

    const resolvedAnnouncement =
      announcementText !== undefined
        ? announcementText.trim()
        : modeChanged
          ? mode === 'reduced'
            ? 'Qualidade gráfica alterada para Reduzida'
            : 'Qualidade gráfica alterada para Automática'
          : '';

    const shouldAnnounce = resolvedAnnouncement.length > 0;
    if (!modeChanged && !shouldAnnounce) {
      return;
    }

    commit({
      ...state,
      qualityMode: mode,
      announcement: shouldAnnounce ? resolvedAnnouncement : state.announcement,
      announcementSeq: shouldAnnounce
        ? state.announcementSeq + 1
        : state.announcementSeq,
    });
  };

  const setWebGLStatus = (status: WebGLStatus, announcementText?: string): void => {
    const statusChanged = status !== state.webglStatus;

    let defaultAnnouncement = '';
    if (statusChanged) {
      if (status === 'unsupported') {
        defaultAnnouncement =
          'Seu navegador ou dispositivo não oferece suporte a WebGL 2 para visualização 3D.';
      } else if (status === 'context_lost') {
        defaultAnnouncement =
          'O contexto gráfico 3D foi interrompido temporariamente.';
      } else if (status === 'ready' && state.webglStatus === 'context_lost') {
        defaultAnnouncement = 'Visualização 3D restaurada.';
      }
    }

    const resolvedAnnouncement =
      announcementText !== undefined
        ? announcementText.trim()
        : defaultAnnouncement;
    const shouldAnnounce = resolvedAnnouncement.length > 0;

    if (!statusChanged && !shouldAnnounce) {
      return;
    }

    commit({
      ...state,
      webglStatus: status,
      announcement: shouldAnnounce ? resolvedAnnouncement : state.announcement,
      announcementSeq: shouldAnnounce
        ? state.announcementSeq + 1
        : state.announcementSeq,
    });
  };

  const setDrawerOpen = (open: boolean): void => {
    if (state.drawerOpen === open) {
      return;
    }

    commit({
      ...state,
      drawerOpen: open,
    });
  };

  const setHelpOpen = (open: boolean): void => {
    const nextCreditsOpen = open ? false : state.creditsOpen;
    if (state.helpOpen === open && state.creditsOpen === nextCreditsOpen) {
      return;
    }

    commit({
      ...state,
      helpOpen: open,
      creditsOpen: nextCreditsOpen,
    });
  };

  const setCreditsOpen = (open: boolean): void => {
    const nextHelpOpen = open ? false : state.helpOpen;
    if (state.creditsOpen === open && state.helpOpen === nextHelpOpen) {
      return;
    }

    commit({
      ...state,
      creditsOpen: open,
      helpOpen: nextHelpOpen,
    });
  };

  const closeAllModals = (): void => {
    if (!state.helpOpen && !state.creditsOpen) {
      return;
    }

    commit({
      ...state,
      helpOpen: false,
      creditsOpen: false,
    });
  };

  const announce = (message: string): void => {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return;
    }

    commit({
      ...state,
      announcement: trimmed,
      announcementSeq: state.announcementSeq + 1,
    });
  };

  const reset = (): void => {
    commit(createInitialViewerState());
  };

  return {
    getState,
    subscribe,
    setLayerMode,
    toggleMuscles,
    setMuscleOpacity,
    setHoveredId,
    setSelectedId,
    clearSelection,
    selectStructure,
    setManifestStatus,
    setSystemLoadState,
    setQualityMode,
    setWebGLStatus,
    setDrawerOpen,
    setHelpOpen,
    setCreditsOpen,
    closeAllModals,
    announce,
    reset,
  };
}

export const viewerStore: ViewerStore = createViewerStore();
