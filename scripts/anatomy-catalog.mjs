/**
 * Catálogo canônico da Fase 1 (v1) — Cintura escapular e membro superior bilateral.
 * 22 estruturas anatômicas (10 ossos, 12 músculos) mapeadas para 36 STLs reais
 * do BodyParts3D v3.0 (DBCLS, CC BY-SA 2.1 JP).
 *
 * Parâmetros geométricos calibrados em T-02 (auditoria anatômica pré-build):
 * - Convenção clavícula: bone.clavicula.right / bone.clavicula.left (latim TA2 estrito)
 * - targetTriangles por malha somando ~94.200 triângulos (abaixo do alvo de 100.000)
 * - anchorDirection / yBias / focusDirection em coordenadas glTF (+X = esq. anat., +Y = superior, +Z = anterior)
 */

export const SCHEMA_VERSION = '1.0.0';
export const ASSET_VERSION = 'v1';
export const METADATA_VERSION = 'v1';
export const COVERAGE_MATRIX_VERSION = 'v1';
export const COORDINATE_SYSTEM = 'gltf-y-up-meters-anterior-pos-z';
export const TERMINOLOGY_REFERENCE = 'Terminologia Anatomica (TA2)';

export const BODYPARTS3D_BASE_URL =
  'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl';

export const SCOPE_STATEMENT =
  'Esta versão (v1) contempla um recorte regional selecionado dos principais ossos (cíngulo do membro superior, braço e antebraço — sem ossos da mão) e principais músculos da cintura escapular e do membro superior bilateral (22 estruturas anatômicas: 10 ossos e 12 músculos, compostas por 36 malhas STL reais do BodyParts3D v3.0). Não cobre ossos da mão, manguito rotador, cabeça, coluna vertebral, caixa torácica óssea, abdome ou membros inferiores; a cobertura completa do corpo humano pertence à Fase 2.';

export const LICENSE_INFO = {
  sourceName: 'BodyParts3D v3.0 (DBCLS)',
  spdxOrIdentifier: 'CC-BY-SA-2.1-JP',
  attributionText:
    'BodyParts3D, Copyright 2008 Life Science Integrated Database Center licensed by CC Attribution-ShareAlike 2.1 Japan.',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en',
};

export const DETAIL_LEVEL = 'segmentado_por_estrutura_e_subpartes';

/**
 * @typedef {Object} AnatomyPartSpec
 * @property {string} nodeName
 * @property {string} fmaId
 * @property {number} targetTriangles
 * @property {number} expectedBytes
 */

/**
 * @typedef {Object} AnatomyStructureSpec
 * @property {string} anatomyId
 * @property {'skeletal' | 'muscular'} system
 * @property {'left' | 'right' | 'midline'} laterality
 * @property {string} region
 * @property {{ 'pt-BR': string, la: string }} displayName
 * @property {string} scientificName
 * @property {AnatomyPartSpec[]} parts
 * @property {[number, number, number]} anchorDirection
 * @property {number} yBias
 * @property {[number, number, number]} focusDirection
 */

/** @type {AnatomyStructureSpec[]} */
export const ANATOMY_CATALOG = [
  // =========================================================================
  // SISTEMA ÓSSEO (10 estruturas / 10 malhas)
  // =========================================================================
  {
    anatomyId: 'bone.clavicula.right',
    system: 'skeletal',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Clavícula', la: 'Clavicula' },
    scientificName: 'Clavicula',
    parts: [
      {
        nodeName: 'bone.clavicula.right',
        fmaId: 'FMA13322',
        targetTriangles: 2500,
        expectedBytes: 255684,
      },
    ],
    anchorDirection: [0.0, 0.65, 0.76],
    yBias: 0.0,
    focusDirection: [-0.22, 0.38, 0.898],
  },
  {
    anatomyId: 'bone.clavicula.left',
    system: 'skeletal',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Clavícula', la: 'Clavicula' },
    scientificName: 'Clavicula',
    parts: [
      {
        nodeName: 'bone.clavicula.left',
        fmaId: 'FMA13323',
        targetTriangles: 2500,
        expectedBytes: 257084,
      },
    ],
    anchorDirection: [0.0, 0.65, 0.76],
    yBias: 0.0,
    focusDirection: [0.22, 0.38, 0.898],
  },
  {
    anatomyId: 'bone.scapula.right',
    system: 'skeletal',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Escápula', la: 'Scapula' },
    scientificName: 'Scapula',
    parts: [
      {
        nodeName: 'bone.scapula.right',
        fmaId: 'FMA13395',
        targetTriangles: 5500,
        expectedBytes: 5662884,
      },
    ],
    anchorDirection: [0.15, 0.0, -0.989],
    yBias: -0.14,
    focusDirection: [-0.32, 0.14, -0.937],
  },
  {
    anatomyId: 'bone.scapula.left',
    system: 'skeletal',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Escápula', la: 'Scapula' },
    scientificName: 'Scapula',
    parts: [
      {
        nodeName: 'bone.scapula.left',
        fmaId: 'FMA13396',
        targetTriangles: 5500,
        expectedBytes: 6090884,
      },
    ],
    anchorDirection: [-0.15, 0.0, -0.989],
    yBias: -0.14,
    focusDirection: [0.32, 0.14, -0.937],
  },
  {
    anatomyId: 'bone.humerus.right',
    system: 'skeletal',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Úmero', la: 'Humerus' },
    scientificName: 'Humerus',
    parts: [
      {
        nodeName: 'bone.humerus.right',
        fmaId: 'FMA23130',
        targetTriangles: 4000,
        expectedBytes: 813484,
      },
    ],
    anchorDirection: [-0.55, 0.0, 0.835],
    yBias: -0.05,
    focusDirection: [-0.45, 0.08, 0.89],
  },
  {
    anatomyId: 'bone.humerus.left',
    system: 'skeletal',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Úmero', la: 'Humerus' },
    scientificName: 'Humerus',
    parts: [
      {
        nodeName: 'bone.humerus.left',
        fmaId: 'FMA23131',
        targetTriangles: 4000,
        expectedBytes: 824684,
      },
    ],
    anchorDirection: [0.55, 0.0, 0.835],
    yBias: -0.05,
    focusDirection: [0.45, 0.08, 0.89],
  },
  {
    anatomyId: 'bone.radius.right',
    system: 'skeletal',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Rádio', la: 'Radius' },
    scientificName: 'Radius',
    parts: [
      {
        nodeName: 'bone.radius.right',
        fmaId: 'FMA23464',
        targetTriangles: 2300,
        expectedBytes: 140284,
      },
    ],
    anchorDirection: [-0.65, 0.0, 0.76],
    yBias: -0.15,
    focusDirection: [-0.5, 0.05, 0.865],
  },
  {
    anatomyId: 'bone.radius.left',
    system: 'skeletal',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Rádio', la: 'Radius' },
    scientificName: 'Radius',
    parts: [
      {
        nodeName: 'bone.radius.left',
        fmaId: 'FMA23465',
        targetTriangles: 2300,
        expectedBytes: 135784,
      },
    ],
    anchorDirection: [0.65, 0.0, 0.76],
    yBias: -0.15,
    focusDirection: [0.5, 0.05, 0.865],
  },
  {
    anatomyId: 'bone.ulna.right',
    system: 'skeletal',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Ulna', la: 'Ulna' },
    scientificName: 'Ulna',
    parts: [
      {
        nodeName: 'bone.ulna.right',
        fmaId: 'FMA23467',
        targetTriangles: 2800,
        expectedBytes: 179684,
      },
    ],
    anchorDirection: [0.45, 0.0, 0.893],
    yBias: -0.05,
    focusDirection: [0.12, 0.05, 0.991],
  },
  {
    anatomyId: 'bone.ulna.left',
    system: 'skeletal',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Ulna', la: 'Ulna' },
    scientificName: 'Ulna',
    parts: [
      {
        nodeName: 'bone.ulna.left',
        fmaId: 'FMA23468',
        targetTriangles: 2800,
        expectedBytes: 176984,
      },
    ],
    anchorDirection: [-0.45, 0.0, 0.893],
    yBias: -0.05,
    focusDirection: [-0.12, 0.05, 0.991],
  },

  // =========================================================================
  // SISTEMA MUSCULAR (12 estruturas / 26 malhas)
  // =========================================================================
  {
    anatomyId: 'muscle.deltoideus.right',
    system: 'muscular',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo deltoide', la: 'Musculus deltoideus' },
    scientificName: 'Musculus deltoideus',
    parts: [
      {
        nodeName: 'muscle.deltoideus.right.clavicular',
        fmaId: 'FMA34680',
        targetTriangles: 2000,
        expectedBytes: 1454184,
      },
      {
        nodeName: 'muscle.deltoideus.right.acromial',
        fmaId: 'FMA34682',
        targetTriangles: 2200,
        expectedBytes: 1484184,
      },
      {
        nodeName: 'muscle.deltoideus.right.spinal',
        fmaId: 'FMA34684',
        targetTriangles: 2600,
        expectedBytes: 2200584,
      },
    ],
    anchorDirection: [-0.959, 0.05, 0.279],
    yBias: 0.05,
    focusDirection: [-0.901, 0.14, 0.411],
  },
  {
    anatomyId: 'muscle.deltoideus.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo deltoide', la: 'Musculus deltoideus' },
    scientificName: 'Musculus deltoideus',
    parts: [
      {
        nodeName: 'muscle.deltoideus.left.clavicular',
        fmaId: 'FMA34681',
        targetTriangles: 2000,
        expectedBytes: 1424384,
      },
      {
        nodeName: 'muscle.deltoideus.left.acromial',
        fmaId: 'FMA34683',
        targetTriangles: 2200,
        expectedBytes: 1453884,
      },
      {
        nodeName: 'muscle.deltoideus.left.spinal',
        fmaId: 'FMA34685',
        targetTriangles: 2600,
        expectedBytes: 2231484,
      },
    ],
    anchorDirection: [0.959, 0.05, 0.279],
    yBias: 0.05,
    focusDirection: [0.901, 0.14, 0.411],
  },
  {
    anatomyId: 'muscle.pectoralis_major.right',
    system: 'muscular',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo peitoral maior', la: 'Musculus pectoralis major' },
    scientificName: 'Musculus pectoralis major',
    parts: [
      {
        nodeName: 'muscle.pectoralis_major.right.clavicular',
        fmaId: 'FMA34690',
        targetTriangles: 1400,
        expectedBytes: 466584,
      },
      {
        nodeName: 'muscle.pectoralis_major.right.sternocostal',
        fmaId: 'FMA79979',
        targetTriangles: 3200,
        expectedBytes: 1800784,
      },
      {
        nodeName: 'muscle.pectoralis_major.right.abdominal',
        fmaId: 'FMA45874',
        targetTriangles: 1300,
        expectedBytes: 377384,
      },
    ],
    anchorDirection: [-0.18, 0.0, 0.984],
    yBias: 0.0,
    focusDirection: [-0.25, 0.08, 0.965],
  },
  {
    anatomyId: 'muscle.pectoralis_major.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo peitoral maior', la: 'Musculus pectoralis major' },
    scientificName: 'Musculus pectoralis major',
    parts: [
      {
        nodeName: 'muscle.pectoralis_major.left.clavicular',
        fmaId: 'FMA34691',
        targetTriangles: 1400,
        expectedBytes: 460684,
      },
      {
        nodeName: 'muscle.pectoralis_major.left.sternocostal',
        fmaId: 'FMA79980',
        targetTriangles: 3200,
        expectedBytes: 1789984,
      },
      {
        nodeName: 'muscle.pectoralis_major.left.abdominal',
        fmaId: 'FMA45875',
        targetTriangles: 1300,
        expectedBytes: 373484,
      },
    ],
    anchorDirection: [0.18, 0.0, 0.984],
    yBias: 0.0,
    focusDirection: [0.25, 0.08, 0.965],
  },
  {
    anatomyId: 'muscle.biceps_brachii.right',
    system: 'muscular',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo bíceps braquial', la: 'Musculus biceps brachii' },
    scientificName: 'Musculus biceps brachii',
    parts: [
      {
        nodeName: 'muscle.biceps_brachii.right.short_head',
        fmaId: 'FMA37684',
        targetTriangles: 2200,
        expectedBytes: 1392084,
      },
      {
        nodeName: 'muscle.biceps_brachii.right.long_head',
        fmaId: 'FMA37686',
        targetTriangles: 2600,
        expectedBytes: 1613384,
      },
    ],
    anchorDirection: [-0.18, 0.0, 0.984],
    yBias: 0.0,
    focusDirection: [-0.3, 0.06, 0.952],
  },
  {
    anatomyId: 'muscle.biceps_brachii.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo bíceps braquial', la: 'Musculus biceps brachii' },
    scientificName: 'Musculus biceps brachii',
    parts: [
      {
        nodeName: 'muscle.biceps_brachii.left.short_head',
        fmaId: 'FMA37685',
        targetTriangles: 2200,
        expectedBytes: 1435484,
      },
      {
        nodeName: 'muscle.biceps_brachii.left.long_head',
        fmaId: 'FMA37687',
        targetTriangles: 2600,
        expectedBytes: 1645384,
      },
    ],
    anchorDirection: [0.18, 0.0, 0.984],
    yBias: 0.0,
    focusDirection: [0.3, 0.06, 0.952],
  },
  {
    anatomyId: 'muscle.brachialis.right',
    system: 'muscular',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo braquial', la: 'Musculus brachialis' },
    scientificName: 'Musculus brachialis',
    parts: [
      {
        nodeName: 'muscle.brachialis.right',
        fmaId: 'FMA37668',
        targetTriangles: 2500,
        expectedBytes: 1749484,
      },
    ],
    anchorDirection: [-0.821, 0.0, 0.571],
    yBias: 0.05,
    focusDirection: [-0.782, 0.04, 0.622],
  },
  {
    anatomyId: 'muscle.brachialis.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo braquial', la: 'Musculus brachialis' },
    scientificName: 'Musculus brachialis',
    parts: [
      {
        nodeName: 'muscle.brachialis.left',
        fmaId: 'FMA37669',
        targetTriangles: 2500,
        expectedBytes: 1734384,
      },
    ],
    anchorDirection: [0.821, 0.0, 0.571],
    yBias: 0.05,
    focusDirection: [0.782, 0.04, 0.622],
  },
  {
    anatomyId: 'muscle.triceps_brachii.right',
    system: 'muscular',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo tríceps braquial', la: 'Musculus triceps brachii' },
    scientificName: 'Musculus triceps brachii',
    parts: [
      {
        nodeName: 'muscle.triceps_brachii.right.medial_head',
        fmaId: 'FMA37695',
        targetTriangles: 1800,
        expectedBytes: 1344084,
      },
      {
        nodeName: 'muscle.triceps_brachii.right.lateral_head',
        fmaId: 'FMA37697',
        targetTriangles: 2200,
        expectedBytes: 1815684,
      },
      {
        nodeName: 'muscle.triceps_brachii.right.long_head',
        fmaId: 'FMA37699',
        targetTriangles: 2400,
        expectedBytes: 1975784,
      },
    ],
    anchorDirection: [-0.25, 0.0, -0.968],
    yBias: 0.05,
    focusDirection: [-0.38, 0.08, -0.922],
  },
  {
    anatomyId: 'muscle.triceps_brachii.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo tríceps braquial', la: 'Musculus triceps brachii' },
    scientificName: 'Musculus triceps brachii',
    parts: [
      {
        nodeName: 'muscle.triceps_brachii.left.medial_head',
        fmaId: 'FMA37696',
        targetTriangles: 1800,
        expectedBytes: 1311384,
      },
      {
        nodeName: 'muscle.triceps_brachii.left.lateral_head',
        fmaId: 'FMA37698',
        targetTriangles: 2200,
        expectedBytes: 1798784,
      },
      {
        nodeName: 'muscle.triceps_brachii.left.long_head',
        fmaId: 'FMA37700',
        targetTriangles: 2400,
        expectedBytes: 1906484,
      },
    ],
    anchorDirection: [0.25, 0.0, -0.968],
    yBias: 0.05,
    focusDirection: [0.38, 0.08, -0.922],
  },
  {
    anatomyId: 'muscle.brachioradialis.right',
    system: 'muscular',
    laterality: 'right',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo braquiorradial', la: 'Musculus brachioradialis' },
    scientificName: 'Musculus brachioradialis',
    parts: [
      {
        nodeName: 'muscle.brachioradialis.right',
        fmaId: 'FMA38486',
        targetTriangles: 3600,
        expectedBytes: 3658084,
      },
    ],
    anchorDirection: [-0.741, 0.0, 0.671],
    yBias: 0.18,
    focusDirection: [-0.721, 0.05, 0.691],
  },
  {
    anatomyId: 'muscle.brachioradialis.left',
    system: 'muscular',
    laterality: 'left',
    region: 'upper_limb',
    displayName: { 'pt-BR': 'Músculo braquiorradial', la: 'Musculus brachioradialis' },
    scientificName: 'Musculus brachioradialis',
    parts: [
      {
        nodeName: 'muscle.brachioradialis.left',
        fmaId: 'FMA38487',
        targetTriangles: 3600,
        expectedBytes: 3677984,
      },
    ],
    anchorDirection: [0.741, 0.0, 0.671],
    yBias: 0.18,
    focusDirection: [0.721, 0.05, 0.691],
  },
];

/**
 * Retorna a lista achatada de todas as 36 partes com metadados da estrutura pai.
 */
export function listAllCatalogParts() {
  return ANATOMY_CATALOG.flatMap((structure) =>
    structure.parts.map((part) => ({
      ...part,
      anatomyId: structure.anatomyId,
      system: structure.system,
      laterality: structure.laterality,
    })),
  );
}
