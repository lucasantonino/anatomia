import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

import {
  ANATOMY_CATALOG,
  ASSET_VERSION,
  BODYPARTS3D_BASE_URL,
  COORDINATE_SYSTEM,
  COVERAGE_MATRIX_VERSION,
  DETAIL_LEVEL,
  LICENSE_INFO,
  METADATA_VERSION,
  SCHEMA_VERSION,
  SCOPE_STATEMENT,
  TERMINOLOGY_REFERENCE,
  listAllCatalogParts,
} from './anatomy-catalog.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'bodyparts3d');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'assets', ASSET_VERSION);

const DOWNLOAD_CONCURRENCY = 6;
const DOWNLOAD_MAX_RETRIES = 3;

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function round6(value) {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function floor6(value) {
  const floored = Math.floor(value * 1e6) / 1e6;
  return Object.is(floored, -0) ? 0 : floored;
}

function ceil6(value) {
  const ceiled = Math.ceil(value * 1e6) / 1e6;
  return Object.is(ceiled, -0) ? 0 : ceiled;
}

function normalizeVec3(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len <= 1e-12) {
    throw new Error(`Vetor nulo não pode ser normalizado: [${v.join(', ')}]`);
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}

async function writeFileAtomic(targetPath, data) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, data);
  await fs.rename(tmpPath, targetPath);
}

/**
 * Baixa um STL do BodyParts3D com cache local em `.cache/bodyparts3d/` e retries.
 */
async function fetchStlWithCache(part) {
  const cachePath = path.join(CACHE_DIR, `${part.fmaId}.stl`);

  try {
    const stat = await fs.stat(cachePath);
    if (stat.size === part.expectedBytes) {
      const buffer = await fs.readFile(cachePath);
      return {
        buffer,
        fromCache: true,
        sha256: sha256Hex(buffer),
        bytes: buffer.byteLength,
      };
    }
  } catch {
    // Cache miss — prosseguir com download
  }

  const url = `${BODYPARTS3D_BASE_URL}/${part.fmaId}.stl`;
  let lastError = null;

  for (let attempt = 1; attempt <= DOWNLOAD_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'anatomia-3d-asset-pipeline/1.0' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} ao baixar ${url}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.byteLength < 84) {
        throw new Error(`STL truncado (${buffer.byteLength} B) para ${part.fmaId}`);
      }

      const triCount = buffer.readUInt32LE(80);
      const expectedStlSize = 84 + triCount * 50;
      if (buffer.byteLength !== expectedStlSize) {
        throw new Error(
          `Formato STL binário inválido para ${part.fmaId}: esperado ${expectedStlSize} B para ${triCount} triângulos, recebido ${buffer.byteLength} B`,
        );
      }

      await writeFileAtomic(cachePath, buffer);
      return {
        buffer,
        fromCache: false,
        sha256: sha256Hex(buffer),
        bytes: buffer.byteLength,
      };
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_MAX_RETRIES) {
        const delayMs = 500 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Falha ao baixar ${part.fmaId} após ${DOWNLOAD_MAX_RETRIES} tentativas: ${lastError?.message}`);
}

async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Faz parsing de STL binário, aplica rotação rígida SO(3) (x/1000, z/1000, -y/1000)
 * e solda vértices duplicados em grade sub-micrométrica (1e-6 m = 0,001 mm).
 */
function parseAndWeldBinaryStl(buffer, fmaId) {
  if (buffer.byteLength < 84) {
    throw new Error(`Arquivo STL muito curto para ${fmaId}: ${buffer.byteLength} B`);
  }

  const rawTriangles = buffer.readUInt32LE(80);
  const expectedSize = 84 + rawTriangles * 50;
  if (buffer.byteLength !== expectedSize) {
    throw new Error(
      `Tamanho STL inconsistente para ${fmaId}: lido ${buffer.byteLength} B, esperado ${expectedSize} B (${rawTriangles} tris)`,
    );
  }

  const vertexMap = new Map();
  const positionsList = [];
  const indicesList = [];
  let degenerateTriangles = 0;

  const getOrCreateVertex = (gx, gy, gz) => {
    if (!Number.isFinite(gx) || !Number.isFinite(gy) || !Number.isFinite(gz)) {
      throw new Error(`Coordenada não finita encontrada em ${fmaId}`);
    }
    const kx = Math.round(gx * 1e6);
    const ky = Math.round(gy * 1e6);
    const kz = Math.round(gz * 1e6);
    const key = `${kx},${ky},${kz}`;

    let idx = vertexMap.get(key);
    if (idx === undefined) {
      idx = positionsList.length / 3;
      vertexMap.set(key, idx);
      positionsList.push(gx, gy, gz);
    }
    return idx;
  };

  for (let t = 0; t < rawTriangles; t++) {
    const base = 84 + t * 50;
    // Ignoramos os 12 bytes da normal de face (base..base+11) e recalculamos pós-simplificação.
    const x0 = buffer.readFloatLE(base + 12);
    const y0 = buffer.readFloatLE(base + 16);
    const z0 = buffer.readFloatLE(base + 20);

    const x1 = buffer.readFloatLE(base + 24);
    const y1 = buffer.readFloatLE(base + 28);
    const z1 = buffer.readFloatLE(base + 32);

    const x2 = buffer.readFloatLE(base + 36);
    const y2 = buffer.readFloatLE(base + 40);
    const z2 = buffer.readFloatLE(base + 44);

    // Transformação SO(3) comprovada: (x, y, z)_mm -> (x/1000, z/1000, -y/1000)_m (det = +1)
    const i0 = getOrCreateVertex(x0 / 1000, z0 / 1000, -y0 / 1000);
    const i1 = getOrCreateVertex(x1 / 1000, z1 / 1000, -y1 / 1000);
    const i2 = getOrCreateVertex(x2 / 1000, z2 / 1000, -y2 / 1000);

    if (i0 === i1 || i1 === i2 || i2 === i0) {
      degenerateTriangles++;
      continue;
    }

    indicesList.push(i0, i1, i2);
  }

  return {
    positions: new Float32Array(positionsList),
    indices: new Uint32Array(indicesList),
    rawTriangles,
    weldedTriangles: indicesList.length / 3,
    weldedVertices: positionsList.length / 3,
    degenerateTriangles,
  };
}

/**
 * Calcula estatísticas geométricas de uma malha indexada:
 * boundingBox, centroide ponderado por área, área total e volume assinado.
 */
function computeMeshStats(positions, indices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }

  let totalArea = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let signedVolume6 = 0;

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    const ax = positions[a];
    const ay = positions[a + 1];
    const az = positions[a + 2];

    const bx = positions[b];
    const by = positions[b + 1];
    const bz = positions[b + 2];

    const cxv = positions[c];
    const cyv = positions[c + 1];
    const czv = positions[c + 2];

    const e1x = bx - ax;
    const e1y = by - ay;
    const e1z = bz - az;

    const e2x = cxv - ax;
    const e2y = cyv - ay;
    const e2z = czv - az;

    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    const area = 0.5 * Math.hypot(nx, ny, nz);
    totalArea += area;

    const mx = (ax + bx + cxv) / 3;
    const my = (ay + by + cyv) / 3;
    const mz = (az + bz + czv) / 3;

    cx += mx * area;
    cy += my * area;
    cz += mz * area;

    // 6 * V_tetraedro = v0 · (v1 × v2)
    const v12x = by * czv - bz * cyv;
    const v12y = bz * cxv - bx * czv;
    const v12z = bx * cyv - by * cxv;
    signedVolume6 += ax * v12x + ay * v12y + az * v12z;
  }

  const centroid =
    totalArea > 0
      ? [cx / totalArea, cy / totalArea, cz / totalArea]
      : [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];

  return {
    min,
    max,
    bboxCenter: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    centroid,
    totalArea,
    signedVolume: signedVolume6 / 6,
  };
}

/**
 * Calcula média espacial dos vértices no topo (proximal) e base (distal) de um osso longo
 * para diagnóstico empírico da postura do antebraço (supinação vs semipronação).
 */
function computeProximalDistalBands(positions, minY, maxY, bandFraction = 0.15) {
  const span = maxY - minY;
  const topCutoff = maxY - span * bandFraction;
  const bottomCutoff = minY + span * bandFraction;

  const prox = [0, 0, 0];
  let proxCount = 0;
  const dist = [0, 0, 0];
  let distCount = 0;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    if (y >= topCutoff) {
      prox[0] += x;
      prox[1] += y;
      prox[2] += z;
      proxCount++;
    }
    if (y <= bottomCutoff) {
      dist[0] += x;
      dist[1] += y;
      dist[2] += z;
      distCount++;
    }
  }

  return {
    proximal: proxCount > 0 ? [prox[0] / proxCount, prox[1] / proxCount, prox[2] / proxCount] : [0, 0, 0],
    distal: distCount > 0 ? [dist[0] / distCount, dist[1] / distCount, dist[2] / distCount] : [0, 0, 0],
  };
}

/**
 * Executa o diagnóstico empírico obrigatório de T-02 ANTES da simplificação/exportação.
 * Aborta imediatamente se qualquer malha apresentar inversão de lateralidade no upstream.
 */
function runEmpiricalDiagnostics(meshesByNodeName) {
  console.log('\n=== DIAGNÓSTICO EMPÍRICO PRÉ-SIMPLIFICAÇÃO (ALERTAS T-02) ===');

  const lateralityErrors = [];
  const meshDiagnostics = [];

  console.log('\n[A] Verificação de lateralidade (centroid.x) e winding order das 36 malhas:');
  console.log(
    'nodeName'.padEnd(44) +
      'FMA'.padEnd(10) +
      'Lado'.padEnd(7) +
      'cx (m)'.padStart(10) +
      'cy (m)'.padStart(10) +
      'cz (m)'.padStart(10) +
      'tris'.padStart(9) +
      'vol(cm3)'.padStart(11),
  );

  for (const structure of ANATOMY_CATALOG) {
    for (const part of structure.parts) {
      const entry = meshesByNodeName.get(part.nodeName);
      const stats = computeMeshStats(entry.positions, entry.indices);
      entry.rawStats = stats;

      const isRight = structure.laterality === 'right';
      const isLeft = structure.laterality === 'left';
      const validLaterality = (isRight && stats.centroid[0] < 0) || (isLeft && stats.centroid[0] > 0);

      if (!validLaterality) {
        lateralityErrors.push({
          nodeName: part.nodeName,
          fmaId: part.fmaId,
          expectedLaterality: structure.laterality,
          centroidX: stats.centroid[0],
        });
      }

      const volCm3 = stats.signedVolume * 1e6;
      const highlight =
        part.fmaId === 'FMA34690' || part.fmaId === 'FMA34691' ? '  <-- ALERTA T-02 (peitoral clavicular)' : '';
      const statusFlag = validLaterality ? '' : '  [INVERTIDO!]';

      console.log(
        part.nodeName.padEnd(44) +
          part.fmaId.padEnd(10) +
          structure.laterality.padEnd(7) +
          stats.centroid[0].toFixed(4).padStart(10) +
          stats.centroid[1].toFixed(4).padStart(10) +
          stats.centroid[2].toFixed(4).padStart(10) +
          String(entry.weldedTriangles).padStart(9) +
          volCm3.toFixed(2).padStart(11) +
          highlight +
          statusFlag,
      );

      meshDiagnostics.push({
        nodeName: part.nodeName,
        fmaId: part.fmaId,
        anatomyId: structure.anatomyId,
        laterality: structure.laterality,
        centroid: stats.centroid.map(round6),
        min: stats.min.map(round6),
        max: stats.max.map(round6),
        signedVolumeCm3: round6(volCm3),
        rawTriangles: entry.rawTriangles,
        weldedTriangles: entry.weldedTriangles,
        weldedVertices: entry.weldedVertices,
      });
    }
  }

  if (lateralityErrors.length > 0) {
    console.error('\n[ERRO CRÍTICO] Inversão de lateralidade detectada no upstream BodyParts3D!');
    for (const err of lateralityErrors) {
      console.error(
        `  - ${err.nodeName} (${err.fmaId}): esperado ${err.expectedLaterality}, mas centroid.x = ${err.centroidX.toFixed(6)} m`,
      );
    }
    throw new Error(
      `ABORTADO: ${lateralityErrors.length} malha(s) com lateralidade invertida no upstream. Reporte imediatamente ao Coordenador.`,
    );
  }

  console.log('\n[OK] Todas as 18 malhas right possuem centroid.x < 0 e todas as 18 left possuem centroid.x > 0.');
  console.log('[OK] Par crítico FMA34690 (right) / FMA34691 (left) confirmado sem inversão!');

  // Simetria bilateral entre os 18 pares antímeros
  console.log('\n[A.2] Simetria bilateral dos 18 pares antímeros:');
  const bilateralSummary = [];
  for (const structure of ANATOMY_CATALOG) {
    if (structure.laterality !== 'right') continue;
    for (const part of structure.parts) {
      const leftNodeName = part.nodeName.replace('.right', '.left');
      const rStats = meshesByNodeName.get(part.nodeName).rawStats;
      const lStats = meshesByNodeName.get(leftNodeName).rawStats;
      const dxSym = rStats.centroid[0] + lStats.centroid[0];
      const dyDiff = rStats.centroid[1] - lStats.centroid[1];
      const dzDiff = rStats.centroid[2] - lStats.centroid[2];
      bilateralSummary.push({
        pair: part.nodeName.replace('.right', '.{right,left}'),
        dxSymMm: round6(dxSym * 1000),
        dyDiffMm: round6(dyDiff * 1000),
        dzDiffMm: round6(dzDiff * 1000),
      });
    }
  }
  for (const sym of bilateralSummary) {
    console.log(
      `  ${sym.pair.padEnd(46)} dx(R+L)=${sym.dxSymMm.toFixed(1).padStart(6)}mm  dy(R-L)=${sym.dyDiffMm.toFixed(1).padStart(6)}mm  dz(R-L)=${sym.dzDiffMm.toFixed(1).padStart(6)}mm`,
    );
  }

  // [B] Ordenação espacial das sub-partes dos músculos compostos
  console.log('\n[B] Ordenação espacial das sub-partes de músculos compostos:');
  const subpartChecks = [];

  for (const side of ['right', 'left']) {
    // Deltoide: z_clavicular > z_acromial > z_spinal
    const dClav = meshesByNodeName.get(`muscle.deltoideus.${side}.clavicular`).rawStats;
    const dAcro = meshesByNodeName.get(`muscle.deltoideus.${side}.acromial`).rawStats;
    const dSpin = meshesByNodeName.get(`muscle.deltoideus.${side}.spinal`).rawStats;
    const deltoidOk = dClav.centroid[2] > dAcro.centroid[2] && dAcro.centroid[2] > dSpin.centroid[2];
    const deltoidMsg = `Deltoide (${side}): z_clav=${dClav.centroid[2].toFixed(4)} > z_acrom=${dAcro.centroid[2].toFixed(4)} > z_spin=${dSpin.centroid[2].toFixed(4)} => ${deltoidOk ? 'OK' : 'ATENÇÃO'}`;
    console.log(`  ${deltoidMsg}`);
    subpartChecks.push({ check: `deltoideus.${side}.z_order`, ok: deltoidOk, detail: deltoidMsg });

    // Peitoral maior: y_clavicular > y_sternocostal > y_abdominal
    const pClav = meshesByNodeName.get(`muscle.pectoralis_major.${side}.clavicular`).rawStats;
    const pSter = meshesByNodeName.get(`muscle.pectoralis_major.${side}.sternocostal`).rawStats;
    const pAbdo = meshesByNodeName.get(`muscle.pectoralis_major.${side}.abdominal`).rawStats;
    const pecOk = pClav.centroid[1] > pSter.centroid[1] && pSter.centroid[1] > pAbdo.centroid[1];
    const pecMsg = `Peitoral maior (${side}): y_clav=${pClav.centroid[1].toFixed(4)} > y_sternocost=${pSter.centroid[1].toFixed(4)} > y_abdom=${pAbdo.centroid[1].toFixed(4)} => ${pecOk ? 'OK' : 'ATENÇÃO'}`;
    console.log(`  ${pecMsg}`);
    subpartChecks.push({ check: `pectoralis_major.${side}.y_order`, ok: pecOk, detail: pecMsg });

    // Bíceps braquial: cabeça longa mais lateral (|x|) e/ou mais alta (maxY) que cabeça curta
    const bShort = meshesByNodeName.get(`muscle.biceps_brachii.${side}.short_head`).rawStats;
    const bLong = meshesByNodeName.get(`muscle.biceps_brachii.${side}.long_head`).rawStats;
    const bicepsLatOk = Math.abs(bLong.centroid[0]) > Math.abs(bShort.centroid[0]);
    const bicepsMsg = `Bíceps (${side}): |x|_long=${Math.abs(bLong.centroid[0]).toFixed(4)} vs |x|_short=${Math.abs(bShort.centroid[0]).toFixed(4)} | maxY_long=${bLong.max[1].toFixed(4)} vs maxY_short=${bShort.max[1].toFixed(4)} => ${bicepsLatOk ? 'OK (long_head mais lateral)' : 'ATENÇÃO'}`;
    console.log(`  ${bicepsMsg}`);
    subpartChecks.push({ check: `biceps_brachii.${side}.lateral_order`, ok: bicepsLatOk, detail: bicepsMsg });

    // Tríceps braquial: maxY_long > maxY_lateral > maxY_medial
    const tMed = meshesByNodeName.get(`muscle.triceps_brachii.${side}.medial_head`).rawStats;
    const tLat = meshesByNodeName.get(`muscle.triceps_brachii.${side}.lateral_head`).rawStats;
    const tLong = meshesByNodeName.get(`muscle.triceps_brachii.${side}.long_head`).rawStats;
    const tricepsOk = tLong.max[1] > tLat.max[1] && tLat.max[1] > tMed.max[1];
    const tricepsMsg = `Tríceps (${side}): maxY_long=${tLong.max[1].toFixed(4)} > maxY_lat=${tLat.max[1].toFixed(4)} > maxY_med=${tMed.max[1].toFixed(4)} | |x|_lat=${Math.abs(tLat.centroid[0]).toFixed(4)} > |x|_long=${Math.abs(tLong.centroid[0]).toFixed(4)} => ${tricepsOk ? 'OK' : 'ATENÇÃO'}`;
    console.log(`  ${tricepsMsg}`);
    subpartChecks.push({ check: `triceps_brachii.${side}.maxY_order`, ok: tricepsOk, detail: tricepsMsg });
  }

  // [C] Diagnóstico da posição anatômica do antebraço (rádio vs ulna)
  console.log('\n[C] Diagnóstico postural do antebraço (Rádio vs Ulna):');
  const forearmDiagnosis = {};
  for (const side of ['right', 'left']) {
    const rad = meshesByNodeName.get(`bone.radius.${side}`);
    const uln = meshesByNodeName.get(`bone.ulna.${side}`);
    const radBands = computeProximalDistalBands(rad.positions, rad.rawStats.min[1], rad.rawStats.max[1]);
    const ulnBands = computeProximalDistalBands(uln.positions, uln.rawStats.min[1], uln.rawStats.max[1]);

    const proxRadAbsX = Math.abs(radBands.proximal[0]);
    const proxUlnAbsX = Math.abs(ulnBands.proximal[0]);
    const distRadAbsX = Math.abs(radBands.distal[0]);
    const distUlnAbsX = Math.abs(ulnBands.distal[0]);

    const distDeltaAbsXMm = (distRadAbsX - distUlnAbsX) * 1000;
    const distDeltaZMm = (radBands.distal[2] - ulnBands.distal[2]) * 1000;

    let posture = 'indeterminada';
    if (distDeltaAbsXMm > 10 && Math.abs(distDeltaZMm) < 15) {
      posture = 'supinação anatômica (rádio lateral à ulna distalmente)';
    } else if (distDeltaZMm > 10 && Math.abs(distDeltaAbsXMm) <= 15) {
      posture = 'semipronação / neutra (rádio anterior à ulna distalmente)';
    } else if (distDeltaAbsXMm < -5) {
      posture = 'pronação (rádio cruzado medialmente à ulna distalmente)';
    } else {
      posture = 'intermediária (supinação parcial / semipronação leve)';
    }

    console.log(
      `  Antebraço (${side}):\n` +
        `    Proximal: Rádio=(${radBands.proximal.map((n) => n.toFixed(4)).join(', ')}) | Ulna=(${ulnBands.proximal.map((n) => n.toFixed(4)).join(', ')})\n` +
        `    Distal:   Rádio=(${radBands.distal.map((n) => n.toFixed(4)).join(', ')}) | Ulna=(${ulnBands.distal.map((n) => n.toFixed(4)).join(', ')})\n` +
        `    Delta distal: Δ|x|(R-U)=${distDeltaAbsXMm.toFixed(1)}mm, Δz(R-U)=${distDeltaZMm.toFixed(1)}mm => ${posture}`,
    );

    forearmDiagnosis[side] = {
      radiusProximal: radBands.proximal.map(round6),
      radiusDistal: radBands.distal.map(round6),
      ulnaProximal: ulnBands.proximal.map(round6),
      ulnaDistal: ulnBands.distal.map(round6),
      distalDeltaAbsXMm: round6(distDeltaAbsXMm),
      distalDeltaZMm: round6(distDeltaZMm),
      posture,
    };
  }

  return {
    meshDiagnostics,
    bilateralSummary,
    subpartChecks,
    forearmDiagnosis,
  };
}

/**
 * Remove vértices não referenciados após simplificação e retorna arrays compactos.
 */
function compactIndexedMesh(positions, indices) {
  const vertexCount = positions.length / 3;
  const remap = new Int32Array(vertexCount).fill(-1);
  const newPositions = [];
  const newIndices = new Uint32Array(indices.length);
  let nextIndex = 0;

  for (let i = 0; i < indices.length; i++) {
    const oldIdx = indices[i];
    let mapped = remap[oldIdx];
    if (mapped === -1) {
      mapped = nextIndex++;
      remap[oldIdx] = mapped;
      newPositions.push(positions[oldIdx * 3], positions[oldIdx * 3 + 1], positions[oldIdx * 3 + 2]);
    }
    newIndices[i] = mapped;
  }

  return {
    positions: new Float32Array(newPositions),
    indices: newIndices,
  };
}

/**
 * Simplifica uma malha individualmente com MeshoptSimplifier preservando acidentes ósseos
 * e contornos musculares. Nunca mistura malhas de anatomyId diferentes.
 */
function simplifySingleMesh(positions, indices, targetTriangles, nodeName) {
  const inputTriangles = indices.length / 3;
  if (inputTriangles <= targetTriangles) {
    const compacted = compactIndexedMesh(positions, indices);
    return {
      positions: compacted.positions,
      indices: compacted.indices,
      resultError: 0,
      strategy: 'passthrough',
    };
  }

  const targetIndexCount = Math.max(12, Math.floor(targetTriangles) * 3);
  const acceptableMaxTris = Math.ceil(targetTriangles * 1.05);

  // Tenta primeiro com LockBorder e erros conservadores para evitar perfuração de lâminas finas (ex.: escápula)
  const attempts = [
    { error: 0.005, flags: ['LockBorder'] },
    { error: 0.01, flags: ['LockBorder'] },
    { error: 0.015, flags: ['LockBorder'] },
    { error: 0.025, flags: ['LockBorder'] },
    { error: 0.01, flags: [] },
    { error: 0.02, flags: [] },
    { error: 0.04, flags: [] },
  ];

  let bestIndices = indices;
  let bestError = 0;
  let bestStrategy = 'none';

  for (const attempt of attempts) {
    const [simplifiedIndices, resultError] = MeshoptSimplifier.simplify(
      indices,
      positions,
      3,
      targetIndexCount,
      attempt.error,
      attempt.flags,
    );
    const outTris = simplifiedIndices.length / 3;

    if (outTris > 0) {
      bestIndices = simplifiedIndices;
      bestError = resultError;
      bestStrategy = `err<=${attempt.error}${attempt.flags.length ? `+${attempt.flags.join(',')}` : ''}`;

      if (outTris <= acceptableMaxTris) {
        break;
      }
    }
  }

  const compacted = compactIndexedMesh(positions, bestIndices);
  if (compacted.indices.length === 0) {
    throw new Error(`Simplificação produziu malha vazia para ${nodeName}`);
  }

  return {
    positions: compacted.positions,
    indices: compacted.indices,
    resultError: bestError,
    strategy: bestStrategy,
  };
}

/**
 * Recalcula normais suaves ponderadas pela área de cada face (cross(e1, e2) sem normalizar
 * tem norma igual a 2 * área).
 */
function computeAreaWeightedNormals(positions, indices) {
  const normals = new Float32Array(positions.length);

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    const e1x = positions[b] - positions[a];
    const e1y = positions[b + 1] - positions[a + 1];
    const e1z = positions[b + 2] - positions[a + 2];

    const e2x = positions[c] - positions[a];
    const e2y = positions[c + 1] - positions[a + 1];
    const e2z = positions[c + 2] - positions[a + 2];

    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    normals[a] += nx;
    normals[a + 1] += ny;
    normals[a + 2] += nz;

    normals[b] += nx;
    normals[b + 1] += ny;
    normals[b + 2] += nz;

    normals[c] += nx;
    normals[c + 1] += ny;
    normals[c + 2] += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (len > 1e-12) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    } else {
      normals[i] = 0;
      normals[i + 1] = 1;
      normals[i + 2] = 0;
    }
  }

  return normals;
}

/**
 * Calcula boundingBox combinada e labelAnchor determinístico (vértice real da superfície externa)
 * usando os parâmetros anatômicos calibrados em T-02.
 */
function computeStructureAnchorAndBox(structure, simplifiedParts) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const part of simplifiedParts) {
    const pos = part.positions;
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i];
      const y = pos[i + 1];
      const z = pos[i + 2];
      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }
  }

  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const dir = normalizeVec3(structure.anchorDirection);

  const P = [center[0], center[1] + structure.yBias * size[1], center[2]];
  // Half-extent real da AABB ao longo da direção unitária `dir` (garante simetria exata entre dir.x < 0 e dir.x > 0)
  const halfExtent =
    0.5 * (Math.abs(size[0] * dir[0]) + Math.abs(size[1] * dir[1]) + Math.abs(size[2] * dir[2]));
  const G = [P[0] + dir[0] * halfExtent, P[1] + dir[1] * halfExtent, P[2] + dir[2] * halfExtent];

  let bestNormalFiltered = null;
  let bestNormalFilteredDistSq = Infinity;

  let bestFallback = null;
  let bestFallbackDistSq = Infinity;

  for (const part of simplifiedParts) {
    const pos = part.positions;
    const norm = part.normals;
    for (let i = 0; i < pos.length; i += 3) {
      const vx = pos[i];
      const vy = pos[i + 1];
      const vz = pos[i + 2];

      const dx = vx - G[0];
      const dy = vy - G[1];
      const dz = vz - G[2];
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < bestFallbackDistSq) {
        bestFallbackDistSq = distSq;
        bestFallback = [vx, vy, vz];
      }

      const ndot = norm[i] * dir[0] + norm[i + 1] * dir[1] + norm[i + 2] * dir[2];
      if (ndot > 0.25 && distSq < bestNormalFilteredDistSq) {
        bestNormalFilteredDistSq = distSq;
        bestNormalFiltered = [vx, vy, vz];
      }
    }
  }

  const chosen = bestNormalFiltered ?? bestFallback;
  if (!chosen) {
    throw new Error(`Nenhum vértice disponível para calcular labelAnchor de ${structure.anatomyId}`);
  }

  return {
    labelAnchor: chosen.map(round6),
    usedNormalFilter: bestNormalFiltered !== null,
    boundingBox: {
      min: min.map(floor6),
      max: max.map(ceil6),
    },
  };
}

/**
 * Constrói e comprime um arquivo .glb para um sistema ('skeletal' ou 'muscular')
 * mantendo a hierarquia exata HumanBody > skeletal-system/muscular-system > meshNodes.
 */
async function buildSystemGlb(system, partsData) {
  const doc = new Document();
  doc.getRoot().getAsset().generator = 'Anatomia 3D Asset Pipeline v1 (@gltf-transform + meshoptimizer)';

  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode('HumanBody');
  const systemGroupName = system === 'skeletal' ? 'skeletal-system' : 'muscular-system';
  const systemNode = doc.createNode(systemGroupName);

  rootNode.addChild(systemNode);
  scene.addChild(rootNode);

  // Material PBR base anatomicamente neutro (clonado/gerenciado por estrutura em runtime no AnatomyEngine)
  const baseMaterial =
    system === 'skeletal'
      ? doc
          .createMaterial('BoneBaseMaterial')
          .setBaseColorFactor([0.81, 0.74, 0.64, 1.0])
          .setRoughnessFactor(0.62)
          .setMetallicFactor(0.0)
          .setDoubleSided(false)
      : doc
          .createMaterial('MuscleBaseMaterial')
          .setBaseColorFactor([0.52, 0.14, 0.14, 1.0])
          .setRoughnessFactor(0.55)
          .setMetallicFactor(0.0)
          .setDoubleSided(false);

  let totalTriangles = 0;

  for (const item of partsData) {
    const vertexCount = item.positions.length / 3;
    const indicesArray = vertexCount <= 65535 ? new Uint16Array(item.indices) : item.indices;

    const positionAccessor = doc
      .createAccessor(`${item.nodeName}.POSITION`)
      .setType('VEC3')
      .setArray(item.positions)
      .setBuffer(buffer);

    const normalAccessor = doc
      .createAccessor(`${item.nodeName}.NORMAL`)
      .setType('VEC3')
      .setArray(item.normals)
      .setBuffer(buffer);

    const indexAccessor = doc
      .createAccessor(`${item.nodeName}.INDICES`)
      .setType('SCALAR')
      .setArray(indicesArray)
      .setBuffer(buffer);

    const primitive = doc
      .createPrimitive()
      .setAttribute('POSITION', positionAccessor)
      .setAttribute('NORMAL', normalAccessor)
      .setIndices(indexAccessor)
      .setMaterial(baseMaterial);

    const mesh = doc.createMesh(item.nodeName).addPrimitive(primitive);

    const node = doc
      .createNode(item.nodeName)
      .setMesh(mesh)
      .setExtras({
        anatomyId: item.anatomyId,
        system: item.system,
        fmaId: item.fmaId,
      });

    systemNode.addChild(node);
    totalTriangles += item.indices.length / 3;
  }

  // Aplica reorder + quantize (KHR_mesh_quantization) + EXTMeshoptCompression (modo FILTER / high)
  await doc.transform(
    meshopt({
      encoder: MeshoptEncoder,
      level: 'high',
      quantizePosition: 14,
      quantizeNormal: 8,
    }),
  );

  const io = new NodeIO()
    .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
    });

  const glbBytes = await io.writeBinary(doc);
  const glbBuffer = Buffer.from(glbBytes);

  return {
    buffer: glbBuffer,
    sha256: sha256Hex(glbBuffer),
    bytes: glbBuffer.byteLength,
    triangles: totalTriangles,
    meshCount: partsData.length,
  };
}

async function main() {
  const startedAt = Date.now();
  console.log('=== ANATOMIA 3D — BUILD DE ATIVOS 3D (BodyParts3D v3.0 -> glTF 2.0 Meshopt) ===');

  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const allParts = listAllCatalogParts();
  console.log(`Catálogo carregado: ${ANATOMY_CATALOG.length} estruturas, ${allParts.length} malhas STL.`);

  // 1. Download e cache dos 36 STLs brutos
  console.log('\n[1/6] Baixando/verificando 36 STLs em .cache/bodyparts3d/ ...');
  const downloadedList = await mapWithConcurrency(allParts, DOWNLOAD_CONCURRENCY, async (part) => {
    const result = await fetchStlWithCache(part);
    if (result.bytes !== part.expectedBytes) {
      console.warn(
        `  [AVISO] Tamanho divergente para ${part.fmaId}: esperado ${part.expectedBytes} B, recebido ${result.bytes} B`,
      );
    }
    return { part, ...result };
  });

  const cachedCount = downloadedList.filter((d) => d.fromCache).length;
  const rawTotalBytes = downloadedList.reduce((acc, d) => acc + d.bytes, 0);
  console.log(
    `  36 STLs prontos (${cachedCount} do cache, ${downloadedList.length - cachedCount} baixados) — ${(rawTotalBytes / 1024 / 1024).toFixed(2)} MiB brutos.`,
  );

  // 2. Parsing binário STL + conversão SO(3) + soldagem de vértices
  console.log('\n[2/6] Parsing STL binário, conversão SO(3) (m) e soldagem de vértices...');
  const meshesByNodeName = new Map();
  const stlHashesRecord = [];

  const globalMin = [Infinity, Infinity, Infinity];
  const globalMax = [-Infinity, -Infinity, -Infinity];
  let totalRawTriangles = 0;

  for (const item of downloadedList) {
    const parsed = parseAndWeldBinaryStl(item.buffer, item.part.fmaId);
    totalRawTriangles += parsed.rawTriangles;

    for (let i = 0; i < parsed.positions.length; i += 3) {
      const x = parsed.positions[i];
      const y = parsed.positions[i + 1];
      const z = parsed.positions[i + 2];
      if (x < globalMin[0]) globalMin[0] = x;
      if (y < globalMin[1]) globalMin[1] = y;
      if (z < globalMin[2]) globalMin[2] = z;
      if (x > globalMax[0]) globalMax[0] = x;
      if (y > globalMax[1]) globalMax[1] = y;
      if (z > globalMax[2]) globalMax[2] = z;
    }

    meshesByNodeName.set(item.part.nodeName, {
      ...item.part,
      ...parsed,
      stlSha256: item.sha256,
      stlBytes: item.bytes,
    });

    stlHashesRecord.push({
      system: item.part.system,
      fmaId: item.part.fmaId,
      nodeName: item.part.nodeName,
      anatomyId: item.part.anatomyId,
      bytes: item.bytes,
      expectedBytes: item.part.expectedBytes,
      rawTriangles: parsed.rawTriangles,
      sha256: item.sha256,
    });
  }

  // 3. Centralização global apenas em Y e Z (X = 0 preservado no plano sagital mediano)
  const centerY = (globalMin[1] + globalMax[1]) / 2;
  const centerZ = (globalMin[2] + globalMax[2]) / 2;
  const sceneOriginOffset = [0, round6(-centerY), round6(-centerZ)];

  for (const mesh of meshesByNodeName.values()) {
    const pos = mesh.positions;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] += sceneOriginOffset[1];
      pos[i + 2] += sceneOriginOffset[2];
    }
  }

  console.log(
    `  BBox global pré-centralização (m): min=[${globalMin.map(round6).join(', ')}], max=[${globalMax.map(round6).join(', ')}]`,
  );
  console.log(`  sceneOriginOffset aplicado: [${sceneOriginOffset.join(', ')}] (X=0 sagital mediano preservado)`);
  console.log(`  Total bruto de triângulos (36 STLs): ${totalRawTriangles.toLocaleString('en-US')}`);

  // 4. Diagnóstico empírico obrigatório de T-02 (aborta se houver inversão no upstream)
  const diagnostics = runEmpiricalDiagnostics(meshesByNodeName);

  // 5. Simplificação controlada + normais ponderadas por área + cálculo de âncoras
  console.log('\n[3/6] Simplificando individualmente as 36 malhas com MeshoptSimplifier...');
  console.log(
    'nodeName'.padEnd(44) +
      'rawTris'.padStart(9) +
      'target'.padStart(8) +
      'final'.padStart(8) +
      'verts'.padStart(8) +
      'err'.padStart(9) +
      'volΔ%'.padStart(8) +
      '  estratégia',
  );

  const skeletalPartsData = [];
  const muscularPartsData = [];
  const simplificationReport = [];

  for (const structure of ANATOMY_CATALOG) {
    for (const part of structure.parts) {
      const entry = meshesByNodeName.get(part.nodeName);
      const simplified = simplifySingleMesh(entry.positions, entry.indices, part.targetTriangles, part.nodeName);
      const normals = computeAreaWeightedNormals(simplified.positions, simplified.indices);
      const postStats = computeMeshStats(simplified.positions, simplified.indices);

      const rawVol = entry.rawStats.signedVolume;
      const postVol = postStats.signedVolume;
      const volDeltaPct = Math.abs(rawVol) > 1e-12 ? ((postVol - rawVol) / Math.abs(rawVol)) * 100 : 0;

      const finalTris = simplified.indices.length / 3;
      const finalVerts = simplified.positions.length / 3;

      console.log(
        part.nodeName.padEnd(44) +
          String(entry.rawTriangles).padStart(9) +
          String(part.targetTriangles).padStart(8) +
          String(finalTris).padStart(8) +
          String(finalVerts).padStart(8) +
          simplified.resultError.toFixed(5).padStart(9) +
          volDeltaPct.toFixed(2).padStart(8) +
          `  ${simplified.strategy}`,
      );

      const finalizedPart = {
        nodeName: part.nodeName,
        fmaId: part.fmaId,
        anatomyId: structure.anatomyId,
        system: structure.system,
        positions: simplified.positions,
        normals,
        indices: simplified.indices,
      };

      entry.finalized = finalizedPart;
      simplificationReport.push({
        nodeName: part.nodeName,
        fmaId: part.fmaId,
        system: structure.system,
        rawTriangles: entry.rawTriangles,
        targetTriangles: part.targetTriangles,
        finalTriangles: finalTris,
        finalVertices: finalVerts,
        resultError: round6(simplified.resultError),
        volumeDeltaPercent: round6(volDeltaPct),
        strategy: simplified.strategy,
      });

      if (structure.system === 'skeletal') {
        skeletalPartsData.push(finalizedPart);
      } else {
        muscularPartsData.push(finalizedPart);
      }
    }
  }

  // 6. Construção dos metadados determinísticos (labelAnchor, boundingBox, focusDirection)
  console.log('\n[4/6] Calculando labelAnchor determinístico e boundingBox para as 22 estruturas...');
  const generatedAt = new Date().toISOString();
  const metadataStructures = [];
  const coverageStructures = [];

  for (const structure of ANATOMY_CATALOG) {
    const finalizedParts = structure.parts.map((p) => meshesByNodeName.get(p.nodeName).finalized);
    const { labelAnchor, boundingBox, usedNormalFilter } = computeStructureAnchorAndBox(structure, finalizedParts);
    const focusDirection = normalizeVec3(structure.focusDirection).map(round6);

    const meshNodes = structure.parts.map((p) => p.nodeName);
    const fmaIds = structure.parts.map((p) => p.fmaId);

    console.log(
      `  ${structure.anatomyId.padEnd(32)} anchor=[${labelAnchor.map((v) => v.toFixed(4)).join(', ')}]${usedNormalFilter ? '' : ' (fallback)'}`,
    );

    metadataStructures.push({
      anatomyId: structure.anatomyId,
      system: structure.system,
      laterality: structure.laterality,
      region: structure.region,
      displayName: structure.displayName,
      scientificName: structure.scientificName,
      meshNodes,
      labelAnchor,
      focusDirection,
      boundingBox,
      source: {
        assetVersion: ASSET_VERSION,
        referenceIds: ['BP3D-v3.0'],
        fmaIds,
      },
      review: {
        status: 'pending_review',
        reviewedBy: 'unassigned',
        reviewedAt: null,
      },
    });

    coverageStructures.push({
      anatomyId: structure.anatomyId,
      system: structure.system,
      laterality: structure.laterality,
      presentInAsset: true,
      detailLevel: DETAIL_LEVEL,
      meshNodes,
      fmaIds,
      reviewStatus: 'pending_review',
    });
  }

  // 7. Exportação e compressão Meshopt dos 2 .glb
  console.log('\n[5/6] Gerando e comprimindo skeletal-v1.glb e muscular-v1.glb (KHR_mesh_quantization + EXT_meshopt_compression)...');
  const skeletalGlb = await buildSystemGlb('skeletal', skeletalPartsData);
  const muscularGlb = await buildSystemGlb('muscular', muscularPartsData);

  const totalGlbBytes = skeletalGlb.bytes + muscularGlb.bytes;
  const totalFinalTriangles = skeletalGlb.triangles + muscularGlb.triangles;

  const metadataDoc = {
    schemaVersion: SCHEMA_VERSION,
    assetVersion: ASSET_VERSION,
    metadataVersion: METADATA_VERSION,
    terminologyReference: TERMINOLOGY_REFERENCE,
    generatedAt,
    structures: metadataStructures,
  };

  const coverageMatrixDoc = {
    schemaVersion: SCHEMA_VERSION,
    assetVersion: ASSET_VERSION,
    coverageMatrixVersion: COVERAGE_MATRIX_VERSION,
    scopeStatement: SCOPE_STATEMENT,
    generatedAt,
    structures: coverageStructures,
  };

  const manifestDoc = {
    schemaVersion: SCHEMA_VERSION,
    assetVersion: ASSET_VERSION,
    metadataVersion: METADATA_VERSION,
    coverageMatrixVersion: COVERAGE_MATRIX_VERSION,
    coordinateSystem: COORDINATE_SYSTEM,
    sceneOriginOffset,
    metadataUrl: `/assets/${ASSET_VERSION}/metadata-${METADATA_VERSION}.json`,
    coverageMatrixUrl: `/assets/${ASSET_VERSION}/coverage-matrix.json`,
    systems: {
      skeletal: {
        url: `/assets/${ASSET_VERSION}/skeletal-${ASSET_VERSION}.glb`,
        sha256: skeletalGlb.sha256,
        bytes: skeletalGlb.bytes,
        triangles: skeletalGlb.triangles,
        meshCount: skeletalGlb.meshCount,
      },
      muscular: {
        url: `/assets/${ASSET_VERSION}/muscular-${ASSET_VERSION}.glb`,
        sha256: muscularGlb.sha256,
        bytes: muscularGlb.bytes,
        triangles: muscularGlb.triangles,
        meshCount: muscularGlb.meshCount,
      },
    },
    license: LICENSE_INFO,
  };

  // 8. Emissão atômica em public/assets/v1/ e relatórios em .cache/bodyparts3d/
  console.log('\n[6/6] Gravando unidade de lançamento atomicamente em public/assets/v1/ ...');
  await writeFileAtomic(path.join(OUTPUT_DIR, `skeletal-${ASSET_VERSION}.glb`), skeletalGlb.buffer);
  await writeFileAtomic(path.join(OUTPUT_DIR, `muscular-${ASSET_VERSION}.glb`), muscularGlb.buffer);
  await writeFileAtomic(
    path.join(OUTPUT_DIR, `metadata-${METADATA_VERSION}.json`),
    `${JSON.stringify(metadataDoc, null, 2)}\n`,
  );
  await writeFileAtomic(
    path.join(OUTPUT_DIR, 'coverage-matrix.json'),
    `${JSON.stringify(coverageMatrixDoc, null, 2)}\n`,
  );
  await writeFileAtomic(path.join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifestDoc, null, 2)}\n`);

  // Artefatos de auditoria no cache (fora do Git)
  await writeFileAtomic(path.join(CACHE_DIR, 'stl-hashes.json'), `${JSON.stringify(stlHashesRecord, null, 2)}\n`);
  await writeFileAtomic(
    path.join(CACHE_DIR, 'build-report.json'),
    `${JSON.stringify(
      {
        generatedAt,
        sceneOriginOffset,
        rawTotalBytes,
        totalRawTriangles,
        skeletal: {
          bytes: skeletalGlb.bytes,
          triangles: skeletalGlb.triangles,
          meshCount: skeletalGlb.meshCount,
          sha256: skeletalGlb.sha256,
        },
        muscular: {
          bytes: muscularGlb.bytes,
          triangles: muscularGlb.triangles,
          meshCount: muscularGlb.meshCount,
          sha256: muscularGlb.sha256,
        },
        totals: {
          bytes: totalGlbBytes,
          triangles: totalFinalTriangles,
        },
        diagnostics,
        simplificationReport,
      },
      null,
      2,
    )}\n`,
  );

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log('\n=== RESUMO DO BUILD ===');
  console.log(
    `  skeletal-v1.glb : ${(skeletalGlb.bytes / 1024).toFixed(1)} KB (${skeletalGlb.bytes} B) | ${skeletalGlb.triangles.toLocaleString('en-US')} tris | ${skeletalGlb.meshCount} malhas | sha256=${skeletalGlb.sha256.slice(0, 16)}...`,
  );
  console.log(
    `  muscular-v1.glb : ${(muscularGlb.bytes / 1024).toFixed(1)} KB (${muscularGlb.bytes} B) | ${muscularGlb.triangles.toLocaleString('en-US')} tris | ${muscularGlb.meshCount} malhas | sha256=${muscularGlb.sha256.slice(0, 16)}...`,
  );
  console.log(
    `  TOTAL .glb      : ${(totalGlbBytes / 1024 / 1024).toFixed(2)} MB (${totalGlbBytes.toLocaleString('en-US')} B) | ${totalFinalTriangles.toLocaleString('en-US')} tris (redução de ${((1 - totalFinalTriangles / totalRawTriangles) * 100).toFixed(1)}% vs ${totalRawTriangles.toLocaleString('en-US')} brutos)`,
  );
  console.log(`  Tempo total     : ${elapsedSec}s`);
  console.log(`  Hashes STL salvos em: .cache/bodyparts3d/stl-hashes.json`);
}

main().catch((err) => {
  console.error('\n[BUILD FALHOU]', err?.stack || err);
  process.exit(1);
});
