import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MUSCLE_OPACITY,
  MAX_MUSCLE_OPACITY,
  MIN_MUSCLE_OPACITY,
  MUSCLE_GHOST_OPACITY_THRESHOLD,
  clampMuscleOpacity,
  createViewerStore,
  deriveLayerMode,
  formatLateralityLabelPtBr,
  getActiveAnatomyId,
  inferSystemFromAnatomyId,
  isBonesVisible,
  isMuscleGhostMode,
  isMusclesVisible,
  type StructureSelectionInput,
} from '../../src/core/state/viewerStore';

const BICEPS_LEFT: StructureSelectionInput = {
  anatomyId: 'muscle.biceps_brachii.left',
  system: 'muscular',
  laterality: 'left',
  displayName: {
    'pt-BR': 'Músculo bíceps braquial',
    la: 'Musculus biceps brachii',
  },
};

const CLAVICULA_RIGHT: StructureSelectionInput = {
  anatomyId: 'bone.clavicula.right',
  system: 'skeletal',
  laterality: 'right',
  displayName: {
    'pt-BR': 'Clavícula',
    la: 'Clavicula',
  },
};

const STERNUM_MIDLINE: StructureSelectionInput = {
  anatomyId: 'bone.sternum.midline',
  system: 'skeletal',
  laterality: 'midline',
  displayName: {
    'pt-BR': 'Esterno',
    la: 'Sternum',
  },
};

describe('viewerStore — estado inicial, fábrica e estabilidade referencial', () => {
  it('inicia com modo Ambos, opacidade 1.0, sem seleção/hover e modais fechados', () => {
    const store = createViewerStore();
    const state = store.getState();

    expect(deriveLayerMode(state.visibleSystems)).toBe('both');
    expect(isMusclesVisible(state)).toBe(true);
    expect(isBonesVisible(state)).toBe(true);
    expect(state.muscleOpacity).toBe(DEFAULT_MUSCLE_OPACITY);
    expect(state.hoveredId).toBeNull();
    expect(state.selectedId).toBeNull();
    expect(getActiveAnatomyId(state)).toBeNull();
    expect(state.qualityMode).toBe('auto');
    expect(state.webglStatus).toBe('initializing');
    expect(state.loadState).toEqual({
      manifest: 'idle',
      skeletal: { status: 'idle', progress: 0, errorMessage: null },
      muscular: { status: 'idle', progress: 0, errorMessage: null },
    });
    expect(state.drawerOpen).toBe(false);
    expect(state.helpOpen).toBe(false);
    expect(state.creditsOpen).toBe(false);
    expect(state.announcement).toBe('');
    expect(state.announcementSeq).toBe(0);
  });

  it('normaliza overrides inválidos na fábrica (visibleSystems vazio, opacidade fora da faixa, modais simultâneos)', () => {
    const store = createViewerStore({
      visibleSystems: new Set(),
      muscleOpacity: 0.01,
      helpOpen: true,
      creditsOpen: true,
      loadState: {
        manifest: 'loaded',
        skeletal: { status: 'loading', progress: 150, errorMessage: null },
        muscular: { status: 'idle', progress: -20, errorMessage: null },
      },
    });

    const state = store.getState();
    expect(deriveLayerMode(state.visibleSystems)).toBe('both');
    expect(state.muscleOpacity).toBe(MIN_MUSCLE_OPACITY);
    expect(state.helpOpen).toBe(true);
    expect(state.creditsOpen).toBe(false);
    expect(state.loadState.skeletal.progress).toBe(100);
    expect(state.loadState.muscular.progress).toBe(0);
  });

  it('mantém estabilidade referencial estrita de getState() em chamadas no-op e não notifica listeners', () => {
    const store = createViewerStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const initialRef = store.getState();
    expect(store.getState()).toBe(initialRef);

    store.setLayerMode('both');
    store.setMuscleOpacity(1.0);
    store.setMuscleOpacity(5.0);
    store.setMuscleOpacity(Number.NaN);
    store.setHoveredId(null);
    store.setSelectedId(null);
    store.setSelectedId(null, '   ');
    store.clearSelection();
    store.setManifestStatus('idle');
    store.setSystemLoadState('skeletal', { status: 'idle', progress: 0 });
    store.setQualityMode('auto');
    store.setWebGLStatus('initializing');
    store.setDrawerOpen(false);
    store.setHelpOpen(false);
    store.setCreditsOpen(false);
    store.closeAllModals();
    store.announce('   ');

    expect(store.getState()).toBe(initialRef);
    expect(listener).not.toHaveBeenCalled();

    store.setDrawerOpen(true);
    expect(store.getState()).not.toBe(initialRef);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setDrawerOpen(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('mantém estabilidade referencial quando setQualityMode recebe announcementText vazio/espaços sem alterar mode', () => {
    const store = createViewerStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const before = store.getState();
    store.setQualityMode('auto', '   ');

    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('mantém estabilidade referencial quando setWebGLStatus recebe announcementText vazio/espaços sem alterar status', () => {
    const store = createViewerStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const before = store.getState();
    store.setWebGLStatus('initializing', '');

    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('restaura estado inicial com reset()', () => {
    const store = createViewerStore();
    store.setLayerMode('skeletal');
    store.setMuscleOpacity(0.2);
    store.setDrawerOpen(true);
    store.setHelpOpen(true);

    store.reset();
    const state = store.getState();
    expect(deriveLayerMode(state.visibleSystems)).toBe('both');
    expect(state.muscleOpacity).toBe(1.0);
    expect(state.drawerOpen).toBe(false);
    expect(state.helpOpen).toBe(false);
    expect(state.announcementSeq).toBe(0);
  });
});

describe('viewerStore — máquina de estado de camadas (ADR-006)', () => {
  it('transita entre muscular, skeletal e both atualizando anúncios aria-live', () => {
    const store = createViewerStore();

    store.setLayerMode('muscular');
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('muscular');
    expect(isMusclesVisible(store.getState())).toBe(true);
    expect(isBonesVisible(store.getState())).toBe(false);
    expect(store.getState().announcement).toBe(
      'Camada alterada para Somente músculos',
    );
    expect(store.getState().announcementSeq).toBe(1);

    store.setLayerMode('skeletal');
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('skeletal');
    expect(isMusclesVisible(store.getState())).toBe(false);
    expect(isBonesVisible(store.getState())).toBe(true);
    expect(store.getState().announcement).toBe(
      'Camada alterada para Somente ossos',
    );
    expect(store.getState().announcementSeq).toBe(2);

    store.setLayerMode('both');
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('both');
    expect(isMusclesVisible(store.getState())).toBe(true);
    expect(isBonesVisible(store.getState())).toBe(true);
    expect(store.getState().announcement).toBe(
      'Camada alterada para Músculos e ossos',
    );
    expect(store.getState().announcementSeq).toBe(3);
  });

  it('toggleMuscles segue both -> skeletal, muscular -> skeletal (nunca cena vazia) e skeletal -> both', () => {
    const store = createViewerStore();

    // both -> skeletal
    store.toggleMuscles();
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('skeletal');
    expect(store.getState().visibleSystems.size).toBe(1);

    // skeletal -> both
    store.toggleMuscles();
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('both');
    expect(store.getState().visibleSystems.size).toBe(2);

    // muscular -> skeletal (jamais deixa cena vazia)
    store.setLayerMode('muscular');
    store.toggleMuscles();
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('skeletal');
    expect(store.getState().visibleSystems.has('skeletal')).toBe(true);
    expect(store.getState().visibleSystems.size).toBeGreaterThan(0);
  });
});

describe('viewerStore — consistência de hoveredId / selectedId com camadas ocultas', () => {
  it('limpa hoveredId e selectedId automaticamente quando a camada correspondente é ocultada', () => {
    const store = createViewerStore();

    store.setSelectedId('muscle.biceps_brachii.left');
    store.setHoveredId('bone.clavicula.right');
    expect(getActiveAnatomyId(store.getState())).toBe('bone.clavicula.right');

    // Ocultar músculos: limpa selectedId muscular, preserva hoveredId ósseo
    store.setLayerMode('skeletal');
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().hoveredId).toBe('bone.clavicula.right');
    expect(getActiveAnatomyId(store.getState())).toBe('bone.clavicula.right');

    // Voltar a Ambos e inverter
    store.setLayerMode('both');
    store.setSelectedId('bone.clavicula.right');
    store.setHoveredId('muscle.biceps_brachii.left');

    // Ocultar ossos: limpa selectedId ósseo, preserva hoveredId muscular
    store.setLayerMode('muscular');
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().hoveredId).toBe('muscle.biceps_brachii.left');

    // toggleMuscles a partir de muscular vai para skeletal e limpa hoveredId muscular
    store.toggleMuscles();
    expect(store.getState().hoveredId).toBeNull();

    // Limpeza também respeita resolveSystem customizado
    store.setLayerMode('both');
    store.setSelectedId('custom-node-1', undefined, () => 'muscular');
    store.setLayerMode('skeletal', (id) =>
      id === 'custom-node-1' ? 'muscular' : undefined,
    );
    expect(store.getState().selectedId).toBeNull();
  });

  it('bloqueia setHoveredId e setSelectedId para estruturas de camadas ocultas (prefixo e resolver customizado)', () => {
    const store = createViewerStore({
      visibleSystems: new Set(['skeletal']),
    });
    const listener = vi.fn();
    store.subscribe(listener);

    const before = store.getState();
    store.setHoveredId('muscle.biceps_brachii.left');
    store.setSelectedId(
      'muscle.biceps_brachii.left',
      'Tentativa em camada oculta',
    );
    store.setHoveredId('custom-muscle-id', () => 'muscular');
    store.setSelectedId('custom-muscle-id', 'Anúncio bloqueado', () => 'muscular');

    expect(store.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();

    // Camada visível continua aceita
    store.setSelectedId('bone.clavicula.right', 'Clavícula selecionada');
    expect(store.getState().selectedId).toBe('bone.clavicula.right');
    expect(store.getState().announcement).toBe('Clavícula selecionada');
    expect(store.getState().announcementSeq).toBe(1);

    // clearSelection limpa seleção ativa
    store.clearSelection();
    expect(store.getState().selectedId).toBeNull();
  });

  it('resolve precedência de etiqueta activeAnatomyId = hoveredId ?? selectedId', () => {
    const store = createViewerStore();
    store.setSelectedId('bone.clavicula.right');
    expect(getActiveAnatomyId(store.getState())).toBe('bone.clavicula.right');

    store.setHoveredId('muscle.biceps_brachii.left');
    expect(getActiveAnatomyId(store.getState())).toBe('muscle.biceps_brachii.left');

    store.setHoveredId(null);
    expect(getActiveAnatomyId(store.getState())).toBe('bone.clavicula.right');
  });
});

describe('viewerStore — opacidade muscular e modo fantasma', () => {
  it('clampMuscleOpacity restringe para [0.15, 1.0], trata NaN/Infinity e remove ruído de ponto flutuante', () => {
    expect(clampMuscleOpacity(0.15)).toBe(MIN_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(1.0)).toBe(MAX_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(0)).toBe(MIN_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(-0.5)).toBe(MIN_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(0.1499)).toBe(MIN_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(1.5)).toBe(MAX_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(Number.NaN)).toBe(DEFAULT_MUSCLE_OPACITY);
    expect(clampMuscleOpacity(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_MUSCLE_OPACITY,
    );
    expect(clampMuscleOpacity(Number.NEGATIVE_INFINITY)).toBe(
      DEFAULT_MUSCLE_OPACITY,
    );
    expect(clampMuscleOpacity(0.15 + 0.1)).toBe(0.25);
    expect(clampMuscleOpacity(0.1 + 0.2)).toBe(0.3);
    expect(clampMuscleOpacity(0.33336)).toBe(0.3334);
  });

  it('setMuscleOpacity aplica clamping no estado', () => {
    const store = createViewerStore();
    store.setMuscleOpacity(0.05);
    expect(store.getState().muscleOpacity).toBe(0.15);

    store.setMuscleOpacity(0.25);
    expect(store.getState().muscleOpacity).toBe(0.25);

    store.setMuscleOpacity(Number.NaN);
    expect(store.getState().muscleOpacity).toBe(1.0);
  });

  it('isMuscleGhostMode é verdadeiro somente em Ambos com muscleOpacity <= 0.25', () => {
    expect(MUSCLE_GHOST_OPACITY_THRESHOLD).toBe(0.25);

    expect(
      isMuscleGhostMode({
        visibleSystems: new Set(['muscular', 'skeletal']),
        muscleOpacity: 0.25,
      }),
    ).toBe(true);

    expect(
      isMuscleGhostMode({
        visibleSystems: new Set(['muscular', 'skeletal']),
        muscleOpacity: 0.15,
      }),
    ).toBe(true);

    expect(
      isMuscleGhostMode({
        visibleSystems: new Set(['muscular', 'skeletal']),
        muscleOpacity: 0.2501,
      }),
    ).toBe(false);

    expect(
      isMuscleGhostMode({
        visibleSystems: new Set(['muscular']),
        muscleOpacity: 0.2,
      }),
    ).toBe(false);

    expect(
      isMuscleGhostMode({
        visibleSystems: new Set(['skeletal']),
        muscleOpacity: 0.2,
      }),
    ).toBe(false);
  });
});

describe('viewerStore — selectStructure (idle, loading, error, loaded e auto-revelação)', () => {
  it('recusa seleção quando o sistema está idle ou loading e anuncia status em PT-BR', () => {
    const store = createViewerStore();

    const idleResult = store.selectStructure(BICEPS_LEFT);
    expect(idleResult).toEqual({
      selected: false,
      layerRevealed: false,
      reason: 'system_not_loaded',
    });
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().announcement).toBe(
      'A camada muscular ainda não está carregada.',
    );
    expect(store.getState().announcementSeq).toBe(1);

    store.setSystemLoadState('muscular', { status: 'loading', progress: 45 });
    const loadingResult = store.selectStructure(BICEPS_LEFT);
    expect(loadingResult).toEqual({
      selected: false,
      layerRevealed: false,
      reason: 'system_not_loaded',
    });
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().announcement).toBe(
      'A camada muscular ainda está carregando.',
    );
    expect(store.getState().announcementSeq).toBe(2);
  });

  it('recusa seleção quando o sistema está em error e anuncia falha com nome da estrutura', () => {
    const store = createViewerStore();
    store.setSystemLoadState('skeletal', {
      status: 'error',
      errorMessage: 'HTTP 500',
    });

    const errorResult = store.selectStructure(CLAVICULA_RIGHT);
    expect(errorResult).toEqual({
      selected: false,
      layerRevealed: false,
      reason: 'system_error',
    });
    expect(store.getState().selectedId).toBeNull();
    expect(store.getState().announcement).toBe(
      'Não foi possível selecionar Clavícula: a camada óssea falhou ao carregar.',
    );
    expect(store.getState().announcementSeq).toBe(1);
  });

  it('seleciona estrutura quando carregada na camada visível sem revelar camada extra e anuncia PT-BR/Latim/lateralidade', () => {
    const store = createViewerStore();
    store.setSystemLoadState('skeletal', { status: 'loaded' });
    const systemsBefore = store.getState().visibleSystems;

    const rightResult = store.selectStructure(CLAVICULA_RIGHT);
    expect(rightResult).toEqual({
      selected: true,
      layerRevealed: false,
      reason: 'ok',
    });
    expect(store.getState().selectedId).toBe('bone.clavicula.right');
    expect(store.getState().visibleSystems).toBe(systemsBefore);
    expect(store.getState().announcement).toBe(
      'Selecionado: Clavícula, Clavicula, lado direito',
    );
    expect(store.getState().announcementSeq).toBe(1);

    const midlineResult = store.selectStructure(STERNUM_MIDLINE);
    expect(midlineResult.selected).toBe(true);
    expect(store.getState().announcement).toBe(
      'Selecionado: Esterno, Sternum, linha média',
    );
    expect(store.getState().announcementSeq).toBe(2);
  });

  it('auto-revela a camada oculta (visibleSystems ∪ {system}) ao selecionar estrutura carregada', () => {
    const store = createViewerStore({
      visibleSystems: new Set(['skeletal']),
    });
    store.setSystemLoadState('muscular', { status: 'loaded' });
    store.setSystemLoadState('skeletal', { status: 'loaded' });

    const revealMuscle = store.selectStructure(BICEPS_LEFT);
    expect(revealMuscle).toEqual({
      selected: true,
      layerRevealed: true,
      reason: 'ok',
    });
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('both');
    expect(store.getState().selectedId).toBe('muscle.biceps_brachii.left');
    expect(store.getState().announcement).toBe(
      'Selecionado: Músculo bíceps braquial, Musculus biceps brachii, lado esquerdo. Camada muscular exibida.',
    );
    expect(store.getState().announcementSeq).toBe(1);

    // Ocultar ossos e selecionar osso revela ossos sem ocultar músculos
    store.setLayerMode('muscular');
    const revealBone = store.selectStructure(CLAVICULA_RIGHT);
    expect(revealBone).toEqual({
      selected: true,
      layerRevealed: true,
      reason: 'ok',
    });
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('both');
    expect(store.getState().selectedId).toBe('bone.clavicula.right');
    expect(store.getState().announcement).toBe(
      'Selecionado: Clavícula, Clavicula, lado direito. Camada óssea exibida.',
    );
  });
});

describe('viewerStore — modais, carga por sistema, qualidade, WebGL e utilitários', () => {
  it('garante exclusão mútua entre helpOpen e creditsOpen e fecha ambos com closeAllModals', () => {
    const store = createViewerStore();
    store.setDrawerOpen(true);

    store.setHelpOpen(true);
    expect(store.getState().helpOpen).toBe(true);
    expect(store.getState().creditsOpen).toBe(false);

    store.setCreditsOpen(true);
    expect(store.getState().helpOpen).toBe(false);
    expect(store.getState().creditsOpen).toBe(true);

    store.setHelpOpen(true);
    expect(store.getState().helpOpen).toBe(true);
    expect(store.getState().creditsOpen).toBe(false);

    store.closeAllModals();
    expect(store.getState().helpOpen).toBe(false);
    expect(store.getState().creditsOpen).toBe(false);
    // closeAllModals não interfere na gaveta de estruturas
    expect(store.getState().drawerOpen).toBe(true);
  });

  it('setManifestStatus atualiza status do manifesto e ignora chamadas repetidas', () => {
    const store = createViewerStore();
    store.setManifestStatus('loading');
    expect(store.getState().loadState.manifest).toBe('loading');

    const ref = store.getState();
    store.setManifestStatus('loading');
    expect(store.getState()).toBe(ref);

    store.setManifestStatus('loaded');
    expect(store.getState().loadState.manifest).toBe('loaded');

    store.setManifestStatus('error');
    expect(store.getState().loadState.manifest).toBe('error');
  });

  it('setSystemLoadState faz clamp/arredondamento do progresso e limpa errorMessage automaticamente em loading/loaded', () => {
    const store = createViewerStore();

    store.setSystemLoadState('muscular', {
      status: 'loading',
      progress: 42.6,
    });
    expect(store.getState().loadState.muscular).toEqual({
      status: 'loading',
      progress: 43,
      errorMessage: null,
    });

    store.setSystemLoadState('muscular', { progress: 250 });
    expect(store.getState().loadState.muscular.progress).toBe(100);

    store.setSystemLoadState('muscular', { progress: -15 });
    expect(store.getState().loadState.muscular.progress).toBe(0);

    store.setSystemLoadState('muscular', { progress: Number.NaN });
    expect(store.getState().loadState.muscular.progress).toBe(0);

    store.setSystemLoadState('muscular', {
      status: 'error',
      errorMessage: 'Falha de rede',
    });
    expect(store.getState().loadState.muscular.errorMessage).toBe(
      'Falha de rede',
    );

    // Retry (status: 'loading') limpa errorMessage automaticamente
    store.setSystemLoadState('muscular', { status: 'loading', progress: 10 });
    expect(store.getState().loadState.muscular.errorMessage).toBeNull();

    // Erro seguido de loaded força progress = 100 e errorMessage = null
    store.setSystemLoadState('muscular', {
      status: 'error',
      progress: 10,
      errorMessage: 'Timeout',
    });
    store.setSystemLoadState('muscular', { status: 'loaded' });
    expect(store.getState().loadState.muscular).toEqual({
      status: 'loaded',
      progress: 100,
      errorMessage: null,
    });
  });

  it('setQualityMode alterna qualidade com anúncios padrão e customizados', () => {
    const store = createViewerStore();

    store.setQualityMode('reduced');
    expect(store.getState().qualityMode).toBe('reduced');
    expect(store.getState().announcement).toBe(
      'Qualidade gráfica alterada para Reduzida',
    );
    expect(store.getState().announcementSeq).toBe(1);

    store.setQualityMode('auto');
    expect(store.getState().qualityMode).toBe('auto');
    expect(store.getState().announcement).toBe(
      'Qualidade gráfica alterada para Automática',
    );
    expect(store.getState().announcementSeq).toBe(2);

    store.setQualityMode('reduced', 'Resolução reduzida automaticamente');
    expect(store.getState().announcement).toBe(
      'Resolução reduzida automaticamente',
    );
    expect(store.getState().announcementSeq).toBe(3);
  });

  it('setWebGLStatus trata initializing -> ready sem ruído, unsupported, context_lost e restauração', () => {
    const store = createViewerStore();

    store.setWebGLStatus('ready');
    expect(store.getState().webglStatus).toBe('ready');
    expect(store.getState().announcement).toBe('');
    expect(store.getState().announcementSeq).toBe(0);

    store.setWebGLStatus('context_lost');
    expect(store.getState().webglStatus).toBe('context_lost');
    expect(store.getState().announcement).toContain('contexto gráfico 3D');
    expect(store.getState().announcementSeq).toBe(1);

    store.setWebGLStatus('ready');
    expect(store.getState().webglStatus).toBe('ready');
    expect(store.getState().announcement).toBe('Visualização 3D restaurada.');
    expect(store.getState().announcementSeq).toBe(2);

    store.setWebGLStatus('unsupported');
    expect(store.getState().webglStatus).toBe('unsupported');
    expect(store.getState().announcement).toContain('WebGL 2');
    expect(store.getState().announcementSeq).toBe(3);
  });

  it('expõe utilitários de inferência de sistema e formatação de lateralidade PT-BR', () => {
    expect(inferSystemFromAnatomyId('bone.clavicula.right')).toBe('skeletal');
    expect(inferSystemFromAnatomyId('muscle.deltoideus.left')).toBe('muscular');
    expect(inferSystemFromAnatomyId('organ.heart.midline')).toBeUndefined();

    expect(formatLateralityLabelPtBr('right')).toBe('lado direito');
    expect(formatLateralityLabelPtBr('left')).toBe('lado esquerdo');
    expect(formatLateralityLabelPtBr('midline')).toBe('linha média');
  });
});
