import { describe, expect, it } from 'vitest';
import {
  AnatomyRegistry,
  createAnatomyRegistry,
  createEmptyAnatomyRegistry,
  normalizeSearchText,
} from '../../src/core/anatomy/registry';
import type {
  AnatomySystem,
  Laterality,
  MetadataDocument,
  StructureMetadata,
} from '../../src/core/schema/anatomy';

function makeStructure(params: {
  anatomyId: string;
  system: AnatomySystem;
  laterality: Laterality;
  ptBr: string;
  la: string;
  scientificName?: string;
  meshNodes?: string[];
  fmaIds?: string[];
}): StructureMetadata {
  return {
    anatomyId: params.anatomyId,
    system: params.system,
    laterality: params.laterality,
    region: 'upper_limb',
    displayName: {
      'pt-BR': params.ptBr,
      la: params.la,
    },
    scientificName: params.scientificName ?? params.la,
    meshNodes: params.meshNodes ?? [params.anatomyId],
    labelAnchor: [0, 0, 0],
    boundingBox: {
      min: [-0.1, -0.1, -0.1],
      max: [0.1, 0.1, 0.1],
    },
    source: {
      assetVersion: 'v1',
      referenceIds: ['BP3D-v3.0'],
      fmaIds: params.fmaIds ?? ['FMA10000'],
    },
    review: {
      status: 'pending_review',
      reviewedBy: 'unassigned',
      reviewedAt: null,
    },
  };
}

function createSampleStructures(): StructureMetadata[] {
  return [
    makeStructure({
      anatomyId: 'bone.humerus.left',
      system: 'skeletal',
      laterality: 'left',
      ptBr: 'Úmero',
      la: 'Humerus',
      fmaIds: ['FMA23131'],
    }),
    makeStructure({
      anatomyId: 'bone.humerus.right',
      system: 'skeletal',
      laterality: 'right',
      ptBr: 'Úmero',
      la: 'Humerus',
      fmaIds: ['FMA23130'],
    }),
    makeStructure({
      anatomyId: 'bone.scapula.left',
      system: 'skeletal',
      laterality: 'left',
      ptBr: 'Escápula',
      la: 'Scapula',
      fmaIds: ['FMA13396'],
    }),
    makeStructure({
      anatomyId: 'bone.scapula.right',
      system: 'skeletal',
      laterality: 'right',
      ptBr: 'Escápula',
      la: 'Scapula',
      fmaIds: ['FMA13395'],
    }),
    makeStructure({
      anatomyId: 'bone.clavicula.left',
      system: 'skeletal',
      laterality: 'left',
      ptBr: 'Clavícula',
      la: 'Clavicula',
      fmaIds: ['FMA13323'],
    }),
    makeStructure({
      anatomyId: 'bone.clavicula.right',
      system: 'skeletal',
      laterality: 'right',
      ptBr: 'Clavícula',
      la: 'Clavicula',
      fmaIds: ['FMA13322'],
    }),
    makeStructure({
      anatomyId: 'bone.radius.right',
      system: 'skeletal',
      laterality: 'right',
      ptBr: 'Rádio',
      la: 'Radius',
      fmaIds: ['FMA23464'],
    }),
    makeStructure({
      anatomyId: 'bone.sternum.midline',
      system: 'skeletal',
      laterality: 'midline',
      ptBr: 'Esterno',
      la: 'Sternum',
      fmaIds: ['FMA7485'],
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
      anatomyId: 'muscle.biceps_brachii.right',
      system: 'muscular',
      laterality: 'right',
      ptBr: 'Músculo bíceps braquial',
      la: 'Musculus biceps brachii',
      meshNodes: [
        'muscle.biceps_brachii.right.short_head',
        'muscle.biceps_brachii.right.long_head',
      ],
      fmaIds: ['FMA37684', 'FMA37686'],
    }),
    makeStructure({
      anatomyId: 'muscle.deltoideus.left',
      system: 'muscular',
      laterality: 'left',
      ptBr: 'Músculo deltoide',
      la: 'Musculus deltoideus',
      meshNodes: [
        'muscle.deltoideus.left.clavicular',
        'muscle.deltoideus.left.acromial',
        'muscle.deltoideus.left.spinal',
      ],
      fmaIds: ['FMA34681', 'FMA34683', 'FMA34685'],
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
    makeStructure({
      anatomyId: 'muscle.brachialis.right',
      system: 'muscular',
      laterality: 'right',
      ptBr: 'Músculo braquial',
      la: 'Musculus brachialis',
      fmaIds: ['FMA37692'],
    }),
    makeStructure({
      anatomyId: 'muscle.triceps_brachii.right',
      system: 'muscular',
      laterality: 'right',
      ptBr: 'Músculo tríceps braquial',
      la: 'Musculus triceps brachii',
      meshNodes: [
        'muscle.triceps_brachii.right.long_head',
        'muscle.triceps_brachii.right.lateral_head',
        'muscle.triceps_brachii.right.medial_head',
      ],
      fmaIds: ['FMA37714', 'FMA37716', 'FMA37718'],
    }),
    makeStructure({
      anatomyId: 'muscle.brachioradialis.right',
      system: 'muscular',
      laterality: 'right',
      ptBr: 'Músculo braquiorradial',
      la: 'Musculus brachioradialis',
      fmaIds: ['FMA38485'],
    }),
  ];
}

describe('normalizeSearchText', () => {
  it('remove acentos/diacríticos, normaliza para minúsculas e colapsa espaços extras', () => {
    expect(normalizeSearchText('  Úmero  ')).toBe('umero');
    expect(normalizeSearchText('Escápula')).toBe('escapula');
    expect(normalizeSearchText('CLAVÍCULA')).toBe('clavicula');
    expect(normalizeSearchText('  Músculo   BÍCEPS\tBraquial \n ')).toBe(
      'musculo biceps braquial',
    );
    expect(normalizeSearchText('Ação / Cabeça')).toBe('acao / cabeca');
    expect(normalizeSearchText('   \t\n  ')).toBe('');
  });
});

describe('AnatomyRegistry — índices O(1), contagens e integridade', () => {
  it('indexa byAnatomyId e byMeshNode incluindo estruturas multi-nó', () => {
    const registry = new AnatomyRegistry(createSampleStructures());

    expect(registry.size).toBe(15);
    expect(registry.hasAnatomyId('muscle.biceps_brachii.left')).toBe(true);
    expect(registry.hasAnatomyId('bone.inexistente.left')).toBe(false);

    expect(registry.byAnatomyId.get('bone.clavicula.right')?.displayName['pt-BR']).toBe(
      'Clavícula',
    );
    expect(registry.getById('bone.clavicula.right')?.displayName.la).toBe(
      'Clavicula',
    );
    expect(registry.getById('bone.inexistente.left')).toBeUndefined();

    expect(
      registry.byMeshNode.get('muscle.biceps_brachii.left.short_head'),
    ).toBe('muscle.biceps_brachii.left');
    expect(
      registry.getByMeshNode('muscle.biceps_brachii.left.long_head'),
    ).toBe('muscle.biceps_brachii.left');
    expect(registry.hasMeshNode('muscle.deltoideus.right.acromial')).toBe(true);
    expect(registry.hasMeshNode('muscle.deltoideus.right.unknown')).toBe(false);

    const resolvedStructure = registry.getStructureByMeshNode(
      'muscle.deltoideus.right.spinal',
    );
    expect(resolvedStructure?.anatomyId).toBe('muscle.deltoideus.right');
    expect(registry.getStructureByMeshNode('mesh.inexistente')).toBeUndefined();
  });

  it('rejeita anatomyId duplicado ou meshNode duplicado no construtor', () => {
    const base = createSampleStructures();

    const duplicateIdList = [
      ...base,
      makeStructure({
        anatomyId: 'bone.clavicula.right',
        system: 'skeletal',
        laterality: 'right',
        ptBr: 'Clavícula duplicada',
        la: 'Clavicula',
        meshNodes: ['bone.clavicula.right.extra'],
      }),
    ];
    expect(() => new AnatomyRegistry(duplicateIdList)).toThrow(
      /anatomyId duplicado/,
    );

    const duplicateNodeAcrossStructures = [
      ...base,
      makeStructure({
        anatomyId: 'muscle.coracobrachialis.left',
        system: 'muscular',
        laterality: 'left',
        ptBr: 'Músculo coracobraquial',
        la: 'Musculus coracobrachialis',
        meshNodes: ['muscle.biceps_brachii.left.short_head'],
      }),
    ];
    expect(() => new AnatomyRegistry(duplicateNodeAcrossStructures)).toThrow(
      /meshNode duplicado/,
    );

    const duplicateNodeInSameStructure = [
      makeStructure({
        anatomyId: 'muscle.biceps_brachii.left',
        system: 'muscular',
        laterality: 'left',
        ptBr: 'Músculo bíceps braquial',
        la: 'Musculus biceps brachii',
        meshNodes: [
          'muscle.biceps_brachii.left.short_head',
          'muscle.biceps_brachii.left.short_head',
        ],
      }),
    ];
    expect(() => new AnatomyRegistry(duplicateNodeInSameStructure)).toThrow(
      /meshNode duplicado/,
    );
  });

  it('retorna contagens exatas por sistema e metadados de versão via createAnatomyRegistry', () => {
    const doc: MetadataDocument = {
      schemaVersion: '1.0.0',
      assetVersion: 'v1',
      metadataVersion: 'v1',
      terminologyReference: 'Terminologia Anatomica (TA2)',
      generatedAt: '2026-11-20T00:00:00Z',
      structures: createSampleStructures(),
    };

    const registry = createAnatomyRegistry(doc);
    expect(registry.version).toEqual({
      assetVersion: 'v1',
      metadataVersion: 'v1',
      terminologyReference: 'Terminologia Anatomica (TA2)',
    });
    expect(registry.getCountBySystem()).toEqual({
      all: 15,
      skeletal: 8,
      muscular: 7,
    });

    const empty = createEmptyAnatomyRegistry();
    expect(empty.size).toBe(0);
    expect(empty.getCountBySystem()).toEqual({
      all: 0,
      skeletal: 0,
      muscular: 0,
    });
    expect(empty.search('clavicula')).toEqual([]);
  });
});

describe('AnatomyRegistry — busca textual PT-BR, Latim, lateralidade, filtros e ordenação', () => {
  const registry = new AnatomyRegistry(createSampleStructures());

  it('encontra estruturas em PT-BR sem acentos (umero, escapula, clavicula, biceps)', () => {
    expect(registry.search('umero').map((s) => s.anatomyId)).toEqual([
      'bone.humerus.right',
      'bone.humerus.left',
    ]);
    expect(registry.search('escapula').map((s) => s.anatomyId)).toEqual([
      'bone.scapula.right',
      'bone.scapula.left',
    ]);
    expect(registry.search('clavicula').map((s) => s.anatomyId)).toEqual([
      'bone.clavicula.right',
      'bone.clavicula.left',
    ]);
    expect(registry.search('biceps').map((s) => s.anatomyId)).toEqual([
      'muscle.biceps_brachii.right',
      'muscle.biceps_brachii.left',
    ]);
  });

  it('encontra estruturas por nome em Latim (Musculus deltoideus, Clavicula, Humerus)', () => {
    expect(
      registry.search('Musculus deltoideus').map((s) => s.anatomyId),
    ).toEqual(['muscle.deltoideus.right', 'muscle.deltoideus.left']);

    expect(registry.search('Clavicula').map((s) => s.anatomyId)).toEqual([
      'bone.clavicula.right',
      'bone.clavicula.left',
    ]);

    expect(registry.search('Humerus').map((s) => s.anatomyId)).toEqual([
      'bone.humerus.right',
      'bone.humerus.left',
    ]);
  });

  it('suporta busca multi-termo combinada com lateralidade em PT-BR e inglês', () => {
    expect(registry.search('biceps esquerdo').map((s) => s.anatomyId)).toEqual([
      'muscle.biceps_brachii.left',
    ]);

    expect(registry.search('esquerdo biceps').map((s) => s.anatomyId)).toEqual([
      'muscle.biceps_brachii.left',
    ]);

    expect(
      registry.search('clavicula direita').map((s) => s.anatomyId),
    ).toEqual(['bone.clavicula.right']);

    expect(registry.search('deltoide left').map((s) => s.anatomyId)).toEqual([
      'muscle.deltoideus.left',
    ]);

    expect(
      registry.search('esterno linha média').map((s) => s.anatomyId),
    ).toEqual(['bone.sternum.midline']);
  });

  it('aplica filtro por sistema (muscular, skeletal, all) em consultas vazias e preenchidas', () => {
    expect(registry.search('', 'muscular')).toHaveLength(7);
    expect(registry.search('   ', 'skeletal')).toHaveLength(8);
    expect(registry.search('', 'all')).toHaveLength(15);

    expect(
      registry.search('braquial', 'muscular').every((s) => s.system === 'muscular'),
    ).toBe(true);
    expect(registry.search('braquial', 'skeletal')).toEqual([]);

    const rightBones = registry.search('direito', 'skeletal');
    expect(rightBones.length).toBeGreaterThan(0);
    expect(
      rightBones.every((s) => s.system === 'skeletal' && s.laterality === 'right'),
    ).toBe(true);

    expect(registry.search('termo_sem_correspondencia')).toEqual([]);
  });

  it('ordena deterministicamente: início PT-BR > substring PT-BR > Latim, independente da ordem de entrada', () => {
    const rankFixture: StructureMetadata[] = [
      // Correspondência apenas por substring em Latim (rank 30)
      makeStructure({
        anatomyId: 'bone.os_latin_sub.right',
        system: 'skeletal',
        laterality: 'right',
        ptBr: 'Osso exemplo alfa',
        la: 'Os radiatus',
      }),
      // Correspondência no início do Latim (rank 20)
      makeStructure({
        anatomyId: 'bone.os_latin_start.right',
        system: 'skeletal',
        laterality: 'right',
        ptBr: 'Osso exemplo beta',
        la: 'Radialia profunda',
      }),
      // Substring no nome PT-BR (rank 11)
      makeStructure({
        anatomyId: 'muscle.brachioradialis.right',
        system: 'muscular',
        laterality: 'right',
        ptBr: 'Músculo braquiorradial',
        la: 'Musculus brachioradialis',
      }),
      // Início exato do nome PT-BR (rank 0)
      makeStructure({
        anatomyId: 'bone.radius.right',
        system: 'skeletal',
        laterality: 'right',
        ptBr: 'Rádio',
        la: 'Radius',
      }),
    ];

    const forwardRegistry = new AnatomyRegistry(rankFixture);
    const reversedRegistry = new AnatomyRegistry([...rankFixture].reverse());

    const expectedOrder = [
      'bone.radius.right',
      'muscle.brachioradialis.right',
      'bone.os_latin_start.right',
      'bone.os_latin_sub.right',
    ];

    expect(forwardRegistry.search('rad').map((s) => s.anatomyId)).toEqual(
      expectedOrder,
    );
    expect(reversedRegistry.search('rad').map((s) => s.anatomyId)).toEqual(
      expectedOrder,
    );

    // Dentro de substring PT-BR, "Músculo braquial" (início após prefixo "Músculo ") precede "bíceps braquial" e "tríceps braquial"
    expect(registry.search('braquial').map((s) => s.anatomyId)).toEqual([
      'muscle.brachialis.right',
      'muscle.biceps_brachii.right',
      'muscle.biceps_brachii.left',
      'muscle.triceps_brachii.right',
    ]);
  });
});
