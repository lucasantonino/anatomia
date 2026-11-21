// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnatomyRegistry } from '../../src/core/anatomy/registry';
import type {
  AnatomyRegion,
  AnatomySystem,
  CoverageMatrix,
  Laterality,
  Manifest,
  MetadataDocument,
  StructureMetadata,
} from '../../src/core/schema/anatomy';
import {
  createViewerStore,
  deriveLayerMode,
  isMusclesVisible,
  type ViewerStore,
} from '../../src/core/state/viewerStore';
import { App } from '../../src/ui/App';
import { CreditsModal } from '../../src/ui/CreditsModal';
import { LayerControls } from '../../src/ui/LayerControls';
import { StatusOverlay } from '../../src/ui/StatusOverlay';
import { StructureDrawer } from '../../src/ui/StructureDrawer';
import type { AnatomyEnginePort, CatalogSnapshot } from '../../src/ui/types';

afterEach(() => {
  cleanup();
});

const SAMPLE_SHA =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function makeStructure(params: {
  anatomyId: string;
  system: AnatomySystem;
  laterality: Laterality;
  ptBr: string;
  la: string;
  region?: AnatomyRegion;
  meshNodes?: string[];
  fmaIds?: string[];
}): StructureMetadata {
  return {
    anatomyId: params.anatomyId,
    system: params.system,
    laterality: params.laterality,
    region: params.region ?? 'upper_limb',
    displayName: {
      'pt-BR': params.ptBr,
      la: params.la,
    },
    scientificName: params.la,
    meshNodes: params.meshNodes ?? [params.anatomyId],
    labelAnchor: [0.1, 0.2, 0.05],
    boundingBox: {
      min: [0, 0, 0],
      max: [0.2, 0.3, 0.1],
    },
    source: {
      assetVersion: 'v1',
      referenceIds: ['BP3D-v3.0'],
      fmaIds: params.fmaIds ?? ['FMA13322'],
    },
    review: {
      status: 'pending_review',
      reviewedBy: 'unassigned',
      reviewedAt: null,
    },
  };
}

function createFixtureStructures(): StructureMetadata[] {
  return [
    makeStructure({
      anatomyId: 'bone.clavicula.right',
      system: 'skeletal',
      laterality: 'right',
      ptBr: 'Clavícula',
      la: 'Clavicula',
      fmaIds: ['FMA13322'],
    }),
    makeStructure({
      anatomyId: 'bone.humerus.left',
      system: 'skeletal',
      laterality: 'left',
      ptBr: 'Úmero',
      la: 'Humerus',
      fmaIds: ['FMA23131'],
    }),
    makeStructure({
      anatomyId: 'muscle.biceps_brachii.left',
      system: 'muscular',
      laterality: 'left',
      ptBr: 'Músculo bíceps braquial',
      la: 'Musculus biceps brachii',
      meshNodes: [
        'muscle.biceps_brachii.left.short_head',
        'muscle.biceps_brachii.left.long_head',
      ],
      fmaIds: ['FMA37685', 'FMA37687'],
    }),
    makeStructure({
      anatomyId: 'muscle.deltoideus.right',
      system: 'muscular',
      laterality: 'right',
      ptBr: 'Músculo deltoide',
      la: 'Musculus deltoideus',
      meshNodes: [
        'muscle.deltoideus.right.clavicular',
        'muscle.deltoideus.right.acromial',
        'muscle.deltoideus.right.spinal',
      ],
      fmaIds: ['FMA34680', 'FMA34682', 'FMA34684'],
    }),
  ];
}

function createFixtureManifest(): Manifest {
  return {
    schemaVersion: '1.0.0',
    assetVersion: 'v1',
    metadataVersion: 'v1',
    coverageMatrixVersion: 'v1',
    coordinateSystem: 'gltf-y-up-meters-anterior-pos-z',
    sceneOriginOffset: [0, -1.09, -0.1],
    metadataUrl: '/assets/v1/metadata-v1.json',
    coverageMatrixUrl: '/assets/v1/coverage-matrix.json',
    systems: {
      skeletal: {
        url: '/assets/v1/skeletal-v1.glb',
        sha256: SAMPLE_SHA,
        bytes: 169_216,
        triangles: 34_200,
        meshCount: 10,
      },
      muscular: {
        url: '/assets/v1/muscular-v1.glb',
        sha256: SAMPLE_SHA,
        bytes: 317_728,
        triangles: 59_972,
        meshCount: 26,
      },
    },
    license: {
      sourceName: 'BodyParts3D v3.0 (DBCLS)',
      spdxOrIdentifier: 'CC-BY-SA-2.1-JP',
      attributionText:
        'BodyParts3D, Copyright 2008 Life Science Integrated Database Center licensed by CC Attribution-ShareAlike 2.1 Japan.',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en',
    },
  };
}

function createFullCoverageMatrix22(): CoverageMatrix {
  const structures: CoverageMatrix['structures'] = [];
  const boneNames = ['clavicula', 'scapula', 'humerus', 'radius', 'ulna'];
  const muscleNames = [
    'deltoideus',
    'pectoralis_major',
    'biceps_brachii',
    'brachialis',
    'triceps_brachii',
    'brachioradialis',
  ];

  for (const name of boneNames) {
    for (const laterality of ['right', 'left'] as const) {
      structures.push({
        anatomyId: `bone.${name}.${laterality}`,
        system: 'skeletal',
        laterality,
        presentInAsset: true,
        detailLevel: 'segmentado_por_estrutura_e_subpartes',
        meshNodes: [`bone.${name}.${laterality}`],
        fmaIds: ['FMA13322'],
        reviewStatus: 'pending_review',
      });
    }
  }

  for (const name of muscleNames) {
    for (const laterality of ['right', 'left'] as const) {
      structures.push({
        anatomyId: `muscle.${name}.${laterality}`,
        system: 'muscular',
        laterality,
        presentInAsset: true,
        detailLevel: 'segmentado_por_estrutura_e_subpartes',
        meshNodes: [`muscle.${name}.${laterality}`],
        fmaIds: ['FMA37685'],
        reviewStatus: 'pending_review',
      });
    }
  }

  return {
    schemaVersion: '1.0.0',
    assetVersion: 'v1',
    coverageMatrixVersion: 'v1',
    scopeStatement:
      'Fase 1: cintura escapular e membro superior bilateral (22 estruturas).',
    generatedAt: '2026-11-20T00:00:00Z',
    structures,
  };
}

interface StubEngine extends AnatomyEnginePort {
  readonly focusStructure: ReturnType<
    typeof vi.fn<AnatomyEnginePort['focusStructure']>
  >;
  readonly resetView: ReturnType<typeof vi.fn<AnatomyEnginePort['resetView']>>;
  readonly mount: ReturnType<typeof vi.fn<AnatomyEnginePort['mount']>>;
  readonly dispose: ReturnType<typeof vi.fn<AnatomyEnginePort['dispose']>>;
  readonly attachLabelElements: ReturnType<
    typeof vi.fn<AnatomyEnginePort['attachLabelElements']>
  >;
  readonly setSafeInsets: ReturnType<
    typeof vi.fn<AnatomyEnginePort['setSafeInsets']>
  >;
  readonly nudgeOrbit: ReturnType<typeof vi.fn<AnatomyEnginePort['nudgeOrbit']>>;
  readonly nudgePan: ReturnType<typeof vi.fn<AnatomyEnginePort['nudgePan']>>;
  readonly nudgeZoom: ReturnType<typeof vi.fn<AnatomyEnginePort['nudgeZoom']>>;
  readonly retrySystem: ReturnType<
    typeof vi.fn<AnatomyEnginePort['retrySystem']>
  >;
  readonly retryAll: ReturnType<typeof vi.fn<AnatomyEnginePort['retryAll']>>;
}

function createStubEngine(structures = createFixtureStructures()): StubEngine {
  const manifest = createFixtureManifest();
  const metadata: MetadataDocument = {
    schemaVersion: '1.0.0',
    assetVersion: 'v1',
    metadataVersion: 'v1',
    terminologyReference: 'Terminologia Anatomica (TA2)',
    generatedAt: '2026-11-20T00:00:00Z',
    structures,
  };
  const snapshot: CatalogSnapshot = {
    manifest,
    metadata,
    coverageMatrix: createFullCoverageMatrix22(),
    registry: new AnatomyRegistry(structures, {
      assetVersion: 'v1',
      metadataVersion: 'v1',
      terminologyReference: 'Terminologia Anatomica (TA2)',
    }),
  };

  return {
    mount: vi.fn<AnatomyEnginePort['mount']>(),
    dispose: vi.fn<AnatomyEnginePort['dispose']>(),
    attachLabelElements: vi.fn<AnatomyEnginePort['attachLabelElements']>(),
    setSafeInsets: vi.fn<AnatomyEnginePort['setSafeInsets']>(),
    resetView: vi.fn<AnatomyEnginePort['resetView']>(),
    focusStructure: vi.fn<AnatomyEnginePort['focusStructure']>(),
    nudgeOrbit: vi.fn<AnatomyEnginePort['nudgeOrbit']>(),
    nudgePan: vi.fn<AnatomyEnginePort['nudgePan']>(),
    nudgeZoom: vi.fn<AnatomyEnginePort['nudgeZoom']>(),
    retrySystem: vi.fn<AnatomyEnginePort['retrySystem']>(async () => undefined),
    retryAll: vi.fn<AnatomyEnginePort['retryAll']>(async () => undefined),
    getCatalogSnapshot: () => snapshot,
    subscribeCatalog: () => () => undefined,
  };
}

function createLoadedStore(overrides?: Parameters<typeof createViewerStore>[0]): ViewerStore {
  return createViewerStore({
    webglStatus: 'ready',
    loadState: {
      manifest: 'loaded',
      skeletal: { status: 'loaded', progress: 100, errorMessage: null },
      muscular: { status: 'loaded', progress: 100, errorMessage: null },
    },
    ...overrides,
  });
}

describe('LayerControls', () => {
  it('alterna Músculos / Ossos / Ambos sem contradição e evita cena vazia no toggle Mostrar músculos', () => {
    const store = createLoadedStore();

    const renderControls = () => {
      const state = store.getState();
      return (
        <LayerControls
          layerMode={deriveLayerMode(state.visibleSystems)}
          musclesVisible={isMusclesVisible(state)}
          muscleOpacity={state.muscleOpacity}
          qualityMode={state.qualityMode}
          onLayerModeChange={(mode) => store.setLayerMode(mode)}
          onToggleMuscles={() => store.toggleMuscles()}
          onMuscleOpacityChange={(opacity) => store.setMuscleOpacity(opacity)}
          onResetView={vi.fn()}
          onQualityModeChange={(mode) => store.setQualityMode(mode)}
        />
      );
    };

    const { rerender } = render(renderControls());

    const group = screen.getByRole('group', { name: 'Camadas anatômicas' });
    const btnMuscles = within(group).getByRole('button', { name: 'Músculos' });
    const btnBones = within(group).getByRole('button', { name: 'Ossos' });
    const btnBoth = within(group).getByRole('button', { name: 'Ambos' });
    const toggleMuscles = screen.getByRole('button', {
      name: /Mostrar músculos/i,
    });

    // Estado inicial: Ambos
    expect(btnBoth).toHaveAttribute('aria-pressed', 'true');
    expect(btnMuscles).toHaveAttribute('aria-pressed', 'false');
    expect(btnBones).toHaveAttribute('aria-pressed', 'false');
    expect(toggleMuscles).toHaveAttribute('aria-pressed', 'true');

    // Mudar para Somente Músculos -> desligar Mostrar músculos transita automaticamente para Ossos
    fireEvent.click(btnMuscles);
    rerender(renderControls());
    expect(btnMuscles).toHaveAttribute('aria-pressed', 'true');
    expect(toggleMuscles).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggleMuscles);
    rerender(renderControls());
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('skeletal');
    expect(btnBones).toHaveAttribute('aria-pressed', 'true');
    expect(btnMuscles).toHaveAttribute('aria-pressed', 'false');
    expect(toggleMuscles).toHaveAttribute('aria-pressed', 'false');

    // Ligar Mostrar músculos a partir de Ossos -> Ambos
    fireEvent.click(toggleMuscles);
    rerender(renderControls());
    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('both');
    expect(btnBoth).toHaveAttribute('aria-pressed', 'true');
    expect(toggleMuscles).toHaveAttribute('aria-pressed', 'true');
  });

  it('exibe slider de Opacidade dos músculos somente em Ambos, ativa dica de modo fantasma em <= 25% e alterna Qualidade', () => {
    const onOpacity = vi.fn();
    const onQuality = vi.fn();

    const { rerender } = render(
      <LayerControls
        layerMode="both"
        musclesVisible={true}
        muscleOpacity={1.0}
        qualityMode="auto"
        onLayerModeChange={vi.fn()}
        onToggleMuscles={vi.fn()}
        onMuscleOpacityChange={onOpacity}
        onResetView={vi.fn()}
        onQualityModeChange={onQuality}
      />,
    );

    const slider = screen.getByRole('slider', {
      name: /Opacidade dos músculos/i,
    });
    expect(slider).toHaveValue('100');
    expect(screen.queryByTestId('muscle-ghost-hint')).not.toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '20' } });
    expect(onOpacity).toHaveBeenCalledWith(0.2);

    // Em opacidade <= 25% exibe dica de seleção direta de ossos
    rerender(
      <LayerControls
        layerMode="both"
        musclesVisible={true}
        muscleOpacity={0.25}
        qualityMode="auto"
        onLayerModeChange={vi.fn()}
        onToggleMuscles={vi.fn()}
        onMuscleOpacityChange={onOpacity}
        onResetView={vi.fn()}
        onQualityModeChange={onQuality}
      />,
    );
    expect(screen.getByTestId('muscle-ghost-hint')).toHaveTextContent(
      /Seleção direta de ossos ativa/i,
    );

    // Qualidade: auto -> reduced
    const qualityButton = screen.getByRole('button', {
      name: /Qualidade: Automática/i,
    });
    expect(qualityButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(qualityButton);
    expect(onQuality).toHaveBeenCalledWith('reduced');

    // Em Somente Músculos ou Somente Ossos o slider NÃO deve ser renderizado
    rerender(
      <LayerControls
        layerMode="muscular"
        musclesVisible={true}
        muscleOpacity={0.2}
        qualityMode="reduced"
        onLayerModeChange={vi.fn()}
        onToggleMuscles={vi.fn()}
        onMuscleOpacityChange={onOpacity}
        onResetView={vi.fn()}
        onQualityModeChange={onQuality}
      />,
    );
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('muscle-ghost-hint')).not.toBeInTheDocument();

    rerender(
      <LayerControls
        layerMode="skeletal"
        musclesVisible={false}
        muscleOpacity={0.2}
        qualityMode="reduced"
        onLayerModeChange={vi.fn()}
        onToggleMuscles={vi.fn()}
        onMuscleOpacityChange={onOpacity}
        onResetView={vi.fn()}
        onQualityModeChange={onQuality}
      />,
    );
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('StructureDrawer', () => {
  it('busca sem acento em PT-BR e Latim, exibe contagens dinâmicas nos filtros e fecha com Esc', () => {
    const registry = new AnatomyRegistry(createFixtureStructures());
    const onClose = vi.fn();
    const onSelect = vi.fn();

    render(
      <StructureDrawer
        open={true}
        registry={registry}
        selectedId={null}
        manifestStatus="loaded"
        webglStatus="ready"
        isMobile={false}
        onClose={onClose}
        onSelectStructure={onSelect}
      />,
    );

    // Contagens dinâmicas nos filtros
    const filterGroup = screen.getByRole('group', {
      name: 'Filtrar por sistema anatômico',
    });
    expect(
      within(filterGroup).getByRole('button', { name: 'Todas (4)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const musclesFilter = within(filterGroup).getByRole('button', {
      name: 'Músculos (2)',
    });
    const bonesFilter = within(filterGroup).getByRole('button', {
      name: 'Ossos (2)',
    });

    const searchInput = screen.getByRole('searchbox', {
      name: /Buscar estrutura \(PT-BR ou latim\)/i,
    });

    // Busca PT-BR sem acento: clavicula, umero, biceps
    fireEvent.change(searchInput, { target: { value: 'clavicula' } });
    expect(screen.getByText('Clavícula')).toBeInTheDocument();
    expect(screen.queryByText('Úmero')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'umero' } });
    expect(screen.getByText('Úmero')).toBeInTheDocument();
    expect(screen.queryByText('Clavícula')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'biceps' } });
    expect(screen.getByText('Músculo bíceps braquial')).toBeInTheDocument();

    // Busca em Latim
    fireEvent.change(searchInput, {
      target: { value: 'Musculus deltoideus' },
    });
    expect(screen.getByText('Músculo deltoide')).toBeInTheDocument();
    expect(
      screen.queryByText('Músculo bíceps braquial'),
    ).not.toBeInTheDocument();

    // Botão limpar busca e filtro por sistema
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    expect(searchInput).toHaveValue('');

    fireEvent.click(bonesFilter);
    expect(screen.getByText('Clavícula')).toBeInTheDocument();
    expect(screen.getByText('Úmero')).toBeInTheDocument();
    expect(screen.queryByText('Músculo deltoide')).not.toBeInTheDocument();

    fireEvent.click(musclesFilter);
    expect(screen.getByText('Músculo deltoide')).toBeInTheDocument();
    expect(screen.queryByText('Clavícula')).not.toBeInTheDocument();

    // Fechamento por Esc
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filtra por região anatômica, combina sistema + região com contagens dinâmicas e reseta via Limpar filtros', () => {
    const multiRegionStructures: StructureMetadata[] = [
      makeStructure({
        anatomyId: 'bone.cranium.midline',
        system: 'skeletal',
        laterality: 'midline',
        region: 'head_neck',
        ptBr: 'Crânio',
        la: 'Cranium',
        fmaIds: ['FMA46565'],
      }),
      makeStructure({
        anatomyId: 'bone.sternum.midline',
        system: 'skeletal',
        laterality: 'midline',
        region: 'trunk',
        ptBr: 'Esterno',
        la: 'Sternum',
        fmaIds: ['FMA7485'],
      }),
      makeStructure({
        anatomyId: 'muscle.rectus_abdominis.right',
        system: 'muscular',
        laterality: 'right',
        region: 'trunk',
        ptBr: 'Músculo reto do abdome',
        la: 'Musculus rectus abdominis',
        fmaIds: ['FMA9628'],
      }),
      makeStructure({
        anatomyId: 'muscle.biceps_brachii.left',
        system: 'muscular',
        laterality: 'left',
        region: 'upper_limb',
        ptBr: 'Músculo bíceps braquial',
        la: 'Musculus biceps brachii',
        fmaIds: ['FMA37685'],
      }),
      makeStructure({
        anatomyId: 'bone.femur.right',
        system: 'skeletal',
        laterality: 'right',
        region: 'lower_limb',
        ptBr: 'Fêmur',
        la: 'Femur',
        fmaIds: ['FMA9611'],
      }),
      makeStructure({
        anatomyId: 'muscle.quadriceps_femoris.right',
        system: 'muscular',
        laterality: 'right',
        region: 'lower_limb',
        ptBr: 'Músculo quadríceps femoral',
        la: 'Musculus quadriceps femoris',
        fmaIds: ['FMA22428'],
      }),
    ];

    const registry = new AnatomyRegistry(multiRegionStructures);

    render(
      <StructureDrawer
        open={true}
        registry={registry}
        selectedId={null}
        manifestStatus="loaded"
        webglStatus="ready"
        isMobile={false}
        onClose={vi.fn()}
        onSelectStructure={vi.fn()}
      />,
    );

    const systemGroup = screen.getByRole('group', {
      name: 'Filtrar por sistema anatômico',
    });
    const regionGroup = screen.getByRole('group', {
      name: 'Filtrar por região anatômica',
    });

    // Contagens iniciais nas 4 regiões
    expect(
      within(regionGroup).getByRole('button', { name: 'Todas (6)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(regionGroup).getByRole('button', { name: 'Cabeça/Pescoço (1)' }),
    ).toBeInTheDocument();
    expect(
      within(regionGroup).getByRole('button', { name: 'Tronco (2)' }),
    ).toBeInTheDocument();
    expect(
      within(regionGroup).getByRole('button', { name: 'M. Superior (1)' }),
    ).toBeInTheDocument();
    const lowerLimbBtn = within(regionGroup).getByRole('button', {
      name: 'M. Inferior (2)',
    });

    // Filtrar por região M. Inferior
    fireEvent.click(lowerLimbBtn);
    expect(lowerLimbBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Fêmur')).toBeInTheDocument();
    expect(screen.getByText('Músculo quadríceps femoral')).toBeInTheDocument();
    expect(screen.queryByText('Crânio')).not.toBeInTheDocument();
    expect(screen.queryByText('Esterno')).not.toBeInTheDocument();

    // Combinar sistema Músculos + região M. Inferior
    fireEvent.click(
      within(systemGroup).getByRole('button', { name: 'Músculos (3)' }),
    );
    expect(screen.getByText('Músculo quadríceps femoral')).toBeInTheDocument();
    expect(screen.queryByText('Fêmur')).not.toBeInTheDocument();

    // Contagens regionais atualizam dinamicamente para o sistema filtrado (Músculos)
    const headNeckZeroBtn = within(regionGroup).getByRole('button', {
      name: 'Cabeça/Pescoço (0)',
    });
    fireEvent.click(headNeckZeroBtn);
    expect(
      screen.getByText('Nenhuma estrutura disponível neste filtro.'),
    ).toBeInTheDocument();

    // Limpar filtros restaura sistema, região e lista completa
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(
      within(systemGroup).getByRole('button', { name: 'Todas (6)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(regionGroup).getByRole('button', { name: 'Todas (6)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Crânio')).toBeInTheDocument();
    expect(screen.getByText('Fêmur')).toBeInTheDocument();
    expect(screen.getByText('Músculo bíceps braquial')).toBeInTheDocument();
  });
});

describe('CreditsModal', () => {
  it('exibe atribuição integral BodyParts3D (DBCLS / CC BY-SA 2.1 JP), escopo v1 honesto, pending_review, aviso educacional e sem alegação de corpo inteiro', () => {
    const manifest = createFixtureManifest();
    const coverage = createFullCoverageMatrix22();
    const onClose = vi.fn();

    render(
      <CreditsModal
        open={true}
        manifest={manifest}
        coverageMatrix={coverage}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: /Créditos, Licenças e Escopo/i,
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const fullText = dialog.textContent ?? '';
    expect(fullText).toContain('BodyParts3D');
    expect(fullText).toContain('DBCLS');
    expect(fullText).toContain('CC BY-SA 2.1 JP');
    expect(fullText).toContain('v1');
    expect(fullText).toContain('22 estruturas');
    expect(fullText).toContain('10 ossos');
    expect(fullText).toContain('12 músculos');
    expect(fullText).toContain('pending_review');
    expect(fullText).toMatch(/estritamente educacional/i);
    expect(fullText).not.toMatch(/corpo inteiro/i);
    expect(fullText).not.toMatch(/corpo completo/i);

    const licenseLink = within(dialog).getByRole('link', {
      name: /CC BY-SA 2\.1 JP/i,
    });
    expect(licenseLink).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en',
    );
    expect(licenseLink).toHaveAttribute('target', '_blank');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renderiza dinamicamente versões, contagens, scopeStatement, malhas e licença de um manifesto v2', () => {
    const manifestV2: Manifest = {
      schemaVersion: '1.0.0',
      assetVersion: 'v2',
      metadataVersion: 'v2',
      coverageMatrixVersion: 'v2',
      coordinateSystem: 'gltf-y-up-meters-anterior-pos-z',
      sceneOriginOffset: [0, -0.88, 0.02],
      metadataUrl: '/assets/v2/metadata-v2.json',
      coverageMatrixUrl: '/assets/v2/coverage-matrix.json',
      systems: {
        skeletal: {
          url: '/assets/v2/skeletal-v2.glb',
          sha256: SAMPLE_SHA,
          bytes: 1_200_000,
          triangles: 90_000,
          meshCount: 85,
        },
        muscular: {
          url: '/assets/v2/muscular-v2.glb',
          sha256: SAMPLE_SHA,
          bytes: 1_450_000,
          triangles: 110_000,
          meshCount: 115,
        },
      },
      license: {
        sourceName: 'BodyParts3D v3.0 (DBCLS) — Corpo Inteiro',
        spdxOrIdentifier: 'CC-BY-SA-2.1-JP',
        attributionText:
          'BodyParts3D, Copyright 2008 DBCLS, licenciado sob CC Attribution-ShareAlike 2.1 Japan.',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en',
      },
    };

    const v2Coverage: CoverageMatrix = {
      schemaVersion: '1.0.0',
      assetVersion: 'v2',
      coverageMatrixVersion: 'v2',
      scopeStatement:
        'Fase 2 (v2): cobertura de corpo inteiro nas 4 regiões anatômicas (cabeça/pescoço, tronco, membro superior e membro inferior).',
      generatedAt: '2026-11-21T00:00:00Z',
      structures: [
        {
          anatomyId: 'bone.cranium.midline',
          system: 'skeletal',
          laterality: 'midline',
          region: 'head_neck',
          presentInAsset: true,
          detailLevel: 'segmentado_por_estrutura_e_subpartes',
          meshNodes: ['bone.cranium.midline'],
          fmaIds: ['FMA46565'],
          reviewStatus: 'pending_review',
        },
        {
          anatomyId: 'bone.femur.right',
          system: 'skeletal',
          laterality: 'right',
          region: 'lower_limb',
          presentInAsset: true,
          detailLevel: 'segmentado_por_estrutura_e_subpartes',
          meshNodes: ['bone.femur.right'],
          fmaIds: ['FMA9611'],
          reviewStatus: 'pending_review',
        },
        {
          anatomyId: 'muscle.quadriceps_femoris.right',
          system: 'muscular',
          laterality: 'right',
          region: 'lower_limb',
          presentInAsset: true,
          detailLevel: 'segmentado_por_estrutura_e_subpartes',
          meshNodes: ['muscle.quadriceps_femoris.right'],
          fmaIds: ['FMA22428'],
          reviewStatus: 'pending_review',
        },
        {
          anatomyId: 'bone.stapes.right',
          system: 'skeletal',
          laterality: 'right',
          region: 'head_neck',
          presentInAsset: false,
          detailLevel: 'excluido_escala',
          meshNodes: [],
          fmaIds: ['FMA52751'],
          reviewStatus: 'pending_review',
        },
      ],
    };

    render(
      <CreditsModal
        open={true}
        manifest={manifestV2}
        coverageMatrix={v2Coverage}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByTestId('credits-modal');
    const text = dialog.textContent ?? '';

    // Versões v2, total de malhas (85 + 115 = 200) e somente estruturas presentInAsset=true (3 = 2 ossos + 1 músculo)
    expect(text).toContain('v2');
    expect(text).toContain('200 malhas');
    expect(text).toContain('3 estruturas (2 ossos e 1 músculos)');
    expect(text).toContain(v2Coverage.scopeStatement);
    expect(text).toContain('BodyParts3D v3.0 (DBCLS)');
    expect(text).toContain('CC BY-SA 2.1 JP');
    expect(text).toContain('pending_review');
  });
});

describe('StatusOverlay', () => {
  it('exibe contagem dinâmica totalStructures no fallback WebGL unsupported e texto genérico quando omitida', () => {
    const idleLoadState = createViewerStore().getState().loadState;

    const { rerender } = render(
      <StatusOverlay
        webglStatus="unsupported"
        loadState={idleLoadState}
        totalStructures={148}
        onRetrySystem={vi.fn()}
        onRetryAll={vi.fn()}
        onOpenDrawer={vi.fn()}
      />,
    );

    expect(screen.getByTestId('status-webgl-unsupported')).toHaveTextContent(
      'todas as 148 estruturas anatômicas desta versão na lista textual.',
    );

    rerender(
      <StatusOverlay
        webglStatus="unsupported"
        loadState={idleLoadState}
        onRetrySystem={vi.fn()}
        onRetryAll={vi.fn()}
        onOpenDrawer={vi.fn()}
      />,
    );

    expect(screen.getByTestId('status-webgl-unsupported')).toHaveTextContent(
      'todas as estruturas anatômicas desta versão na lista textual.',
    );
  });
});

describe('App — integração UI + viewerStore + stub AnatomyEnginePort', () => {
  it('revela camada oculta ao selecionar estrutura pela gaveta, invoca focusStructure e anuncia em aria-live', () => {
    const store = createLoadedStore({
      visibleSystems: new Set(['skeletal']),
    });
    const engine = createStubEngine();

    render(<App store={store} engine={engine} />);

    // Abrir gaveta Estruturas
    fireEvent.click(
      screen.getByRole('button', { name: /Abrir lista de estruturas/i }),
    );
    const drawer = screen.getByTestId('structure-drawer');

    // Selecionar músculo enquanto somente ossos estão visíveis
    fireEvent.click(
      within(drawer).getByRole('button', { name: /Músculo bíceps braquial/i }),
    );

    expect(deriveLayerMode(store.getState().visibleSystems)).toBe('both');
    expect(store.getState().selectedId).toBe('muscle.biceps_brachii.left');
    expect(engine.focusStructure).toHaveBeenCalledWith(
      'muscle.biceps_brachii.left',
    );

    const announcer = screen.getByTestId('live-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveTextContent(
      /Selecionado: Músculo bíceps braquial, Musculus biceps brachii, lado esquerdo\. Camada muscular exibida\./i,
    );

    // Troca de camada também anuncia em aria-live
    const layerGroup = screen.getByRole('group', {
      name: 'Camadas anatômicas',
    });
    fireEvent.click(within(layerGroup).getByRole('button', { name: 'Ossos' }));
    expect(announcer).toHaveTextContent(
      'Camada alterada para Somente ossos',
    );
  });

  it('mantém exclusão mútua entre HelpModal e CreditsModal e respeita atalhos R e Esc', () => {
    const store = createLoadedStore();
    const engine = createStubEngine();

    render(<App store={store} engine={engine} />);

    // Atalho R global aciona resetView
    fireEvent.keyDown(window, { key: 'r' });
    expect(engine.resetView).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('live-announcer')).toHaveTextContent(
      'Vista anatômica redefinida.',
    );

    // Abrir Como navegar e depois Créditos -> exclusão mútua
    fireEvent.click(screen.getByRole('button', { name: 'Como navegar' }));
    expect(screen.getByTestId('help-modal')).toBeInTheDocument();
    expect(screen.queryByTestId('credits-modal')).not.toBeInTheDocument();

    // Com modal aberto, R não deve disparar resetView
    fireEvent.keyDown(window, { key: 'R' });
    expect(engine.resetView).toHaveBeenCalledTimes(1);

    // Abrir Créditos fecha Como navegar automaticamente
    fireEvent.click(
      screen.getByRole('button', { name: /Créditos, licenças e escopo/i }),
    );
    expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('credits-modal')).toBeInTheDocument();

    // Esc fecha o modal aberto
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('credits-modal')).not.toBeInTheDocument();

    // Abrir gaveta: digitar R dentro da busca NÃO dispara resetView
    fireEvent.click(
      screen.getByRole('button', { name: /Abrir lista de estruturas/i }),
    );
    const searchInput = screen.getByRole('searchbox', {
      name: /Buscar estrutura/i,
    });
    fireEvent.keyDown(searchInput, { key: 'r' });
    expect(engine.resetView).toHaveBeenCalledTimes(1);

    // Selecionar estrutura, fechar gaveta com Esc e depois limpar seleção com Esc
    fireEvent.click(
      within(screen.getByTestId('structure-drawer')).getByRole('button', {
        name: /Clavícula/i,
      }),
    );
    expect(store.getState().selectedId).toBe('bone.clavicula.right');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('structure-drawer')).not.toBeInTheDocument();
    expect(store.getState().selectedId).toBe('bone.clavicula.right');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(store.getState().selectedId).toBeNull();
    expect(screen.getByTestId('live-announcer')).toHaveTextContent(
      'Seleção removida.',
    );
  });

  it('mantém lista textual e etiqueta acessíveis no fallback webglStatus === unsupported', () => {
    const store = createViewerStore({
      webglStatus: 'unsupported',
      loadState: {
        manifest: 'loaded',
        skeletal: { status: 'idle', progress: 0, errorMessage: null },
        muscular: { status: 'idle', progress: 0, errorMessage: null },
      },
    });
    const engine = createStubEngine();

    render(<App store={store} engine={engine} />);

    const fallbackOverlay = screen.getByTestId('status-webgl-unsupported');
    expect(fallbackOverlay).toHaveTextContent(
      /Visualização 3D indisponível neste dispositivo/i,
    );

    // Abrir lista textual pelo botão do overlay fallback
    fireEvent.click(
      within(fallbackOverlay).getByRole('button', {
        name: /Abrir lista de estruturas/i,
      }),
    );
    const drawer = screen.getByTestId('structure-drawer');
    expect(drawer).toHaveTextContent(/Modo de referência textual ativo/i);

    // Selecionar uma estrutura no modo fallback atualiza etiqueta estática e aria-live
    fireEvent.click(
      within(drawer).getByRole('button', { name: /Clavícula/i }),
    );
    const labelCard = screen.getByTestId('anatomy-label-card');
    expect(labelCard).toHaveAttribute('data-active', 'true');
    expect(labelCard).toHaveAttribute('data-pinned', 'true');
    expect(labelCard).toHaveTextContent('Clavícula');
    expect(labelCard).toHaveTextContent('Clavicula');
    expect(screen.getByTestId('live-announcer')).toHaveTextContent(
      'Selecionado: Clavícula, Clavicula, lado direito',
    );
  });
});
