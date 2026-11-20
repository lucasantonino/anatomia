import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LABEL_OFFSET_PX,
  clampLabelRect,
  isNdcBehindCamera,
  type SafeInsets,
  type Size2D,
} from '../../src/scene/LabelProjector';

describe('isNdcBehindCamera', () => {
  it('retorna false dentro do frustum de profundidade [-1, 1]', () => {
    expect(isNdcBehindCamera(0)).toBe(false);
    expect(isNdcBehindCamera(-1)).toBe(false);
    expect(isNdcBehindCamera(1)).toBe(false);
    expect(isNdcBehindCamera(-0.75)).toBe(false);
    expect(isNdcBehindCamera(0.9999)).toBe(false);
  });

  it('retorna true fora de [-1, 1] ou para valores não finitos', () => {
    expect(isNdcBehindCamera(1.01)).toBe(true);
    expect(isNdcBehindCamera(-1.01)).toBe(true);
    expect(isNdcBehindCamera(2)).toBe(true);
    expect(isNdcBehindCamera(-2)).toBe(true);
    expect(isNdcBehindCamera(Number.NaN)).toBe(true);
    expect(isNdcBehindCamera(Number.POSITIVE_INFINITY)).toBe(true);
    expect(isNdcBehindCamera(Number.NEGATIVE_INFINITY)).toBe(true);
  });
});

describe('clampLabelRect (RF-08 anti-colisão e clamping)', () => {
  const desktopViewport: Size2D = { width: 1280, height: 720 };
  const labelSize: Size2D = { width: 220, height: 84 };
  const desktopInsets: SafeInsets = {
    top: 72,
    right: 16,
    bottom: 140,
    left: 16,
  };

  it('posiciona no quadrante preferencial top-right no centro do desktop 1280x720 e conecta âncora à borda do cartão', () => {
    const result = clampLabelRect(
      { x: 640, y: 360 },
      labelSize,
      desktopViewport,
      desktopInsets,
    );

    expect(result.placement).toBe('top-right');
    expect(result.x).toBe(640 + DEFAULT_LABEL_OFFSET_PX.x);
    expect(result.y).toBe(360 - DEFAULT_LABEL_OFFSET_PX.y - labelSize.height);
    expect(result.connector).toEqual({
      x1: 640,
      y1: 360,
      x2: result.x,
      y2: result.y + labelSize.height,
    });
  });

  it('espelha automaticamente para left próximo à borda direita e quando a gaveta lateral (right = 360) está aberta', () => {
    // Próximo à borda direita sem gaveta
    const nearRightEdge = clampLabelRect(
      { x: 1180, y: 360 },
      labelSize,
      desktopViewport,
      desktopInsets,
    );
    expect(nearRightEdge.placement).toBe('top-left');
    expect(nearRightEdge.x + labelSize.width).toBeLessThanOrEqual(
      desktopViewport.width - desktopInsets.right,
    );
    expect(nearRightEdge.x).toBeGreaterThanOrEqual(desktopInsets.left);
    expect(nearRightEdge.connector.x2).toBe(nearRightEdge.x + labelSize.width);

    // Gaveta lateral aberta ocupando 360 px à direita
    const insetsWithDrawer: SafeInsets = {
      ...desktopInsets,
      right: 360,
    };
    const nearDrawer = clampLabelRect(
      { x: 820, y: 360 },
      labelSize,
      desktopViewport,
      insetsWithDrawer,
    );
    expect(nearDrawer.placement).toBe('top-left');
    expect(nearDrawer.x + labelSize.width).toBeLessThanOrEqual(
      desktopViewport.width - insetsWithDrawer.right,
    );
    expect(nearDrawer.x).toBeGreaterThanOrEqual(insetsWithDrawer.left);
  });

  it('espelha para bottom quando próximo à barra superior (safeInsets.top = 72)', () => {
    const nearTop = clampLabelRect(
      { x: 640, y: 100 },
      labelSize,
      desktopViewport,
      desktopInsets,
    );

    expect(nearTop.placement).toBe('bottom-right');
    expect(nearTop.y).toBeGreaterThanOrEqual(desktopInsets.top);
    expect(nearTop.y + labelSize.height).toBeLessThanOrEqual(
      desktopViewport.height - desktopInsets.bottom,
    );
    expect(nearTop.connector.y2).toBe(nearTop.y);

    // Canto superior direito espelha ambos os eixos -> bottom-left
    const topRightCorner = clampLabelRect(
      { x: 1200, y: 90 },
      labelSize,
      desktopViewport,
      desktopInsets,
    );
    expect(topRightCorner.placement).toBe('bottom-left');
    expect(topRightCorner.x + labelSize.width).toBeLessThanOrEqual(
      desktopViewport.width - desktopInsets.right,
    );
    expect(topRightCorner.y).toBeGreaterThanOrEqual(desktopInsets.top);
  });

  it('nunca invade a barra inferior (safeInsets.bottom = 140), mesmo com âncora baixa', () => {
    const safeBottomLimit = desktopViewport.height - desktopInsets.bottom;

    for (const anchorY of [520, 560, 580, 650, 710]) {
      const result = clampLabelRect(
        { x: 640, y: anchorY },
        labelSize,
        desktopViewport,
        desktopInsets,
      );

      expect(result.y).toBeGreaterThanOrEqual(desktopInsets.top);
      expect(result.y + labelSize.height).toBeLessThanOrEqual(safeBottomLimit);
    }
  });

  it('mantém cartão 100% dentro da área útil segura em viewport mínimo mobile 320x568 e 390x844 para qualquer âncora', () => {
    const mobileCases: Array<{
      readonly name: string;
      readonly viewport: Size2D;
      readonly card: Size2D;
      readonly insets: SafeInsets;
    }> = [
      {
        name: 'mobile 320x568',
        viewport: { width: 320, height: 568 },
        card: { width: 220, height: 84 },
        insets: { top: 64, right: 12, bottom: 148, left: 12 },
      },
      {
        name: 'mobile 390x844',
        viewport: { width: 390, height: 844 },
        card: { width: 240, height: 92 },
        insets: { top: 68, right: 16, bottom: 152, left: 16 },
      },
    ];

    for (const testCase of mobileCases) {
      const { viewport, card, insets } = testCase;
      const sampleXs = [-20, 0, 12, 80, 160, 240, viewport.width - 10, viewport.width + 30];
      const sampleYs = [-20, 0, 64, 140, 280, 400, viewport.height - 80, viewport.height + 30];

      for (const anchorX of sampleXs) {
        for (const anchorY of sampleYs) {
          const result = clampLabelRect(
            { x: anchorX, y: anchorY },
            card,
            viewport,
            insets,
          );

          expect(result.x).toBeGreaterThanOrEqual(insets.left);
          expect(result.x + card.width).toBeLessThanOrEqual(
            viewport.width - insets.right,
          );
          expect(result.y).toBeGreaterThanOrEqual(insets.top);
          expect(result.y + card.height).toBeLessThanOrEqual(
            viewport.height - insets.bottom,
          );

          // Conector sempre com coordenadas finitas e ponto de fixação sobre o retângulo do cartão
          expect(Number.isFinite(result.connector.x1)).toBe(true);
          expect(Number.isFinite(result.connector.y1)).toBe(true);
          expect(Number.isFinite(result.connector.x2)).toBe(true);
          expect(Number.isFinite(result.connector.y2)).toBe(true);
          expect(result.connector.x1).toBe(Math.round(anchorX));
          expect(result.connector.y1).toBe(Math.round(anchorY));
          expect(result.connector.x2).toBeGreaterThanOrEqual(result.x);
          expect(result.connector.x2).toBeLessThanOrEqual(result.x + card.width);
          expect(result.connector.y2).toBeGreaterThanOrEqual(result.y);
          expect(result.connector.y2).toBeLessThanOrEqual(result.y + card.height);
        }
      }
    }
  });

  it('trata defensivamente safeInsets negativos e cartão maior que a área útil sem gerar NaN', () => {
    const result = clampLabelRect(
      { x: 100, y: 100 },
      { width: 400, height: 300 },
      { width: 320, height: 240 },
      { top: -10, right: -5, bottom: 20, left: 10 },
    );

    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    expect(result.x).toBe(10);
    expect(result.y).toBe(0);
  });
});
