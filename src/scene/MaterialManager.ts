import * as THREE from 'three';
import type { AnatomySystem } from '../core/schema/anatomy';

export const CLINICAL_BONE_MATERIAL = {
  colorHex: 0xddd6c7,
  roughness: 0.72,
  metalness: 0.04,
  highlightEmissiveHex: 0x6ec8ff,
  hoverEmissiveIntensity: 0.28,
  selectedEmissiveIntensity: 0.42,
} as const;

export const CLINICAL_MUSCLE_MATERIAL = {
  colorHex: 0x8f3834,
  roughness: 0.56,
  metalness: 0.03,
  highlightEmissiveHex: 0xff9e6d,
  hoverEmissiveIntensity: 0.32,
  selectedEmissiveIntensity: 0.42,
} as const;

const HIGHLIGHT_LINEAR_BRIGHTEN_FACTOR = 1.12;
const OPAQUE_OPACITY_EPSILON = 0.999;

export type HighlightVisualState = 'default' | 'hovered' | 'selected';

type SystemMaterialPreset =
  | typeof CLINICAL_BONE_MATERIAL
  | typeof CLINICAL_MUSCLE_MATERIAL;

type SystemMaterialSet = Record<HighlightVisualState, THREE.MeshStandardMaterial>;
type SharedMaterialPool = Record<AnatomySystem, SystemMaterialSet>;

interface StructureMaterialEntry {
  readonly anatomyId: string;
  readonly system: AnatomySystem;
  readonly meshes: readonly THREE.Mesh[];
  visualState: HighlightVisualState;
}

function createSystemMaterialSet(preset: SystemMaterialPreset): SystemMaterialSet {
  const baseColor = new THREE.Color(preset.colorHex);
  const highlightColor = baseColor
    .clone()
    .multiplyScalar(HIGHLIGHT_LINEAR_BRIGHTEN_FACTOR);
  highlightColor.r = Math.min(1, highlightColor.r);
  highlightColor.g = Math.min(1, highlightColor.g);
  highlightColor.b = Math.min(1, highlightColor.b);

  return {
    default: new THREE.MeshStandardMaterial({
      color: baseColor.clone(),
      roughness: preset.roughness,
      metalness: preset.metalness,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
      transparent: false,
      depthWrite: true,
      opacity: 1,
      side: THREE.FrontSide,
    }),
    hovered: new THREE.MeshStandardMaterial({
      color: highlightColor.clone(),
      roughness: preset.roughness,
      metalness: preset.metalness,
      emissive: new THREE.Color(preset.highlightEmissiveHex),
      emissiveIntensity: preset.hoverEmissiveIntensity,
      transparent: false,
      depthWrite: true,
      opacity: 1,
      side: THREE.FrontSide,
    }),
    selected: new THREE.MeshStandardMaterial({
      color: highlightColor.clone(),
      roughness: preset.roughness,
      metalness: preset.metalness,
      emissive: new THREE.Color(preset.highlightEmissiveHex),
      emissiveIntensity: preset.selectedEmissiveIntensity,
      transparent: false,
      depthWrite: true,
      opacity: 1,
      side: THREE.FrontSide,
    }),
  };
}

/**
 * Gerencia exatamente 6 materiais PBR clínicos compartilhados na GPU
 * (`skeletal` e `muscular` × `default` / `hovered` / `selected`), suportando
 * centenas de malhas de corpo inteiro sem multiplicação de programas/uniforms,
 * mantendo opacidade muscular opaca/translúcida em O(1) e realce multi-nó
 * 100% reversível por `anatomyId`.
 */
export class MaterialManager {
  private sharedMaterials: SharedMaterialPool | null = null;
  private readonly managedMaterials = new Set<THREE.Material>();

  private readonly entriesByAnatomyId = new Map<string, StructureMaterialEntry>();
  private readonly idsBySystem: Record<AnatomySystem, Set<string>> = {
    skeletal: new Set<string>(),
    muscular: new Set<string>(),
  };

  private visibleSystems: ReadonlySet<AnatomySystem> = new Set<AnatomySystem>([
    'muscular',
    'skeletal',
  ]);
  private muscleOpacity = 1.0;
  private hoveredId: string | null = null;
  private selectedId: string | null = null;

  public constructor() {
    this.ensureSharedMaterials();
  }

  private ensureSharedMaterials(): SharedMaterialPool {
    if (this.sharedMaterials) {
      return this.sharedMaterials;
    }

    const pool: SharedMaterialPool = {
      skeletal: createSystemMaterialSet(CLINICAL_BONE_MATERIAL),
      muscular: createSystemMaterialSet(CLINICAL_MUSCLE_MATERIAL),
    };

    for (const system of ['skeletal', 'muscular'] as const) {
      for (const state of ['default', 'hovered', 'selected'] as const) {
        this.managedMaterials.add(pool[system][state]);
      }
    }

    this.sharedMaterials = pool;
    return pool;
  }

  /**
   * Registra todas as malhas de um sistema carregado atribuindo o material
   * clínico compartilhado `default` e descartando materiais temporários do GLTF.
   */
  public registerSystemMeshes(
    system: AnatomySystem,
    meshesByAnatomyId: ReadonlyMap<string, readonly THREE.Mesh[]>,
  ): void {
    this.unregisterSystem(system);

    const pool = this.ensureSharedMaterials();
    const defaultMaterial = pool[system].default;
    const oldMaterialsToDispose = new Set<THREE.Material>();

    for (const [anatomyId, meshes] of meshesByAnatomyId.entries()) {
      for (const mesh of meshes) {
        if (Array.isArray(mesh.material)) {
          for (const mat of mesh.material) {
            if (!this.managedMaterials.has(mat)) {
              oldMaterialsToDispose.add(mat);
            }
          }
        } else if (mesh.material && !this.managedMaterials.has(mesh.material)) {
          oldMaterialsToDispose.add(mesh.material);
        }

        mesh.material = defaultMaterial;
        mesh.renderOrder = 1;
      }

      const entry: StructureMaterialEntry = {
        anatomyId,
        system,
        meshes,
        visualState: 'default',
      };

      this.entriesByAnatomyId.set(anatomyId, entry);
      this.idsBySystem[system].add(anatomyId);
    }

    for (const oldMaterial of oldMaterialsToDispose) {
      oldMaterial.dispose();
    }

    this.applyLayerAppearance(this.visibleSystems, this.muscleOpacity);
    this.syncHighlights(this.hoveredId, this.selectedId);
  }

  /**
   * Desregistra as malhas de um sistema específico (útil antes de retry),
   * mantendo o pool compartilhado pronto para o novo carregamento.
   */
  public unregisterSystem(system: AnatomySystem): void {
    const ids = this.idsBySystem[system];
    for (const anatomyId of ids) {
      this.entriesByAnatomyId.delete(anatomyId);
    }
    ids.clear();
  }

  /**
   * Aplica política de opacidade muscular (ADR-006) em O(1) nos 6 materiais
   * compartilhados e atualiza `renderOrder` das malhas:
   * - Somente músculos: sempre opaco (`opacity = 1`, `transparent = false`, `depthWrite = true`)
   * - Ambos com `muscleOpacity >= 0.999`: opaco (`renderOrder = 1`)
   * - Ambos com `0.15 <= muscleOpacity < 0.999`: translúcido (`transparent = true`, `depthWrite = false`, `renderOrder = 2` vs ossos `renderOrder = 1`)
   */
  public applyLayerAppearance(
    visibleSystems: ReadonlySet<AnatomySystem>,
    muscleOpacity: number,
  ): void {
    this.visibleSystems = visibleSystems;
    this.muscleOpacity = muscleOpacity;

    const pool = this.ensureSharedMaterials();
    const bothVisible =
      visibleSystems.has('muscular') && visibleSystems.has('skeletal');
    const translucentMuscles =
      bothVisible && muscleOpacity < OPAQUE_OPACITY_EPSILON;

    for (const state of ['default', 'hovered', 'selected'] as const) {
      const boneMat = pool.skeletal[state];
      const boneNeedsFlagUpdate = boneMat.transparent !== false;
      boneMat.transparent = false;
      boneMat.depthWrite = true;
      boneMat.opacity = 1;
      if (boneNeedsFlagUpdate) {
        boneMat.needsUpdate = true;
      }

      const muscleMat = pool.muscular[state];
      const nextTransparent = translucentMuscles;
      const nextDepthWrite = !translucentMuscles;
      const nextOpacity = translucentMuscles ? muscleOpacity : 1;
      const muscleNeedsFlagUpdate = muscleMat.transparent !== nextTransparent;
      muscleMat.transparent = nextTransparent;
      muscleMat.depthWrite = nextDepthWrite;
      muscleMat.opacity = nextOpacity;
      if (muscleNeedsFlagUpdate) {
        muscleMat.needsUpdate = true;
      }
    }

    for (const anatomyId of this.idsBySystem.skeletal) {
      const entry = this.entriesByAnatomyId.get(anatomyId);
      if (!entry) {
        continue;
      }
      for (const mesh of entry.meshes) {
        mesh.renderOrder = 1;
      }
    }

    const nextMuscleRenderOrder = translucentMuscles ? 2 : 1;
    for (const anatomyId of this.idsBySystem.muscular) {
      const entry = this.entriesByAnatomyId.get(anatomyId);
      if (!entry) {
        continue;
      }
      for (const mesh of entry.meshes) {
        mesh.renderOrder = nextMuscleRenderOrder;
      }
    }
  }

  /**
   * Sincroniza os estados visuais (`default`, `hovered`, `selected`) trocando
   * `mesh.material` apenas nas malhas dos IDs afetados — 100% reversível e O(1).
   */
  public syncHighlights(
    hoveredId: string | null,
    selectedId: string | null,
  ): void {
    const affectedIds = new Set<string>();
    if (this.hoveredId) {
      affectedIds.add(this.hoveredId);
    }
    if (this.selectedId) {
      affectedIds.add(this.selectedId);
    }
    if (hoveredId) {
      affectedIds.add(hoveredId);
    }
    if (selectedId) {
      affectedIds.add(selectedId);
    }

    this.hoveredId = hoveredId;
    this.selectedId = selectedId;

    const pool = this.ensureSharedMaterials();

    for (const anatomyId of affectedIds) {
      const entry = this.entriesByAnatomyId.get(anatomyId);
      if (!entry) {
        continue;
      }

      let targetState: HighlightVisualState = 'default';
      if (anatomyId === selectedId) {
        targetState = 'selected';
      } else if (anatomyId === hoveredId) {
        targetState = 'hovered';
      }

      const targetMaterial = pool[entry.system][targetState];
      for (const mesh of entry.meshes) {
        mesh.material = targetMaterial;
      }
      entry.visualState = targetState;
    }
  }

  /**
   * Reaplica toda a configuração de materiais após recuperação de contexto WebGL.
   */
  public reapplyAll(): void {
    const pool = this.ensureSharedMaterials();

    for (const system of ['skeletal', 'muscular'] as const) {
      for (const state of ['default', 'hovered', 'selected'] as const) {
        pool[system][state].needsUpdate = true;
      }
    }

    for (const entry of this.entriesByAnatomyId.values()) {
      const targetMaterial = pool[entry.system][entry.visualState];
      for (const mesh of entry.meshes) {
        mesh.material = targetMaterial;
      }
    }

    this.applyLayerAppearance(this.visibleSystems, this.muscleOpacity);
  }

  public dispose(): void {
    if (this.sharedMaterials) {
      for (const system of ['skeletal', 'muscular'] as const) {
        for (const state of ['default', 'hovered', 'selected'] as const) {
          this.sharedMaterials[system][state].dispose();
        }
      }
      this.sharedMaterials = null;
    }

    this.managedMaterials.clear();
    this.entriesByAnatomyId.clear();
    this.idsBySystem.skeletal.clear();
    this.idsBySystem.muscular.clear();
    this.hoveredId = null;
    this.selectedId = null;
  }
}
