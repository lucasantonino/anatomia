/**
 * Gerador idempotente do catálogo rascunho da Fase 2 (v2 — Corpo Humano Completo).
 *
 * Extrai todos os STLs esqueléticos puros (FMA23881 menos FMA23878, FMA7591 e FMA12513)
 * e musculares (FMA72954 menos FMA21964 e FMA21965) do BodyParts3D v3.0, preserva 100%
 * verbatim as 22 estruturas (36 STLs) já calibradas na v1, cruza com TA2.csv + FMA.csv +
 * dicionário anatômico PT-BR/Latim TA2 e grava:
 *   - scripts/anatomy-catalog-v2.json
 *   - .cache/bodyparts3d/v2-catalog-audit.json
 *
 * Uso: node scripts/generate-v2-catalog-draft.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANATOMY_CATALOG as V1_CATALOG,
  BODYPARTS3D_BASE_URL,
  COORDINATE_SYSTEM,
  DETAIL_LEVEL,
  LICENSE_INFO,
  SCHEMA_VERSION,
  TERMINOLOGY_REFERENCE,
} from './anatomy-catalog.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'bodyparts3d');
const OUTPUT_CATALOG_PATH = path.join(ROOT_DIR, 'scripts', 'anatomy-catalog-v2.json');
const OUTPUT_AUDIT_PATH = path.join(CACHE_DIR, 'v2-catalog-audit.json');

const ANATOMY_ID_REGEX = /^(bone|muscle)\.[a-z][a-z0-9_]*\.(left|right|midline)(\.[a-z0-9_]+)?$/;
const FMA_ID_REGEX = /^FMA\d+$/;

const TARGET_TOTAL_TRIANGLES = 320_000;
const BP3D_DATA_BASE =
  'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data';

const UPSTREAM_FILES = [
  { name: 'parts_list_e.txt', url: `${BP3D_DATA_BASE}/parts_list_e.txt` },
  { name: 'conventional_part_of.txt', url: `${BP3D_DATA_BASE}/conventional_part_of.txt` },
  { name: 'FMA.csv', url: `${BP3D_DATA_BASE}/FMA.csv` },
  {
    name: 'TA2.csv',
    url: 'https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/master/TA2.csv',
  },
  {
    name: 'bp3d-tree.json',
    url: 'https://api.github.com/repos/Kevin-Mattheus-Moerman/BodyParts3D/git/trees/main?recursive=1',
  },
];

// ============================================================================
// UTILITÁRIOS DE CACHE, REDE E VETORES
// ============================================================================

function round6(value) {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeVec3(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len <= 1e-12) {
    return [0, 0, 1];
  }
  return [round6(v[0] / len), round6(v[1] / len), round6(v[2] / len)];
}

async function fetchToCache(name, url) {
  const dest = path.join(CACHE_DIR, name);
  try {
    const stat = await fs.stat(dest);
    if (stat.size > 0) {
      return { path: dest, fromCache: true, bytes: stat.size };
    }
  } catch {
    // cache miss
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'anatomia-3d-v2-catalog-generator/1.0' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} (${url})`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, buf);
      await fs.rename(tmp, dest);
      return { path: dest, fromCache: false, bytes: buf.byteLength };
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw new Error(`Falha ao baixar ${name}: ${lastErr?.message}`);
}

function normalizeKey(str) {
  return str
    .toLowerCase()
    .replace(/\b(right|left)\b/g, ' ')
    .replace(/\bmuscle\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ============================================================================
// PARSERS DE METADADOS UPSTREAM
// ============================================================================

async function loadUpstreamData() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  for (const f of UPSTREAM_FILES) {
    const info = await fetchToCache(f.name, f.url);
    console.log(`  [${info.fromCache ? 'CACHE' : 'DOWN '}] ${f.name} (${info.bytes.toLocaleString('en-US')} B)`);
  }

  // 1. bp3d-tree.json -> stlSizeMap
  const treeJson = JSON.parse(await fs.readFile(path.join(CACHE_DIR, 'bp3d-tree.json'), 'utf8'));
  const stlSizeMap = new Map();
  for (const entry of treeJson.tree) {
    if (entry.path.startsWith('assets/BodyParts3D_data/stl/') && entry.path.endsWith('.stl')) {
      const id = path.basename(entry.path, '.stl');
      stlSizeMap.set(id, entry.size);
    }
  }

  // 2. parts_list_e.txt
  const namesMap = new Map();
  const partsRaw = await fs.readFile(path.join(CACHE_DIR, 'parts_list_e.txt'), 'utf8');
  for (const line of partsRaw.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [id, en] = line.split('\t');
    if (id) namesMap.set(id.trim(), (en ?? '').trim());
  }

  // 3. conventional_part_of.txt
  const childrenOf = new Map();
  const parentsOf = new Map();
  const cpoRaw = await fs.readFile(path.join(CACHE_DIR, 'conventional_part_of.txt'), 'utf8');
  for (const line of cpoRaw.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [pid, pname, cid, cname] = line.split('\t');
    if (!pid || !cid) continue;
    if (!namesMap.has(pid)) namesMap.set(pid, pname?.trim() ?? '');
    if (!namesMap.has(cid)) namesMap.set(cid, cname?.trim() ?? '');
    if (!childrenOf.has(pid)) childrenOf.set(pid, new Set());
    childrenOf.get(pid).add(cid);
    if (!parentsOf.has(cid)) parentsOf.set(cid, new Set());
    parentsOf.get(cid).add(pid);
  }

  // 4. FMA.csv
  const fmaLabelMap = new Map();
  const fmaRaw = await fs.readFile(path.join(CACHE_DIR, 'FMA.csv'), 'utf8');
  for (const line of fmaRaw.split(/\r?\n/).slice(1)) {
    const match = line.match(/^(\d+),(.*),(\d*)$/);
    if (match) {
      fmaLabelMap.set(`FMA${match[1]}`, {
        preferredLabel: match[2].trim(),
        parentFmaId: match[3] ? `FMA${match[3]}` : null,
      });
    }
  }

  // 5. TA2.csv
  const ta2ByEn = new Map();
  const ta2ByLa = new Map();
  const ta2Raw = (await fs.readFile(path.join(CACHE_DIR, 'TA2.csv'), 'utf8')).replace(/^\uFEFF/, '');
  for (const line of ta2Raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const unwrapped = trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
    const cols = unwrapped.split(';');
    if (cols[0] === 'TA2ID' || cols.length < 6) continue;
    const row = {
      ta2Id: cols[0].trim(),
      en: cols[1].trim(),
      la: cols[2].trim(),
      pt: cols[5].trim(),
    };
    const enKey = normalizeKey(row.en);
    const laKey = row.la.toLowerCase().trim();
    if (enKey && !ta2ByEn.has(enKey)) ta2ByEn.set(enKey, row);
    if (laKey && !ta2ByLa.has(laKey)) ta2ByLa.set(laKey, row);
  }

  return { stlSizeMap, namesMap, childrenOf, parentsOf, fmaLabelMap, ta2ByEn, ta2ByLa };
}

function collectDescendants(rootId, childrenOf) {
  const visited = new Set();
  const queue = [rootId];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const kids = childrenOf.get(cur);
    if (kids) {
      for (const k of kids) {
        if (!visited.has(k)) queue.push(k);
      }
    }
  }
  return visited;
}

function findDirectBranches(nodeId, rootId, childrenOf, namesMap) {
  const branches = [];
  for (const child of childrenOf.get(rootId) ?? []) {
    const desc = collectDescendants(child, childrenOf);
    if (desc.has(nodeId)) {
      branches.push({ id: child, name: namesMap.get(child) ?? '' });
    }
  }
  return branches;
}

// ============================================================================
// DICIONÁRIOS CURADOS ANATÔMICOS (TA2 LATIM + PT-BR + ORIENTAÇÃO + ORÇAMENTO)
// ============================================================================

const ORDINAL_MAP = {
  first: { num: 1, roman: 'I', ptMasc: '1º', ptFem: '1ª' },
  second: { num: 2, roman: 'II', ptMasc: '2º', ptFem: '2ª' },
  third: { num: 3, roman: 'III', ptMasc: '3º', ptFem: '3ª' },
  fourth: { num: 4, roman: 'IV', ptMasc: '4º', ptFem: '4ª' },
  fifth: { num: 5, roman: 'V', ptMasc: '5º', ptFem: '5ª' },
  sixth: { num: 6, roman: 'VI', ptMasc: '6º', ptFem: '6ª' },
  seventh: { num: 7, roman: 'VII', ptMasc: '7º', ptFem: '7ª' },
  eighth: { num: 8, roman: 'VIII', ptMasc: '8º', ptFem: '8ª' },
  ninth: { num: 9, roman: 'IX', ptMasc: '9º', ptFem: '9ª' },
  tenth: { num: 10, roman: 'X', ptMasc: '10º', ptFem: '10ª' },
  eleventh: { num: 11, roman: 'XI', ptMasc: '11º', ptFem: '11ª' },
  twelfth: { num: 12, roman: 'XII', ptMasc: '12º', ptFem: '12ª' },
};

const FINGER_MAP = {
  thumb: { num: 1, roman: 'I', pt: 'polegar (I dedo da mão)', la: 'pollicis' },
  'index finger': { num: 2, roman: 'II', pt: 'indicador (II dedo da mão)', la: 'indicis' },
  'middle finger': { num: 3, roman: 'III', pt: 'dedo médio (III dedo da mão)', la: 'digiti medii manus' },
  'ring finger': { num: 4, roman: 'IV', pt: 'dedo anelar (IV dedo da mão)', la: 'digiti anularis manus' },
  'little finger': { num: 5, roman: 'V', pt: 'dedo mínimo (V dedo da mão)', la: 'digiti minimi manus' },
};

const TOE_MAP = {
  'big toe': { num: 1, roman: 'I', pt: 'hálux (I dedo do pé)', la: 'hallucis' },
  'second toe': { num: 2, roman: 'II', pt: 'II dedo do pé', la: 'digiti II pedis' },
  'third toe': { num: 3, roman: 'III', pt: 'III dedo do pé', la: 'digiti III pedis' },
  'fourth toe': { num: 4, roman: 'IV', pt: 'IV dedo do pé', la: 'digiti IV pedis' },
  'little toe': { num: 5, roman: 'V', pt: 'V dedo do pé', la: 'digiti minimi pedis' },
};

/**
 * Mapeamento completo de ossos simples (fora da v1, vértebras, costelas, metacarpos, metatarsos e falanges).
 */
const BONE_SINGLE_DICT = {
  // Crânio e pescoço (head_neck)
  'frontal bone': {
    slug: 'os_frontale',
    pt: 'Osso frontal',
    la: 'Os frontale',
    region: 'head_neck',
    orient: 'anterior_superior',
    target: 2800,
  },
  'occipital bone': {
    slug: 'os_occipitale',
    pt: 'Osso occipital',
    la: 'Os occipitale',
    region: 'head_neck',
    orient: 'posterior',
    target: 2600,
  },
  'sphenoid bone': {
    slug: 'os_sphenoidale',
    pt: 'Osso esfenoide',
    la: 'Os sphenoidale',
    region: 'head_neck',
    orient: 'anterior',
    target: 2000,
  },
  ethmoid: {
    slug: 'os_ethmoidale',
    pt: 'Osso etmoide',
    la: 'Os ethmoidale',
    region: 'head_neck',
    orient: 'anterior',
    target: 1400,
  },
  vomer: {
    slug: 'vomer',
    pt: 'Vômer',
    la: 'Vomer',
    region: 'head_neck',
    orient: 'anterior',
    target: 800,
  },
  mandible: {
    slug: 'mandibula',
    pt: 'Mandíbula',
    la: 'Mandibula',
    region: 'head_neck',
    orient: 'anterior',
    target: 2600,
  },
  'hyoid bone': {
    slug: 'os_hyoideum',
    pt: 'Osso hioide',
    la: 'Os hyoideum',
    region: 'head_neck',
    orient: 'anterior',
    target: 900,
  },
  'parietal bone': {
    slug: 'os_parietale',
    pt: 'Osso parietal',
    la: 'Os parietale',
    region: 'head_neck',
    orient: 'lateral_superior',
    target: 2200,
  },
  'temporal bone': {
    slug: 'os_temporale',
    pt: 'Osso temporal',
    la: 'Os temporale',
    region: 'head_neck',
    orient: 'lateral',
    target: 2000,
  },
  maxilla: {
    slug: 'maxilla',
    pt: 'Maxila',
    la: 'Maxilla',
    region: 'head_neck',
    orient: 'anterior',
    target: 1800,
  },
  'zygomatic bone': {
    slug: 'os_zygomaticum',
    pt: 'Osso zigomático',
    la: 'Os zygomaticum',
    region: 'head_neck',
    orient: 'anterolateral',
    target: 1000,
  },
  'nasal bone': {
    slug: 'os_nasale',
    pt: 'Osso nasal',
    la: 'Os nasale',
    region: 'head_neck',
    orient: 'anterior',
    target: 450,
  },
  'lacrimal bone': {
    slug: 'os_lacrimale',
    pt: 'Osso lacrimal',
    la: 'Os lacrimale',
    region: 'head_neck',
    orient: 'anterior',
    target: 450,
  },
  'palatine bone': {
    slug: 'os_palatinum',
    pt: 'Osso palatino',
    la: 'Os palatinum',
    region: 'head_neck',
    orient: 'anterior',
    target: 700,
  },
  'inferior nasal concha': {
    slug: 'concha_nasalis_inferior',
    pt: 'Concha nasal inferior',
    la: 'Concha nasalis inferior',
    region: 'head_neck',
    orient: 'anterior',
    target: 500,
  },

  // Tronco (trunk)
  sacrum: {
    slug: 'os_sacrum',
    pt: 'Sacro',
    la: 'Os sacrum',
    region: 'trunk',
    orient: 'posterior',
    target: 2600,
  },

  // Carpo (upper_limb — face dorsal -Z; apenas pisiforme palmar +Z conforme auditoria SUB-05)
  scaphoid: {
    slug: 'os_scaphoideum',
    pt: 'Osso escafoide',
    la: 'Os scaphoideum',
    region: 'upper_limb',
    orient: 'posterior',
    target: 320,
  },
  lunate: {
    slug: 'os_lunatum',
    pt: 'Osso semilunar',
    la: 'Os lunatum',
    region: 'upper_limb',
    orient: 'posterior',
    target: 300,
  },
  triquetral: {
    slug: 'os_triquetrum',
    pt: 'Osso piramidal',
    la: 'Os triquetrum',
    region: 'upper_limb',
    orient: 'posterior',
    target: 280,
  },
  pisiform: {
    slug: 'os_pisiforme',
    pt: 'Osso pisiforme',
    la: 'Os pisiforme',
    region: 'upper_limb',
    orient: 'anterior',
    target: 220,
  },
  trapezium: {
    slug: 'os_trapezium',
    pt: 'Osso trapézio',
    la: 'Os trapezium',
    region: 'upper_limb',
    orient: 'posterior',
    target: 300,
  },
  trapezoid: {
    slug: 'os_trapezoideum',
    pt: 'Osso trapezoide',
    la: 'Os trapezoideum',
    region: 'upper_limb',
    orient: 'posterior',
    target: 260,
  },
  capitate: {
    slug: 'os_capitatum',
    pt: 'Osso capitato',
    la: 'Os capitatum',
    region: 'upper_limb',
    orient: 'posterior',
    target: 340,
  },
  hamate: {
    slug: 'os_hamatum',
    pt: 'Osso hamato',
    la: 'Os hamatum',
    region: 'upper_limb',
    orient: 'posterior',
    target: 320,
  },

  // Cíngulo pélvico e membro inferior (lower_limb — coerente com TA2 Cingulum pelvicum e FMA9622)
  'hip bone': {
    slug: 'os_coxae',
    pt: 'Osso do quadril',
    la: 'Os coxae',
    region: 'lower_limb',
    orient: 'anterolateral',
    target: 2800,
  },
  femur: {
    slug: 'femur',
    pt: 'Fêmur',
    la: 'Femur',
    region: 'lower_limb',
    orient: 'anterolateral',
    target: 2600,
  },
  patella: {
    slug: 'patella',
    pt: 'Patela',
    la: 'Patella',
    region: 'lower_limb',
    orient: 'anterior',
    target: 700,
  },
  tibia: {
    slug: 'tibia',
    pt: 'Tíbia',
    la: 'Tibia',
    region: 'lower_limb',
    orient: 'anterior',
    target: 2000,
  },
  fibula: {
    slug: 'fibula',
    pt: 'Fíbula',
    la: 'Fibula',
    region: 'lower_limb',
    orient: 'lateral',
    target: 1400,
  },
  talus: {
    slug: 'talus',
    pt: 'Tálus',
    la: 'Talus',
    region: 'lower_limb',
    orient: 'anterior_superior',
    target: 900,
  },
  calcaneus: {
    slug: 'calcaneus',
    pt: 'Calcâneo',
    la: 'Calcaneus',
    region: 'lower_limb',
    orient: 'posterior',
    target: 1000,
  },
  'navicular bone of foot': {
    slug: 'os_naviculare',
    pt: 'Osso navicular',
    la: 'Os naviculare',
    region: 'lower_limb',
    orient: 'anterior_superior',
    target: 550,
  },
  'cuboid bone': {
    slug: 'os_cuboideum',
    pt: 'Osso cuboide',
    la: 'Os cuboideum',
    region: 'lower_limb',
    orient: 'lateral',
    target: 600,
  },
  'medial cuneiform bone': {
    slug: 'os_cuneiforme_mediale',
    pt: 'Osso cuneiforme medial',
    la: 'Os cuneiforme mediale',
    region: 'lower_limb',
    orient: 'anterior_superior',
    target: 550,
  },
  'intermediate cuneiform bone': {
    slug: 'os_cuneiforme_intermedium',
    pt: 'Osso cuneiforme intermédio',
    la: 'Os cuneiforme intermedium',
    region: 'lower_limb',
    orient: 'anterior_superior',
    target: 450,
  },
  'lateral cuneiform bone': {
    slug: 'os_cuneiforme_laterale',
    pt: 'Osso cuneiforme lateral',
    la: 'Os cuneiforme laterale',
    region: 'lower_limb',
    orient: 'anterior_superior',
    target: 480,
  },
  'sesamoid bone of foot': {
    slug: 'os_sesamoideum_pedis',
    pt: 'Ossos sesamoides do pé',
    la: 'Ossa sesamoidea pedis',
    region: 'lower_limb',
    orient: 'inferior',
    target: 260,
  },
};

/**
 * Definição explícita dos músculos compostos (multi-parte) da v2 (além dos 4 músculos compostos da v1).
 * Mapeia cada STL (por FMA/BP ID) para: { groupSlug, laterality, partSuffix }.
 */
const COMPOSITE_MUSCLE_PARTS = {
  // Cabeça
  FMA49001: { slug: 'masseter', laterality: 'right', suffix: 'superficial' },
  FMA49004: { slug: 'masseter', laterality: 'right', suffix: 'deep' },
  FMA49002: { slug: 'masseter', laterality: 'left', suffix: 'superficial' },
  FMA49005: { slug: 'masseter', laterality: 'left', suffix: 'deep' },

  FMA46782: { slug: 'orbicularis_oculi', laterality: 'right', suffix: 'orbital' },
  FMA46785: { slug: 'orbicularis_oculi', laterality: 'right', suffix: 'palpebral' },
  FMA46783: { slug: 'orbicularis_oculi', laterality: 'left', suffix: 'orbital' },
  FMA46786: { slug: 'orbicularis_oculi', laterality: 'left', suffix: 'palpebral' },

  FMA49024: { slug: 'pterygoideus_lateralis', laterality: 'right', suffix: 'upper_head' },
  FMA49022: { slug: 'pterygoideus_lateralis', laterality: 'right', suffix: 'lower_head' },
  FMA49025: { slug: 'pterygoideus_lateralis', laterality: 'left', suffix: 'upper_head' },
  FMA49023: { slug: 'pterygoideus_lateralis', laterality: 'left', suffix: 'lower_head' },

  FMA46759: { slug: 'occipitofrontalis', laterality: 'right', suffix: 'frontalis' },
  FMA46761: { slug: 'occipitofrontalis', laterality: 'right', suffix: 'occipitalis' },
  FMA46760: { slug: 'occipitofrontalis', laterality: 'left', suffix: 'frontalis' },
  FMA46762: { slug: 'occipitofrontalis', laterality: 'left', suffix: 'occipitalis' },

  // Pescoço (inclui tendão intermediário do digástrico, comprovado geometricamente em mm!)
  FMA46304: { slug: 'digastricus', laterality: 'right', suffix: 'anterior_belly' },
  FMA46306: { slug: 'digastricus', laterality: 'right', suffix: 'posterior_belly' },
  FMA258850: { slug: 'digastricus', laterality: 'right', suffix: 'intermediate_tendon' },
  FMA46305: { slug: 'digastricus', laterality: 'left', suffix: 'anterior_belly' },
  FMA46307: { slug: 'digastricus', laterality: 'left', suffix: 'posterior_belly' },
  FMA264840: { slug: 'digastricus', laterality: 'left', suffix: 'intermediate_tendon' },

  FMA46283: { slug: 'longus_colli', laterality: 'right', suffix: 'superior_oblique' },
  FMA46285: { slug: 'longus_colli', laterality: 'right', suffix: 'vertical_intermediate' },
  FMA46287: { slug: 'longus_colli', laterality: 'right', suffix: 'inferior_oblique' },
  FMA46284: { slug: 'longus_colli', laterality: 'left', suffix: 'superior_oblique' },
  FMA46286: { slug: 'longus_colli', laterality: 'left', suffix: 'vertical_intermediate' },
  FMA46288: { slug: 'longus_colli', laterality: 'left', suffix: 'inferior_oblique' },

  // Dorso / Tronco
  FMA33586: { slug: 'trapezius', laterality: 'right', suffix: 'descending' },
  FMA33584: { slug: 'trapezius', laterality: 'right', suffix: 'transverse' },
  FMA33581: { slug: 'trapezius', laterality: 'right', suffix: 'ascending' },
  FMA33587: { slug: 'trapezius', laterality: 'left', suffix: 'descending' },
  FMA33585: { slug: 'trapezius', laterality: 'left', suffix: 'transverse' },
  FMA33583: { slug: 'trapezius', laterality: 'left', suffix: 'ascending' },

  FMA45854: { slug: 'levator_ani', laterality: 'right', suffix: 'pubococcygeus' },
  FMA45856: { slug: 'levator_ani', laterality: 'right', suffix: 'puborectalis' },
  FMA45858: { slug: 'levator_ani', laterality: 'right', suffix: 'iliococcygeus' },
  FMA45855: { slug: 'levator_ani', laterality: 'left', suffix: 'pubococcygeus' },
  FMA45857: { slug: 'levator_ani', laterality: 'left', suffix: 'puborectalis' },
  FMA45859: { slug: 'levator_ani', laterality: 'left', suffix: 'iliococcygeus' },

  // Membro superior (além dos compostos v1)
  FMA38560: { slug: 'pronator_teres', laterality: 'right', suffix: 'humeral_head' },
  FMA38562: { slug: 'pronator_teres', laterality: 'right', suffix: 'ulnar_head' },
  FMA38561: { slug: 'pronator_teres', laterality: 'left', suffix: 'humeral_head' },
  FMA38563: { slug: 'pronator_teres', laterality: 'left', suffix: 'ulnar_head' },

  FMA38617: { slug: 'flexor_carpi_ulnaris', laterality: 'right', suffix: 'humeral_head' },
  FMA38619: { slug: 'flexor_carpi_ulnaris', laterality: 'right', suffix: 'ulnar_head' },
  FMA38618: { slug: 'flexor_carpi_ulnaris', laterality: 'left', suffix: 'humeral_head' },
  FMA38620: { slug: 'flexor_carpi_ulnaris', laterality: 'left', suffix: 'ulnar_head' },

  FMA38638: { slug: 'flexor_digitorum_superficialis', laterality: 'right', suffix: 'humeroulnar_head' },
  FMA38640: { slug: 'flexor_digitorum_superficialis', laterality: 'right', suffix: 'radial_head' },
  FMA38639: { slug: 'flexor_digitorum_superficialis', laterality: 'left', suffix: 'humeroulnar_head' },
  FMA38641: { slug: 'flexor_digitorum_superficialis', laterality: 'left', suffix: 'radial_head' },

  BP45: {
    slug: 'extensor_carpi_ulnaris',
    laterality: 'right',
    suffix: 'humeral_head',
    partFmaId: 'FMA77260',
    structureFmaIds: ['FMA38507', 'FMA77260', 'FMA77261'],
  },
  BP47: {
    slug: 'extensor_carpi_ulnaris',
    laterality: 'right',
    suffix: 'ulnar_head',
    partFmaId: 'FMA77261',
    structureFmaIds: ['FMA38507', 'FMA77260', 'FMA77261'],
  },
  BP44: {
    slug: 'extensor_carpi_ulnaris',
    laterality: 'left',
    suffix: 'humeral_head',
    partFmaId: 'FMA77260',
    structureFmaIds: ['FMA38508', 'FMA77260', 'FMA77261'],
  },
  BP46: {
    slug: 'extensor_carpi_ulnaris',
    laterality: 'left',
    suffix: 'ulnar_head',
    partFmaId: 'FMA77261',
    structureFmaIds: ['FMA38508', 'FMA77260', 'FMA77261'],
  },

  FMA65198: { slug: 'flexor_pollicis_brevis', laterality: 'right', suffix: 'superficial_head' },
  FMA46110: { slug: 'flexor_pollicis_brevis', laterality: 'right', suffix: 'deep_head' },
  FMA65199: { slug: 'flexor_pollicis_brevis', laterality: 'left', suffix: 'superficial_head' },
  FMA46111: { slug: 'flexor_pollicis_brevis', laterality: 'left', suffix: 'deep_head' },

  FMA46121: { slug: 'adductor_pollicis', laterality: 'right', suffix: 'oblique_head' },
  FMA46123: { slug: 'adductor_pollicis', laterality: 'right', suffix: 'transverse_head' },
  FMA46122: { slug: 'adductor_pollicis', laterality: 'left', suffix: 'oblique_head' },
  FMA46124: { slug: 'adductor_pollicis', laterality: 'left', suffix: 'transverse_head' },

  // Membro inferior
  FMA45888: { slug: 'biceps_femoris', laterality: 'right', suffix: 'long_head' },
  FMA45891: { slug: 'biceps_femoris', laterality: 'right', suffix: 'short_head' },
  FMA45889: { slug: 'biceps_femoris', laterality: 'left', suffix: 'long_head' },
  FMA45892: { slug: 'biceps_femoris', laterality: 'left', suffix: 'short_head' },

  FMA45957: { slug: 'gastrocnemius', laterality: 'right', suffix: 'medial_head' },
  FMA45960: { slug: 'gastrocnemius', laterality: 'right', suffix: 'lateral_head' },
  FMA45958: { slug: 'gastrocnemius', laterality: 'left', suffix: 'medial_head' },
  FMA45961: { slug: 'gastrocnemius', laterality: 'left', suffix: 'lateral_head' },

  FMA45971: { slug: 'flexor_hallucis_brevis', laterality: 'right', suffix: 'medial_head' },
  FMA45973: { slug: 'flexor_hallucis_brevis', laterality: 'right', suffix: 'lateral_head' },
  FMA45972: { slug: 'flexor_hallucis_brevis', laterality: 'left', suffix: 'medial_head' },
  FMA45974: { slug: 'flexor_hallucis_brevis', laterality: 'left', suffix: 'lateral_head' },

  FMA46018: { slug: 'adductor_hallucis', laterality: 'right', suffix: 'oblique_head' },
  FMA46020: { slug: 'adductor_hallucis', laterality: 'right', suffix: 'transverse_head' },
  FMA46019: { slug: 'adductor_hallucis', laterality: 'left', suffix: 'oblique_head' },
  FMA46021: { slug: 'adductor_hallucis', laterality: 'left', suffix: 'transverse_head' },
};

/**
 * Dicionário anatômico completo de músculos (TA2 Latim + PT-BR + região + orientação + orçamento por parte).
 * Chave: slug latino canônico (ex.: 'temporalis', 'gluteus_maximus').
 */
const MUSCLE_DICT = {
  // === CABEÇA (head_neck) ===
  orbicularis_oris: { pt: 'Músculo orbicular da boca', la: 'Musculus orbicularis oris', region: 'head_neck', orient: 'anterior', target: 420 },
  orbicularis_oculi: { pt: 'Músculo orbicular do olho', la: 'Musculus orbicularis oculi', region: 'head_neck', orient: 'anterior', target: 260 },
  occipitofrontalis: { pt: 'Músculo occipitofrontal', la: 'Musculus occipitofrontalis', region: 'head_neck', orient: 'anterior_superior', target: 320 },
  temporoparietalis: { pt: 'Músculo temporoparietal', la: 'Musculus temporoparietalis', region: 'head_neck', orient: 'lateral', target: 450 },
  galea_aponeurotica: { pt: 'Gálea aponeurótica (aponeurose epicrânica)', la: 'Galea aponeurotica', region: 'head_neck', orient: 'superior', target: 1100, specialKind: 'aponeurosis' },
  temporalis: { pt: 'Músculo temporal', la: 'Musculus temporalis', region: 'head_neck', orient: 'lateral', target: 650 },
  masseter: { pt: 'Músculo masseter', la: 'Musculus masseter', region: 'head_neck', orient: 'lateral', target: 320 },
  pterygoideus_medialis: { pt: 'Músculo pterigóideo medial', la: 'Musculus pterygoideus medialis', region: 'head_neck', orient: 'lateral', target: 280 },
  pterygoideus_lateralis: { pt: 'Músculo pterigóideo lateral', la: 'Musculus pterygoideus lateralis', region: 'head_neck', orient: 'lateral', target: 220 },
  buccinator: { pt: 'Músculo bucinador', la: 'Musculus buccinator', region: 'head_neck', orient: 'anterolateral', target: 300 },
  procerus: { pt: 'Músculo prócero', la: 'Musculus procerus', region: 'head_neck', orient: 'anterior', target: 220 },
  nasalis: { pt: 'Músculo nasal', la: 'Musculus nasalis', region: 'head_neck', orient: 'anterior', target: 240 },
  depressor_septi_nasi: { pt: 'Músculo abaixador do septo nasal', la: 'Musculus depressor septi nasi', region: 'head_neck', orient: 'anterior', target: 180 },
  corrugator_supercilii: { pt: 'Músculo corrugador do supercílio', la: 'Musculus corrugator supercilii', region: 'head_neck', orient: 'anterior', target: 200 },
  levator_labii_superioris_alaeque_nasi: { pt: 'Músculo levantador do lábio superior e da asa do nariz', la: 'Musculus levator labii superioris alaeque nasi', region: 'head_neck', orient: 'anterior', target: 180 },
  levator_labii_superioris: { pt: 'Músculo levantador do lábio superior', la: 'Musculus levator labii superioris', region: 'head_neck', orient: 'anterior', target: 220 },
  levator_anguli_oris: { pt: 'Músculo levantador do ângulo da boca', la: 'Musculus levator anguli oris', region: 'head_neck', orient: 'anterior', target: 200 },
  zygomaticus_major: { pt: 'Músculo zigomático maior', la: 'Musculus zygomaticus major', region: 'head_neck', orient: 'anterolateral', target: 260 },
  zygomaticus_minor: { pt: 'Músculo zigomático menor', la: 'Musculus zygomaticus minor', region: 'head_neck', orient: 'anterolateral', target: 200 },
  risorius: { pt: 'Músculo risório', la: 'Musculus risorius', region: 'head_neck', orient: 'anterolateral', target: 220 },
  depressor_anguli_oris: { pt: 'Músculo abaixador do ângulo da boca', la: 'Musculus depressor anguli oris', region: 'head_neck', orient: 'anterior', target: 220 },
  depressor_labii_inferioris: { pt: 'Músculo abaixador do lábio inferior', la: 'Musculus depressor labii inferioris', region: 'head_neck', orient: 'anterior', target: 240 },
  mentalis: { pt: 'Músculo mentual', la: 'Musculus mentalis', region: 'head_neck', orient: 'anterior', target: 180 },

  // === PESCOÇO E NUCA (head_neck) ===
  platysma: { pt: 'Músculo platisma', la: 'Platysma', region: 'head_neck', orient: 'anterolateral', target: 500 },
  sternocleidomastoideus: { pt: 'Músculo esternocleidomastóideo', la: 'Musculus sternocleidomastoideus', region: 'head_neck', orient: 'anterolateral', target: 600 },
  digastricus: { pt: 'Músculo digástrico', la: 'Musculus digastricus', region: 'head_neck', orient: 'anterolateral', target: 240 },
  stylohyoideus: { pt: 'Músculo estilo-hióideo', la: 'Musculus stylohyoideus', region: 'head_neck', orient: 'anterolateral', target: 240 },
  mylohyoideus: { pt: 'Músculo milo-hióideo', la: 'Musculus mylohyoideus', region: 'head_neck', orient: 'anterior', target: 280 },
  geniohyoideus: { pt: 'Músculo gênio-hióideo', la: 'Musculus geniohyoideus', region: 'head_neck', orient: 'anterior', target: 220 },
  sternohyoideus: { pt: 'Músculo esterno-hióideo', la: 'Musculus sternohyoideus', region: 'head_neck', orient: 'anterior', target: 280 },
  sternothyroideus: { pt: 'Músculo esternotireóideo', la: 'Musculus sternothyroideus', region: 'head_neck', orient: 'anterior', target: 260 },
  thyrohyoideus: { pt: 'Músculo tireo-hióideo', la: 'Musculus thyrohyoideus', region: 'head_neck', orient: 'anterior', target: 240 },
  omohyoideus: { pt: 'Músculo omo-hióideo', la: 'Musculus omohyoideus', region: 'head_neck', orient: 'anterolateral', target: 320 },
  scalenus_anterior: { pt: 'Músculo escaleno anterior', la: 'Musculus scalenus anterior', region: 'head_neck', orient: 'anterolateral', target: 300 },
  scalenus_medius: { pt: 'Músculo escaleno médio', la: 'Musculus scalenus medius', region: 'head_neck', orient: 'lateral', target: 340 },
  scalenus_posterior: { pt: 'Músculo escaleno posterior', la: 'Musculus scalenus posterior', region: 'head_neck', orient: 'posterolateral', target: 280 },
  longus_colli: { pt: 'Músculo longo do pescoço', la: 'Musculus longus colli', region: 'head_neck', orient: 'anterior', target: 240 },
  longus_capitis: { pt: 'Músculo longo da cabeça', la: 'Musculus longus capitis', region: 'head_neck', orient: 'anterior', target: 280 },
  rectus_capitis_anterior: { pt: 'Músculo reto anterior da cabeça', la: 'Musculus rectus capitis anterior', region: 'head_neck', orient: 'anterior', target: 200 },
  rectus_capitis_lateralis: { pt: 'Músculo reto lateral da cabeça', la: 'Musculus rectus capitis lateralis', region: 'head_neck', orient: 'lateral', target: 200 },
  rectus_capitis_posterior_major: { pt: 'Músculo reto posterior maior da cabeça', la: 'Musculus rectus capitis posterior major', region: 'head_neck', orient: 'posterior', target: 240 },
  rectus_capitis_posterior_minor: { pt: 'Músculo reto posterior menor da cabeça', la: 'Musculus rectus capitis posterior minor', region: 'head_neck', orient: 'posterior', target: 220 },
  obliquus_capitis_superior: { pt: 'Músculo oblíquo superior da cabeça', la: 'Musculus obliquus capitis superior', region: 'head_neck', orient: 'posterior', target: 240 },
  obliquus_capitis_inferior: { pt: 'Músculo oblíquo inferior da cabeça', la: 'Musculus obliquus capitis inferior', region: 'head_neck', orient: 'posterior', target: 240 },
  // Ramos cervicais/cefálicos do dorso profundo (em head_neck por localização cervical/nuca)
  splenius_capitis: { pt: 'Músculo esplênio da cabeça', la: 'Musculus splenius capitis', region: 'head_neck', orient: 'posterior', target: 450 },
  splenius_cervicis: { pt: 'Músculo esplênio do pescoço', la: 'Musculus splenius cervicis', region: 'head_neck', orient: 'posterior', target: 400 },
  semispinalis_capitis: { pt: 'Músculo semiespinal da cabeça', la: 'Musculus semispinalis capitis', region: 'head_neck', orient: 'posterior', target: 380 },
  semispinalis_cervicis: { pt: 'Músculo semiespinal do pescoço', la: 'Musculus semispinalis cervicis', region: 'head_neck', orient: 'posterior', target: 340 },
  longissimus_capitis: { pt: 'Músculo longuíssimo da cabeça', la: 'Musculus longissimus capitis', region: 'head_neck', orient: 'posterior', target: 300 },
  longissimus_cervicis: { pt: 'Músculo longuíssimo do pescoço', la: 'Musculus longissimus cervicis', region: 'head_neck', orient: 'posterior', target: 300 },
  spinalis_cervicis: { pt: 'Músculo espinal do pescoço', la: 'Musculus spinalis cervicis', region: 'head_neck', orient: 'posterior', target: 240 },
  iliocostalis_cervicis: { pt: 'Músculo iliocostal do pescoço', la: 'Musculus iliocostalis cervicis', region: 'head_neck', orient: 'posterior', target: 320 },
  rotatores_cervicis: { pt: 'Músculos rotadores do pescoço', la: 'Musculi rotatores cervicis', region: 'head_neck', orient: 'posterior', target: 280 },
  interspinales_cervicis: { pt: 'Músculos interespinhais do pescoço', la: 'Musculi interspinales cervicis', region: 'head_neck', orient: 'posterior', target: 320, specialKind: 'set' },
  intertransversarii_anteriores_cervicis: { pt: 'Músculos intertransversários anteriores do pescoço', la: 'Musculi intertransversarii anteriores cervicis', region: 'head_neck', orient: 'lateral', target: 320, specialKind: 'set' },
  intertransversarii_posteriores_cervicis: { pt: 'Músculos intertransversários posteriores do pescoço', la: 'Musculi intertransversarii posteriores cervicis', region: 'head_neck', orient: 'posterior', target: 320, specialKind: 'set' },

  // === TRONCO: DORSO, TÓRAX, ABDOME E ASSOALHO PÉLVICO (trunk) ===
  trapezius: { pt: 'Músculo trapézio', la: 'Musculus trapezius', region: 'trunk', orient: 'posterior', target: 520 },
  latissimus_dorsi: { pt: 'Músculo latíssimo do dorso', la: 'Musculus latissimus dorsi', region: 'trunk', orient: 'posterior', target: 1100 },
  rhomboideus_major: { pt: 'Músculo romboide maior', la: 'Musculus rhomboideus major', region: 'trunk', orient: 'posterior', target: 420 },
  rhomboideus_minor: { pt: 'Músculo romboide menor', la: 'Musculus rhomboideus minor', region: 'trunk', orient: 'posterior', target: 300 },
  levator_scapulae: { pt: 'Músculo levantador da escápula', la: 'Musculus levator scapulae', region: 'trunk', orient: 'posterolateral', target: 360 },
  serratus_posterior_superior: { pt: 'Músculo serrátil posterior superior', la: 'Musculus serratus posterior superior', region: 'trunk', orient: 'posterior', target: 420 },
  serratus_posterior_inferior: { pt: 'Músculo serrátil posterior inferior', la: 'Musculus serratus posterior inferior', region: 'trunk', orient: 'posterior', target: 480 },
  iliocostalis_thoracis: { pt: 'Músculo iliocostal do tórax', la: 'Musculus iliocostalis thoracis', region: 'trunk', orient: 'posterior', target: 480 },
  iliocostalis_lumborum: { pt: 'Músculo iliocostal do lombo', la: 'Musculus iliocostalis lumborum', region: 'trunk', orient: 'posterior', target: 620 },
  longissimus_thoracis: { pt: 'Músculo longuíssimo do tórax', la: 'Musculus longissimus thoracis', region: 'trunk', orient: 'posterior', target: 620 },
  spinalis_thoracis: { pt: 'Músculo espinal do tórax', la: 'Musculus spinalis thoracis', region: 'trunk', orient: 'posterior', target: 420 },
  semispinalis_thoracis: { pt: 'Músculo semiespinal do tórax', la: 'Musculus semispinalis thoracis', region: 'trunk', orient: 'posterior', target: 420 },
  multifidus: { pt: 'Músculos multífidos', la: 'Musculi multifidi', region: 'trunk', orient: 'posterior', target: 520 },
  rotatores_thoracis: { pt: 'Músculos rotadores do tórax', la: 'Musculi rotatores thoracis', region: 'trunk', orient: 'posterior', target: 650, specialKind: 'bilateral_merged' },
  rotatores_lumborum: { pt: 'Músculos rotadores do lombo', la: 'Musculi rotatores lumborum', region: 'trunk', orient: 'posterior', target: 360 },
  interspinales_thoracis: { pt: 'Músculos interespinhais do tórax', la: 'Musculi interspinales thoracis', region: 'trunk', orient: 'posterior', target: 260, specialKind: 'set' },
  interspinales_lumborum: { pt: 'Músculos interespinhais do lombo', la: 'Musculi interspinales lumborum', region: 'trunk', orient: 'posterior', target: 360, specialKind: 'set' },
  intertransversarii_laterales_lumborum: { pt: 'Músculos intertransversários laterais do lombo', la: 'Musculi intertransversarii laterales lumborum', region: 'trunk', orient: 'posterior', target: 380, specialKind: 'set' },
  intertransversarii_mediales_lumborum: { pt: 'Músculos intertransversários mediais do lombo', la: 'Musculi intertransversarii mediales lumborum', region: 'trunk', orient: 'posterior', target: 420, specialKind: 'set' },
  levatores_costarum_breves: { pt: 'Músculos levantadores curtos das costelas', la: 'Musculi levatores costarum breves', region: 'trunk', orient: 'posterior', target: 380, specialKind: 'set' },
  levatores_costarum_longi: { pt: 'Músculos levantadores longos das costelas', la: 'Musculi levatores costarum longi', region: 'trunk', orient: 'posterior', target: 450, specialKind: 'set' },

  // Tórax
  diaphragma: { pt: 'Diafragma', la: 'Diaphragma', region: 'trunk', orient: 'anterior', target: 1600 },
  intercostales_externi: { pt: 'Músculos intercostais externos', la: 'Musculi intercostales externi', region: 'trunk', orient: 'anterior', target: 2200, specialKind: 'bilateral_merged' },
  intercostales_interni: { pt: 'Músculos intercostais internos', la: 'Musculi intercostales interni', region: 'trunk', orient: 'anterior', target: 2000, specialKind: 'bilateral_merged' },
  intercostales_intimi: { pt: 'Músculos intercostais íntimos', la: 'Musculi intercostales intimi', region: 'trunk', orient: 'anterior', target: 1800, specialKind: 'bilateral_merged' },
  transversus_thoracis: { pt: 'Músculo transverso do tórax', la: 'Musculus transversus thoracis', region: 'trunk', orient: 'anterior', target: 360 },

  // Abdome e assoalho pélvico
  rectus_abdominis: { pt: 'Músculo reto do abdome', la: 'Musculus rectus abdominis', region: 'trunk', orient: 'anterior', target: 1100 },
  obliquus_externus_abdominis: { pt: 'Músculo oblíquo externo do abdome', la: 'Musculus obliquus externus abdominis', region: 'trunk', orient: 'anterolateral', target: 1300 },
  obliquus_internus_abdominis: { pt: 'Músculo oblíquo interno do abdome', la: 'Musculus obliquus internus abdominis', region: 'trunk', orient: 'anterolateral', target: 1000 },
  transversus_abdominis: { pt: 'Músculo transverso do abdome', la: 'Musculus transversus abdominis', region: 'trunk', orient: 'anterolateral', target: 1000 },
  pyramidalis: { pt: 'Músculo piramidal', la: 'Musculus pyramidalis', region: 'trunk', orient: 'anterior', target: 260 },
  quadratus_lumborum: { pt: 'Músculo quadrado do lombo', la: 'Musculus quadratus lumborum', region: 'trunk', orient: 'posterior', target: 420 },
  linea_alba: { pt: 'Linha alba', la: 'Linea alba', region: 'trunk', orient: 'anterior', target: 360, specialKind: 'fibrous_structure' },
  levator_ani: { pt: 'Músculo levantador do ânus', la: 'Musculus levator ani', region: 'trunk', orient: 'posterior', target: 280 },
  coccygeus: { pt: 'Músculo coccígeo (isquiococcígeo)', la: 'Musculus coccygeus', region: 'trunk', orient: 'posterior', target: 260 },
  sphincter_ani_externus: { pt: 'Músculo esfíncter externo do ânus', la: 'Musculus sphincter ani externus', region: 'trunk', orient: 'posterior', target: 260 },

  // === MEMBRO SUPERIOR (upper_limb — além da v1) ===
  pectoralis_minor: { pt: 'Músculo peitoral menor', la: 'Musculus pectoralis minor', region: 'upper_limb', orient: 'anterior', target: 480 },
  subclavius: { pt: 'Músculo subclávio', la: 'Musculus subclavius', region: 'upper_limb', orient: 'anterior', target: 260 },
  serratus_anterior: { pt: 'Músculo serrátil anterior', la: 'Musculus serratus anterior', region: 'upper_limb', orient: 'anterolateral', target: 1100 },
  supraspinatus: { pt: 'Músculo supraespinal', la: 'Musculus supraspinatus', region: 'upper_limb', orient: 'posterior', target: 380 },
  infraspinatus: { pt: 'Músculo infraespinal', la: 'Musculus infraspinatus', region: 'upper_limb', orient: 'posterior', target: 500 },
  teres_minor: { pt: 'Músculo redondo menor', la: 'Musculus teres minor', region: 'upper_limb', orient: 'posterior', target: 320 },
  teres_major: { pt: 'Músculo redondo maior', la: 'Musculus teres major', region: 'upper_limb', orient: 'posterior', target: 360 },
  subscapularis: { pt: 'Músculo subescapular', la: 'Musculus subscapularis', region: 'upper_limb', orient: 'anterior', target: 480 },
  coracobrachialis: { pt: 'Músculo coracobraquial', la: 'Musculus coracobrachialis', region: 'upper_limb', orient: 'anterior', target: 300 },
  anconeus: { pt: 'Músculo ancôneo', la: 'Musculus anconeus', region: 'upper_limb', orient: 'posterior', target: 280 },
  // Antebraço anterior
  pronator_teres: { pt: 'Músculo pronador redondo', la: 'Musculus pronator teres', region: 'upper_limb', orient: 'anterior', target: 300 },
  flexor_carpi_radialis: { pt: 'Músculo flexor radial do carpo', la: 'Musculus flexor carpi radialis', region: 'upper_limb', orient: 'anterior', target: 360 },
  palmaris_longus: { pt: 'Músculo palmar longo', la: 'Musculus palmaris longus', region: 'upper_limb', orient: 'anterior', target: 400 },
  flexor_carpi_ulnaris: { pt: 'Músculo flexor ulnar do carpo', la: 'Musculus flexor carpi ulnaris', region: 'upper_limb', orient: 'anterior', target: 320 },
  flexor_digitorum_superficialis: { pt: 'Músculo flexor superficial dos dedos', la: 'Musculus flexor digitorum superficialis', region: 'upper_limb', orient: 'anterior', target: 520 },
  flexor_digitorum_profundus: { pt: 'Músculo flexor profundo dos dedos', la: 'Musculus flexor digitorum profundus', region: 'upper_limb', orient: 'anterior', target: 650 },
  flexor_pollicis_longus: { pt: 'Músculo flexor longo do polegar', la: 'Musculus flexor pollicis longus', region: 'upper_limb', orient: 'anterior', target: 360 },
  pronator_quadratus: { pt: 'Músculo pronador quadrado', la: 'Musculus pronator quadratus', region: 'upper_limb', orient: 'anterior', target: 280 },
  // Antebraço posterior
  extensor_carpi_radialis_longus: { pt: 'Músculo extensor radial longo do carpo', la: 'Musculus extensor carpi radialis longus', region: 'upper_limb', orient: 'posterolateral', target: 440 },
  extensor_carpi_radialis_brevis: { pt: 'Músculo extensor radial curto do carpo', la: 'Musculus extensor carpi radialis brevis', region: 'upper_limb', orient: 'posterolateral', target: 400 },
  extensor_digitorum: { pt: 'Músculo extensor dos dedos', la: 'Musculus extensor digitorum', region: 'upper_limb', orient: 'posterior', target: 600 },
  extensor_digiti_minimi: { pt: 'Músculo extensor do dedo mínimo', la: 'Musculus extensor digiti minimi', region: 'upper_limb', orient: 'posterior', target: 340 },
  extensor_carpi_ulnaris: { pt: 'Músculo extensor ulnar do carpo', la: 'Musculus extensor carpi ulnaris', region: 'upper_limb', orient: 'posterior', target: 320 },
  supinator: { pt: 'Músculo supinador', la: 'Musculus supinator', region: 'upper_limb', orient: 'posterolateral', target: 360 },
  abductor_pollicis_longus: { pt: 'Músculo abdutor longo do polegar', la: 'Musculus abductor pollicis longus', region: 'upper_limb', orient: 'posterolateral', target: 340 },
  extensor_pollicis_brevis: { pt: 'Músculo extensor curto do polegar', la: 'Musculus extensor pollicis brevis', region: 'upper_limb', orient: 'posterolateral', target: 280 },
  extensor_pollicis_longus: { pt: 'Músculo extensor longo do polegar', la: 'Musculus extensor pollicis longus', region: 'upper_limb', orient: 'posterior', target: 300 },
  extensor_indicis: { pt: 'Músculo extensor do indicador', la: 'Musculus extensor indicis', region: 'upper_limb', orient: 'posterior', target: 280 },
  // Mão
  abductor_pollicis_brevis: { pt: 'Músculo abdutor curto do polegar', la: 'Musculus abductor pollicis brevis', region: 'upper_limb', orient: 'anterior', target: 240 },
  flexor_pollicis_brevis: { pt: 'Músculo flexor curto do polegar', la: 'Musculus flexor pollicis brevis', region: 'upper_limb', orient: 'anterior', target: 200 },
  opponens_pollicis: { pt: 'Músculo oponente do polegar', la: 'Musculus opponens pollicis', region: 'upper_limb', orient: 'anterior', target: 240 },
  adductor_pollicis: { pt: 'Músculo adutor do polegar', la: 'Musculus adductor pollicis', region: 'upper_limb', orient: 'anterior', target: 220 },
  abductor_digiti_minimi_manus: { pt: 'Músculo abdutor do dedo mínimo da mão', la: 'Musculus abductor digiti minimi manus', region: 'upper_limb', orient: 'anterior', target: 240 },
  flexor_digiti_minimi_brevis_manus: { pt: 'Músculo flexor curto do dedo mínimo da mão', la: 'Musculus flexor digiti minimi brevis manus', region: 'upper_limb', orient: 'anterior', target: 200 },
  opponens_digiti_minimi_manus: { pt: 'Músculo oponente do dedo mínimo da mão', la: 'Musculus opponens digiti minimi manus', region: 'upper_limb', orient: 'anterior', target: 220 },
  lumbricales_manus: { pt: 'Músculos lumbricais da mão', la: 'Musculi lumbricales manus', region: 'upper_limb', orient: 'anterior', target: 360, specialKind: 'set' },
  interossei_dorsales_manus: { pt: 'Músculos interósseos dorsais da mão', la: 'Musculi interossei dorsales manus', region: 'upper_limb', orient: 'posterior', target: 380, specialKind: 'set' },
  interossei_palmares: { pt: 'Músculos interósseos palmares', la: 'Musculi interossei palmares', region: 'upper_limb', orient: 'anterior', target: 280, specialKind: 'set' },

  // === MEMBRO INFERIOR (lower_limb) ===
  gluteus_maximus: { pt: 'Músculo glúteo máximo', la: 'Musculus gluteus maximus', region: 'lower_limb', orient: 'posterior', target: 900 },
  gluteus_medius: { pt: 'Músculo glúteo médio', la: 'Musculus gluteus medius', region: 'lower_limb', orient: 'posterolateral', target: 700 },
  gluteus_minimus: { pt: 'Músculo glúteo mínimo', la: 'Musculus gluteus minimus', region: 'lower_limb', orient: 'lateral', target: 600 },
  tensor_fasciae_latae: { pt: 'Músculo tensor da fáscia lata', la: 'Musculus tensor fasciae latae', region: 'lower_limb', orient: 'anterolateral', target: 420 },
  tractus_iliotibialis: { pt: 'Trato iliotibial', la: 'Tractus iliotibialis', region: 'lower_limb', orient: 'lateral', target: 850, specialKind: 'fascia' },
  piriformis: { pt: 'Músculo piriforme', la: 'Musculus piriformis', region: 'lower_limb', orient: 'posterior', target: 320 },
  obturatorius_internus: { pt: 'Músculo obturador interno', la: 'Musculus obturatorius internus', region: 'lower_limb', orient: 'posterior', target: 420 },
  obturatorius_externus: { pt: 'Músculo obturador externo', la: 'Musculus obturatorius externus', region: 'lower_limb', orient: 'anterior', target: 300 },
  gemellus_superior: { pt: 'Músculo gêmeo superior', la: 'Musculus gemellus superior', region: 'lower_limb', orient: 'posterior', target: 240 },
  gemellus_inferior: { pt: 'Músculo gêmeo inferior', la: 'Musculus gemellus inferior', region: 'lower_limb', orient: 'posterior', target: 260 },
  quadratus_femoris: { pt: 'Músculo quadrado femoral', la: 'Musculus quadratus femoris', region: 'lower_limb', orient: 'posterior', target: 320 },
  iliacus: { pt: 'Músculo ilíaco', la: 'Musculus iliacus', region: 'lower_limb', orient: 'anterior', target: 550 },
  psoas_major: { pt: 'Músculo psoas maior', la: 'Musculus psoas major', region: 'lower_limb', orient: 'anterior', target: 620 },
  // Coxa
  sartorius: { pt: 'Músculo sartório', la: 'Musculus sartorius', region: 'lower_limb', orient: 'anterior', target: 650 },
  rectus_femoris: { pt: 'Músculo reto femoral', la: 'Musculus rectus femoris', region: 'lower_limb', orient: 'anterior', target: 850 },
  vastus_lateralis: { pt: 'Músculo vasto lateral', la: 'Musculus vastus lateralis', region: 'lower_limb', orient: 'anterolateral', target: 900 },
  vastus_medialis: { pt: 'Músculo vasto medial', la: 'Musculus vastus medialis', region: 'lower_limb', orient: 'anteromedial', target: 750 },
  vastus_intermedius: { pt: 'Músculo vasto intermédio', la: 'Musculus vastus intermedius', region: 'lower_limb', orient: 'anterior', target: 700 },
  pectineus: { pt: 'Músculo pectíneo', la: 'Musculus pectineus', region: 'lower_limb', orient: 'anterior', target: 360 },
  adductor_longus: { pt: 'Músculo adutor longo', la: 'Musculus adductor longus', region: 'lower_limb', orient: 'anteromedial', target: 500 },
  adductor_brevis: { pt: 'Músculo adutor curto', la: 'Musculus adductor brevis', region: 'lower_limb', orient: 'anteromedial', target: 380 },
  adductor_magnus: { pt: 'Músculo adutor magno', la: 'Musculus adductor magnus', region: 'lower_limb', orient: 'posteromedial', target: 800 },
  adductor_minimus: { pt: 'Músculo adutor mínimo', la: 'Musculus adductor minimus', region: 'lower_limb', orient: 'posterior', target: 280 },
  gracilis: { pt: 'Músculo grácil', la: 'Musculus gracilis', region: 'lower_limb', orient: 'medial', target: 550 },
  biceps_femoris: { pt: 'Músculo bíceps femoral', la: 'Musculus biceps femoris', region: 'lower_limb', orient: 'posterior', target: 520 },
  semitendinosus: { pt: 'Músculo semitendíneo', la: 'Musculus semitendinosus', region: 'lower_limb', orient: 'posterior', target: 550 },
  semimembranosus: { pt: 'Músculo semimembranáceo', la: 'Musculus semimembranosus', region: 'lower_limb', orient: 'posterior', target: 650 },
  // Perna
  tibialis_anterior: { pt: 'Músculo tibial anterior', la: 'Musculus tibialis anterior', region: 'lower_limb', orient: 'anterior', target: 550 },
  extensor_hallucis_longus: { pt: 'Músculo extensor longo do hálux', la: 'Musculus extensor hallucis longus', region: 'lower_limb', orient: 'anterior', target: 400 },
  extensor_digitorum_longus: { pt: 'Músculo extensor longo dos dedos', la: 'Musculus extensor digitorum longus', region: 'lower_limb', orient: 'anterolateral', target: 620 },
  fibularis_tertius: { pt: 'Músculo fibular terceiro', la: 'Musculus fibularis tertius', region: 'lower_limb', orient: 'anterolateral', target: 260 },
  fibularis_longus: { pt: 'Músculo fibular longo', la: 'Musculus fibularis longus', region: 'lower_limb', orient: 'lateral', target: 580 },
  fibularis_brevis: { pt: 'Músculo fibular curto', la: 'Musculus fibularis brevis', region: 'lower_limb', orient: 'lateral', target: 460 },
  gastrocnemius: { pt: 'Músculo gastrocnêmio', la: 'Musculus gastrocnemius', region: 'lower_limb', orient: 'posterior', target: 520 },
  soleus: { pt: 'Músculo sóleo', la: 'Musculus soleus', region: 'lower_limb', orient: 'posterior', target: 700 },
  tendo_calcaneus: { pt: 'Tendão do calcâneo (tendão de Aquiles)', la: 'Tendo calcaneus', region: 'lower_limb', orient: 'posterior', target: 520, specialKind: 'tendon' },
  plantaris: { pt: 'Músculo plantar', la: 'Musculus plantaris', region: 'lower_limb', orient: 'posterior', target: 440 },
  popliteus: { pt: 'Músculo poplíteo', la: 'Musculus popliteus', region: 'lower_limb', orient: 'posterior', target: 300 },
  tibialis_posterior: { pt: 'Músculo tibial posterior', la: 'Musculus tibialis posterior', region: 'lower_limb', orient: 'posterior', target: 550 },
  flexor_digitorum_longus: { pt: 'Músculo flexor longo dos dedos', la: 'Musculus flexor digitorum longus', region: 'lower_limb', orient: 'posterior', target: 600 },
  flexor_hallucis_longus: { pt: 'Músculo flexor longo do hálux', la: 'Musculus flexor hallucis longus', region: 'lower_limb', orient: 'posterior', target: 550 },
  // Pé
  extensor_digitorum_brevis: { pt: 'Músculo extensor curto dos dedos', la: 'Musculus extensor digitorum brevis', region: 'lower_limb', orient: 'anterior_superior', target: 360 },
  extensor_hallucis_brevis: { pt: 'Músculo extensor curto do hálux', la: 'Musculus extensor hallucis brevis', region: 'lower_limb', orient: 'anterior_superior', target: 260 },
  abductor_hallucis: { pt: 'Músculo abdutor do hálux', la: 'Musculus abductor hallucis', region: 'lower_limb', orient: 'medial', target: 320 },
  flexor_digitorum_brevis: { pt: 'Músculo flexor curto dos dedos', la: 'Musculus flexor digitorum brevis', region: 'lower_limb', orient: 'inferior', target: 380 },
  abductor_digiti_minimi_pedis: { pt: 'Músculo abdutor do dedo mínimo do pé', la: 'Musculus abductor digiti minimi pedis', region: 'lower_limb', orient: 'lateral', target: 300 },
  quadratus_plantae: { pt: 'Músculo quadrado plantar', la: 'Musculus quadratus plantae', region: 'lower_limb', orient: 'inferior', target: 280 },
  flexor_hallucis_brevis: { pt: 'Músculo flexor curto do hálux', la: 'Musculus flexor hallucis brevis', region: 'lower_limb', orient: 'inferior', target: 220 },
  adductor_hallucis: { pt: 'Músculo adutor do hálux', la: 'Musculus adductor hallucis', region: 'lower_limb', orient: 'inferior', target: 200 },
  flexor_digiti_minimi_brevis_pedis: { pt: 'Músculo flexor curto do dedo mínimo do pé', la: 'Musculus flexor digiti minimi brevis pedis', region: 'lower_limb', orient: 'lateral', target: 220 },
  opponens_digiti_minimi_pedis: { pt: 'Músculo oponente do dedo mínimo do pé', la: 'Musculus opponens digiti minimi pedis', region: 'lower_limb', orient: 'lateral', target: 180 },
  interossei_dorsales_pedis: { pt: 'Músculos interósseos dorsais do pé', la: 'Musculi interossei dorsales pedis', region: 'lower_limb', orient: 'anterior_superior', target: 360, specialKind: 'set' },
};

/**
 * Mapeamento de nome inglês limpo (sem right/left) -> slug canônico em MUSCLE_DICT.
 */
const ENGLISH_TO_MUSCLE_SLUG = {
  'orbicularis oris': 'orbicularis_oris',
  temporoparietalis: 'temporoparietalis',
  'aponeurosis of epicranius': 'galea_aponeurotica',
  temporalis: 'temporalis',
  'medial pterygoid': 'pterygoideus_medialis',
  buccinator: 'buccinator',
  procerus: 'procerus',
  nasalis: 'nasalis',
  'depressor septi nasi': 'depressor_septi_nasi',
  'corrugator supercilii': 'corrugator_supercilii',
  'levator labii superioris alaeque nasi': 'levator_labii_superioris_alaeque_nasi',
  'levator labii superioris': 'levator_labii_superioris',
  'levator anguli oris': 'levator_anguli_oris',
  'zygomaticus major': 'zygomaticus_major',
  'zygomaticus minor': 'zygomaticus_minor',
  risorius: 'risorius',
  'depressor anguli oris': 'depressor_anguli_oris',
  'depressor labii inferioris': 'depressor_labii_inferioris',
  mentalis: 'mentalis',

  platysma: 'platysma',
  sternocleidomastoid: 'sternocleidomastoideus',
  stylohyoid: 'stylohyoideus',
  mylohyoid: 'mylohyoideus',
  geniohyoid: 'geniohyoideus',
  sternohyoid: 'sternohyoideus',
  sternothyroid: 'sternothyroideus',
  thyrohyoid: 'thyrohyoideus',
  omohyoid: 'omohyoideus',
  'scalenus anterior': 'scalenus_anterior',
  'scalenus medius': 'scalenus_medius',
  'scalenus posterior': 'scalenus_posterior',
  'longus capitis': 'longus_capitis',
  'rectus capitis anterior': 'rectus_capitis_anterior',
  'rectus capitis lateralis': 'rectus_capitis_lateralis',
  'rectus capitis posterior major': 'rectus_capitis_posterior_major',
  'rectus capitis posterior minor': 'rectus_capitis_posterior_minor',
  'obliquus capitis superior': 'obliquus_capitis_superior',
  'obliquus capitis inferior': 'obliquus_capitis_inferior',

  'splenius capitis': 'splenius_capitis',
  'splenius cervicis': 'splenius_cervicis',
  'semispinalis capitis': 'semispinalis_capitis',
  'semispinalis cervicis': 'semispinalis_cervicis',
  'longissimus capitis': 'longissimus_capitis',
  'longissimus cervicis': 'longissimus_cervicis',
  'spinalis cervicis': 'spinalis_cervicis',
  'iliocostalis cervicis': 'iliocostalis_cervicis',
  'cervical rotator': 'rotatores_cervicis',
  'set of interspinales cervicis': 'interspinales_cervicis',
  'set of anterior cervical intertransversarii': 'intertransversarii_anteriores_cervicis',
  'set of posterior cervical intertransversarii': 'intertransversarii_posteriores_cervicis',

  'latissimus dorsi': 'latissimus_dorsi',
  'rhomboid major': 'rhomboideus_major',
  'rhomboid minor': 'rhomboideus_minor',
  'levator scapulae': 'levator_scapulae',
  'serratus posterior superior': 'serratus_posterior_superior',
  'serratus posterior inferior': 'serratus_posterior_inferior',
  'iliocostalis thoracis': 'iliocostalis_thoracis',
  'iliocostalis lumborum': 'iliocostalis_lumborum',
  'longissimus thoracis': 'longissimus_thoracis',
  'spinalis thoracis': 'spinalis_thoracis',
  'semispinalis thoracis': 'semispinalis_thoracis',
  multifidus: 'multifidus',
  'thoracic rotator': 'rotatores_thoracis',
  'lumbar rotator': 'rotatores_lumborum',
  'set of interspinales thoracis': 'interspinales_thoracis',
  'set of interspinales lumborum': 'interspinales_lumborum',
  'set of lateral lumbar intertransversarius muscles': 'intertransversarii_laterales_lumborum',
  'set of medial lumbar intertransversarius muscles': 'intertransversarii_mediales_lumborum',
  'set of levatores costarum breves': 'levatores_costarum_breves',
  'set of levatores costarum longi': 'levatores_costarum_longi',

  diaphragm: 'diaphragma',
  'external intercostal muscle': 'intercostales_externi',
  'internal intercostal muscle': 'intercostales_interni',
  'innermost intercostal muscle': 'intercostales_intimi',
  'transversus thoracis': 'transversus_thoracis',

  'rectus abdominis': 'rectus_abdominis',
  'external oblique': 'obliquus_externus_abdominis',
  'internal oblique': 'obliquus_internus_abdominis',
  'transversus abdominis': 'transversus_abdominis',
  pyramidalis: 'pyramidalis',
  'quadratus lumborum': 'quadratus_lumborum',
  'linea alba': 'linea_alba',
  coccygeus: 'coccygeus',
  'external anal sphincter': 'sphincter_ani_externus',

  'pectoralis minor': 'pectoralis_minor',
  subclavius: 'subclavius',
  'serratus anterior': 'serratus_anterior',
  supraspinatus: 'supraspinatus',
  'infraspinatus muscle': 'infraspinatus',
  'teres minor': 'teres_minor',
  'teres major': 'teres_major',
  subscapularis: 'subscapularis',
  coracobrachialis: 'coracobrachialis',
  anconeus: 'anconeus',
  'flexor carpi radialis': 'flexor_carpi_radialis',
  'palmaris longus': 'palmaris_longus',
  'flexor digitorum profundus': 'flexor_digitorum_profundus',
  'flexor pollicis longus': 'flexor_pollicis_longus',
  'pronator quadratus': 'pronator_quadratus',
  'extensor carpi radialis longus': 'extensor_carpi_radialis_longus',
  'extensor carpi radialis brevis': 'extensor_carpi_radialis_brevis',
  'extensor digitorum': 'extensor_digitorum',
  'extensor digiti minimi': 'extensor_digiti_minimi',
  supinator: 'supinator',
  'abductor pollicis longus': 'abductor_pollicis_longus',
  'extensor pollicis brevis': 'extensor_pollicis_brevis',
  'extensor pollicis longus': 'extensor_pollicis_longus',
  'extensor indicis': 'extensor_indicis',
  'abductor pollicis brevis': 'abductor_pollicis_brevis',
  'opponens pollicis': 'opponens_pollicis',
  'abductor digiti minimi of hand': 'abductor_digiti_minimi_manus',
  'flexor digiti minimi brevis of hand': 'flexor_digiti_minimi_brevis_manus',
  'opponens digiti minimi of hand': 'opponens_digiti_minimi_manus',
  'set of lumbricals of hand': 'lumbricales_manus',
  'set of dorsal interossei of hand': 'interossei_dorsales_manus',
  'set of palmar interossei of hand': 'interossei_palmares',

  'gluteus maximus': 'gluteus_maximus',
  'gluteus medius': 'gluteus_medius',
  'gluteus minimus': 'gluteus_minimus',
  'tensor fasciae latae': 'tensor_fasciae_latae',
  'iliotibial tract': 'tractus_iliotibialis',
  piriformis: 'piriformis',
  'obturator internus': 'obturatorius_internus',
  'obturator externus': 'obturatorius_externus',
  'gemellus superior': 'gemellus_superior',
  'gemellus inferior': 'gemellus_inferior',
  'quadratus femoris': 'quadratus_femoris',
  iliacus: 'iliacus',
  'psoas major': 'psoas_major',
  sartorius: 'sartorius',
  'rectus femoris': 'rectus_femoris',
  'vastus lateralis': 'vastus_lateralis',
  'vastus medialis': 'vastus_medialis',
  'vastus intermedius': 'vastus_intermedius',
  pectineus: 'pectineus',
  'adductor longus': 'adductor_longus',
  'adductor brevis': 'adductor_brevis',
  'adductor magnus': 'adductor_magnus',
  'adductor minimus': 'adductor_minimus',
  gracilis: 'gracilis',
  semitendinosus: 'semitendinosus',
  semimembranosus: 'semimembranosus',
  'tibialis anterior': 'tibialis_anterior',
  'extensor hallucis longus': 'extensor_hallucis_longus',
  'extensor digitorum longus': 'extensor_digitorum_longus',
  'fibularis tertius': 'fibularis_tertius',
  'fibularis longus': 'fibularis_longus',
  'fibularis brevis': 'fibularis_brevis',
  soleus: 'soleus',
  'calcaneal tendon': 'tendo_calcaneus',
  plantaris: 'plantaris',
  popliteus: 'popliteus',
  'tibialis posterior': 'tibialis_posterior',
  'flexor digitorum longus': 'flexor_digitorum_longus',
  'flexor hallucis longus': 'flexor_hallucis_longus',
  'extensor digitorum brevis': 'extensor_digitorum_brevis',
  'extensor hallucis brevis': 'extensor_hallucis_brevis',
  'abductor hallucis': 'abductor_hallucis',
  'flexor digitorum brevis': 'flexor_digitorum_brevis',
  'abductor digiti minimi of foot': 'abductor_digiti_minimi_pedis',
  'flexor accessorius': 'quadratus_plantae',
  'flexor digiti minimi brevis of foot': 'flexor_digiti_minimi_brevis_pedis',
  'opponens digiti minimi of foot': 'opponens_digiti_minimi_pedis',
  'set of dorsal interossei of foot': 'interossei_dorsales_pedis',
};

// ============================================================================
// VETORES DIRECIONAIS INICIAIS POR ORIENTAÇÃO ANATÔMICA E LATERALIDADE
// ============================================================================

function computeInitialVectors(orient, laterality) {
  // +X = esquerda anatômica, -X = direita anatômica, +Y = superior, +Z = anterior
  const s = laterality === 'right' ? -1 : laterality === 'left' ? 1 : 0;

  let anchor = [0, 0, 1];
  let focus = [0, 0.08, 1];
  const yBias = 0.0;

  switch (orient) {
    case 'anterior':
      anchor = [s * 0.22, 0.0, 0.975];
      focus = [s * 0.28, 0.08, 0.955];
      break;
    case 'anterior_superior':
      anchor = [s * 0.2, 0.45, 0.87];
      focus = [s * 0.25, 0.35, 0.9];
      break;
    case 'anterolateral':
      anchor = [s * 0.65, 0.0, 0.76];
      focus = [s * 0.6, 0.08, 0.79];
      break;
    case 'anteromedial':
      anchor = [s * -0.25, 0.0, 0.968];
      focus = [s * 0.15, 0.06, 0.986];
      break;
    case 'lateral':
      anchor = [s === 0 ? 0.0 : s * 0.96, 0.05, 0.27];
      focus = [s === 0 ? 0.0 : s * 0.9, 0.12, 0.41];
      break;
    case 'lateral_superior':
      anchor = [s * 0.82, 0.45, 0.35];
      focus = [s * 0.78, 0.35, 0.52];
      break;
    case 'medial':
      anchor = [s * -0.4, 0.0, 0.916];
      focus = [s * -0.15, 0.08, 0.985];
      break;
    case 'posterior':
      anchor = [s * 0.22, 0.0, -0.975];
      focus = [s * 0.3, 0.08, -0.95];
      break;
    case 'posterolateral':
      anchor = [s * 0.65, 0.0, -0.76];
      focus = [s * 0.6, 0.08, -0.79];
      break;
    case 'posteromedial':
      anchor = [s * -0.25, 0.0, -0.968];
      focus = [s * 0.15, 0.08, -0.985];
      break;
    case 'superior':
      anchor = [s * 0.1, 0.94, 0.32];
      focus = [s * 0.15, 0.7, 0.7];
      break;
    case 'inferior':
      anchor = [s * 0.2, -0.85, 0.48];
      focus = [s * 0.25, -0.55, 0.79];
      break;
    default:
      anchor = [s * 0.22, 0.0, 0.975];
      focus = [s * 0.28, 0.08, 0.955];
  }

  return {
    anchorDirection: normalizeVec3(anchor),
    yBias,
    focusDirection: normalizeVec3(focus),
  };
}

function clampTriangles(target, rawTriangles) {
  const minTris = Math.min(rawTriangles, 140);
  return Math.max(minTris, Math.min(Math.round(target), rawTriangles));
}

function extractLateralityAndCleanName(enName) {
  let laterality = 'midline';
  if (/\bright\b/i.test(enName)) laterality = 'right';
  else if (/\bleft\b/i.test(enName)) laterality = 'left';

  const clean = enName
    .replace(/\b(right|left)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\bof\s+of\b/gi, 'of')
    .trim();

  return { laterality, clean };
}

function slugifyAscii(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ============================================================================
// CLASSIFICAÇÃO DE OSSOS (203 STLs)
// ============================================================================

function buildSkeletalStructures(skelIds, v1ByFma, data, audit) {
  const { stlSizeMap, namesMap, ta2ByEn } = data;
  const structures = [];
  const handled = new Set();

  // 1. Preserva 100% verbatim os 10 ossos da v1
  for (const s of V1_CATALOG.filter((x) => x.system === 'skeletal')) {
    structures.push({
      ...structuredClone(s),
      sourcePhase: 'v1',
      needsTranslationReview: false,
    });
    for (const p of s.parts) handled.add(p.fmaId);
  }

  // 2. Esterno composto (3 STLs: FMA7486 manubrium, FMA7487 body of sternum, FMA7488 xiphoid process)
  const sternumPartsSpec = [
    { fmaId: 'FMA7486', suffix: 'manubrium', target: 650 },
    { fmaId: 'FMA7487', suffix: 'corpus', target: 850 },
    { fmaId: 'FMA7488', suffix: 'processus_xiphoideus', target: 350 },
  ];
  const sternumParts = [];
  for (const sp of sternumPartsSpec) {
    if (skelIds.includes(sp.fmaId)) {
      const bytes = stlSizeMap.get(sp.fmaId);
      const rawTris = (bytes - 84) / 50;
      sternumParts.push({
        nodeName: `bone.sternum.midline.${sp.suffix}`,
        fmaId: sp.fmaId,
        targetTriangles: clampTriangles(sp.target, rawTris),
        expectedBytes: bytes,
      });
      handled.add(sp.fmaId);
    }
  }
  if (sternumParts.length > 0) {
    structures.push({
      anatomyId: 'bone.sternum.midline',
      system: 'skeletal',
      laterality: 'midline',
      region: 'trunk',
      displayName: { 'pt-BR': 'Esterno', la: 'Sternum' },
      scientificName: 'Sternum',
      parts: sternumParts,
      ...computeInitialVectors('anterior', 'midline'),
      sourcePhase: 'v2',
      needsTranslationReview: false,
    });
    audit.groupings.push({
      anatomyId: 'bone.sternum.midline',
      system: 'skeletal',
      partCount: sternumParts.length,
      parts: sternumParts.map((p) => `${p.nodeName} (${p.fmaId})`),
      rationale: 'Manúbrio, corpo e processo xifoide sob FMA7485 (sternum).',
    });
  }

  // 3. Demais 190 STLs ósseos
  for (const id of skelIds) {
    if (handled.has(id)) continue;
    const enName = namesMap.get(id) ?? '';
    const bytes = stlSizeMap.get(id);
    const rawTris = (bytes - 84) / 50;
    const { laterality, clean } = extractLateralityAndCleanName(enName);

    let entry = null;

    // 3a. Vértebras (atlas, axis, C3-C7, T1-T12, L1-L5)
    if (clean === 'atlas') {
      entry = {
        anatomyId: 'bone.vertebra_cervicalis.midline.c1',
        laterality: 'midline',
        region: 'head_neck',
        pt: 'Atlas (1ª vértebra cervical — C1)',
        la: 'Atlas (Vertebra cervicalis I)',
        orient: 'posterior',
        target: 1100,
      };
    } else if (clean === 'axis') {
      entry = {
        anatomyId: 'bone.vertebra_cervicalis.midline.c2',
        laterality: 'midline',
        region: 'head_neck',
        pt: 'Áxis (2ª vértebra cervical — C2)',
        la: 'Axis (Vertebra cervicalis II)',
        orient: 'posterior',
        target: 1100,
      };
    } else {
      const vertMatch = clean.match(/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) (cervical|thoracic|lumbar) vertebra$/i);
      if (vertMatch) {
        const ord = ORDINAL_MAP[vertMatch[1].toLowerCase()];
        const kind = vertMatch[2].toLowerCase();
        const mapKind = {
          cervical: { slug: 'vertebra_cervicalis', code: 'c', region: 'head_neck', pt: 'vértebra cervical', la: 'Vertebra cervicalis', target: 950 },
          thoracic: { slug: 'vertebra_thoracica', code: 't', region: 'trunk', pt: 'vértebra torácica', la: 'Vertebra thoracica', target: 1050 },
          lumbar: { slug: 'vertebra_lumbalis', code: 'l', region: 'trunk', pt: 'vértebra lombar', la: 'Vertebra lumbalis', target: 1200 },
        }[kind];
        entry = {
          anatomyId: `bone.${mapKind.slug}.midline.${mapKind.code}${ord.num}`,
          laterality: 'midline',
          region: mapKind.region,
          pt: `${ord.ptFem} ${mapKind.pt} (${mapKind.code.toUpperCase()}${ord.num})`,
          la: `${mapKind.la} ${ord.roman}`,
          orient: 'posterior',
          target: mapKind.target,
        };
      }
    }

    // 3b. Costelas (1..12 right/left)
    if (!entry) {
      const ribMatch = clean.match(/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) rib$/i);
      if (ribMatch) {
        const ord = ORDINAL_MAP[ribMatch[1].toLowerCase()];
        entry = {
          anatomyId: `bone.costa.${laterality}.${ord.num}`,
          laterality,
          region: 'trunk',
          pt: `${ord.ptFem} costela`,
          la: `Costa ${ord.roman}`,
          orient: ord.num >= 11 ? 'posterolateral' : 'anterolateral',
          target: ord.num >= 11 ? 450 : 620,
        };
      }
    }

    // 3c. Metacarpos (1..5 right/left)
    if (!entry) {
      const mcMatch = clean.match(/^(first|second|third|fourth|fifth) metacarpal bone$/i);
      if (mcMatch) {
        const ord = ORDINAL_MAP[mcMatch[1].toLowerCase()];
        entry = {
          anatomyId: `bone.os_metacarpi.${laterality}.${ord.num}`,
          laterality,
          region: 'upper_limb',
          pt: `${ord.ptMasc} osso metacarpal`,
          la: `Os metacarpi ${ord.roman}`,
          orient: 'posterior',
          target: 360,
        };
      }
    }

    // 3d. Metatarsos (1..5 right/left)
    if (!entry) {
      const mtMatch = clean.match(/^(first|second|third|fourth|fifth) metatarsal bone$/i);
      if (mtMatch) {
        const ord = ORDINAL_MAP[mtMatch[1].toLowerCase()];
        entry = {
          anatomyId: `bone.os_metatarsi.${laterality}.${ord.num}`,
          laterality,
          region: 'lower_limb',
          pt: `${ord.ptMasc} osso metatarsal`,
          la: `Os metatarsi ${ord.roman}`,
          orient: 'anterior_superior',
          target: 420,
        };
      }
    }

    // 3e. Falanges da mão
    if (!entry) {
      const handPhalMatch = clean.match(/^(proximal|middle|distal) phalanx of (thumb|index finger|middle finger|ring finger|little finger)$/i);
      if (handPhalMatch) {
        const seg = handPhalMatch[1].toLowerCase();
        const finger = FINGER_MAP[handPhalMatch[2].toLowerCase()];
        const segMap = {
          proximal: { slug: 'phalanx_proximalis_manus', pt: 'Falange proximal', la: 'Phalanx proximalis', target: 260 },
          middle: { slug: 'phalanx_media_manus', pt: 'Falange média', la: 'Phalanx media', target: 220 },
          distal: { slug: 'phalanx_distalis_manus', pt: 'Falange distal', la: 'Phalanx distalis', target: 180 },
        }[seg];
        entry = {
          anatomyId: `bone.${segMap.slug}.${laterality}.${finger.num}`,
          laterality,
          region: 'upper_limb',
          pt: `${segMap.pt} do ${finger.pt}`,
          la: `${segMap.la} ${finger.la}`,
          orient: 'posterior',
          target: segMap.target,
        };
      }
    }

    // 3f. Falanges do pé
    if (!entry) {
      const footPhalMatch = clean.match(/^(proximal|middle|distal) phalanx of (big toe|second toe|third toe|fourth toe|little toe)$/i);
      if (footPhalMatch) {
        const seg = footPhalMatch[1].toLowerCase();
        const toe = TOE_MAP[footPhalMatch[2].toLowerCase()];
        const segMap = {
          proximal: { slug: 'phalanx_proximalis_pedis', pt: 'Falange proximal', la: 'Phalanx proximalis', target: 240 },
          middle: { slug: 'phalanx_media_pedis', pt: 'Falange média', la: 'Phalanx media', target: 190 },
          distal: { slug: 'phalanx_distalis_pedis', pt: 'Falange distal', la: 'Phalanx distalis', target: 170 },
        }[seg];
        entry = {
          anatomyId: `bone.${segMap.slug}.${laterality}.${toe.num}`,
          laterality,
          region: 'lower_limb',
          pt: `${segMap.pt} do ${toe.pt}`,
          la: `${segMap.la} ${toe.la}`,
          orient: 'anterior_superior',
          target: segMap.target,
        };
      }
    }

    // 3g. Ossos simples no dicionário curado
    if (!entry) {
      const dict = BONE_SINGLE_DICT[clean.toLowerCase()];
      if (dict) {
        entry = {
          anatomyId: `bone.${dict.slug}.${laterality}`,
          laterality,
          region: dict.region,
          pt: dict.pt,
          la: dict.la,
          orient: dict.orient,
          target: dict.target,
        };
      }
    }

    // 3h. Fallback automático via TA2.csv (marca needsTranslationReview: true)
    let needsReview = false;
    if (!entry) {
      needsReview = true;
      const ta2 = ta2ByEn.get(normalizeKey(clean));
      const slug = slugifyAscii(ta2?.la || clean);
      entry = {
        anatomyId: `bone.${slug}.${laterality}`,
        laterality,
        region: 'trunk',
        pt: ta2?.pt || clean,
        la: ta2?.la || clean,
        orient: 'anterior',
        target: 600,
      };
      audit.needsTranslationReview.push({
        anatomyId: entry.anatomyId,
        fmaId: id,
        enName,
        fallbackPt: entry.pt,
        fallbackLa: entry.la,
      });
    }

    structures.push({
      anatomyId: entry.anatomyId,
      system: 'skeletal',
      laterality: entry.laterality,
      region: entry.region,
      displayName: { 'pt-BR': entry.pt, la: entry.la },
      scientificName: entry.la,
      parts: [
        {
          nodeName: entry.anatomyId,
          fmaId: id,
          targetTriangles: clampTriangles(entry.target, rawTris),
          expectedBytes: bytes,
        },
      ],
      ...computeInitialVectors(entry.orient, entry.laterality),
      sourcePhase: 'v2',
      needsTranslationReview: needsReview,
    });
    handled.add(id);
  }

  return structures;
}

// ============================================================================
// CLASSIFICAÇÃO DE MÚSCULOS (435 STLs)
// ============================================================================

function buildMuscularStructures(muscIds, data, audit) {
  const { stlSizeMap, namesMap, childrenOf, parentsOf, ta2ByEn } = data;
  const structures = [];
  const handled = new Set();

  // 1. Preserva 100% verbatim os 12 músculos (26 STLs) da v1
  for (const s of V1_CATALOG.filter((x) => x.system === 'muscular')) {
    structures.push({
      ...structuredClone(s),
      sourcePhase: 'v1',
      needsTranslationReview: false,
    });
    for (const p of s.parts) handled.add(p.fmaId);
  }

  // 2. Agrupa músculos compostos novos (definidos em COMPOSITE_MUSCLE_PARTS)
  const compositeBuckets = new Map(); // key = `${slug}.${laterality}` -> array of { id, suffix, parentFmaId }
  for (const id of muscIds) {
    if (handled.has(id)) continue;
    const comp = COMPOSITE_MUSCLE_PARTS[id];
    if (!comp) continue;
    const key = `${comp.slug}.${comp.laterality}`;
    if (!compositeBuckets.has(key)) compositeBuckets.set(key, []);
    compositeBuckets.get(key).push({ id, ...comp });
    handled.add(id);
  }

  for (const [key, items] of compositeBuckets.entries()) {
    const first = items[0];
    const meta = MUSCLE_DICT[first.slug];
    if (!meta) {
      throw new Error(`Slug composto não encontrado em MUSCLE_DICT: ${first.slug}`);
    }
    const anatomyId = `muscle.${first.slug}.${first.laterality}`;
    const parts = items.map((item) => {
      const bytes = stlSizeMap.get(item.id);
      const rawTris = (bytes - 84) / 50;
      const partObj = {
        nodeName: `${anatomyId}.${item.suffix}`,
        fmaId: item.partFmaId ?? item.id,
        targetTriangles: clampTriangles(meta.target, rawTris),
        expectedBytes: bytes,
      };
      if (item.partFmaId && item.partFmaId !== item.id) {
        partObj.stlId = item.id;
      }
      return partObj;
    });

    const structObj = {
      anatomyId,
      system: 'muscular',
      laterality: first.laterality,
      region: meta.region,
      displayName: { 'pt-BR': meta.pt, la: meta.la },
      scientificName: meta.la,
      parts,
      ...computeInitialVectors(meta.orient, first.laterality),
      sourcePhase: 'v2',
      needsTranslationReview: false,
    };
    if (first.structureFmaIds) {
      structObj.structureFmaIds = first.structureFmaIds;
    }

    structures.push(structObj);

    audit.groupings.push({
      anatomyId,
      system: 'muscular',
      partCount: parts.length,
      parts: parts.map((p) =>
        p.stlId ? `${p.nodeName} (stl=${p.stlId}, fma=${p.fmaId})` : `${p.nodeName} (${p.fmaId})`,
      ),
      rationale:
        first.slug === 'digastricus'
          ? 'Ventres anterior e posterior + tendão intermediário (FMA258850/FMA264840), ligação comprovada por BBox 3D em mm.'
          : first.structureFmaIds
            ? `Sub-partes/cabeças anatômicas com separação stlId (BP*) vs fmaId estrito (${first.structureFmaIds.join(', ')}).`
            : 'Sub-partes/cabeças anatômicas sob o mesmo músculo TA2.',
    });
  }

  // 3. Músculos numerados do pé (1º..4º lumbrical e 1º..3º interósseo plantar) e demais músculos simples
  for (const id of muscIds) {
    if (handled.has(id)) continue;
    const enName = namesMap.get(id) ?? '';
    const bytes = stlSizeMap.get(id);
    const rawTris = (bytes - 84) / 50;
    const { laterality, clean } = extractLateralityAndCleanName(enName);

    const ancestralBranches = findDirectBranches(id, 'FMA72954', childrenOf, namesMap);
    const immediateParents = [...(parentsOf.get(id) ?? [])].map((p) => `${p} (${namesMap.get(p) ?? ''})`);

    let entry = null;
    let needsReview = false;

    // 3a. Lumbricais numerados do pé (1º..4º)
    const footLumbMatch = clean.match(/^(first|second|third|fourth) lumbrical of foot$/i);
    if (footLumbMatch) {
      const ord = ORDINAL_MAP[footLumbMatch[1].toLowerCase()];
      entry = {
        anatomyId: `muscle.lumbricalis_pedis.${laterality}.${ord.num}`,
        laterality,
        region: 'lower_limb',
        pt: `${ord.ptMasc} músculo lumbrical do pé`,
        la: `Musculus lumbricalis ${ord.roman} pedis`,
        orient: 'inferior',
        target: 190,
      };
    }

    // 3b. Interósseos plantares numerados do pé (1º..3º)
    if (!entry) {
      const footInterMatch = clean.match(/^(first|second|third) plantar interosseous of foot$/i);
      if (footInterMatch) {
        const ord = ORDINAL_MAP[footInterMatch[1].toLowerCase()];
        entry = {
          anatomyId: `muscle.interosseus_plantaris.${laterality}.${ord.num}`,
          laterality,
          region: 'lower_limb',
          pt: `${ord.ptMasc} músculo interósseo plantar`,
          la: `Musculus interosseus plantaris ${ord.roman}`,
          orient: 'inferior',
          target: 200,
        };
      }
    }

    // 3c. Músculo simples no dicionário curado
    if (!entry) {
      const slug = ENGLISH_TO_MUSCLE_SLUG[clean.toLowerCase()];
      if (slug && MUSCLE_DICT[slug]) {
        const meta = MUSCLE_DICT[slug];
        entry = {
          anatomyId: `muscle.${slug}.${laterality}`,
          laterality,
          region: meta.region,
          pt: meta.pt,
          la: meta.la,
          orient: meta.orient,
          target: meta.target,
          specialKind: meta.specialKind,
        };
      }
    }

    // 3d. Fallback via TA2.csv (marca needsTranslationReview: true)
    if (!entry) {
      needsReview = true;
      const ta2 = ta2ByEn.get(normalizeKey(clean));
      const slug = slugifyAscii((ta2?.la || clean).replace(/^muscul(us|i)\s+/i, ''));
      let fallbackRegion = 'trunk';
      const branchIds = new Set(ancestralBranches.map((b) => b.id));
      if (branchIds.has('FMA71287') || branchIds.has('FMA71290')) fallbackRegion = 'head_neck';
      else if (branchIds.has('FMA9621')) fallbackRegion = 'upper_limb';
      else if (branchIds.has('FMA9622')) fallbackRegion = 'lower_limb';

      entry = {
        anatomyId: `muscle.${slug}.${laterality}`,
        laterality,
        region: fallbackRegion,
        pt: ta2?.pt || `Músculo ${clean}`,
        la: ta2?.la || clean,
        orient: 'anterior',
        target: 350,
      };
      audit.needsTranslationReview.push({
        anatomyId: entry.anatomyId,
        fmaId: id,
        enName,
        fallbackPt: entry.pt,
        fallbackLa: entry.la,
      });
    }

    if (entry.specialKind) {
      audit.specialStructures.push({
        kind: entry.specialKind,
        anatomyId: entry.anatomyId,
        fmaId: id,
        enName,
        laterality: entry.laterality,
        region: entry.region,
        rawTriangles: rawTris,
        ancestralBranches: ancestralBranches.map((b) => `${b.id}:${b.name}`),
        immediateParents,
      });
    }

    structures.push({
      anatomyId: entry.anatomyId,
      system: 'muscular',
      laterality: entry.laterality,
      region: entry.region,
      displayName: { 'pt-BR': entry.pt, la: entry.la },
      scientificName: entry.la,
      parts: [
        {
          nodeName: entry.anatomyId,
          fmaId: id,
          targetTriangles: clampTriangles(entry.target, rawTris),
          expectedBytes: bytes,
        },
      ],
      ...computeInitialVectors(entry.orient, entry.laterality),
      sourcePhase: 'v2',
      needsTranslationReview: needsReview,
    });
    handled.add(id);
  }

  return structures;
}

// ============================================================================
// VALIDAÇÃO INTERNA DO DRAFT E EMISSÃO
// ============================================================================

/**
 * Rebalanceia proporcionalmente os targetTriangles APENAS das estruturas novas (v2)
 * para fechar rigorosamente dentro das metas por sistema (esqueleto ~124k, musculatura ~186k,
 * total <= 320k), mantendo as 22 estruturas da v1 100% verbatim e preservando pisos mínimos
 * de densidade anatômica em ossos pequenos/crânio/vértebras.
 */
function rebalanceV2TriangleBudgets(structures, systemBudgets) {
  for (const [system, targetSystemTotal] of Object.entries(systemBudgets)) {
    const sysStructs = structures.filter((s) => s.system === system);
    const v1Total = sysStructs
      .filter((s) => s.sourcePhase === 'v1')
      .reduce((acc, s) => acc + s.parts.reduce((a, p) => a + p.targetTriangles, 0), 0);

    const v2Parts = sysStructs
      .filter((s) => s.sourcePhase !== 'v1')
      .flatMap((s) => s.parts);

    const availableForV2 = targetSystemTotal - v1Total;
    const currentV2Total = v2Parts.reduce((acc, p) => acc + p.targetTriangles, 0);
    if (currentV2Total <= availableForV2 || v2Parts.length === 0) continue;

    // Guarda piso mínimo e teto (rawTris) por peça
    const items = v2Parts.map((p) => {
      const rawTris = Math.floor((p.expectedBytes - 84) / 50);
      const minFloor = Math.min(rawTris, Math.max(120, Math.round(p.targetTriangles * 0.45)));
      return { part: p, rawTris, minFloor, base: p.targetTriangles };
    });

    // Water-filling iterativo para convergir exatamente no orçamento sem violar pisos
    let remainingBudget = availableForV2;
    let adjustable = items.slice();
    for (let iter = 0; iter < 6 && adjustable.length > 0; iter++) {
      const sumBase = adjustable.reduce((acc, it) => acc + it.base, 0);
      if (sumBase <= 0) break;
      const scale = remainingBudget / sumBase;
      const nextAdjustable = [];
      let lockedSum = 0;

      for (const it of adjustable) {
        const scaled = Math.round((it.base * scale) / 10) * 10;
        if (scaled <= it.minFloor) {
          it.part.targetTriangles = it.minFloor;
          lockedSum += it.minFloor;
        } else {
          it.part.targetTriangles = Math.min(it.rawTris, scaled);
          nextAdjustable.push(it);
        }
      }

      if (nextAdjustable.length === adjustable.length) break;
      remainingBudget -= lockedSum;
      adjustable = nextAdjustable;
    }
  }
}

/**
 * Overrides exatos de anchorDirection / focusDirection determinados pela auditoria
 * anatômica SUB-05 (P2-01b). Em glTF: +X = esquerda anatômica, -X = direita anatômica,
 * +Y = superior, +Z = anterior.
 */
const SUB05_VECTOR_OVERRIDES = {
  'bone.os_sesamoideum_pedis.left': {
    anchorDirection: [0.201, -0.853, 0.482],
    focusDirection: [0.251, -0.553, 0.794],
  },
  'bone.os_sesamoideum_pedis.right': {
    anchorDirection: [-0.201, -0.853, 0.482],
    focusDirection: [-0.251, -0.553, 0.794],
  },
  'muscle.gracilis.left': {
    focusDirection: [0.15, 0.06, 0.987],
  },
  'muscle.gracilis.right': {
    focusDirection: [-0.15, 0.06, 0.987],
  },
  'muscle.abductor_hallucis.left': {
    anchorDirection: [-0.4, -0.45, 0.798],
    focusDirection: [0.15, -0.35, 0.925],
  },
  'muscle.abductor_hallucis.right': {
    anchorDirection: [0.4, -0.45, 0.798],
    focusDirection: [-0.15, -0.35, 0.925],
  },
  'muscle.intercostales_externi.midline': {
    anchorDirection: [0.55, -0.1, 0.829],
    focusDirection: [0.5, 0.08, 0.862],
  },
  'muscle.intercostales_interni.midline': {
    anchorDirection: [0.55, -0.1, 0.829],
    focusDirection: [0.5, 0.08, 0.862],
  },
  'muscle.intercostales_intimi.midline': {
    anchorDirection: [0.55, -0.1, 0.829],
    focusDirection: [0.5, 0.08, 0.862],
  },
  'muscle.sphincter_ani_externus.midline': {
    anchorDirection: [0, -0.6, -0.8],
    focusDirection: [0, -0.45, -0.893],
  },
  'muscle.levator_ani.left': {
    anchorDirection: [0.2, -0.45, -0.87],
    focusDirection: [0.25, -0.4, -0.882],
  },
  'muscle.levator_ani.right': {
    anchorDirection: [-0.2, -0.45, -0.87],
    focusDirection: [-0.25, -0.4, -0.882],
  },
  'muscle.coccygeus.left': {
    anchorDirection: [0.2, -0.45, -0.87],
    focusDirection: [0.25, -0.4, -0.882],
  },
  'muscle.coccygeus.right': {
    anchorDirection: [-0.2, -0.45, -0.87],
    focusDirection: [-0.25, -0.4, -0.882],
  },
  'muscle.flexor_digiti_minimi_brevis_pedis.left': {
    anchorDirection: [0.6, -0.65, 0.466],
    focusDirection: [0.55, -0.45, 0.704],
  },
  'muscle.flexor_digiti_minimi_brevis_pedis.right': {
    anchorDirection: [-0.6, -0.65, 0.466],
    focusDirection: [-0.55, -0.45, 0.704],
  },
  'muscle.opponens_digiti_minimi_pedis.left': {
    anchorDirection: [0.6, -0.65, 0.466],
    focusDirection: [0.55, -0.45, 0.704],
  },
  'muscle.opponens_digiti_minimi_pedis.right': {
    anchorDirection: [-0.6, -0.65, 0.466],
    focusDirection: [-0.55, -0.45, 0.704],
  },
  // Ulna na v2: face posteromedial subcutânea (em glTF +X = esquerda anatômica, logo medial da ulna direita aponta +X)
  'bone.ulna.right': {
    anchorDirection: [0.35, 0.05, -0.935],
    focusDirection: [-0.25, 0.08, -0.965],
  },
  'bone.ulna.left': {
    anchorDirection: [-0.35, 0.05, -0.935],
    focusDirection: [0.25, 0.08, -0.965],
  },
};

function applySub05VectorOverrides(structures) {
  let applied = 0;
  for (const s of structures) {
    const ov = SUB05_VECTOR_OVERRIDES[s.anatomyId];
    if (!ov) continue;
    if (ov.anchorDirection) s.anchorDirection = ov.anchorDirection;
    if (ov.focusDirection) s.focusDirection = ov.focusDirection;
    if (ov.yBias !== undefined) s.yBias = ov.yBias;
    applied++;
  }
  if (applied !== Object.keys(SUB05_VECTOR_OVERRIDES).length) {
    throw new Error(
      `Esperado aplicar ${Object.keys(SUB05_VECTOR_OVERRIDES).length} overrides SUB-05, mas apenas ${applied} foram aplicados.`,
    );
  }
  return applied;
}

async function main() {
  console.log('=== ANATOMIA 3D — GERADOR DO CATÁLOGO RASCUNHO FASE 2 (v2) ===\n');
  console.log('[1/4] Carregando metadados BodyParts3D v3.0 e TA2.csv (cache .cache/bodyparts3d/)...');
  const data = await loadUpstreamData();
  const { stlSizeMap, namesMap, childrenOf, parentsOf } = data;

  console.log('\n[2/4] Extraindo subárvores esquelética e muscular em conventional_part_of.txt...');

  // Esquelético: FMA23881 menos descendentes de FMA23878 (articular), FMA7591 (costal cartilage) e FMA12513 (eyeball)
  const skelAll = collectDescendants('FMA23881', childrenOf);
  const skelExclArticular = collectDescendants('FMA23878', childrenOf);
  const skelExclCostal = collectDescendants('FMA7591', childrenOf);
  const skelExclEyeball = collectDescendants('FMA12513', childrenOf);
  const skelExcluded = new Set([...skelExclArticular, ...skelExclCostal, ...skelExclEyeball]);

  const skelIds = [...skelAll].filter((id) => !skelExcluded.has(id) && stlSizeMap.has(id)).sort();

  // Muscular: FMA72954 menos ligamentos/retináculos/arcos fibrosos excluídos pela auditoria SUB-05
  // (FMA21964/FMA21965 inguinal ligament, FMA40120/FMA40121 flexor retinaculum of wrist, FMA46442 tendinous arch of levator ani)
  const muscAll = collectDescendants('FMA72954', childrenOf);
  const muscExcluded = new Set(['FMA21964', 'FMA21965', 'FMA40120', 'FMA40121', 'FMA46442']);
  const muscIds = [...muscAll].filter((id) => !muscExcluded.has(id) && stlSizeMap.has(id)).sort();

  // Verifica 0 sobreposição esqueleto <-> muscular
  const skelSet = new Set(skelIds);
  const overlapSkelMusc = muscIds.filter((id) => skelSet.has(id));
  if (overlapSkelMusc.length > 0) {
    throw new Error(`Sobreposição inesperada esqueleto/muscular: ${overlapSkelMusc.join(', ')}`);
  }

  // Verifica 0 sobreposição pai-filho dentro de cada sistema
  const checkParentChild = (ids) => {
    const idSet = new Set(ids);
    const pairs = [];
    for (const id of ids) {
      const desc = collectDescendants(id, childrenOf);
      for (const d of desc) {
        if (d !== id && idSet.has(d)) pairs.push({ parent: id, child: d });
      }
    }
    return pairs;
  };
  const skelParentChild = checkParentChild(skelIds);
  const muscParentChild = checkParentChild(muscIds);

  console.log(`  Esquelético puro: ${skelIds.length} STLs (excluídos ${[...skelAll].filter((id) => skelExcluded.has(id) && stlSizeMap.has(id)).length} STLs articulares/cartilagens/olho; 0 pai-filho)`);
  console.log(`  Muscular        : ${muscIds.length} STLs (excluídos FMA21964/FMA21965/FMA40120/FMA40121/FMA46442; 0 pai-filho)`);

  const audit = {
    generatedAt: new Date().toISOString(),
    source: 'BodyParts3D v3.0 (Kevin-Mattheus-Moerman/BodyParts3D) + TA2.csv (Z-Anatomy)',
    regionalPolicy: {
      head_neck: 'Crânio (22 ossos), hioide, vértebras cervicais (C1-C7), músculos da cabeça (FMA71287), pescoço (FMA71290) e ramos cervicais/cefálicos do dorso profundo.',
      trunk: 'Esterno (3 sub-partes), 24 costelas, vértebras torácicas (T1-T12), lombares (L1-L5), sacro, musculatura torácica (FMA71293), abdominal/assoalho pélvico (FMA86917) e dorso toracolombar (FMA71291).',
      upper_limb: 'Cíngulo peitoral (clavícula, escápula), braço, antebraço, carpo, metacarpos, falanges da mão (64 STLs ósseos) + toda a musculatura de FMA9621 (incl. peitoral maior/menor, serrátil anterior, subclávio e cabeças em FMA46569).',
      lower_limb: 'Cíngulo pélvico (osso do quadril / os coxae — coerente com TA2 Cingulum pelvicum), fêmur, patela, tíbia, fíbula, tarso, metatarsos, falanges e sesamoides do pé (64 STLs ósseos) + toda a musculatura de FMA9622 (glúteos, ilíaco, psoas maior, pelvitrocantéricos, coxa, perna, pé e cabeças em FMA46569).',
    },
    counts: {},
    v1Preservation: {},
    parentChildOverlaps: { skeletal: skelParentChild, muscular: muscParentChild },
    nonFmaIds: [],
    groupings: [],
    specialStructures: [],
    needsTranslationReview: [],
    missingAnatomyNotes: [
      'Cóccix (coccyx / FMA20225): não existe arquivo STL separado no BodyParts3D v3.0 (ausente em parts_list_e.txt e stl/).',
      'Ossículos da orelha média (malleus, incus, stapes): ausentes nos STLs do BodyParts3D v3.0.',
      'Músculos quadríceps femoral (reto femoral, vastos lateral/medial/intermédio), sóleo e ilíaco/psoas maior foram mantidos como estruturas clicáveis individuais para maior valor didático; SUB-05 pode validar ou solicitar agrupamento.',
      'Granularidade mão vs pé no BodyParts3D: lumbricais da mão (FMA42398/42399) e interósseos dorsais/palmares da mão e dorsais do pé vêm em STLs de conjunto ("set of ..."), enquanto lumbricais do pé (1º-4º) e interósseos plantares do pé (1º-3º) vêm individualizados.',
    ],
    validation: {
      invalidIds: [],
      duplicateAnatomyIds: [],
      duplicateMeshNodes: [],
      duplicateStlIds: [],
      missingExtractedStlIds: [],
      extraStlIds: [],
    },
  };

  console.log('\n[3/4] Construindo estruturas esqueléticas e musculares (preservando v1 verbatim)...');
  const v1ByFma = new Map();
  for (const s of V1_CATALOG) {
    for (const p of s.parts) v1ByFma.set(p.fmaId, s);
  }

  const skeletalStructures = buildSkeletalStructures(skelIds, v1ByFma, data, audit);
  const muscularStructures = buildMuscularStructures(muscIds, data, audit);
  const allStructures = [...skeletalStructures, ...muscularStructures];

  // Aplica overrides exatos de direção calibrados pela auditoria SUB-05 (P2-01b)
  const appliedOverrides = applySub05VectorOverrides(allStructures);
  console.log(`  Overrides vetoriais SUB-05 aplicados: ${appliedOverrides} estruturas.`);

  // Rebalanceia apenas peças novas v2 para fechar estritamente dentro de <= 320.000 tris
  // (esqueleto ~124k [meta 110k-130k] + musculatura ~186k [meta 170k-190k] = ~310k)
  rebalanceV2TriangleBudgets(allStructures, {
    skeletal: 124_000,
    muscular: 186_000,
  });

  // Ordenação determinística: v1 primeiro (na ordem canônica da v1), depois por sistema -> região -> anatomyId
  const regionOrder = { head_neck: 0, trunk: 1, upper_limb: 2, lower_limb: 3 };
  const systemOrder = { skeletal: 0, muscular: 1 };
  allStructures.sort((a, b) => {
    if (a.system !== b.system) return systemOrder[a.system] - systemOrder[b.system];
    if (a.sourcePhase !== b.sourcePhase) return a.sourcePhase === 'v1' ? -1 : 1;
    if (a.sourcePhase === 'v1') return 0; // mantém ordem original da v1
    if (a.region !== b.region) return regionOrder[a.region] - regionOrder[b.region];
    return a.anatomyId.localeCompare(b.anatomyId);
  });

  // Validações rigorosas de integridade do catálogo gerado
  const seenAnatomyIds = new Set();
  const seenMeshNodes = new Set();
  const seenStlIds = new Set();

  let skelTris = 0;
  let muscTris = 0;
  let skelRawTris = 0;
  let muscRawTris = 0;
  let skelStlCount = 0;
  let muscStlCount = 0;
  const byRegion = {
    head_neck: { skeletal: 0, muscular: 0, stls: 0 },
    trunk: { skeletal: 0, muscular: 0, stls: 0 },
    upper_limb: { skeletal: 0, muscular: 0, stls: 0 },
    lower_limb: { skeletal: 0, muscular: 0, stls: 0 },
  };

  for (const s of allStructures) {
    if (!ANATOMY_ID_REGEX.test(s.anatomyId)) {
      audit.validation.invalidIds.push({ type: 'anatomyId', value: s.anatomyId });
    }
    if (seenAnatomyIds.has(s.anatomyId)) {
      audit.validation.duplicateAnatomyIds.push(s.anatomyId);
    }
    seenAnatomyIds.add(s.anatomyId);

    byRegion[s.region][s.system] += 1;
    byRegion[s.region].stls += s.parts.length;

    if (s.structureFmaIds) {
      for (const sf of s.structureFmaIds) {
        if (!FMA_ID_REGEX.test(sf)) {
          audit.validation.invalidIds.push({ type: 'structureFmaId', value: sf, anatomyId: s.anatomyId });
        }
      }
    }

    for (const p of s.parts) {
      if (!ANATOMY_ID_REGEX.test(p.nodeName)) {
        audit.validation.invalidIds.push({ type: 'meshNode', value: p.nodeName });
      }
      if (!FMA_ID_REGEX.test(p.fmaId)) {
        audit.validation.invalidIds.push({ type: 'fmaId', value: p.fmaId, nodeName: p.nodeName });
      }
      if (seenMeshNodes.has(p.nodeName)) {
        audit.validation.duplicateMeshNodes.push(p.nodeName);
      }
      seenMeshNodes.add(p.nodeName);

      const stlId = p.stlId ?? p.fmaId;
      if (seenStlIds.has(stlId)) {
        audit.validation.duplicateStlIds.push(stlId);
      }
      seenStlIds.add(stlId);

      if (!FMA_ID_REGEX.test(stlId)) {
        audit.nonFmaIds.push({
          stlId,
          mappedFmaId: p.fmaId,
          structureFmaIds: s.structureFmaIds ?? [],
          nodeName: p.nodeName,
          anatomyId: s.anatomyId,
          enName: namesMap.get(stlId) ?? '',
          immediateParents: [...(parentsOf.get(stlId) ?? [])].map((x) => `${x}(${namesMap.get(x) ?? ''})`),
          resolution: 'Separado stlId (download/proveniência) de fmaId estrito (^FMA\\d+$) nos metadados e extras glTF.',
        });
      }

      const rawTris = (p.expectedBytes - 84) / 50;
      if (s.system === 'skeletal') {
        skelTris += p.targetTriangles;
        skelRawTris += rawTris;
        skelStlCount += 1;
      } else {
        muscTris += p.targetTriangles;
        muscRawTris += rawTris;
        muscStlCount += 1;
      }
    }
  }

  const expectedAllStlIds = new Set([...skelIds, ...muscIds]);
  for (const id of expectedAllStlIds) {
    if (!seenStlIds.has(id)) audit.validation.missingExtractedStlIds.push(id);
  }
  for (const id of seenStlIds) {
    if (!expectedAllStlIds.has(id)) audit.validation.extraStlIds.push(id);
  }

  // Verifica preservação das 22 estruturas v1 (20 verbatim + 2 ulna recalibradas em direção conforme SUB-05)
  const v1Checks = [];
  for (const v1Struct of V1_CATALOG) {
    const found = allStructures.find((x) => x.anatomyId === v1Struct.anatomyId);
    const { sourcePhase, needsTranslationReview, ...comparable } = found ?? {};
    const verbatim = JSON.stringify(comparable) === JSON.stringify(v1Struct);
    const identityPreserved =
      found != null &&
      found.anatomyId === v1Struct.anatomyId &&
      found.system === v1Struct.system &&
      found.laterality === v1Struct.laterality &&
      found.region === v1Struct.region &&
      JSON.stringify(found.displayName) === JSON.stringify(v1Struct.displayName) &&
      found.scientificName === v1Struct.scientificName &&
      JSON.stringify(found.parts) === JSON.stringify(v1Struct.parts);
    v1Checks.push({ anatomyId: v1Struct.anatomyId, verbatim, identityPreserved });
  }
  const v1VerbatimCount = v1Checks.filter((c) => c.verbatim).length;
  const v1IdentityCount = v1Checks.filter((c) => c.identityPreserved).length;

  audit.v1Preservation = {
    expectedStructures: V1_CATALOG.length,
    verbatimMatches: v1VerbatimCount,
    identityMatches: v1IdentityCount,
    recalibratedSub05: v1Checks.filter((c) => !c.verbatim && c.identityPreserved).map((c) => c.anatomyId),
    allIdentityPreserved: v1IdentityCount === V1_CATALOG.length,
  };

  audit.counts = {
    totalStructures: allStructures.length,
    skeletalStructures: skeletalStructures.length,
    muscularStructures: muscularStructures.length,
    totalStls: seenStlIds.size,
    skeletalStls: skelStlCount,
    muscularStls: muscStlCount,
    rawTriangles: {
      skeletal: skelRawTris,
      muscular: muscRawTris,
      total: skelRawTris + muscRawTris,
    },
    plannedTargetTriangles: {
      skeletal: skelTris,
      muscular: muscTris,
      total: skelTris + muscTris,
      budgetTargetMax: TARGET_TOTAL_TRIANGLES,
      withinBudget: skelTris + muscTris <= TARGET_TOTAL_TRIANGLES,
    },
    byRegion,
    needsTranslationReviewCount: audit.needsTranslationReview.length,
    nonFmaIdCount: audit.nonFmaIds.length,
    specialStructureCount: audit.specialStructures.length,
    compositeGroupCount: audit.groupings.length,
  };

  // Falha dura se houver qualquer erro estrutural
  const v = audit.validation;
  if (
    v.invalidIds.length > 0 ||
    v.duplicateAnatomyIds.length > 0 ||
    v.duplicateMeshNodes.length > 0 ||
    v.duplicateStlIds.length > 0 ||
    v.missingExtractedStlIds.length > 0 ||
    v.extraStlIds.length > 0 ||
    !audit.v1Preservation.allIdentityPreserved ||
    !audit.counts.plannedTargetTriangles.withinBudget
  ) {
    await fs.writeFile(OUTPUT_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
    throw new Error(
      `Falha na validação interna do catálogo v2! Veja detalhes em ${OUTPUT_AUDIT_PATH}: ` +
        JSON.stringify({ ...v, v1Identity: audit.v1Preservation.allIdentityPreserved }),
    );
  }

  const catalogOutput = {
    schemaVersion: SCHEMA_VERSION,
    assetVersion: 'v2',
    metadataVersion: 'v2',
    coverageMatrixVersion: 'v2',
    status: 'audited_sub05_p2_01b',
    generatedAt: audit.generatedAt,
    coordinateSystem: COORDINATE_SYSTEM,
    terminologyReference: TERMINOLOGY_REFERENCE,
    bodyParts3DBaseUrl: BODYPARTS3D_BASE_URL,
    detailLevel: DETAIL_LEVEL,
    license: LICENSE_INFO,
    regionalPolicy: audit.regionalPolicy,
    summary: audit.counts,
    structures: allStructures,
  };

  console.log('\n[4/4] Gravando scripts/anatomy-catalog-v2.json e .cache/bodyparts3d/v2-catalog-audit.json...');
  await fs.writeFile(OUTPUT_CATALOG_PATH, `${JSON.stringify(catalogOutput, null, 2)}\n`);
  await fs.writeFile(OUTPUT_AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);

  console.log('\n=== RESUMO DO CATÁLOGO v2 (PÓS-AUDITORIA SUB-05) ===');
  console.log(`  Estruturas totais   : ${allStructures.length} (Esquelético: ${skeletalStructures.length}, Muscular: ${muscularStructures.length})`);
  console.log(`  STLs totais         : ${seenStlIds.size} (Esquelético: ${skelStlCount}, Muscular: ${muscStlCount})`);
  console.log(`  Preservação v1      : ${v1IdentityCount}/${V1_CATALOG.length} identidade preservada (${v1VerbatimCount} verbatim + ${audit.v1Preservation.recalibratedSub05.join(', ')} recalibradas SUB-05)`);
  console.log(`  Triângulos brutos   : ${(skelRawTris + muscRawTris).toLocaleString('en-US')} (Skel: ${skelRawTris.toLocaleString('en-US')}, Musc: ${muscRawTris.toLocaleString('en-US')})`);
  console.log(`  Triângulos alvo v2  : ${(skelTris + muscTris).toLocaleString('en-US')} / ${TARGET_TOTAL_TRIANGLES.toLocaleString('en-US')} (Skel: ${skelTris.toLocaleString('en-US')}, Musc: ${muscTris.toLocaleString('en-US')})`);
  console.log(`  Por região          : head_neck=${byRegion.head_neck.skeletal}+${byRegion.head_neck.muscular} (${byRegion.head_neck.stls} STLs) | trunk=${byRegion.trunk.skeletal}+${byRegion.trunk.muscular} (${byRegion.trunk.stls} STLs) | upper_limb=${byRegion.upper_limb.skeletal}+${byRegion.upper_limb.muscular} (${byRegion.upper_limb.stls} STLs) | lower_limb=${byRegion.lower_limb.skeletal}+${byRegion.lower_limb.muscular} (${byRegion.lower_limb.stls} STLs)`);
  console.log(`  Agrupamentos novos  : ${audit.groupings.length} estruturas compostas`);
  console.log(`  Estruturas especiais: ${audit.specialStructures.length} (tendões/aponeuroses/fáscias/retináculos/sets/bilaterais fundidos)`);
  console.log(`  IDs não-FMA (BP*)   : ${audit.nonFmaIds.length}`);
  console.log(`  Sem tradução curada : ${audit.needsTranslationReview.length}`);
  console.log(`  Regex/Unicidade     : 0 inválidos, 0 duplicados, 0 faltantes, 0 extras`);
}

main().catch((err) => {
  console.error('\n[ERRO NO GERADOR v2]', err?.stack || err);
  process.exit(1);
});
