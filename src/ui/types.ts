import type {
  AnatomyRegion,
  AnatomySystem,
  CoverageMatrix,
  Laterality,
  Manifest,
  MetadataDocument,
} from '../core/schema/anatomy';
import type { AnatomyRegistry } from '../core/anatomy/registry';

/**
 * Tipos de integração da camada UI com o motor 3D, estritamente livres de
 * qualquer importação de Three.js. Estruturalmente compatíveis com
 * `AnatomyEngine`, `LabelProjector` e `AssetLoader`.
 */

export interface SafeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface LabelDomElements {
  readonly cardElement: HTMLElement;
  readonly lineElement?: SVGLineElement | null;
  readonly dotElement?: SVGCircleElement | null;
}

export interface CatalogSnapshot {
  readonly manifest: Manifest | null;
  readonly metadata: MetadataDocument | null;
  readonly coverageMatrix: CoverageMatrix | null;
  readonly registry: AnatomyRegistry;
}

export interface AnatomyEnginePort {
  mount(container: HTMLElement, labelElements?: LabelDomElements | null): void;
  dispose(): void;
  attachLabelElements(elements: LabelDomElements | null): void;
  setSafeInsets(insets: Partial<SafeInsets>): void;
  resetView(): void;
  focusStructure(anatomyId: string): void;
  nudgeOrbit(deltaAzimuthRad: number, deltaPolarRad: number): void;
  nudgePan(deltaX: number, deltaY: number): void;
  nudgeZoom(scaleFactor: number): void;
  retrySystem(system: AnatomySystem): Promise<void>;
  retryAll(): Promise<void>;
  getCatalogSnapshot(): CatalogSnapshot;
  subscribeCatalog(listener: () => void): () => void;
}

export function formatSystemLabel(system: AnatomySystem): string {
  return system === 'muscular' ? 'Muscular' : 'Ósseo';
}

export function formatLateralityChip(laterality: Laterality): string {
  switch (laterality) {
    case 'right':
      return 'Lado direito';
    case 'left':
      return 'Lado esquerdo';
    case 'midline':
      return 'Linha média';
  }
}

export function formatRegionLabel(region: AnatomyRegion): string {
  switch (region) {
    case 'head_neck':
      return 'Cabeça e pescoço';
    case 'trunk':
      return 'Tronco';
    case 'upper_limb':
      return 'Membro superior';
    case 'lower_limb':
      return 'Membro inferior';
  }
}

export function formatRegionCompactLabel(region: AnatomyRegion): string {
  switch (region) {
    case 'head_neck':
      return 'Cabeça/Pescoço';
    case 'trunk':
      return 'Tronco';
    case 'upper_limb':
      return 'M. Superior';
    case 'lower_limb':
      return 'M. Inferior';
  }
}
