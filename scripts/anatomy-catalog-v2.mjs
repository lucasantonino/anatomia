/**
 * Catálogo oficial da Fase 2 (v2) — Corpo Humano Completo (Esquelético + Muscular).
 * Carrega `scripts/anatomy-catalog-v2.json` (auditado por SUB-05 em P2-01b):
 * - 575 estruturas anatômicas (201 ósseas + 374 musculares)
 * - 635 malhas STL reais do BodyParts3D v3.0 (DBCLS, CC BY-SA 2.1 JP)
 * - 4 regiões anatômicas: head_neck, trunk, upper_limb, lower_limb
 * - 100% dos fmaId públicos aderentes à regex estrita ^FMA\d+$ (com stlId separado para BP44..BP47)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_JSON_PATH = path.join(__dirname, 'anatomy-catalog-v2.json');

const catalogData = JSON.parse(fs.readFileSync(CATALOG_JSON_PATH, 'utf8'));

export const SCHEMA_VERSION = catalogData.schemaVersion ?? '1.0.0';
export const ASSET_VERSION = 'v2';
export const METADATA_VERSION = 'v2';
export const COVERAGE_MATRIX_VERSION = 'v2';
export const COORDINATE_SYSTEM = catalogData.coordinateSystem ?? 'gltf-y-up-meters-anterior-pos-z';
export const TERMINOLOGY_REFERENCE = catalogData.terminologyReference ?? 'Terminologia Anatomica (TA2)';
export const BODYPARTS3D_BASE_URL =
  catalogData.bodyParts3DBaseUrl ??
  'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/main/assets/BodyParts3D_data/stl';
export const DETAIL_LEVEL = catalogData.detailLevel ?? 'segmentado_por_estrutura_e_subpartes';
export const LICENSE_INFO = catalogData.license;

export const SCOPE_STATEMENT =
  'Esta versão (v2 — Corpo Humano Completo) contempla 575 estruturas anatômicas (201 estruturas ósseas e 374 estruturas musculares, compostas por 635 malhas STL reais do BodyParts3D v3.0) distribuídas nas 4 macro-regiões anatômicas: cabeça e pescoço (head_neck), tronco (trunk), membro superior com cíngulo peitoral (upper_limb) e membro inferior com cíngulo pélvico (lower_limb). Inclui crânio, coluna vertebral cervical/torácica/lombar e sacro, caixa torácica óssea, mãos, pés, musculatura esquelética completa e estruturas aponeuróticas/tendíneas funcionais selecionadas (gálea aponeurótica, linha alba, trato iliotibial e tendão do calcâneo). Limitações transparentes da fonte BodyParts3D v3.0: não inclui cóccix separado, ossículos da orelha média, dentes, cartilagens costais/articulares, discos intervertebrais, ligamentos articulares, retináculos fibrosos ou sistemas viscerais/vasculares/nervosos; lumbricais e interósseos da mão e interósseos dorsais do pé são representados em malhas de conjunto.';

export const ANATOMY_CATALOG_V2 = catalogData.structures;
export const ANATOMY_CATALOG = ANATOMY_CATALOG_V2;

/**
 * Retorna a lista achatada de todas as 635 partes com metadados da estrutura pai.
 */
export function listAllCatalogParts() {
  return ANATOMY_CATALOG_V2.flatMap((structure) =>
    structure.parts.map((part) => ({
      ...part,
      stlId: part.stlId ?? part.fmaId,
      anatomyId: structure.anatomyId,
      system: structure.system,
      laterality: structure.laterality,
      region: structure.region,
    })),
  );
}
