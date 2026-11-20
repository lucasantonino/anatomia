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

interface StructureMaterialEntry {
  readonly anatomyId: string;
  readonly system: AnatomySystem;
  readonly material: THREE.MeshStandardMaterial;
  readonly meshes: readonly THREE.Mesh[];
  readonly baseColor: THREE.Color;
  readonly highlightColor: THREE.Color;
  readonly baseRoughness: number;
  readonly baseMetalness: number;
  visualState: HighlightVisualState;
}

function disposeMeshMaterial(
  material: THREE.Material | THREE.Material[] | undefined,
): void {
  if (!material) {
    return;
  }
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose();
    }
    return;
  }
  material.dispose();
}

/**
 * Gerencia materiais PBR clínicos, opacidade muscular opaca/translúcida e realce
 * 100% reversível coordenado por `anatomyId` (todas as malhas/cabeças de uma mesma
 * estrutura compartilham um único material gerenciado).
 */
export class MaterialManager {
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

  /**
   * Registra todas as malhas de um sistema carregado, aplicando materiais clínicos
   * dedicados por `anatomyId` e descartando materiais temporários do GLTF.
   */
  public registerSystemMeshes(
    system: AnatomySystem,
    meshesByAnatomyId: ReadonlyMap<string, readonly THREE.Mesh[]>,
  ): void {
    this.unregisterSystem(system);

    const preset =
      system === 'skeletal' ? CLINICAL_BONE_MATERIAL : CLINICAL_MUSCLE_MATERIAL;

    for (const [anatomyId, meshes] of meshesByAnatomyId.entries()) {
      const baseColor = new THREE.Color(preset.colorHex);
      const highlightColor = baseColor
        .clone()
        .multiplyScalar(HIGHLIGHT_LINEAR_BRIGHTEN_FACTOR);
      highlightColor.r = Math.min(1, highlightColor.r);
      highlightColor.g = Math.min(1, highlightColor.g);
      highlightColor.b = Math.min(1, highlightColor.b);

      const material = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        roughness: preset.roughness,
        metalness: preset.metalness,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        transparent: false,
        depthWrite: true,
        opacity: 1,
        side: THREE.FrontSide,
      });

      const oldMaterialsToDispose = new Set<THREE.Material>();
      for (const mesh of meshes) {
        if (Array.isArray(mesh.material)) {
          for (const mat of mesh.material) {
            oldMaterialsToDispose.add(mat);
          }
        } else if (mesh.material) {
          oldMaterialsToDispose.add(mesh.material);
        }
        mesh.material = material;
        mesh.renderOrder = 1;
      }

      for (const oldMaterial of oldMaterialsToDispose) {
        oldMaterial.dispose();
      }

      const entry: StructureMaterialEntry = {
        anatomyId,
        system,
        material,
        meshes,
        baseColor,
        highlightColor,
        baseRoughness: preset.roughness,
        baseMetalness: preset.metalness,
        visualState: 'default',
      };

      this.entriesByAnatomyId.set(anatomyId, entry);
      this.idsBySystem[system].add(anatomyId);
    }

    this.applyLayerAppearance(this.visibleSystems, this.muscleOpacity);
    this.syncHighlights(this.hoveredId, this.selectedId);
  }

  /**
   * Remove e libera materiais de um sistema específico (útil antes de retry).
   */
  public unregisterSystem(system: AnatomySystem): void {
    const ids = this.idsBySystem[system];
    for (const anatomyId of ids) {
      const entry = this.entriesByAnatomyId.get(anatomyId);
      if (entry) {
        entry.material.dispose();
        this.entriesByAnatomyId.delete(anatomyId);
      }
    }
    ids.clear();
  }

  /**
   * Aplica política de opacidade muscular (ADR-006):
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

    const bothVisible =
      visibleSystems.has('muscular') && visibleSystems.has('skeletal');
    const translucentMuscles =
      bothVisible && muscleOpacity < OPAQUE_OPACITY_EPSILON;

    for (const anatomyId of this.idsBySystem.skeletal) {
      const entry = this.entriesByAnatomyId.get(anatomyId);
      if (!entry) {
        continue;
      }
      const needsFlagUpdate = entry.material.transparent !== false;
      entry.material.transparent = false;
      entry.material.depthWrite = true;
      entry.material.opacity = 1;
      if (needsFlagUpdate) {
        entry.material.needsUpdate = true;
      }
      for (const mesh of entry.meshes) {
        mesh.renderOrder = 1;
      }
    }

    for (const anatomyId of this.idsBySystem.muscular) {
      const entry = this.entriesByAnatomyId.get(anatomyId);
      if (!entry) {
        continue;
      }
      const nextTransparent = translucentMuscles;
      const nextDepthWrite = !translucentMuscles;
      const nextOpacity = translucentMuscles ? muscleOpacity : 1;
      const nextRenderOrder = translucentMuscles ? 2 : 1;

      const needsFlagUpdate = entry.material.transparent !== nextTransparent;
      entry.material.transparent = nextTransparent;
      entry.material.depthWrite = nextDepthWrite;
      entry.material.opacity = nextOpacity;
      if (needsFlagUpdate) {
        entry.material.needsUpdate = true;
      }
      for (const mesh of entry.meshes) {
        mesh.renderOrder = nextRenderOrder;
      }
    }
  }

  /**
   * Sincroniza os estados visuais (`default`, `hovered`, `selected`) de forma
   * 100% reversível e idempotente.
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

      this.applyVisualState(entry, targetState);
    }
  }

  /**
   * Reaplica toda a configuração de materiais após recuperação de contexto WebGL.
   */
  public reapplyAll(): void {
    for (const entry of this.entriesByAnatomyId.values()) {
      entry.material.needsUpdate = true;
      const state = entry.visualState;
      entry.visualState = 'default';
      this.applyVisualState(entry, state);
    }
    this.applyLayerAppearance(this.visibleSystems, this.muscleOpacity);
  }

  private applyVisualState(
    entry: StructureMaterialEntry,
    nextState: HighlightVisualState,
  ): void {
    const preset =
      entry.system === 'skeletal'
        ? CLINICAL_BONE_MATERIAL
        : CLINICAL_MUSCLE_MATERIAL;

    if (nextState === 'default') {
      entry.material.color.copy(entry.baseColor);
      entry.material.emissive.setHex(0x000000);
      entry.material.emissiveIntensity = 0;
      entry.material.roughness = entry.baseRoughness;
      entry.material.metalness = entry.baseMetalness;
      entry.visualState = 'default';
      return;
    }

    entry.material.color.copy(entry.highlightColor);
    entry.material.emissive.setHex(preset.highlightEmissiveHex);
    entry.material.emissiveIntensity =
      nextState === 'selected'
        ? preset.selectedEmissiveIntensity
        : preset.hoverEmissiveIntensity;
    entry.visualState = nextState;
  }

  public dispose(): void {
    for (const entry of this.entriesByAnatomyId.values()) {
      disposeMeshMaterial(entry.material);
    }
    this.entriesByAnatomyId.clear();
    this.idsBySystem.skeletal.clear();
    this.idsBySystem.muscular.clear();
    this.hoveredId = null;
    this.selectedId = null;
  }
}
