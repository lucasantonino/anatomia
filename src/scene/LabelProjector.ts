import * as THREE from 'three';
import type { Vec3 } from '../core/schema/anatomy';

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Size2D {
  readonly width: number;
  readonly height: number;
}

export interface SafeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export type LabelPlacementQuadrant =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

export interface LabelConnectorLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface ClampedLabelPlacement {
  readonly x: number;
  readonly y: number;
  readonly placement: LabelPlacementQuadrant;
  readonly connector: LabelConnectorLine;
}

export interface LabelDomElements {
  readonly cardElement: HTMLElement;
  readonly lineElement?: SVGLineElement | null;
  readonly dotElement?: SVGCircleElement | null;
}

export const DEFAULT_LABEL_OFFSET_PX = { x: 20, y: 20 } as const;
const DEFAULT_CARD_SIZE_FALLBACK: Size2D = { width: 220, height: 84 };

function clampValue(value: number, min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Função pura: verifica se a coordenada Z em espaço NDC está fora do frustum
 * de profundidade da câmera (`[-1, 1]`), indicando âncora atrás da câmera ou
 * além do plano distante.
 */
export function isNdcBehindCamera(ndcZ: number): boolean {
  return !Number.isFinite(ndcZ) || ndcZ > 1 || ndcZ < -1;
}

/**
 * Função pura: calcula posição 2D do cartão da etiqueta anatômica a partir da
 * âncora projetada, preferindo quadrante acima-direita, espelhando automaticamente
 * para esquerda/abaixo quando violar bordas ou `safeInsets` (barras/gaveta aberta)
 * e aplicando clamping rigoroso dentro da área útil segura.
 */
export function clampLabelRect(
  anchorPx: Point2D,
  labelSize: Size2D,
  viewport: Size2D,
  safeInsets: Partial<SafeInsets> = {},
  offsetPx: { readonly x?: number; readonly y?: number } = DEFAULT_LABEL_OFFSET_PX,
): ClampedLabelPlacement {
  const insetTop = Math.max(0, safeInsets.top ?? 0);
  const insetRight = Math.max(0, safeInsets.right ?? 0);
  const insetBottom = Math.max(0, safeInsets.bottom ?? 0);
  const insetLeft = Math.max(0, safeInsets.left ?? 0);

  const dx = offsetPx.x ?? DEFAULT_LABEL_OFFSET_PX.x;
  const dy = offsetPx.y ?? DEFAULT_LABEL_OFFSET_PX.y;

  const minX = insetLeft;
  const minY = insetTop;
  const safeRightEdge = Math.max(minX, viewport.width - insetRight);
  const safeBottomEdge = Math.max(minY, viewport.height - insetBottom);
  const maxX = Math.max(minX, safeRightEdge - labelSize.width);
  const maxY = Math.max(minY, safeBottomEdge - labelSize.height);

  // Preferência horizontal: direita; espelha para esquerda se estourar a margem direita
  const preferredRightX = anchorPx.x + dx;
  const mirroredLeftX = anchorPx.x - dx - labelSize.width;
  const overflowsRight = preferredRightX + labelSize.width > safeRightEdge;

  let horizontal: 'right' | 'left' = 'right';
  let rawX = preferredRightX;

  if (overflowsRight) {
    const spaceRight = safeRightEdge - anchorPx.x;
    const spaceLeft = anchorPx.x - minX;
    if (mirroredLeftX >= minX || spaceLeft > spaceRight) {
      horizontal = 'left';
      rawX = mirroredLeftX;
    }
  }

  // Preferência vertical: acima; espelha para abaixo se estourar a margem superior
  const preferredTopY = anchorPx.y - dy - labelSize.height;
  const mirroredBottomY = anchorPx.y + dy;
  const overflowsTop = preferredTopY < minY;

  let vertical: 'top' | 'bottom' = 'top';
  let rawY = preferredTopY;

  if (overflowsTop) {
    const spaceTop = anchorPx.y - minY;
    const spaceBottom = safeBottomEdge - anchorPx.y;
    if (mirroredBottomY + labelSize.height <= safeBottomEdge || spaceBottom > spaceTop) {
      vertical = 'bottom';
      rawY = mirroredBottomY;
    }
  }

  const x = Math.round(clampValue(rawX, minX, maxX));
  const y = Math.round(clampValue(rawY, minY, maxY));

  const placement: LabelPlacementQuadrant = `${vertical}-${horizontal}`;

  const anchorX = Math.round(anchorPx.x);
  const anchorY = Math.round(anchorPx.y);
  const attachX = Math.round(clampValue(anchorX, x, x + labelSize.width));
  const attachY = Math.round(clampValue(anchorY, y, y + labelSize.height));

  return {
    x,
    y,
    placement,
    connector: {
      x1: anchorX,
      y1: anchorY,
      x2: attachX,
      y2: attachY,
    },
  };
}

/**
 * Projetor 3D -> 2D imperativo de etiquetas no DOM:
 * - Opera somente quando há estrutura ativa (`anchorWorld !== null`)
 * - Atualiza posição diretamente via `transform: translate3d(...)` sem re-render React
 * - Mede tamanho da etiqueta exclusivamente via `ResizeObserver` (zero reflow no loop RAF)
 */
export class LabelProjector {
  private elements: LabelDomElements | null = null;
  private cardResizeObserver: ResizeObserver | null = null;

  private viewport: Size2D = { width: 1, height: 1 };
  private safeInsets: SafeInsets = { top: 12, right: 12, bottom: 12, left: 12 };
  private cardSize: Size2D = { ...DEFAULT_CARD_SIZE_FALLBACK };

  private readonly projectedVec = new THREE.Vector3();
  private isVisible = false;

  public attachElements(elements: LabelDomElements | null): void {
    this.disconnectCardObserver();
    this.elements = elements;
    this.isVisible = false;

    if (!elements) {
      return;
    }

    this.measureCard(elements.cardElement);

    if (typeof ResizeObserver !== 'undefined') {
      this.cardResizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }
        const width = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (width > 0 && height > 0) {
          this.cardSize = { width, height };
        }
      });
      this.cardResizeObserver.observe(elements.cardElement);
    }

    this.setHidden();
  }

  public setViewport(width: number, height: number): void {
    if (width > 0 && height > 0) {
      this.viewport = { width, height };
    }
  }

  public setSafeInsets(insets: Partial<SafeInsets>): void {
    this.safeInsets = {
      top: Math.max(0, insets.top ?? this.safeInsets.top),
      right: Math.max(0, insets.right ?? this.safeInsets.right),
      bottom: Math.max(0, insets.bottom ?? this.safeInsets.bottom),
      left: Math.max(0, insets.left ?? this.safeInsets.left),
    };
  }

  public update(anchorWorld: Vec3 | null, camera: THREE.Camera): void {
    if (!this.elements) {
      return;
    }

    if (anchorWorld === null) {
      if (this.isVisible) {
        this.setHidden();
      }
      return;
    }

    this.projectedVec
      .set(anchorWorld[0], anchorWorld[1], anchorWorld[2])
      .project(camera);

    if (isNdcBehindCamera(this.projectedVec.z)) {
      if (this.isVisible) {
        this.setHidden();
      }
      return;
    }

    const px = (this.projectedVec.x * 0.5 + 0.5) * this.viewport.width;
    const py = (-this.projectedVec.y * 0.5 + 0.5) * this.viewport.height;

    const clamped = clampLabelRect(
      { x: px, y: py },
      this.cardSize,
      this.viewport,
      this.safeInsets,
    );

    const { cardElement, lineElement, dotElement } = this.elements;

    if (!this.isVisible) {
      cardElement.style.visibility = 'visible';
      if (lineElement) {
        lineElement.style.visibility = 'visible';
      }
      if (dotElement) {
        dotElement.style.visibility = 'visible';
      }
      this.isVisible = true;
    }

    cardElement.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;

    if (lineElement) {
      lineElement.setAttribute('x1', String(clamped.connector.x1));
      lineElement.setAttribute('y1', String(clamped.connector.y1));
      lineElement.setAttribute('x2', String(clamped.connector.x2));
      lineElement.setAttribute('y2', String(clamped.connector.y2));
    }

    if (dotElement) {
      dotElement.setAttribute('cx', String(clamped.connector.x1));
      dotElement.setAttribute('cy', String(clamped.connector.y1));
    }
  }

  public hide(): void {
    if (this.elements) {
      this.setHidden();
    }
  }

  private setHidden(): void {
    if (!this.elements) {
      return;
    }
    this.elements.cardElement.style.visibility = 'hidden';
    if (this.elements.lineElement) {
      this.elements.lineElement.style.visibility = 'hidden';
    }
    if (this.elements.dotElement) {
      this.elements.dotElement.style.visibility = 'hidden';
    }
    this.isVisible = false;
  }

  private measureCard(cardElement: HTMLElement): void {
    const width = cardElement.offsetWidth;
    const height = cardElement.offsetHeight;
    if (width > 0 && height > 0) {
      this.cardSize = { width, height };
    }
  }

  private disconnectCardObserver(): void {
    if (this.cardResizeObserver) {
      this.cardResizeObserver.disconnect();
      this.cardResizeObserver = null;
    }
  }

  public dispose(): void {
    this.disconnectCardObserver();
    this.elements = null;
    this.isVisible = false;
  }
}
