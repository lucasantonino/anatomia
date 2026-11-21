import { describe, expect, it } from 'vitest';
import { resolveNetworkAssetUrl } from '../../src/scene/AssetLoader';
import {
  ANATOMY_ID_REGEX,
  AnatomyIdSchema,
  AnatomyRegionSchema,
  BoundingBoxSchema,
  CoverageMatrixSchema,
  LABEL_ANCHOR_BBOX_TOLERANCE_METERS,
  ManifestSchema,
  MetadataDocumentSchema,
  SafeAssetUrlSchema,
  StructureMetadataSchema,
  isPointWithinBoundingBox,
  isSafeAssetUrl,
  isValidIsoDate,
  type AnatomyRegion,
  type BoundingBox,
  type CoverageMatrix,
  type Manifest,
  type MetadataDocument,
  type StructureMetadata,
} from '../../src/core/schema/anatomy';

const VALID_SHA256_SKELETAL =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const VALID_SHA256_MUSCULAR =
  'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

function createValidManifest(): Manifest {
  return {
    schemaVersion: '1.0.0',
    assetVersion: 'v1',
    metadataVersion: 'v1',
    coverageMatrixVersion: 'v1',
    coordinateSystem: 'gltf-y-up-meters-anterior-pos-z',
    sceneOriginOffset: [0, -1.12, 0.08],
    metadataUrl: '/assets/v1/metadata-v1.json',
    coverageMatrixUrl: '/assets/v1/coverage-matrix.json',
    systems: {
      skeletal: {
        url: '/assets/v1/skeletal-v1.glb',
        sha256: VALID_SHA256_SKELETAL,
        bytes: 412_000,
        triangles: 34_000,
        meshCount: 10,
      },
      muscular: {
        url: '/assets/v1/muscular-v1.glb',
        sha256: VALID_SHA256_MUSCULAR,
        bytes: 980_000,
        triangles: 62_000,
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

function createValidMuscleStructure(): StructureMetadata {
  return {
    anatomyId: 'muscle.biceps_brachii.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: {
      'pt-BR': 'Músculo bíceps braquial',
      la: 'Musculus biceps brachii',
    },
    scientificName: 'Musculus biceps brachii',
    meshNodes: [
      'muscle.biceps_brachii.left.short_head',
      'muscle.biceps_brachii.left.long_head',
    ],
    labelAnchor: [0.215, 0.042, 0.038],
    boundingBox: {
      min: [0.16, -0.11, -0.02],
      max: [0.26, 0.19, 0.07],
    },
    source: {
      assetVersion: 'v1',
      referenceIds: ['BP3D-v3.0'],
      fmaIds: ['FMA37685', 'FMA37687'],
    },
    review: {
      status: 'pending_review',
      reviewedBy: 'unassigned',
      reviewedAt: null,
    },
  };
}

function createValidBoneStructure(): StructureMetadata {
  return {
    anatomyId: 'bone.clavicula.right',
    system: 'skeletal',
    laterality: 'right',
    region: 'upper_limb',
    displayName: {
      'pt-BR': 'Clavícula',
      la: 'Clavicula',
    },
    scientificName: 'Clavicula',
    meshNodes: ['bone.clavicula.right'],
    labelAnchor: [-0.08, 0.22, 0.09],
    focusDirection: [-0.2, 0.35, 0.91],
    boundingBox: {
      min: [-0.15, 0.2, 0.05],
      max: [-0.01, 0.25, 0.14],
    },
    source: {
      assetVersion: 'v1',
      referenceIds: ['BP3D-v3.0'],
      fmaIds: ['FMA13322'],
    },
    review: {
      status: 'pending_review',
      reviewedBy: 'unassigned',
      reviewedAt: null,
    },
  };
}

function createValidMetadataDocument(): MetadataDocument {
  return {
    schemaVersion: '1.0.0',
    assetVersion: 'v1',
    metadataVersion: 'v1',
    terminologyReference: 'Terminologia Anatomica (TA2)',
    generatedAt: '2026-11-20T00:00:00Z',
    structures: [createValidBoneStructure(), createValidMuscleStructure()],
  };
}

function createValidCoverageMatrix(): CoverageMatrix {
  return {
    schemaVersion: '1.0.0',
    assetVersion: 'v1',
    coverageMatrixVersion: 'v1',
    scopeStatement:
      'Fase 1: cintura escapular e membro superior bilateral (22 estruturas anatômicas / 36 malhas).',
    generatedAt: '2026-11-20T00:00:00Z',
    structures: [
      {
        anatomyId: 'bone.clavicula.right',
        system: 'skeletal',
        laterality: 'right',
        presentInAsset: true,
        detailLevel: 'segmentado_por_estrutura_e_subpartes',
        meshNodes: ['bone.clavicula.right'],
        fmaIds: ['FMA13322'],
        reviewStatus: 'pending_review',
      },
      {
        anatomyId: 'muscle.biceps_brachii.left',
        system: 'muscular',
        laterality: 'left',
        presentInAsset: true,
        detailLevel: 'segmentado_por_estrutura_e_subpartes',
        meshNodes: [
          'muscle.biceps_brachii.left.short_head',
          'muscle.biceps_brachii.left.long_head',
        ],
        fmaIds: ['FMA37685', 'FMA37687'],
        reviewStatus: 'pending_review',
      },
    ],
  };
}

describe('ANATOMY_ID_REGEX e AnatomyIdSchema', () => {
  it.each([
    'bone.clavicula.right',
    'bone.clavicula.left',
    'muscle.biceps_brachii.left.short_head',
    'bone.sternum.midline',
    'bone.vertebra_cervical.midline.c3',
    'muscle.deltoideus.right.acromial',
    'muscle.pectoralis_major.left',
  ])('aceita identificador anatômico canônico válido: %s', (id) => {
    expect(ANATOMY_ID_REGEX.test(id)).toBe(true);
    expect(AnatomyIdSchema.safeParse(id).success).toBe(true);
  });

  it.each([
    ['maiúscula no prefixo', 'Bone.clavicula.right'],
    ['maiúscula no nome latino', 'bone.Clavicula.right'],
    ['maiúscula na lateralidade', 'bone.clavicula.RIGHT'],
    ['espaço no nome', 'muscle.biceps brachii.left'],
    ['espaço externo', ' bone.clavicula.right'],
    ['sem lateralidade (bone.vertebra.c3)', 'bone.vertebra.c3'],
    ['apenas 2 segmentos', 'bone.clavicula'],
    ['sistema inválido (organ)', 'organ.heart.midline'],
    ['sistema inválido (skeletal)', 'skeletal.clavicula.right'],
    ['sistema inválido (muscular)', 'muscular.deltoideus.left'],
    ['lateralidade inválida', 'bone.clavicula.center'],
    ['nome latino iniciado por dígito', 'bone.1costa.right'],
    ['parte vazia após ponto final', 'bone.clavicula.right.'],
    ['mais de um nível de parte', 'muscle.biceps_brachii.left.short.head'],
    ['caractere acentuado não-ASCII', 'bone.úmero.right'],
    ['hífen no nome', 'muscle.biceps-brachii.left'],
    ['string vazia', ''],
  ])('rejeita identificador inválido (%s): %s', (_reason, id) => {
    expect(ANATOMY_ID_REGEX.test(id)).toBe(false);
    expect(AnatomyIdSchema.safeParse(id).success).toBe(false);
  });
});

describe('isSafeAssetUrl e SafeAssetUrlSchema', () => {
  it.each([
    '/assets/v1/skeletal-v1.glb',
    '/assets/v1/muscular-v1.glb',
    '/assets/v1/manifest.json',
    '/assets/v1/metadata-v1.json',
    '/assets/v2/upper_limb/model_1.0.glb',
  ])('aceita caminho relativo seguro sob /assets/: %s', (url) => {
    expect(isSafeAssetUrl(url)).toBe(true);
    expect(SafeAssetUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    ['URL externa HTTPS', 'https://evil.com/a.glb'],
    ['URL externa HTTP', 'http://localhost:5173/assets/v1/skeletal-v1.glb'],
    ['travessia de diretório ..', '/assets/../secret'],
    ['travessia profunda ..', '/assets/v1/../../etc/passwd'],
    ['protocol-relative //cdn/x', '//cdn/x'],
    ['barra dupla interna', '/assets//v1/skeletal-v1.glb'],
    ['codificação %2e%2e minúscula', '/assets/v1/%2e%2e/secret.glb'],
    ['codificação %2E%2E maiúscula', '/assets/v1/%2E%2E/secret.glb'],
    ['barra codificada %2f', '/assets/v1/skeletal%2fv1.glb'],
    ['barra invertida codificada %5c', '/assets/v1/skeletal%5cv1.glb'],
    ['barra invertida literal', '/assets/v1\\skeletal-v1.glb'],
    ['caminho UNC com barras invertidas', '\\\\server\\share\\a.glb'],
    ['string vazia', ''],
    ['apenas espaços', '   '],
    ['diretório terminando em barra', '/assets/'],
    ['segmento ponto atual', '/assets/./skeletal-v1.glb'],
    ['sem barra inicial', 'assets/v1/skeletal-v1.glb'],
    ['fora de /assets/', '/public/v1/skeletal-v1.glb'],
    ['query string', '/assets/v1/skeletal-v1.glb?cache=1'],
    ['fragmento hash', '/assets/v1/skeletal-v1.glb#mesh'],
    ['protocolo javascript', 'javascript:alert(1)'],
  ])('rejeita URL insegura (%s): %s', (_reason, url) => {
    expect(isSafeAssetUrl(url)).toBe(false);
    expect(SafeAssetUrlSchema.safeParse(url).success).toBe(false);
  });
});

describe('isValidIsoDate', () => {
  it('aceita datas civis válidas incluindo ano bissexto', () => {
    expect(isValidIsoDate('2026-11-20')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2000-01-01')).toBe(true);
  });

  it.each([
    '2026-02-30',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-5',
    '2026-11-20T00:00:00Z',
    '20/11/2026',
    '',
  ])('rejeita data inválida: %s', (value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe('ManifestSchema', () => {
  it('aceita manifesto completo válido', () => {
    const manifest = createValidManifest();
    const parsed = ManifestSchema.safeParse(manifest);
    expect(parsed.success).toBe(true);
  });

  it('rejeita sha256 curto, longo, maiúsculo ou não-hexadecimal', () => {
    const invalidHashes = [
      VALID_SHA256_SKELETAL.slice(0, 63),
      `${VALID_SHA256_SKELETAL}0`,
      VALID_SHA256_SKELETAL.toUpperCase(),
      `g${VALID_SHA256_SKELETAL.slice(1)}`,
    ];

    for (const sha256 of invalidHashes) {
      const manifest = createValidManifest();
      manifest.systems.skeletal.sha256 = sha256;
      expect(ManifestSchema.safeParse(manifest).success).toBe(false);
    }
  });

  it('rejeita coordinateSystem incorreto', () => {
    const manifest = {
      ...createValidManifest(),
      coordinateSystem: 'bodyparts3d-z-up-mm',
    };
    expect(ManifestSchema.safeParse(manifest).success).toBe(false);
  });

  it('rejeita bytes <= 0, bytes decimal, triangles <= 0 e meshCount <= 0', () => {
    for (const invalidBytes of [0, -1, 123.45]) {
      const manifest = createValidManifest();
      manifest.systems.skeletal.bytes = invalidBytes;
      expect(ManifestSchema.safeParse(manifest).success).toBe(false);
    }

    const zeroTriangles = createValidManifest();
    zeroTriangles.systems.muscular.triangles = 0;
    expect(ManifestSchema.safeParse(zeroTriangles).success).toBe(false);

    const zeroMeshes = createValidManifest();
    zeroMeshes.systems.muscular.meshCount = 0;
    expect(ManifestSchema.safeParse(zeroMeshes).success).toBe(false);
  });

  it('rejeita URLs inseguras, SemVer inválido, sceneOriginOffset não finito e licenseUrl inválida', () => {
    const badMetaUrl = createValidManifest();
    badMetaUrl.metadataUrl = 'https://evil.com/metadata.json';
    expect(ManifestSchema.safeParse(badMetaUrl).success).toBe(false);

    const badGlbUrl = createValidManifest();
    badGlbUrl.systems.muscular.url = '/assets/../muscular.glb';
    expect(ManifestSchema.safeParse(badGlbUrl).success).toBe(false);

    const badSemver = createValidManifest();
    badSemver.schemaVersion = '1.0';
    expect(ManifestSchema.safeParse(badSemver).success).toBe(false);

    const badOffset = createValidManifest();
    badOffset.sceneOriginOffset = [0, Number.NaN, 0];
    expect(ManifestSchema.safeParse(badOffset).success).toBe(false);

    const badLicenseUrl = createValidManifest();
    badLicenseUrl.license.licenseUrl = 'javascript:alert(1)';
    expect(ManifestSchema.safeParse(badLicenseUrl).success).toBe(false);
  });
});

describe('AnatomyRegionSchema', () => {
  it.each<AnatomyRegion>(['head_neck', 'trunk', 'upper_limb', 'lower_limb'])(
    'aceita região anatômica canônica válida: %s',
    (region) => {
      expect(AnatomyRegionSchema.safeParse(region).success).toBe(true);
    },
  );

  it.each([
    'head',
    'neck',
    'thorax',
    'abdomen',
    'pelvis',
    'arm',
    'leg',
    'UPPER_LIMB',
    'lower-limb',
    'full_body',
    '',
  ])('rejeita região anatômica inválida: %s', (region) => {
    expect(AnatomyRegionSchema.safeParse(region).success).toBe(false);
  });
});

describe('StructureMetadataSchema e MetadataDocumentSchema', () => {
  it.each<AnatomyRegion>(['head_neck', 'trunk', 'upper_limb', 'lower_limb'])(
    'aceita StructureMetadata com região canônica válida: %s',
    (region) => {
      const structure: StructureMetadata = {
        ...createValidBoneStructure(),
        region,
      };
      expect(StructureMetadataSchema.safeParse(structure).success).toBe(true);
    },
  );

  it('rejeita StructureMetadata com região fora do enum canônico', () => {
    const invalidRegion = {
      ...createValidBoneStructure(),
      region: 'thorax',
    };
    expect(StructureMetadataSchema.safeParse(invalidRegion).success).toBe(false);

    const emptyRegion = {
      ...createValidMuscleStructure(),
      region: '',
    };
    expect(StructureMetadataSchema.safeParse(emptyRegion).success).toBe(false);
  });

  it('aceita estrutura pending_review com reviewedAt null, reviewedBy unassigned, focusDirection opcional e campos P1 opcionais', () => {
    const structure: StructureMetadata = {
      ...createValidMuscleStructure(),
      focusDirection: [0.3, 0.1, 0.95],
      description: {
        'pt-BR': 'Músculo flexor do compartimento anterior do braço.',
      },
      origin: {
        'pt-BR': 'Tubérculo supraglenoidal e processo coracoide da escápula.',
      },
      insertion: {
        'pt-BR': 'Tuberosidade do rádio e aponeurose bicipital.',
      },
      action: {
        'pt-BR': 'Flexão do cotovelo e supinação do antebraço.',
      },
    };

    const result = StructureMetadataSchema.safeParse(structure);
    expect(result.success).toBe(true);
  });

  it('aceita estrutura sem focusDirection nem campos P1 opcionais', () => {
    const structure = createValidMuscleStructure();
    expect(structure.focusDirection).toBeUndefined();
    expect(StructureMetadataSchema.safeParse(structure).success).toBe(true);
  });

  it('rejeita focusDirection nulo [0, 0, 0]', () => {
    const structure: StructureMetadata = {
      ...createValidBoneStructure(),
      focusDirection: [0, 0, 0],
    };
    expect(StructureMetadataSchema.safeParse(structure).success).toBe(false);
  });

  it('aceita estrutura approved com revisor nominal e data civil válida', () => {
    const structure: StructureMetadata = {
      ...createValidBoneStructure(),
      review: {
        status: 'approved',
        reviewedBy: 'Dra. Helena Costa',
        reviewedAt: '2026-11-20',
      },
    };
    expect(StructureMetadataSchema.safeParse(structure).success).toBe(true);
  });

  it('rejeita status approved com reviewedBy unassigned, reviewedAt null ou data inválida (2026-02-30)', () => {
    const unassignedApproved: StructureMetadata = {
      ...createValidBoneStructure(),
      review: {
        status: 'approved',
        reviewedBy: 'unassigned',
        reviewedAt: '2026-11-20',
      },
    };
    expect(StructureMetadataSchema.safeParse(unassignedApproved).success).toBe(false);

    const unassignedWithSpaces: StructureMetadata = {
      ...createValidBoneStructure(),
      review: {
        status: 'approved',
        reviewedBy: '  unassigned  ',
        reviewedAt: '2026-11-20',
      },
    };
    expect(StructureMetadataSchema.safeParse(unassignedWithSpaces).success).toBe(false);

    const nullDateApproved: StructureMetadata = {
      ...createValidBoneStructure(),
      review: {
        status: 'approved',
        reviewedBy: 'Dr. Anatomista',
        reviewedAt: null,
      },
    };
    expect(StructureMetadataSchema.safeParse(nullDateApproved).success).toBe(false);

    const invalidDateApproved: StructureMetadata = {
      ...createValidBoneStructure(),
      review: {
        status: 'approved',
        reviewedBy: 'Dr. Anatomista',
        reviewedAt: '2026-02-30',
      },
    };
    expect(StructureMetadataSchema.safeParse(invalidDateApproved).success).toBe(false);

    const invalidDatePending: StructureMetadata = {
      ...createValidBoneStructure(),
      review: {
        status: 'pending_review',
        reviewedBy: 'unassigned',
        reviewedAt: '2026-02-30',
      },
    };
    expect(StructureMetadataSchema.safeParse(invalidDatePending).success).toBe(false);
  });

  it('rejeita inconsistência entre prefixo bone./muscle. e system', () => {
    const boneMarkedMuscular: StructureMetadata = {
      ...createValidBoneStructure(),
      system: 'muscular',
    };
    expect(StructureMetadataSchema.safeParse(boneMarkedMuscular).success).toBe(false);

    const muscleMarkedSkeletal: StructureMetadata = {
      ...createValidMuscleStructure(),
      system: 'skeletal',
    };
    expect(StructureMetadataSchema.safeParse(muscleMarkedSkeletal).success).toBe(false);
  });

  it('rejeita inconsistência entre lateralidade do anatomyId e campo laterality', () => {
    const wrongLaterality: StructureMetadata = {
      ...createValidBoneStructure(),
      anatomyId: 'bone.clavicula.right',
      laterality: 'left',
    };
    expect(StructureMetadataSchema.safeParse(wrongLaterality).success).toBe(false);

    const midlineMismatch: StructureMetadata = {
      ...createValidBoneStructure(),
      anatomyId: 'bone.sternum.midline',
      meshNodes: ['bone.sternum.midline'],
      laterality: 'right',
    };
    expect(StructureMetadataSchema.safeParse(midlineMismatch).success).toBe(false);
  });

  it('rejeita boundingBox com min > max em qualquer eixo e aceita min === max', () => {
    expect(
      BoundingBoxSchema.safeParse({ min: [0, 0, 0], max: [0, 0, 0] }).success,
    ).toBe(true);

    const badX = createValidBoneStructure();
    badX.boundingBox = { min: [0.2, 0, 0], max: [0.1, 1, 1] };
    expect(StructureMetadataSchema.safeParse(badX).success).toBe(false);

    const badY = createValidBoneStructure();
    badY.boundingBox = { min: [0, 0.5, 0], max: [1, 0.4, 1] };
    expect(StructureMetadataSchema.safeParse(badY).success).toBe(false);

    const badZ = createValidBoneStructure();
    badZ.boundingBox = { min: [0, 0, 0.9], max: [1, 1, 0.8] };
    expect(StructureMetadataSchema.safeParse(badZ).success).toBe(false);
  });

  it('rejeita meshNodes duplicados na mesma estrutura, fmaIds inválidos ou arrays vazios', () => {
    const dupNodeInSameStructure = createValidMuscleStructure();
    dupNodeInSameStructure.meshNodes = [
      'muscle.biceps_brachii.left.short_head',
      'muscle.biceps_brachii.left.short_head',
    ];
    expect(StructureMetadataSchema.safeParse(dupNodeInSameStructure).success).toBe(
      false,
    );

    const badFma = createValidBoneStructure();
    badFma.source.fmaIds = ['13322'];
    expect(StructureMetadataSchema.safeParse(badFma).success).toBe(false);

    const emptyNodes = createValidBoneStructure();
    emptyNodes.meshNodes = [];
    expect(StructureMetadataSchema.safeParse(emptyNodes).success).toBe(false);
  });

  it('aceita MetadataDocument válido e rejeita anatomyId duplicado ou meshNode duplicado entre estruturas', () => {
    const validDoc = createValidMetadataDocument();
    expect(MetadataDocumentSchema.safeParse(validDoc).success).toBe(true);

    const dupIdDoc = createValidMetadataDocument();
    dupIdDoc.structures.push({
      ...createValidBoneStructure(),
      meshNodes: ['bone.clavicula.right.lateral'],
    });
    const dupIdResult = MetadataDocumentSchema.safeParse(dupIdDoc);
    expect(dupIdResult.success).toBe(false);

    const dupMeshNodeAcrossDoc = createValidMetadataDocument();
    dupMeshNodeAcrossDoc.structures.push({
      ...createValidMuscleStructure(),
      anatomyId: 'muscle.brachialis.left',
      displayName: { 'pt-BR': 'Músculo braquial', la: 'Musculus brachialis' },
      scientificName: 'Musculus brachialis',
      meshNodes: ['muscle.biceps_brachii.left.short_head'],
    });
    const dupNodeResult = MetadataDocumentSchema.safeParse(dupMeshNodeAcrossDoc);
    expect(dupNodeResult.success).toBe(false);
  });

  it('rejeita MetadataDocument com generatedAt inválido ou lista de estruturas vazia', () => {
    const badDate = createValidMetadataDocument();
    badDate.generatedAt = '2026-11-20';
    expect(MetadataDocumentSchema.safeParse(badDate).success).toBe(false);

    const emptyStructures = createValidMetadataDocument();
    emptyStructures.structures = [];
    expect(MetadataDocumentSchema.safeParse(emptyStructures).success).toBe(false);
  });
});

describe('CoverageMatrixSchema', () => {
  it('aceita matriz de cobertura válida, incluindo estrutura ausente com meshNodes vazio', () => {
    const matrix = createValidCoverageMatrix();
    matrix.structures.push({
      anatomyId: 'bone.sternum.midline',
      system: 'skeletal',
      laterality: 'midline',
      presentInAsset: false,
      detailLevel: 'planejado_fase_2',
      meshNodes: [],
      fmaIds: ['FMA7485'],
      reviewStatus: 'pending_review',
    });

    expect(CoverageMatrixSchema.safeParse(matrix).success).toBe(true);
  });

  it('aceita CoverageStructure com region opcional (omitido ou válido) e rejeita region inválido', () => {
    const withRegion = createValidCoverageMatrix();
    withRegion.structures[0]!.region = 'upper_limb';
    withRegion.structures.push({
      anatomyId: 'bone.femur.right',
      system: 'skeletal',
      laterality: 'right',
      region: 'lower_limb',
      presentInAsset: true,
      detailLevel: 'segmentado_por_estrutura_e_subpartes',
      meshNodes: ['bone.femur.right'],
      fmaIds: ['FMA9611'],
      reviewStatus: 'pending_review',
    });
    expect(CoverageMatrixSchema.safeParse(withRegion).success).toBe(true);

    // Sem region (compatibilidade v1)
    const withoutRegion = createValidCoverageMatrix();
    expect(withoutRegion.structures[0]?.region).toBeUndefined();
    expect(CoverageMatrixSchema.safeParse(withoutRegion).success).toBe(true);

    // Com region inválido
    const badRegionMatrix = {
      ...createValidCoverageMatrix(),
      structures: [
        {
          ...createValidCoverageMatrix().structures[0]!,
          region: 'pelvis',
        },
      ],
    };
    expect(CoverageMatrixSchema.safeParse(badRegionMatrix).success).toBe(false);
  });

  it('rejeita estrutura com presentInAsset=true e meshNodes vazio', () => {
    const matrix = createValidCoverageMatrix();
    const first = matrix.structures[0];
    if (!first) {
      throw new Error('Fixture inválida');
    }
    first.meshNodes = [];
    expect(CoverageMatrixSchema.safeParse(matrix).success).toBe(false);
  });

  it('rejeita anatomyId duplicado, meshNodes duplicados e inconsistência de sistema/lateralidade na matriz', () => {
    const dupIdMatrix = createValidCoverageMatrix();
    dupIdMatrix.structures.push({
      ...createValidCoverageMatrix().structures[0]!,
    });
    expect(CoverageMatrixSchema.safeParse(dupIdMatrix).success).toBe(false);

    const dupNodesMatrix = createValidCoverageMatrix();
    dupNodesMatrix.structures[1]!.meshNodes = [
      'muscle.biceps_brachii.left.short_head',
      'muscle.biceps_brachii.left.short_head',
    ];
    expect(CoverageMatrixSchema.safeParse(dupNodesMatrix).success).toBe(false);

    const mismatchedSystemMatrix = createValidCoverageMatrix();
    mismatchedSystemMatrix.structures[0]!.system = 'muscular';
    expect(CoverageMatrixSchema.safeParse(mismatchedSystemMatrix).success).toBe(
      false,
    );
  });
});

describe('isPointWithinBoundingBox', () => {
  const unitBox: BoundingBox = {
    min: [0, 0, 0],
    max: [1, 2, 3],
  };

  it('utiliza tolerância padrão de 5 mm (0.005 m)', () => {
    expect(LABEL_ANCHOR_BBOX_TOLERANCE_METERS).toBe(0.005);
  });

  it('retorna true para pontos estritamente internos e sobre as faces', () => {
    expect(isPointWithinBoundingBox([0.5, 1.0, 1.5], unitBox)).toBe(true);
    expect(isPointWithinBoundingBox([0, 0, 0], unitBox)).toBe(true);
    expect(isPointWithinBoundingBox([1, 2, 3], unitBox)).toBe(true);
  });

  it('retorna true para pontos exatamente no limite da tolerância de 5 mm', () => {
    expect(isPointWithinBoundingBox([-0.005, 0, 0], unitBox)).toBe(true);
    expect(isPointWithinBoundingBox([1.005, 2.005, 3.005], unitBox)).toBe(true);
    expect(isPointWithinBoundingBox([0, -0.005, -0.005], unitBox)).toBe(true);
  });

  it('retorna false quando qualquer eixo excede a tolerância de 5 mm', () => {
    expect(isPointWithinBoundingBox([1.0051, 1, 1], unitBox)).toBe(false);
    expect(isPointWithinBoundingBox([-0.0051, 1, 1], unitBox)).toBe(false);
    expect(isPointWithinBoundingBox([0.5, 2.006, 1], unitBox)).toBe(false);
    expect(isPointWithinBoundingBox([0.5, -0.006, 1], unitBox)).toBe(false);
    expect(isPointWithinBoundingBox([0.5, 1, 3.006], unitBox)).toBe(false);
    expect(isPointWithinBoundingBox([0.5, 1, -0.006], unitBox)).toBe(false);
  });

  it('respeita tolerância customizada informada pelo chamador', () => {
    expect(isPointWithinBoundingBox([1.001, 1, 1], unitBox, 0)).toBe(false);
    expect(isPointWithinBoundingBox([1.015, 1, 1], unitBox, 0.02)).toBe(true);
    expect(isPointWithinBoundingBox([1.021, 1, 1], unitBox, 0.02)).toBe(false);
  });
});

describe('resolveNetworkAssetUrl', () => {
  it('preserva URLs completas ou especiais (http, https, blob, data)', () => {
    expect(resolveNetworkAssetUrl('https://example.com/asset.glb')).toBe('https://example.com/asset.glb');
    expect(resolveNetworkAssetUrl('blob:http://localhost/123')).toBe('blob:http://localhost/123');
    expect(resolveNetworkAssetUrl('data:application/json,{}')).toBe('data:application/json,{}');
  });

  it('resolve caminho padrão quando baseUrl for "/"', () => {
    expect(resolveNetworkAssetUrl('/assets/v1/manifest.json', '/')).toBe('/assets/v1/manifest.json');
  });

  it('adiciona prefixo do subdiretório (ex: GitHub Pages "/anatomia/")', () => {
    expect(resolveNetworkAssetUrl('/assets/v1/manifest.json', '/anatomia/')).toBe(
      '/anatomia/assets/v1/manifest.json',
    );
    expect(resolveNetworkAssetUrl('/assets/v1/skeletal-v1.glb', '/anatomia')).toBe(
      '/anatomia/assets/v1/skeletal-v1.glb',
    );
  });

  it('converte para caminho relativo quando baseUrl for "./" ou vazio', () => {
    expect(resolveNetworkAssetUrl('/assets/v1/manifest.json', './')).toBe('assets/v1/manifest.json');
    expect(resolveNetworkAssetUrl('/assets/v1/manifest.json', '')).toBe('assets/v1/manifest.json');
    expect(resolveNetworkAssetUrl('assets/v1/manifest.json', './')).toBe('assets/v1/manifest.json');
  });
});
