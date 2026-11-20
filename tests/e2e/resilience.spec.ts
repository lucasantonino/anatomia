import { expect, test } from '@playwright/test';
import {
  analyzeCanvasPixels,
  attachDiagnostics,
  expectZeroRuntimeErrors,
  waitAnimationFrames,
  waitForViewerFullyLoaded,
} from './helpers';

test.describe('Anatomia 3D — Resiliência e Falhas Simuladas (RF-09)', () => {
  test('falha isolada em muscular-v1.glb mantém esqueleto interativo e recupera com Tentar novamente', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    let muscularAttempts = 0;
    await page.route('**/assets/v1/muscular-v1.glb', async (route) => {
      muscularAttempts += 1;
      if (muscularAttempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'text/plain',
          body: 'Simulated failure on muscular-v1.glb',
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');

    // Overlay bloqueante inicial some pois o esqueleto carrega com sucesso
    await expect(page.getByTestId('status-initial-loading')).toHaveCount(0, {
      timeout: 30_000,
    });

    // Banner não destrutivo de falha parcial muscular aparece
    const partialBanner = page.getByTestId('status-partial-error-muscular');
    await expect(partialBanner).toBeVisible({ timeout: 20_000 });
    await expect(partialBanner).toContainText(
      /não foi possível carregar a camada muscular/i,
    );

    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__retrySession = 'same-page';
    });

    // Esqueleto já está renderizado e interativo na gaveta
    await waitAnimationFrames(page, 4);
    const skeletalPixels = await analyzeCanvasPixels(page);
    expect(skeletalPixels.nonBlackSamples).toBeGreaterThan(200);

    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    const drawer = page.getByTestId('structure-drawer');
    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('clavicula direita');
    await drawer
      .getByRole('button', { name: /Clavícula/i })
      .first()
      .click();
    await expect(page.getByTestId('anatomy-label-card')).toContainText(
      'Clavícula',
    );
    await page.keyboard.press('Escape');

    // Clicar em Tentar novamente carrega a musculatura sem recarregar a página
    await partialBanner
      .getByRole('button', { name: 'Tentar novamente' })
      .click();
    await expect(partialBanner).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId('status-muscular-loading')).toHaveCount(0, {
      timeout: 30_000,
    });
    expect(muscularAttempts).toBe(2);

    const samePage = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__retrySession,
    );
    expect(samePage).toBe('same-page');

    // Agora estruturas musculares selecionam normalmente
    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('biceps esquerdo');
    await drawer
      .getByRole('button', { name: /Músculo bíceps braquial/i })
      .first()
      .click();
    await expect(page.getByTestId('anatomy-label-card')).toContainText(
      'Músculo bíceps braquial',
    );

    expect(pageErrors).toEqual([]);
  });

  test('falha total em manifest.json exibe cartão de erro e recupera toda a cena com Tentar novamente', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    let manifestAttempts = 0;
    await page.route('**/assets/v1/manifest.json', async (route) => {
      manifestAttempts += 1;
      if (manifestAttempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"error":"simulated"}',
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/');

    const totalError = page.getByTestId('status-total-error');
    await expect(totalError).toBeVisible({ timeout: 20_000 });
    await expect(totalError).toContainText(
      'Não foi possível carregar o modelo anatômico',
    );

    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__manifestRetry = 'same-page';
    });

    await totalError.getByRole('button', { name: 'Tentar novamente' }).click();

    await expect(totalError).toHaveCount(0, { timeout: 30_000 });
    await waitForViewerFullyLoaded(page);
    expect(manifestAttempts).toBe(2);

    const samePage = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__manifestRetry,
    );
    expect(samePage).toBe('same-page');

    const pixels = await analyzeCanvasPixels(page);
    expect(pixels.nonBlackSamples).toBeGreaterThan(500);

    expect(pageErrors).toEqual([]);
  });

  test('simulação de webglcontextlost exibe aviso com lista acessível e webglcontextrestored retoma a cena', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    // Dispara webglcontextlost cancelável no canvas e verifica preventDefault()
    const wasPrevented = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '[data-testid="canvas-viewport"] canvas',
      );
      if (!canvas) {
        throw new Error('Canvas não encontrado');
      }
      const event = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(wasPrevented).toBe(true);

    const contextLostOverlay = page.getByTestId('status-webgl-context-lost');
    await expect(contextLostOverlay).toBeVisible();
    await expect(contextLostOverlay).toContainText(
      'Visualização 3D interrompida temporariamente',
    );

    // Lista textual de estruturas continua acessível mesmo durante perda de contexto
    await contextLostOverlay
      .getByRole('button', { name: 'Abrir lista de estruturas' })
      .click();
    const drawer = page.getByTestId('structure-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Todas (22)' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    // Dispara webglcontextrestored -> overlay desaparece e cena retoma
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        '[data-testid="canvas-viewport"] canvas',
      );
      canvas?.dispatchEvent(new Event('webglcontextrestored'));
    });

    await expect(contextLostOverlay).toHaveCount(0);
    await expect(page.getByTestId('live-announcer')).toContainText(
      'Visualização 3D restaurada.',
    );

    await waitAnimationFrames(page, 4);
    const recoveredPixels = await analyzeCanvasPixels(page);
    expect(recoveredPixels.nonBlackSamples).toBeGreaterThan(500);

    expectZeroRuntimeErrors(diag);
  });
});
