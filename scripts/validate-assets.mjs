import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer/decoder';

import {
  ANATOMY_ID_REGEX,
  CoverageMatrixSchema,
  LABEL_ANCHOR_BBOX_TOLERANCE_METERS,
  ManifestSchema,
  MetadataDocumentSchema,
  isPointWithinBoundingBox,
} from '../src/core/schema/anatomy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const VERSION_BUDGETS = {
  v1: {
    targetMaxTriangles: 100_000,
    hardMaxTriangles: 120_000,
    targetMaxGlbBytes: 3_000_000, // 3,0 MB
    hardMaxGlbBytes: 4_000_000, // 4,0 MB
    skeletalTargetMaxBytes: null,
    skeletalHardMaxBytes: null,
    bilateralSymmetryToleranceMeters: 0.035, // 35 mm
    requireCoverageRegion: false,
  },
  v2: {
    targetMaxTriangles: 320_000,
    hardMaxTriangles: 400_000,
    targetMaxGlbBytes: 5_000_000, // 5,0 MB
    hardMaxGlbBytes: 7_000_000, // 7,0 MB
    skeletalTargetMaxBytes: 2_000_000, // 2,0 MB
    skeletalHardMaxBytes: 2_500_000, // 2,5 MB
    bilateralSymmetryToleranceMeters: 0.045, // 45 mm
    requireCoverageRegion: true,
  },
};

const BBOX_SYNC_TOLERANCE_METERS = 0.005; // 5 mm
const MIDLINE_MAX_ABS_X_METERS = 0.06; // 60 mm

const failures = [];
const warnings = [];

function parseVersionArg() {
  const arg = process.argv.find((a) => a.startsWith('--version='));
  const value = arg ? arg.split('=')[1].trim() : 'v2';
  if (value !== 'v1' && value !== 'v2') {
    throw new Error(`Versão inválida "${value}". Use --version=v1 ou --version=v2.`);
  }
  return value;
}

function fail(checkId, message) {
  failures.push(`[CHECK ${checkId} FALHOU] ${message}`);
}

function warn(checkId, message) {
  warnings.push(`[CHECK ${checkId} ALERTA] ${message}`);
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function resolvePublicAssetPath(assetUrl) {
  const relative = assetUrl.replace(/^\/+/, '');
  return path.join(PUBLIC_DIR, relative);
}

async function readJsonFile(filePath, label) {
  const raw = await fs.readFile(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON inválido em ${label} (${filePath}): ${err.message}`);
  }
}

function formatZodIssues(error) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');
}

function transformPointMat4(x, y, z, m) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

/**
 * Extrai triângulos, bounding box e centroide ponderado por área em espaço mundo
 * diretamente dos buffers decodificados de um Node glTF.
 */
function inspectGlbMeshNode(node) {
  const mesh = node.getMesh();
  if (!mesh) {
    return null;
  }

  const worldMatrix = node.getWorldMatrix();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let triangleCount = 0;
  let vertexCount = 0;
  let totalArea = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let hasNonFinite = false;

  const tmpPos = [0, 0, 0];

  for (const prim of mesh.listPrimitives()) {
    const posAccessor = prim.getAttribute('POSITION');
    if (!posAccessor) continue;

    const count = posAccessor.getCount();
    vertexCount += count;

    const worldPositions = new Float64Array(count * 3);
    for (let i = 0; i < count; i++) {
      posAccessor.getElement(i, tmpPos);
      const [wx, wy, wz] = transformPointMat4(tmpPos[0], tmpPos[1], tmpPos[2], worldMatrix);
      if (!Number.isFinite(wx) || !Number.isFinite(wy) || !Number.isFinite(wz)) {
        hasNonFinite = true;
      }
      worldPositions[i * 3] = wx;
      worldPositions[i * 3 + 1] = wy;
      worldPositions[i * 3 + 2] = wz;

      if (wx < min[0]) min[0] = wx;
      if (wy < min[1]) min[1] = wy;
      if (wz < min[2]) min[2] = wz;
      if (wx > max[0]) max[0] = wx;
      if (wy > max[1]) max[1] = wy;
      if (wz > max[2]) max[2] = wz;
    }

    const indicesAccessor = prim.getIndices();
    const indexCount = indicesAccessor ? indicesAccessor.getCount() : count;
    const primTris = Math.floor(indexCount / 3);
    triangleCount += primTris;

    for (let t = 0; t < primTris; t++) {
      const i0 = indicesAccessor ? indicesAccessor.getScalar(t * 3) : t * 3;
      const i1 = indicesAccessor ? indicesAccessor.getScalar(t * 3 + 1) : t * 3 + 1;
      const i2 = indicesAccessor ? indicesAccessor.getScalar(t * 3 + 2) : t * 3 + 2;

      const ax = worldPositions[i0 * 3];
      const ay = worldPositions[i0 * 3 + 1];
      const az = worldPositions[i0 * 3 + 2];

      const bx = worldPositions[i1 * 3];
      const by = worldPositions[i1 * 3 + 1];
      const bz = worldPositions[i1 * 3 + 2];

      const cxv = worldPositions[i2 * 3];
      const cyv = worldPositions[i2 * 3 + 1];
      const czv = worldPositions[i2 * 3 + 2];

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

      cx += ((ax + bx + cxv) / 3) * area;
      cy += ((ay + by + cyv) / 3) * area;
      cz += ((az + bz + czv) / 3) * area;
    }
  }

  const centroid =
    totalArea > 0
      ? [cx / totalArea, cy / totalArea, cz / totalArea]
      : [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];

  return {
    name: node.getName(),
    extras: node.getExtras() ?? {},
    triangles: triangleCount,
    vertices: vertexCount,
    hasNonFinite,
    min,
    max,
    centroid,
  };
}

async function main() {
  const version = parseVersionArg();
  const budget = VERSION_BUDGETS[version];
  const MANIFEST_PATH = path.join(PUBLIC_DIR, 'assets', version, 'manifest.json');

  console.log(`=== ANATOMIA 3D — GATE DE VALIDAÇÃO DE ATIVOS [${version}] (9 VERIFICAÇÕES) ===\n`);

  // -------------------------------------------------------------------------
  // CHECK 1: Validação Zod de contratos (manifest, metadata, coverage-matrix)
  // -------------------------------------------------------------------------
  let rawManifest;
  try {
    rawManifest = await readJsonFile(MANIFEST_PATH, 'manifest.json');
  } catch (err) {
    fail(1, `Não foi possível ler manifest.json (${MANIFEST_PATH}): ${err.message}`);
    reportAndExit(version);
    return;
  }

  const manifestResult = ManifestSchema.safeParse(rawManifest);
  if (!manifestResult.success) {
    fail(1, `manifest.json falhou no ManifestSchema: ${formatZodIssues(manifestResult.error)}`);
    reportAndExit(version);
    return;
  }
  const manifest = manifestResult.data;

  const metadataPath = resolvePublicAssetPath(manifest.metadataUrl);
  const coveragePath = resolvePublicAssetPath(manifest.coverageMatrixUrl);

  let rawMetadata;
  let rawCoverage;
  try {
    rawMetadata = await readJsonFile(metadataPath, manifest.metadataUrl);
  } catch (err) {
    fail(1, `Não foi possível ler ${manifest.metadataUrl}: ${err.message}`);
  }
  try {
    rawCoverage = await readJsonFile(coveragePath, manifest.coverageMatrixUrl);
  } catch (err) {
    fail(1, `Não foi possível ler ${manifest.coverageMatrixUrl}: ${err.message}`);
  }

  if (!rawMetadata || !rawCoverage) {
    reportAndExit(version);
    return;
  }

  const metadataResult = MetadataDocumentSchema.safeParse(rawMetadata);
  if (!metadataResult.success) {
    fail(1, `metadata falhou no MetadataDocumentSchema: ${formatZodIssues(metadataResult.error)}`);
  }

  const coverageResult = CoverageMatrixSchema.safeParse(rawCoverage);
  if (!coverageResult.success) {
    fail(1, `coverage-matrix falhou no CoverageMatrixSchema: ${formatZodIssues(coverageResult.error)}`);
  }

  if (!metadataResult.success || !coverageResult.success) {
    reportAndExit(version);
    return;
  }

  const metadata = metadataResult.data;
  const coverage = coverageResult.data;
  console.log(
    `[CHECK 1 OK] Contratos Zod válidos (${metadata.structures.length} estruturas em metadata e ${coverage.structures.length} em coverage-matrix).`,
  );

  // -------------------------------------------------------------------------
  // CHECK 2: Coerência de versões
  // -------------------------------------------------------------------------
  let check2Ok = true;
  if (manifest.assetVersion !== version) {
    fail(2, `manifest.assetVersion ("${manifest.assetVersion}") difere da versão alvo "${version}".`);
    check2Ok = false;
  }
  if (manifest.assetVersion !== metadata.assetVersion) {
    fail(2, `assetVersion divergente: manifest="${manifest.assetVersion}" vs metadata="${metadata.assetVersion}".`);
    check2Ok = false;
  }
  if (manifest.metadataVersion !== metadata.metadataVersion) {
    fail(
      2,
      `metadataVersion divergente: manifest="${manifest.metadataVersion}" vs metadata="${metadata.metadataVersion}".`,
    );
    check2Ok = false;
  }
  if (manifest.coverageMatrixVersion !== coverage.coverageMatrixVersion) {
    fail(
      2,
      `coverageMatrixVersion divergente: manifest="${manifest.coverageMatrixVersion}" vs coverage="${coverage.coverageMatrixVersion}".`,
    );
    check2Ok = false;
  }
  if (coverage.assetVersion && coverage.assetVersion !== manifest.assetVersion) {
    fail(
      2,
      `coverage.assetVersion ("${coverage.assetVersion}") difere de manifest.assetVersion ("${manifest.assetVersion}").`,
    );
    check2Ok = false;
  }
  for (const s of metadata.structures) {
    if (s.source.assetVersion !== manifest.assetVersion) {
      fail(
        2,
        `Estrutura "${s.anatomyId}" declara source.assetVersion="${s.source.assetVersion}" (esperado "${manifest.assetVersion}").`,
      );
      check2Ok = false;
    }
  }
  if (check2Ok) {
    console.log(
      `[CHECK 2 OK] Coerência de versões confirmada (assetVersion=${manifest.assetVersion}, metadataVersion=${manifest.metadataVersion}, coverageMatrixVersion=${manifest.coverageMatrixVersion}).`,
    );
  }

  // -------------------------------------------------------------------------
  // CHECK 3: Integridade binária dos .glb (existência, bytes, SHA-256)
  // -------------------------------------------------------------------------
  let check3Ok = true;
  const glbBuffers = {};
  for (const sys of ['skeletal', 'muscular']) {
    const sysManifest = manifest.systems[sys];
    const glbPath = resolvePublicAssetPath(sysManifest.url);
    try {
      const buf = await fs.readFile(glbPath);
      glbBuffers[sys] = buf;
      const actualBytes = buf.byteLength;
      const actualSha = sha256Hex(buf);

      if (actualBytes !== sysManifest.bytes) {
        fail(3, `${sysManifest.url}: bytes divergentes (disco=${actualBytes}, manifest=${sysManifest.bytes}).`);
        check3Ok = false;
      }
      if (actualSha !== sysManifest.sha256) {
        fail(3, `${sysManifest.url}: SHA-256 divergente (disco=${actualSha}, manifest=${sysManifest.sha256}).`);
        check3Ok = false;
      }
    } catch (err) {
      fail(3, `Arquivo .glb ausente ou ilegível (${sysManifest.url}): ${err.message}`);
      check3Ok = false;
    }
  }
  if (check3Ok) {
    console.log(
      `[CHECK 3 OK] Integridade binária SHA-256 e bytes validados (skeletal=${glbBuffers.skeletal.byteLength.toLocaleString('en-US')} B, muscular=${glbBuffers.muscular.byteLength.toLocaleString('en-US')} B).`,
    );
  }

  // -------------------------------------------------------------------------
  // CHECK 4: Convenção de IDs (regex + latim estrito para clavícula)
  // -------------------------------------------------------------------------
  let check4Ok = true;
  for (const s of metadata.structures) {
    if (!ANATOMY_ID_REGEX.test(s.anatomyId)) {
      fail(4, `anatomyId fora da regex canônica em metadata: "${s.anatomyId}".`);
      check4Ok = false;
    }
    if (s.anatomyId.includes('clavicle')) {
      fail(4, `Convenção proibida "clavicle" detectada em "${s.anatomyId}" — usar latim estrito "clavicula".`);
      check4Ok = false;
    }
    for (const nodeName of s.meshNodes) {
      if (!ANATOMY_ID_REGEX.test(nodeName)) {
        fail(4, `meshNode fora da regex canônica em metadata: "${nodeName}".`);
        check4Ok = false;
      }
      if (nodeName !== s.anatomyId && !nodeName.startsWith(`${s.anatomyId}.`)) {
        fail(4, `meshNode "${nodeName}" não deriva do anatomyId pai "${s.anatomyId}".`);
        check4Ok = false;
      }
    }
  }
  for (const c of coverage.structures) {
    if (!ANATOMY_ID_REGEX.test(c.anatomyId)) {
      fail(4, `anatomyId fora da regex canônica em coverage-matrix: "${c.anatomyId}".`);
      check4Ok = false;
    }
  }
  if (check4Ok) {
    console.log('[CHECK 4 OK] 100% dos anatomyId e meshNodes seguem a regex canônica e latim TA2 estrito.');
  }

  // -------------------------------------------------------------------------
  // CHECK 5: Correspondência 1:1 com a Matriz de Cobertura (incl. region)
  // -------------------------------------------------------------------------
  let check5Ok = true;
  const metaMap = new Map(metadata.structures.map((s) => [s.anatomyId, s]));
  const covMap = new Map(coverage.structures.map((c) => [c.anatomyId, c]));

  for (const id of metaMap.keys()) {
    if (!covMap.has(id)) {
      fail(5, `anatomyId "${id}" existe em metadata-${version}.json mas falta em coverage-matrix.json.`);
      check5Ok = false;
    }
  }
  for (const id of covMap.keys()) {
    if (!metaMap.has(id)) {
      fail(5, `anatomyId "${id}" existe em coverage-matrix.json mas falta em metadata-${version}.json.`);
      check5Ok = false;
    }
  }

  for (const [id, mEntry] of metaMap.entries()) {
    const cEntry = covMap.get(id);
    if (!cEntry) continue;

    if (!cEntry.presentInAsset) {
      fail(5, `Estrutura "${id}" está marcada com presentInAsset=false na matriz de cobertura.`);
      check5Ok = false;
    }
    if (mEntry.system !== cEntry.system) {
      fail(5, `Sistema divergente para "${id}": metadata="${mEntry.system}" vs coverage="${cEntry.system}".`);
      check5Ok = false;
    }
    if (mEntry.laterality !== cEntry.laterality) {
      fail(5, `Lateralidade divergente para "${id}": metadata="${mEntry.laterality}" vs coverage="${cEntry.laterality}".`);
      check5Ok = false;
    }
    if (cEntry.region !== undefined) {
      if (cEntry.region !== mEntry.region) {
        fail(5, `Região divergente para "${id}": metadata="${mEntry.region}" vs coverage="${cEntry.region}".`);
        check5Ok = false;
      }
    } else if (budget.requireCoverageRegion) {
      fail(5, `Estrutura "${id}" em coverage-matrix.json (${version}) não declara o campo obrigatório "region".`);
      check5Ok = false;
    }
    if (mEntry.review.status !== cEntry.reviewStatus) {
      fail(
        5,
        `Status de revisão divergente para "${id}": metadata="${mEntry.review.status}" vs coverage="${cEntry.reviewStatus}".`,
      );
      check5Ok = false;
    }
    const metaNodesKey = [...mEntry.meshNodes].sort().join('|');
    const covNodesKey = [...cEntry.meshNodes].sort().join('|');
    if (metaNodesKey !== covNodesKey) {
      fail(5, `meshNodes divergentes para "${id}" entre metadata e coverage-matrix.`);
      check5Ok = false;
    }
    const metaFmaKey = [...mEntry.source.fmaIds].sort().join('|');
    const covFmaKey = [...cEntry.fmaIds].sort().join('|');
    if (metaFmaKey !== covFmaKey) {
      fail(5, `fmaIds divergentes para "${id}" entre metadata e coverage-matrix.`);
      check5Ok = false;
    }
  }
  if (check5Ok) {
    console.log(
      `[CHECK 5 OK] Correspondência 1:1 exata entre metadata-${version}.json e coverage-matrix.json (${metaMap.size} estruturas).`,
    );
  }

  // -------------------------------------------------------------------------
  // CHECK 6: Leitura real dos .glb (MeshoptDecoder), hierarquia, zero nós órfãos/ausentes
  // -------------------------------------------------------------------------
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
    .registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
    });

  let check6Ok = true;
  const inspectedNodesBySystem = { skeletal: new Map(), muscular: new Map() };
  const measuredTotals = {
    skeletal: { triangles: 0, meshCount: 0 },
    muscular: { triangles: 0, meshCount: 0 },
  };

  const expectedNodeInfo = new Map();
  for (const s of metadata.structures) {
    for (const nodeName of s.meshNodes) {
      expectedNodeInfo.set(nodeName, {
        anatomyId: s.anatomyId,
        system: s.system,
        laterality: s.laterality,
        fmaIds: new Set(s.source.fmaIds),
      });
    }
  }

  for (const sys of ['skeletal', 'muscular']) {
    const buf = glbBuffers[sys];
    if (!buf) {
      check6Ok = false;
      continue;
    }

    const doc = await io.readBinary(new Uint8Array(buf));
    const scenes = doc.getRoot().listScenes();
    if (scenes.length === 0) {
      fail(6, `${sys}-${version}.glb não possui nenhuma Scene.`);
      check6Ok = false;
      continue;
    }

    const scene = scenes[0];
    const humanBody = scene.listChildren().find((n) => n.getName() === 'HumanBody');
    if (!humanBody) {
      fail(6, `${sys}-${version}.glb não possui nó raiz "HumanBody" sob a Scene.`);
      check6Ok = false;
      continue;
    }

    const expectedGroupName = sys === 'skeletal' ? 'skeletal-system' : 'muscular-system';
    const systemGroup = humanBody.listChildren().find((n) => n.getName() === expectedGroupName);
    if (!systemGroup) {
      fail(6, `${sys}-${version}.glb não possui grupo "${expectedGroupName}" sob "HumanBody".`);
      check6Ok = false;
      continue;
    }

    const allMeshNodesInDoc = doc
      .getRoot()
      .listNodes()
      .filter((n) => n.getMesh() !== null);

    const directSystemMeshNodes = systemGroup.listChildren().filter((n) => n.getMesh() !== null);

    if (allMeshNodesInDoc.length !== directSystemMeshNodes.length) {
      fail(
        6,
        `${sys}-${version}.glb possui ${allMeshNodesInDoc.length} nó(s) de malha no total, mas apenas ${directSystemMeshNodes.length} sob "HumanBody > ${expectedGroupName}".`,
      );
      check6Ok = false;
    }

    for (const node of directSystemMeshNodes) {
      const info = inspectGlbMeshNode(node);
      if (!info) continue;

      if (inspectedNodesBySystem[sys].has(info.name)) {
        fail(6, `Nome de nó duplicado em ${sys}-${version}.glb: "${info.name}".`);
        check6Ok = false;
      }
      inspectedNodesBySystem[sys].set(info.name, info);
      measuredTotals[sys].triangles += info.triangles;
      measuredTotals[sys].meshCount += 1;

      if (info.triangles <= 0 || info.vertices <= 0) {
        fail(6, `Malha vazia em ${sys}-${version}.glb: "${info.name}" (${info.triangles} tris, ${info.vertices} verts).`);
        check6Ok = false;
      }
      if (info.hasNonFinite) {
        fail(6, `Coordenadas NaN/Inf encontradas em "${info.name}" (${sys}-${version}.glb).`);
        check6Ok = false;
      }

      const expected = expectedNodeInfo.get(info.name);
      if (!expected) {
        fail(6, `Nó órfão encontrado em ${sys}-${version}.glb sem entrada em metadata-${version}.json: "${info.name}".`);
        check6Ok = false;
        continue;
      }

      if (expected.system !== sys) {
        fail(6, `Nó "${info.name}" está em ${sys}-${version}.glb mas metadata declara system="${expected.system}".`);
        check6Ok = false;
      }

      const { anatomyId, system: extrasSystem, fmaId } = info.extras;
      if (anatomyId !== expected.anatomyId) {
        fail(
          6,
          `Nó "${info.name}" em ${sys}-${version}.glb tem extras.anatomyId="${anatomyId}" (esperado "${expected.anatomyId}").`,
        );
        check6Ok = false;
      }
      if (extrasSystem !== expected.system) {
        fail(
          6,
          `Nó "${info.name}" em ${sys}-${version}.glb tem extras.system="${extrasSystem}" (esperado "${expected.system}").`,
        );
        check6Ok = false;
      }
      if (typeof fmaId !== 'string' || !expected.fmaIds.has(fmaId)) {
        fail(
          6,
          `Nó "${info.name}" em ${sys}-${version}.glb tem extras.fmaId="${fmaId}" não listado em source.fmaIds de "${expected.anatomyId}".`,
        );
        check6Ok = false;
      }
    }

    const sysManifest = manifest.systems[sys];
    if (measuredTotals[sys].meshCount !== sysManifest.meshCount) {
      fail(
        6,
        `${sys}-${version}.glb: meshCount real (${measuredTotals[sys].meshCount}) difere do manifest (${sysManifest.meshCount}).`,
      );
      check6Ok = false;
    }
    if (measuredTotals[sys].triangles !== sysManifest.triangles) {
      fail(
        6,
        `${sys}-${version}.glb: triângulos reais (${measuredTotals[sys].triangles}) diferem do manifest (${sysManifest.triangles}).`,
      );
      check6Ok = false;
    }
  }

  for (const s of metadata.structures) {
    const sysMap = inspectedNodesBySystem[s.system];
    for (const nodeName of s.meshNodes) {
      if (!sysMap.has(nodeName)) {
        fail(6, `Nó ausente: "${nodeName}" declarado em metadata (${s.anatomyId}) não existe em ${s.system}-${version}.glb.`);
        check6Ok = false;
      }
    }
  }

  if (check6Ok) {
    console.log(
      `[CHECK 6 OK] Hierarquia glTF, extras e 100% dos nós validados (skeletal: ${measuredTotals.skeletal.meshCount} malhas / ${measuredTotals.skeletal.triangles.toLocaleString('en-US')} tris; muscular: ${measuredTotals.muscular.meshCount} malhas / ${measuredTotals.muscular.triangles.toLocaleString('en-US')} tris; zero órfãos/ausentes).`,
    );
  }

  // -------------------------------------------------------------------------
  // CHECK 7: Sanidade geométrica de labelAnchor e sincronia de boundingBox
  // -------------------------------------------------------------------------
  let check7Ok = true;
  for (const s of metadata.structures) {
    if (!isPointWithinBoundingBox(s.labelAnchor, s.boundingBox, LABEL_ANCHOR_BBOX_TOLERANCE_METERS)) {
      fail(
        7,
        `labelAnchor [${s.labelAnchor.join(', ')}] de "${s.anatomyId}" fora da boundingBox (tolerância ${LABEL_ANCHOR_BBOX_TOLERANCE_METERS} m).`,
      );
      check7Ok = false;
    }

    const sysMap = inspectedNodesBySystem[s.system];
    const realMin = [Infinity, Infinity, Infinity];
    const realMax = [-Infinity, -Infinity, -Infinity];
    let foundParts = 0;

    for (const nodeName of s.meshNodes) {
      const info = sysMap.get(nodeName);
      if (!info) continue;
      foundParts++;
      for (let axis = 0; axis < 3; axis++) {
        if (info.min[axis] < realMin[axis]) realMin[axis] = info.min[axis];
        if (info.max[axis] > realMax[axis]) realMax[axis] = info.max[axis];
      }
    }

    if (foundParts === s.meshNodes.length) {
      for (let axis = 0; axis < 3; axis++) {
        const diffMin = Math.abs(realMin[axis] - s.boundingBox.min[axis]);
        const diffMax = Math.abs(realMax[axis] - s.boundingBox.max[axis]);
        if (diffMin > BBOX_SYNC_TOLERANCE_METERS || diffMax > BBOX_SYNC_TOLERANCE_METERS) {
          fail(
            7,
            `boundingBox de "${s.anatomyId}" no metadata diverge da geometria real no .glb no eixo ${axis} (Δmin=${(diffMin * 1000).toFixed(2)}mm, Δmax=${(diffMax * 1000).toFixed(2)}mm).`,
          );
          check7Ok = false;
        }
      }
      if (
        !isPointWithinBoundingBox(
          s.labelAnchor,
          { min: realMin, max: realMax },
          LABEL_ANCHOR_BBOX_TOLERANCE_METERS,
        )
      ) {
        fail(
          7,
          `labelAnchor de "${s.anatomyId}" fora da boundingBox decodificada do .glb (tolerância ${LABEL_ANCHOR_BBOX_TOLERANCE_METERS} m).`,
        );
        check7Ok = false;
      }
    }
  }
  if (check7Ok) {
    console.log(
      `[CHECK 7 OK] Todas as ${metadata.structures.length} âncoras labelAnchor são finitas, contidas nas boundingBoxes declaradas e sincronizadas com os .glb decodificados (tolerância <= 5 mm).`,
    );
  }

  // -------------------------------------------------------------------------
  // CHECK 8: Orçamento de entrega web (triângulos e bytes conforme versão)
  // -------------------------------------------------------------------------
  const totalTriangles = measuredTotals.skeletal.triangles + measuredTotals.muscular.triangles;
  const skeletalBytes = glbBuffers.skeletal?.byteLength ?? 0;
  const muscularBytes = glbBuffers.muscular?.byteLength ?? 0;
  const totalBytes = skeletalBytes + muscularBytes;
  let check8Ok = true;

  if (totalTriangles > budget.hardMaxTriangles) {
    fail(
      8,
      `Orçamento de triângulos (${version}) excedeu o teto rígido: ${totalTriangles.toLocaleString('en-US')} > ${budget.hardMaxTriangles.toLocaleString('en-US')}.`,
    );
    check8Ok = false;
  } else if (totalTriangles > budget.targetMaxTriangles) {
    warn(
      8,
      `Triângulos acima da meta ideal (${totalTriangles.toLocaleString('en-US')} > ${budget.targetMaxTriangles.toLocaleString('en-US')}), porém dentro do teto de ${budget.hardMaxTriangles.toLocaleString('en-US')}.`,
    );
  }

  if (totalBytes > budget.hardMaxGlbBytes) {
    fail(
      8,
      `Tamanho total dos .glb (${version}) excedeu o teto rígido: ${(totalBytes / 1024 / 1024).toFixed(2)} MB > ${(budget.hardMaxGlbBytes / 1_000_000).toFixed(1)} MB (${totalBytes} B).`,
    );
    check8Ok = false;
  } else if (totalBytes > budget.targetMaxGlbBytes) {
    warn(
      8,
      `Tamanho total dos .glb acima da meta ideal (${(totalBytes / 1024 / 1024).toFixed(2)} MB > ${(budget.targetMaxGlbBytes / 1_000_000).toFixed(1)} MB), porém dentro do teto de ${(budget.hardMaxGlbBytes / 1_000_000).toFixed(1)} MB.`,
    );
  }

  if (budget.skeletalHardMaxBytes !== null) {
    if (skeletalBytes > budget.skeletalHardMaxBytes) {
      fail(
        8,
        `skeletal-${version}.glb excedeu o teto rígido: ${(skeletalBytes / 1024 / 1024).toFixed(2)} MB > ${(budget.skeletalHardMaxBytes / 1_000_000).toFixed(1)} MB (${skeletalBytes} B).`,
      );
      check8Ok = false;
    } else if (budget.skeletalTargetMaxBytes !== null && skeletalBytes > budget.skeletalTargetMaxBytes) {
      warn(
        8,
        `skeletal-${version}.glb acima da meta ideal (${(skeletalBytes / 1024 / 1024).toFixed(2)} MB > ${(budget.skeletalTargetMaxBytes / 1_000_000).toFixed(1)} MB), dentro do teto de ${(budget.skeletalHardMaxBytes / 1_000_000).toFixed(1)} MB.`,
      );
    }
  }

  if (check8Ok) {
    console.log(
      `[CHECK 8 OK] Orçamento web (${version}) aprovado: ${totalTriangles.toLocaleString('en-US')} / ${budget.targetMaxTriangles.toLocaleString('en-US')} tris | total ${(totalBytes / 1024 / 1024).toFixed(2)} MB (${totalBytes.toLocaleString('en-US')} B; skel=${(skeletalBytes / 1024 / 1024).toFixed(2)} MB, musc=${(muscularBytes / 1024 / 1024).toFixed(2)} MB) / ${(budget.targetMaxGlbBytes / 1_000_000).toFixed(1)} MB.`,
    );
  }

  // -------------------------------------------------------------------------
  // CHECK 9: Sanidade anatômica de lateralidade (right/left/midline) e simetria bilateral
  // -------------------------------------------------------------------------
  let check9Ok = true;
  const allInspectedByNodeName = new Map([
    ...inspectedNodesBySystem.skeletal.entries(),
    ...inspectedNodesBySystem.muscular.entries(),
  ]);

  let rightCount = 0;
  let leftCount = 0;
  let midlineCount = 0;
  let maxMidlineAbsXMm = 0;
  let maxSymmetryErrorMm = 0;
  let worstSymmetryPair = 'none';

  for (const [nodeName, expected] of expectedNodeInfo.entries()) {
    const info = allInspectedByNodeName.get(nodeName);
    if (!info) continue;

    if (expected.laterality === 'right') {
      rightCount++;
      if (!(info.centroid[0] < 0)) {
        fail(
          9,
          `Lateralidade violada: "${nodeName}" (right) possui centroid.x = ${info.centroid[0].toFixed(5)} m (esperado < 0).`,
        );
        check9Ok = false;
      }
    } else if (expected.laterality === 'left') {
      leftCount++;
      if (!(info.centroid[0] > 0)) {
        fail(
          9,
          `Lateralidade violada: "${nodeName}" (left) possui centroid.x = ${info.centroid[0].toFixed(5)} m (esperado > 0).`,
        );
        check9Ok = false;
      }
    } else if (expected.laterality === 'midline') {
      midlineCount++;
      const absX = Math.abs(info.centroid[0]);
      if (absX * 1000 > maxMidlineAbsXMm) maxMidlineAbsXMm = absX * 1000;
      if (absX >= MIDLINE_MAX_ABS_X_METERS) {
        fail(
          9,
          `Lateralidade midline violada: "${nodeName}" possui |centroid.x| = ${(absX * 1000).toFixed(1)} mm (limite ${(MIDLINE_MAX_ABS_X_METERS * 1000).toFixed(0)} mm).`,
        );
        check9Ok = false;
      }
    }
  }

  let pairsChecked = 0;
  for (const [nodeName, expected] of expectedNodeInfo.entries()) {
    if (expected.laterality !== 'right') continue;
    const leftNodeName = nodeName.replace('.right', '.left');
    const rInfo = allInspectedByNodeName.get(nodeName);
    const lInfo = allInspectedByNodeName.get(leftNodeName);
    if (!rInfo || !lInfo) continue;

    pairsChecked++;
    const dxSym = Math.abs(rInfo.centroid[0] + lInfo.centroid[0]);
    const dyDiff = Math.abs(rInfo.centroid[1] - lInfo.centroid[1]);
    const dzDiff = Math.abs(rInfo.centroid[2] - lInfo.centroid[2]);
    const worstAxis = Math.max(dxSym, dyDiff, dzDiff);
    if (worstAxis * 1000 > maxSymmetryErrorMm) {
      maxSymmetryErrorMm = worstAxis * 1000;
      worstSymmetryPair = nodeName.replace('.right', '.{right,left}');
    }

    if (
      dxSym > budget.bilateralSymmetryToleranceMeters ||
      dyDiff > budget.bilateralSymmetryToleranceMeters ||
      dzDiff > budget.bilateralSymmetryToleranceMeters
    ) {
      fail(
        9,
        `Assimetria bilateral excessiva no par ${nodeName} <-> ${leftNodeName}: |xR+xL|=${(dxSym * 1000).toFixed(1)}mm, |yR-yL|=${(dyDiff * 1000).toFixed(1)}mm, |zR-zL|=${(dzDiff * 1000).toFixed(1)}mm (limite ${(budget.bilateralSymmetryToleranceMeters * 1000).toFixed(0)}mm).`,
      );
      check9Ok = false;
    }
  }

  if (check9Ok) {
    console.log(
      `[CHECK 9 OK] Lateralidade anatômica validada em 100% das malhas (${rightCount} right cx<0, ${leftCount} left cx>0, ${midlineCount} midline max|cx|=${maxMidlineAbsXMm.toFixed(1)}mm; ${pairsChecked} pares antímeros com desvio máximo bilateral ${maxSymmetryErrorMm.toFixed(1)} mm em ${worstSymmetryPair}).`,
    );
  }

  reportAndExit(version);
}

function reportAndExit(version) {
  console.log('');
  if (warnings.length > 0) {
    console.warn(`=== ALERTAS (${warnings.length}) ===`);
    for (const w of warnings) {
      console.warn(`  ${w}`);
    }
    console.log('');
  }

  if (failures.length > 0) {
    console.error(`=== FALHAS NO GATE [${version}] (${failures.length}) ===`);
    for (const f of failures) {
      console.error(`  ${f}`);
    }
    process.exit(1);
  }

  console.log(`=== GATE validate:assets [${version}] APROVADO (9/9 VERIFICAÇÕES PASSARAM) ===`);
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[ERRO INESPERADO NO validate:assets]', err?.stack || err);
  process.exit(1);
});
