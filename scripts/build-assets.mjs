import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Document, NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'bodyparts3d');

const DOWNLOAD_CONCURRENCY = 8;
const DOWNLOAD_MAX_RETRIES = 5;
const MIDLINE_MAX_ABS_X_METERS = 0.06; // 6 cm
const BILATERAL_WARN_METERS = 0.045; // 4,5 cm

function parseVersionArg() {
  const arg = process.argv.find((a) => a.startsWith('--version='));
  const value = arg ? arg.split('=')[1].trim() : 'v2';
  if (value !== 'v1' && value !== 'v2') {
    throw new Error(`Versão inválida "${value}". Use --version=v1 ou --version=v2.`);
  }
  return value;
}

async function loadCatalogForVersion(version) {
  if (version === 'v1') {
    return import('./anatomy-catalog.mjs');
  }
  return import('./anatomy-catalog-v2.mjs');
}

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
 * Valida estrutura de STL binário (header 80 B + uint32 triCount + 50 B por triângulo)
 * e calcula BBox em metros já aplicando a rotação rígida SO(3) (x/1000, z/1000, -y/1000).
 */
function inspectStlBuffer(buffer, stlId) {
  if (buffer.byteLength < 84) {
    throw new Error(`STL truncado (${buffer.byteLength} B) para ${stlId}`);
  }
  const triCount = buffer.readUInt32LE(80);
  const expectedStlSize = 84 + triCount * 50;
  if (buffer.byteLength !== expectedStlSize) {
    throw new Error(
      `Formato STL binário inválido para ${stlId}: esperado ${expectedStlSize} B para ${triCount} triângulos, recebido ${buffer.byteLength} B`,
    );
  }

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let t = 0; t < triCount; t++) {
    const base = 84 + t * 50;
    for (let v = 0; v < 3; v++) {
      const off = base + 12 + v * 12;
      const gx = buffer.readFloatLE(off) / 1000;
      const gy = buffer.readFloatLE(off + 8) / 1000;
      const gz = -buffer.readFloatLE(off + 4) / 1000;
      if (gx < min[0]) min[0] = gx;
      if (gy < min[1]) min[1] = gy;
      if (gz < min[2]) min[2] = gz;
      if (gx > max[0]) max[0] = gx;
      if (gy > max[1]) max[1] = gy;
      if (gz > max[2]) max[2] = gz;
    }
  }

  return {
    rawTriangles: triCount,
    bytes: buffer.byteLength,
    sha256: sha256Hex(buffer),
    min,
    max,
  };
}

/**
 * Baixa um STL do BodyParts3D com cache em `.cache/bodyparts3d/` e backoff exponencial + jitter.
 * Retorna apenas metadados/hashes/BBox sem reter o buffer bruto na memória RAM.
 */
async function ensureStlCachedAndInspect(part, baseUrl) {
  const stlId = part.stlId ?? part.fmaId;
  const cachePath = path.join(CACHE_DIR, `${stlId}.stl`);

  try {
    const stat = await fs.stat(cachePath);
    if (stat.size > 84) {
      const expectedBytes = part.expectedBytes;
      if (!expectedBytes || stat.size === expectedBytes) {
        const buffer = await fs.readFile(cachePath);
        const inspected = inspectStlBuffer(buffer, stlId);
        return { stlId, cachePath, fromCache: true, ...inspected };
      }
    }
  } catch {
    // Cache miss — prosseguir com download
  }

  const url = `${baseUrl}/${stlId}.stl`;
  let lastError = null;

  for (let attempt = 1; attempt <= DOWNLOAD_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'anatomia-3d-asset-pipeline/2.0' },
      });

      if (response.status === 429 || response.status === 503 || response.status >= 500) {
        throw new Error(`HTTP ${response.status} ${response.statusText} (retentável) ao baixar ${url}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} ao baixar ${url}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const inspected = inspectStlBuffer(buffer, stlId);

      await writeFileAtomic(cachePath, buffer);
      return { stlId, cachePath, fromCache: false, ...inspected };
    } catch (error) {
      lastError = error;
      if (attempt < DOWNLOAD_MAX_RETRIES) {
        const baseDelay = 600 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 400);
        await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
      }
    }
  }

  throw new Error(
    `Falha ao baixar ${stlId} após ${DOWNLOAD_MAX_RETRIES} tentativas: ${lastError?.message}`,
  );
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
 * + sceneOriginOffset embutido nos vértices e solda vértices duplicados em grade 1e-6 m.
 * Usa chaves BigInt de 69 bits para eficiência de memória e velocidade em malhas grandes.
 */
function parseTransformAndWeldBinaryStl(buffer, stlId, sceneOriginOffset) {
  const rawTriangles = buffer.readUInt32LE(80);
  const expectedSize = 84 + rawTriangles * 50;
  if (buffer.byteLength !== expectedSize) {
    throw new Error(
      `Tamanho STL inconsistente para ${stlId}: lido ${buffer.byteLength} B, esperado ${expectedSize} B (${rawTriangles} tris)`,
    );
  }

  const offsetY = sceneOriginOffset[1];
  const offsetZ = sceneOriginOffset[2];
  const BIAS = 4_000_000n;

  const vertexMap = new Map();
  // Pré-aloca buffers aproximados (crescem se necessário)
  const positionsList = [];
  const indicesArr = new Uint32Array(rawTriangles * 3);
  let idxWrite = 0;
  let degenerateTriangles = 0;

  const getOrCreateVertex = (gx, gy, gz) => {
    if (!Number.isFinite(gx) || !Number.isFinite(gy) || !Number.isFinite(gz)) {
      throw new Error(`Coordenada não finita encontrada em ${stlId}`);
    }
    const kx = BigInt(Math.round(gx * 1e6)) + BIAS;
    const ky = BigInt(Math.round(gy * 1e6)) + BIAS;
    const kz = BigInt(Math.round(gz * 1e6)) + BIAS;
    const key = (kx << 46n) | (ky << 23n) | kz;

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
    const x0 = buffer.readFloatLE(base + 12);
    const y0 = buffer.readFloatLE(base + 16);
    const z0 = buffer.readFloatLE(base + 20);

    const x1 = buffer.readFloatLE(base + 24);
    const y1 = buffer.readFloatLE(base + 28);
    const z1 = buffer.readFloatLE(base + 32);

    const x2 = buffer.readFloatLE(base + 36);
    const y2 = buffer.readFloatLE(base + 40);
    const z2 = buffer.readFloatLE(base + 44);

    // Transformação SO(3) (det = +1) + centralização Y/Z mantendo X=0 sagital mediano
    const i0 = getOrCreateVertex(x0 / 1000, z0 / 1000 + offsetY, -y0 / 1000 + offsetZ);
    const i1 = getOrCreateVertex(x1 / 1000, z1 / 1000 + offsetY, -y1 / 1000 + offsetZ);
    const i2 = getOrCreateVertex(x2 / 1000, z2 / 1000 + offsetY, -y2 / 1000 + offsetZ);

    if (i0 === i1 || i1 === i2 || i2 === i0) {
      degenerateTriangles++;
      continue;
    }

    indicesArr[idxWrite++] = i0;
    indicesArr[idxWrite++] = i1;
    indicesArr[idxWrite++] = i2;
  }

  return {
    positions: new Float32Array(positionsList),
    indices: idxWrite === indicesArr.length ? indicesArr : indicesArr.slice(0, idxWrite),
    rawTriangles,
    weldedTriangles: idxWrite / 3,
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
 * e contornos musculares. Nunca funde malhas de anatomyId diferentes.
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
  const acceptableMaxTris = Math.ceil(targetTriangles * 1.08);

  // Escada conservadora: LockBorder + erro baixo primeiro; só relaxa se a malha exigir (ex.: intercostais 816k -> 1.7k)
  const attempts = [
    { error: 0.005, flags: ['LockBorder'] },
    { error: 0.01, flags: ['LockBorder'] },
    { error: 0.02, flags: ['LockBorder'] },
    { error: 0.04, flags: ['LockBorder'] },
    { error: 0.02, flags: [] },
    { error: 0.05, flags: [] },
    { error: 0.1, flags: [] },
    { error: 0.25, flags: [] },
    { error: 0.5, flags: [] },
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

  // Fallback sloppy controlado APENAS se a redução normal travou > 2.5x acima do alvo (ex.: malha com dezenas de ilhas desconexas)
  if (bestIndices.length / 3 > targetTriangles * 2.5) {
    const [sloppyIndices, sloppyErr] = MeshoptSimplifier.simplifySloppy(
      indices,
      positions,
      3,
      null,
      targetIndexCount,
      0.08,
    );
    if (sloppyIndices.length > 0 && sloppyIndices.length < bestIndices.length) {
      bestIndices = sloppyIndices;
      bestError = sloppyErr;
      bestStrategy = 'sloppy(err<=0.08)';
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
 * Recalcula normais suaves ponderadas pela área de cada face.
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
 * Calcula boundingBox combinada e labelAnchor determinístico (vértice real da superfície externa).
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

  const P = [center[0], center[1] + (structure.yBias ?? 0) * size[1], center[2]];
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
 * Executa o diagnóstico empírico de lateralidade (right < 0, left > 0, midline |x| < 6cm),
 * casos críticos (subclavius, trapezoideum, flexor_pollicis_brevis, tendo_calcaneus, digastricus, BP44..47)
 * e simetria bilateral. Aborta imediatamente se qualquer malha violar a lateralidade.
 */
function runEmpiricalDiagnostics(catalog, statsByNodeName) {
  console.log('\n=== DIAGNÓSTICO EMPÍRICO DE LATERALIDADE E SIMETRIA ===');

  const lateralityErrors = [];
  const criticalNodes = new Set([
    'muscle.subclavius.right',
    'muscle.subclavius.left',
    'bone.os_trapezoideum.right',
    'bone.os_trapezoideum.left',
    'muscle.flexor_pollicis_brevis.right.superficial_head',
    'muscle.flexor_pollicis_brevis.right.deep_head',
    'muscle.flexor_pollicis_brevis.left.superficial_head',
    'muscle.flexor_pollicis_brevis.left.deep_head',
    'muscle.tendo_calcaneus.right',
    'muscle.tendo_calcaneus.left',
    'muscle.digastricus.right.anterior_belly',
    'muscle.digastricus.right.posterior_belly',
    'muscle.digastricus.right.intermediate_tendon',
    'muscle.digastricus.left.anterior_belly',
    'muscle.digastricus.left.posterior_belly',
    'muscle.digastricus.left.intermediate_tendon',
    'muscle.extensor_carpi_ulnaris.right.humeral_head',
    'muscle.extensor_carpi_ulnaris.right.ulnar_head',
    'muscle.extensor_carpi_ulnaris.left.humeral_head',
    'muscle.extensor_carpi_ulnaris.left.ulnar_head',
    'muscle.pectoralis_major.right.clavicular',
    'muscle.pectoralis_major.left.clavicular',
    'bone.os_sesamoideum_pedis.right',
    'bone.os_sesamoideum_pedis.left',
  ]);

  let rightCount = 0;
  let leftCount = 0;
  let midlineCount = 0;
  let negativeVolCount = 0;
  const criticalReport = [];
  const meshDiagnostics = [];

  for (const structure of catalog) {
    for (const part of structure.parts) {
      const rec = statsByNodeName.get(part.nodeName);
      const { centroid, min, max, signedVolume } = rec.rawStats;
      const stlId = part.stlId ?? part.fmaId;

      let validLaterality = false;
      if (structure.laterality === 'right') {
        rightCount++;
        validLaterality = centroid[0] < 0;
      } else if (structure.laterality === 'left') {
        leftCount++;
        validLaterality = centroid[0] > 0;
      } else {
        midlineCount++;
        validLaterality = Math.abs(centroid[0]) < MIDLINE_MAX_ABS_X_METERS;
      }

      if (signedVolume < 0) negativeVolCount++;

      if (!validLaterality) {
        lateralityErrors.push({
          nodeName: part.nodeName,
          stlId,
          fmaId: part.fmaId,
          expectedLaterality: structure.laterality,
          centroidX: round6(centroid[0]),
        });
      }

      const diagEntry = {
        nodeName: part.nodeName,
        stlId,
        fmaId: part.fmaId,
        anatomyId: structure.anatomyId,
        laterality: structure.laterality,
        centroid: centroid.map(round6),
        min: min.map(round6),
        max: max.map(round6),
        signedVolumeCm3: round6(signedVolume * 1e6),
        rawTriangles: rec.rawTriangles,
      };
      meshDiagnostics.push(diagEntry);

      if (criticalNodes.has(part.nodeName)) {
        criticalReport.push(diagEntry);
      }
    }
  }

  console.log('\n[A] Casos críticos auditados (subclavius, trapezoideum, flexor_pollicis_brevis, tendo_calcaneus, digastricus, BP44..47, sesamoides):');
  for (const c of criticalReport) {
    const idLabel = c.stlId !== c.fmaId ? `${c.stlId}->${c.fmaId}` : c.fmaId;
    console.log(
      `  ${c.nodeName.padEnd(52)} ${idLabel.padEnd(16)} ${c.laterality.padEnd(7)} cx=${c.centroid[0].toFixed(4).padStart(8)} cy=${c.centroid[1].toFixed(4).padStart(8)} cz=${c.centroid[2].toFixed(4).padStart(8)}`,
    );
  }

  if (lateralityErrors.length > 0) {
    console.error('\n[ERRO CRÍTICO] Violação de lateralidade detectada no upstream BodyParts3D!');
    for (const err of lateralityErrors) {
      console.error(
        `  - ${err.nodeName} (stl=${err.stlId}, fma=${err.fmaId}): esperado ${err.expectedLaterality}, mas centroid.x = ${err.centroidX} m`,
      );
    }
    throw new Error(
      `ABORTADO: ${lateralityErrors.length} malha(s) com lateralidade violada no upstream. Reporte imediatamente ao Coordenador.`,
    );
  }

  console.log(
    `\n[OK] Lateralidade 100% válida: ${rightCount} right (cx<0), ${leftCount} left (cx>0), ${midlineCount} midline (|cx|<${(MIDLINE_MAX_ABS_X_METERS * 100).toFixed(0)}cm). Volumes assinados negativos: ${negativeVolCount}.`,
  );

  // Simetria bilateral entre todos os pares antímeros (right <-> left)
  const bilateralWarnings = [];
  let pairsChecked = 0;
  let worstPair = { pair: 'none', maxErrMm: 0, dxSymMm: 0, dyDiffMm: 0, dzDiffMm: 0 };

  for (const structure of catalog) {
    if (structure.laterality !== 'right') continue;
    for (const part of structure.parts) {
      const leftNodeName = part.nodeName.replace('.right', '.left');
      const rRec = statsByNodeName.get(part.nodeName);
      const lRec = statsByNodeName.get(leftNodeName);
      if (!rRec || !lRec) continue;

      pairsChecked++;
      const dxSym = rRec.rawStats.centroid[0] + lRec.rawStats.centroid[0];
      const dyDiff = rRec.rawStats.centroid[1] - lRec.rawStats.centroid[1];
      const dzDiff = rRec.rawStats.centroid[2] - lRec.rawStats.centroid[2];
      const maxErr = Math.max(Math.abs(dxSym), Math.abs(dyDiff), Math.abs(dzDiff));
      const maxErrMm = round6(maxErr * 1000);

      const pairInfo = {
        pair: part.nodeName.replace('.right', '.{right,left}'),
        maxErrMm,
        dxSymMm: round6(dxSym * 1000),
        dyDiffMm: round6(dyDiff * 1000),
        dzDiffMm: round6(dzDiff * 1000),
      };

      if (maxErrMm > worstPair.maxErrMm) {
        worstPair = pairInfo;
      }
      if (maxErr > BILATERAL_WARN_METERS) {
        bilateralWarnings.push(pairInfo);
      }
    }
  }

  console.log(
    `[OK] Simetria bilateral verificada em ${pairsChecked} pares antímeros: pior desvio = ${worstPair.maxErrMm.toFixed(2)} mm (${worstPair.pair}: dx=${worstPair.dxSymMm.toFixed(1)}mm, dy=${worstPair.dyDiffMm.toFixed(1)}mm, dz=${worstPair.dzDiffMm.toFixed(1)}mm).`,
  );
  if (bilateralWarnings.length > 0) {
    console.warn(`[AVISO] ${bilateralWarnings.length} par(es) acima de ${(BILATERAL_WARN_METERS * 1000).toFixed(0)} mm:`);
    for (const w of bilateralWarnings) {
      console.warn(`  - ${w.pair}: max=${w.maxErrMm.toFixed(1)}mm (dx=${w.dxSymMm}mm, dy=${w.dyDiffMm}mm, dz=${w.dzDiffMm}mm)`);
    }
  }

  return {
    counts: { rightCount, leftCount, midlineCount, pairsChecked, negativeVolCount },
    worstBilateralPair: worstPair,
    bilateralWarnings,
    criticalReport,
    meshDiagnostics,
  };
}

/**
 * Constrói e comprime um arquivo .glb para um sistema ('skeletal' ou 'muscular')
 * mantendo a hierarquia exata HumanBody > skeletal-system/muscular-system > meshNodes.
 */
async function buildSystemGlb(system, partsData, assetVersion) {
  const doc = new Document();
  doc.getRoot().getAsset().generator = `Anatomia 3D Asset Pipeline ${assetVersion} (@gltf-transform + meshoptimizer)`;

  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');
  const rootNode = doc.createNode('HumanBody');
  const systemGroupName = system === 'skeletal' ? 'skeletal-system' : 'muscular-system';
  const systemNode = doc.createNode(systemGroupName);

  rootNode.addChild(systemNode);
  scene.addChild(rootNode);

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
  const targetVersion = parseVersionArg();
  const catalogMod = await loadCatalogForVersion(targetVersion);

  const {
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
  } = catalogMod;

  const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'assets', ASSET_VERSION);

  console.log(
    `=== ANATOMIA 3D — BUILD DE ATIVOS 3D [${ASSET_VERSION}] (BodyParts3D v3.0 -> glTF 2.0 Meshopt) ===`,
  );

  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const allParts = listAllCatalogParts();
  console.log(
    `Catálogo ${ASSET_VERSION} carregado: ${ANATOMY_CATALOG.length} estruturas, ${allParts.length} malhas STL.`,
  );

  // -------------------------------------------------------------------------
  // [1/6] Download/cache dos STLs + cálculo streaming de SHA-256 e BBox global
  // -------------------------------------------------------------------------
  console.log(`\n[1/6] Baixando/verificando ${allParts.length} STLs em .cache/bodyparts3d/ ...`);
  let doneDownloads = 0;
  const inspectedList = await mapWithConcurrency(allParts, DOWNLOAD_CONCURRENCY, async (part) => {
    const res = await ensureStlCachedAndInspect(part, BODYPARTS3D_BASE_URL);
    doneDownloads++;
    if (allParts.length > 50 && (doneDownloads % 100 === 0 || doneDownloads === allParts.length)) {
      console.log(`  Progresso STL: ${doneDownloads}/${allParts.length}`);
    }
    if (part.expectedBytes && res.bytes !== part.expectedBytes) {
      console.warn(
        `  [AVISO] Tamanho divergente para ${res.stlId}: esperado ${part.expectedBytes} B, recebido ${res.bytes} B`,
      );
    }
    return { part, ...res };
  });

  const cachedCount = inspectedList.filter((d) => d.fromCache).length;
  const rawTotalBytes = inspectedList.reduce((acc, d) => acc + d.bytes, 0);
  const totalRawTriangles = inspectedList.reduce((acc, d) => acc + d.rawTriangles, 0);
  console.log(
    `  ${allParts.length} STLs prontos (${cachedCount} do cache, ${inspectedList.length - cachedCount} baixados) — ${(rawTotalBytes / 1024 / 1024).toFixed(2)} MiB brutos (${totalRawTriangles.toLocaleString('en-US')} triângulos brutos).`,
  );

  const globalMin = [Infinity, Infinity, Infinity];
  const globalMax = [-Infinity, -Infinity, -Infinity];
  const inspectedByNodeName = new Map();
  const stlHashesRecord = [];

  for (const item of inspectedList) {
    inspectedByNodeName.set(item.part.nodeName, item);
    for (let a = 0; a < 3; a++) {
      if (item.min[a] < globalMin[a]) globalMin[a] = item.min[a];
      if (item.max[a] > globalMax[a]) globalMax[a] = item.max[a];
    }
    stlHashesRecord.push({
      stlId: item.stlId,
      fmaId: item.part.fmaId,
      anatomyId: item.part.anatomyId,
      nodeName: item.part.nodeName,
      system: item.part.system,
      region: item.part.region ?? 'upper_limb',
      bytes: item.bytes,
      rawTriangles: item.rawTriangles,
      sha256: item.sha256,
    });
  }

  // Centralização global apenas em Y e Z (X = 0 preservado no plano sagital mediano)
  const centerY = (globalMin[1] + globalMax[1]) / 2;
  const centerZ = (globalMin[2] + globalMax[2]) / 2;
  const sceneOriginOffset = [0, round6(-centerY), round6(-centerZ)];

  console.log(
    `  BBox global pré-centralização (m): min=[${globalMin.map(round6).join(', ')}], max=[${globalMax.map(round6).join(', ')}]`,
  );
  console.log(
    `  sceneOriginOffset aplicado: [${sceneOriginOffset.join(', ')}] (X=0 sagital mediano preservado)`,
  );

  // -------------------------------------------------------------------------
  // [2/6] Streaming por malha: parse SO(3) + weld + rawStats + simplify + normals
  // -------------------------------------------------------------------------
  console.log(
    `\n[2/6] Processando, soldando e simplificando individualmente as ${allParts.length} malhas (streaming de baixa RAM)...`,
  );

  const statsByNodeName = new Map();
  const finalizedByNodeName = new Map();
  const skeletalPartsData = [];
  const muscularPartsData = [];
  const simplificationReport = [];
  let processedCount = 0;

  for (const structure of ANATOMY_CATALOG) {
    for (const part of structure.parts) {
      const inspected = inspectedByNodeName.get(part.nodeName);
      const buffer = await fs.readFile(inspected.cachePath);
      const parsed = parseTransformAndWeldBinaryStl(buffer, inspected.stlId, sceneOriginOffset);
      const rawStats = computeMeshStats(parsed.positions, parsed.indices);

      statsByNodeName.set(part.nodeName, {
        rawStats,
        rawTriangles: parsed.rawTriangles,
        weldedTriangles: parsed.weldedTriangles,
        weldedVertices: parsed.weldedVertices,
      });

      const simplified = simplifySingleMesh(
        parsed.positions,
        parsed.indices,
        part.targetTriangles,
        part.nodeName,
      );
      const normals = computeAreaWeightedNormals(simplified.positions, simplified.indices);
      const postStats = computeMeshStats(simplified.positions, simplified.indices);

      const rawVol = rawStats.signedVolume;
      const postVol = postStats.signedVolume;
      const volDeltaPct =
        Math.abs(rawVol) > 1e-12 ? ((postVol - rawVol) / Math.abs(rawVol)) * 100 : 0;

      const finalTris = simplified.indices.length / 3;
      const finalVerts = simplified.positions.length / 3;

      const finalizedPart = {
        nodeName: part.nodeName,
        stlId: inspected.stlId,
        fmaId: part.fmaId,
        anatomyId: structure.anatomyId,
        system: structure.system,
        positions: simplified.positions,
        normals,
        indices: simplified.indices,
      };

      finalizedByNodeName.set(part.nodeName, finalizedPart);
      if (structure.system === 'skeletal') {
        skeletalPartsData.push(finalizedPart);
      } else {
        muscularPartsData.push(finalizedPart);
      }

      simplificationReport.push({
        nodeName: part.nodeName,
        stlId: inspected.stlId,
        fmaId: part.fmaId,
        system: structure.system,
        rawTriangles: parsed.rawTriangles,
        targetTriangles: part.targetTriangles,
        finalTriangles: finalTris,
        finalVertices: finalVerts,
        resultError: round6(simplified.resultError),
        volumeDeltaPercent: round6(volDeltaPct),
        strategy: simplified.strategy,
      });

      processedCount++;
      if (allParts.length > 50 && (processedCount % 100 === 0 || processedCount === allParts.length)) {
        console.log(`  Simplificação concluída: ${processedCount}/${allParts.length} malhas`);
      }
    }
  }

  // Relatório resumido de simplificação (destaca malhas que precisaram de erro > 0.01 ou sloppy)
  const nonConservative = simplificationReport.filter(
    (r) => !r.strategy.startsWith('err<=0.005') && r.strategy !== 'passthrough',
  );
  const maxErrItem = simplificationReport.reduce(
    (best, cur) => (cur.resultError > best.resultError ? cur : best),
    simplificationReport[0],
  );
  console.log(
    `  Simplificação finalizada: ${simplificationReport.length} malhas | maior erro relativo = ${maxErrItem.resultError} (${maxErrItem.nodeName}, ${maxErrItem.strategy}) | malhas com estratégia > 0.005: ${nonConservative.length}`,
  );
  for (const nc of nonConservative.slice(0, 15)) {
    console.log(
      `    • ${nc.nodeName.padEnd(46)} ${String(nc.rawTriangles).padStart(7)} -> ${String(nc.finalTriangles).padStart(5)} (alvo ${nc.targetTriangles}) err=${nc.resultError} ${nc.strategy}`,
    );
  }

  // -------------------------------------------------------------------------
  // [3/6] Diagnóstico empírico de lateralidade e simetria (aborta se violado)
  // -------------------------------------------------------------------------
  const diagnostics = runEmpiricalDiagnostics(ANATOMY_CATALOG, statsByNodeName);

  // -------------------------------------------------------------------------
  // [4/6] Cálculo determinístico de labelAnchor, boundingBox e focusDirection
  // -------------------------------------------------------------------------
  console.log(
    `\n[4/6] Calculando labelAnchor determinístico e boundingBox para as ${ANATOMY_CATALOG.length} estruturas...`,
  );
  const generatedAt = new Date().toISOString();
  const metadataStructures = [];
  const coverageStructures = [];
  let fallbackAnchorCount = 0;

  for (const structure of ANATOMY_CATALOG) {
    const finalizedParts = structure.parts.map((p) => finalizedByNodeName.get(p.nodeName));
    const { labelAnchor, boundingBox, usedNormalFilter } = computeStructureAnchorAndBox(
      structure,
      finalizedParts,
    );
    if (!usedNormalFilter) fallbackAnchorCount++;
    const focusDirection = normalizeVec3(structure.focusDirection).map(round6);

    const meshNodes = structure.parts.map((p) => p.nodeName);
    const fmaIds = structure.structureFmaIds ?? [...new Set(structure.parts.map((p) => p.fmaId))];

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
      region: structure.region,
      presentInAsset: true,
      detailLevel: DETAIL_LEVEL,
      meshNodes,
      fmaIds,
      reviewStatus: 'pending_review',
    });
  }
  console.log(
    `  ${metadataStructures.length} âncoras calculadas (${metadataStructures.length - fallbackAnchorCount} com filtro de normal > 0.25, ${fallbackAnchorCount} fallback).`,
  );

  // -------------------------------------------------------------------------
  // [5/6] Exportação e compressão Meshopt dos 2 .glb
  // -------------------------------------------------------------------------
  console.log(
    `\n[5/6] Gerando e comprimindo skeletal-${ASSET_VERSION}.glb e muscular-${ASSET_VERSION}.glb (KHR_mesh_quantization + EXT_meshopt_compression)...`,
  );
  const skeletalGlb = await buildSystemGlb('skeletal', skeletalPartsData, ASSET_VERSION);
  const muscularGlb = await buildSystemGlb('muscular', muscularPartsData, ASSET_VERSION);

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

  // -------------------------------------------------------------------------
  // [6/6] Emissão atômica em public/assets/<version>/ + proveniência
  // -------------------------------------------------------------------------
  console.log(`\n[6/6] Gravando unidade de lançamento atomicamente em public/assets/${ASSET_VERSION}/ ...`);
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
  await writeFileAtomic(
    path.join(OUTPUT_DIR, 'manifest.json'),
    `${JSON.stringify(manifestDoc, null, 2)}\n`,
  );

  // Relatórios de auditoria no cache (fora do Git)
  const sortedHashes = [...stlHashesRecord].sort((a, b) => a.stlId.localeCompare(b.stlId));
  await writeFileAtomic(
    path.join(CACHE_DIR, `stl-hashes-${ASSET_VERSION}.json`),
    `${JSON.stringify(sortedHashes, null, 2)}\n`,
  );
  await writeFileAtomic(
    path.join(CACHE_DIR, `build-report-${ASSET_VERSION}.json`),
    `${JSON.stringify(
      {
        assetVersion: ASSET_VERSION,
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

  // Para v2, emite também docs/proveniencia-v2-hashes.json conforme contrato Fase 2
  if (ASSET_VERSION === 'v2') {
    const provenancePath = path.join(ROOT_DIR, 'docs', 'proveniencia-v2-hashes.json');
    const provenanceDoc = {
      schemaVersion: SCHEMA_VERSION,
      assetVersion: ASSET_VERSION,
      generatedAt,
      sourceRepository: 'https://github.com/Kevin-Mattheus-Moerman/BodyParts3D (main, BodyParts3D v3.0)',
      license: LICENSE_INFO,
      coordinateSystem: COORDINATE_SYSTEM,
      sceneOriginOffset,
      outputs: {
        skeletal: {
          file: `public/assets/${ASSET_VERSION}/skeletal-${ASSET_VERSION}.glb`,
          sha256: skeletalGlb.sha256,
          bytes: skeletalGlb.bytes,
          triangles: skeletalGlb.triangles,
          meshCount: skeletalGlb.meshCount,
        },
        muscular: {
          file: `public/assets/${ASSET_VERSION}/muscular-${ASSET_VERSION}.glb`,
          sha256: muscularGlb.sha256,
          bytes: muscularGlb.bytes,
          triangles: muscularGlb.triangles,
          meshCount: muscularGlb.meshCount,
        },
        totals: {
          bytes: totalGlbBytes,
          triangles: totalFinalTriangles,
          structureCount: ANATOMY_CATALOG.length,
          stlCount: sortedHashes.length,
        },
      },
      sourceStls: sortedHashes,
    };
    await writeFileAtomic(provenancePath, `${JSON.stringify(provenanceDoc, null, 2)}\n`);
    console.log(`  Proveniência SHA-256 gravada em: docs/proveniencia-v2-hashes.json (${sortedHashes.length} STLs + 2 GLBs)`);
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(2);
  console.log(`\n=== RESUMO DO BUILD [${ASSET_VERSION}] ===`);
  console.log(
    `  skeletal-${ASSET_VERSION}.glb : ${(skeletalGlb.bytes / 1024 / 1024).toFixed(2)} MB (${skeletalGlb.bytes.toLocaleString('en-US')} B) | ${skeletalGlb.triangles.toLocaleString('en-US')} tris | ${skeletalGlb.meshCount} malhas | sha256=${skeletalGlb.sha256}`,
  );
  console.log(
    `  muscular-${ASSET_VERSION}.glb : ${(muscularGlb.bytes / 1024 / 1024).toFixed(2)} MB (${muscularGlb.bytes.toLocaleString('en-US')} B) | ${muscularGlb.triangles.toLocaleString('en-US')} tris | ${muscularGlb.meshCount} malhas | sha256=${muscularGlb.sha256}`,
  );
  console.log(
    `  TOTAL .glb      : ${(totalGlbBytes / 1024 / 1024).toFixed(2)} MB (${totalGlbBytes.toLocaleString('en-US')} B) | ${totalFinalTriangles.toLocaleString('en-US')} tris (redução de ${((1 - totalFinalTriangles / totalRawTriangles) * 100).toFixed(2)}% vs ${totalRawTriangles.toLocaleString('en-US')} brutos)`,
  );
  console.log(`  Tempo total     : ${elapsedSec}s`);
}

main().catch((err) => {
  console.error('\n[BUILD FALHOU]', err?.stack || err);
  process.exit(1);
});
