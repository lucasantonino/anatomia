import { expect, test } from '@playwright/test';
import {
  analyzeCanvasPixels,
  attachDiagnostics,
  expectZeroRuntimeErrors,
  visualAuditPath,
  waitAnimationFrames,
  waitForViewerFullyLoaded,
} from './helpers';

test.describe('Anatomia 3D — Mobile Touch (390x844 e 320x568)', () => {
  test('zero overflow horizontal, alvos táteis >= 44x44 px, troca de camadas e captura mobile 320x568', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    // Zero overflow horizontal
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

    // Cena 3D renderizada com pixels reais
    const pixels = await analyzeCanvasPixels(page);
    expect(pixels.nonBlackSamples).toBeGreaterThan(200);

    // Todos os controles interativos visíveis no header e barra inferior medem >= 44x44 px
    const interactiveLocators = page.locator(
      'header button:visible, [data-testid="layer-controls"] button:visible, [data-testid="layer-controls"] input[type="range"]:visible',
    );
    const count = await interactiveLocators.count();
    expect(count).toBeGreaterThanOrEqual(9);

    for (let i = 0; i < count; i += 1) {
      const el = interactiveLocators.nth(i);
      const box = await el.boundingBox();
      const label =
        (await el.getAttribute('aria-label')) ??
        (await el.textContent())?.trim() ??
        `control-${i}`;
      expect(box, `BoundingBox nulo para controle "${label}"`).not.toBeNull();
      if (box) {
        expect(
          box.width,
          `Largura insuficiente (< 44px) no controle "${label}"`,
        ).toBeGreaterThanOrEqual(44);
        expect(
          box.height,
          `Altura insuficiente (< 44px) no controle "${label}"`,
        ).toBeGreaterThanOrEqual(44);
      }
    }

    // Alternância de camadas e atalho Mostrar músculos
    const layerGroup = page.getByRole('group', { name: 'Camadas anatômicas' });
    const btnMuscles = layerGroup.getByRole('button', { name: 'Músculos' });
    const btnBones = layerGroup.getByRole('button', { name: 'Ossos' });
    const btnBoth = layerGroup.getByRole('button', { name: 'Ambos' });
    const toggleMuscles = page.getByRole('button', {
      name: /Mostrar músculos/i,
    });

    await btnMuscles.tap();
    await expect(btnMuscles).toHaveAttribute('aria-pressed', 'true');

    await toggleMuscles.tap();
    await expect(btnBones).toHaveAttribute('aria-pressed', 'true');

    await toggleMuscles.tap();
    await expect(btnBoth).toHaveAttribute('aria-pressed', 'true');

    // Evidência visual dedicada ao menor viewport mobile (320x568)
    if (viewport && viewport.width <= 320) {
      await waitAnimationFrames(page, 4);
      await page.screenshot({
        path: visualAuditPath('08-mobile-320x568.png'),
      });
    }

    expectZeroRuntimeErrors(diag);
  });

  test('gaveta bottom-sheet auto-recolhe ao selecionar estrutura e etiqueta permanece na área útil segura', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .tap();
    const drawer = page.getByTestId('structure-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'true');

    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('clavicula direita');
    await drawer
      .getByRole('button', { name: /Clavícula/i })
      .first()
      .tap();

    // Auto-recolhimento da gaveta no mobile após seleção
    await expect(drawer).toHaveCount(0);

    await page.waitForTimeout(650);
    await waitAnimationFrames(page, 4);

    const labelCard = page.getByTestId('anatomy-label-card');
    await expect(labelCard).toHaveAttribute('data-active', 'true');
    await expect(labelCard).toHaveAttribute('data-pinned', 'true');
    await expect(labelCard).toBeVisible();
    await expect(labelCard).toContainText('Clavícula');
    await expect(labelCard).toContainText('Clavicula');

    const labelBox = await labelCard.boundingBox();
    const headerBox = await page.locator('header').boundingBox();
    const controlsBox = await page.getByTestId('layer-controls').boundingBox();

    expect(labelBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();

    if (labelBox && headerBox && controlsBox && viewport) {
      expect(labelBox.x).toBeGreaterThanOrEqual(0);
      expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(labelBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 2);
      expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(controlsBox.y + 2);
    }

    const closeBtn = labelCard.getByRole('button', { name: 'Fechar etiqueta' });
    const closeBox = await closeBtn.boundingBox();
    expect(closeBox).not.toBeNull();
    if (closeBox) {
      expect(closeBox.width).toBeGreaterThanOrEqual(44);
      expect(closeBox.height).toBeGreaterThanOrEqual(44);
    }

    // Evidência visual dedicada ao viewport mobile padrão (390x844) com etiqueta
    if (viewport && viewport.width >= 390) {
      await page.screenshot({
        path: visualAuditPath('07-mobile-390x844-label.png'),
      });
    }

    await closeBtn.tap();
    await expect(labelCard).toHaveAttribute('data-active', 'false');

    expectZeroRuntimeErrors(diag);
  });

  test('arrasto (> 30 px) no canvas não dispara seleção acidental e toque simples seleciona (RF-06)', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    const labelCard = page.getByTestId('anatomy-label-card');
    const analysis = await analyzeCanvasPixels(page);
    expect(analysis.sampleHitPoints.length).toBeGreaterThan(0);

    const anchorPt = analysis.sampleHitPoints[Math.floor(analysis.sampleHitPoints.length / 2)]!;

    // Simula arrasto tátil nativo (> 45 px) via CDP partindo de um pixel renderizado do modelo
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: anchorPt.x, y: anchorPt.y, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: anchorPt.x + 20, y: anchorPt.y + 6, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: anchorPt.x + 48, y: anchorPt.y + 12, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });

    await waitAnimationFrames(page, 4);
    await expect(labelCard).toHaveAttribute('data-active', 'false');
    await expect(labelCard).toHaveAttribute('data-pinned', 'false');

    // Agora testa toque simples nativo (page.touchscreen.tap) sobre pixel renderizado do modelo
    const postDragAnalysis = await analyzeCanvasPixels(page);
    let tappedStructure = false;

    for (const pt of postDragAnalysis.sampleHitPoints) {
      await page.touchscreen.tap(pt.x, pt.y);
      await waitAnimationFrames(page, 3);
      if ((await labelCard.getAttribute('data-active')) === 'true') {
        tappedStructure = true;
        break;
      }
    }

    await cdp.detach();
    expect(tappedStructure).toBe(true);
    await expect(labelCard).toHaveAttribute('data-pinned', 'true');

    expectZeroRuntimeErrors(diag);
  });
});
