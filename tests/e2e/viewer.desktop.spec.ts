import { expect, test } from '@playwright/test';
import {
  analyzeCanvasPixels,
  attachDiagnostics,
  expectZeroRuntimeErrors,
  visualAuditPath,
  waitAnimationFrames,
  waitForViewerFullyLoaded,
} from './helpers';

test.describe('Anatomia 3D v2 — Desktop (1280x720)', () => {
  test('renderiza corpo inteiro v2 em fundo #000000, alterna camadas/opacidade sem recarregar e gera evidências 01-03', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);
    const glbRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().endsWith('.glb')) {
        glbRequests.push(req.url());
      }
    });

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    // Badge v2 no cabeçalho
    await expect(page.getByLabel('Versão v2')).toHaveText('v2');

    // Marcador de sessão para comprovar zero reloads durante trocas de camada
    await page.evaluate(() => {
      (window as unknown as Record<string, unknown>).__noReloadToken = 'alive';
    });

    // RF-01: fundo #000000 puro e canvas WebGL 2 renderizando pixels reais
    const bodyBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(bodyBg).toBe('rgb(0, 0, 0)');

    const initialPixels = await analyzeCanvasPixels(page);
    expect(initialPixels.nonBlackSamples).toBeGreaterThan(500);

    await page.screenshot({
      path: visualAuditPath('01-v2-desktop-fullbody-anterior.png'),
    });

    const glbCountAfterLoad = glbRequests.length;
    expect(glbCountAfterLoad).toBe(2);
    expect(glbRequests.some((url) => url.endsWith('/assets/v2/skeletal-v2.glb'))).toBe(
      true,
    );
    expect(glbRequests.some((url) => url.endsWith('/assets/v2/muscular-v2.glb'))).toBe(
      true,
    );

    const layerGroup = page.getByRole('group', { name: 'Camadas anatômicas' });
    const btnMuscles = layerGroup.getByRole('button', { name: 'Músculos' });
    const btnBones = layerGroup.getByRole('button', { name: 'Ossos' });
    const btnBoth = layerGroup.getByRole('button', { name: 'Ambos' });
    const toggleMuscles = page.getByRole('button', {
      name: /Mostrar músculos/i,
    });
    const opacitySlider = page.getByRole('slider', {
      name: /Opacidade dos músculos/i,
    });

    // Estado inicial: Ambos ativo, slider presente em 100%
    await expect(btnBoth).toHaveAttribute('aria-pressed', 'true');
    await expect(toggleMuscles).toHaveAttribute('aria-pressed', 'true');
    await expect(opacitySlider).toBeVisible();
    await expect(opacitySlider).toHaveValue('100');

    // RF-03: Somente Ossos -> slider oculto e captura 02 (esqueleto completo)
    await btnBones.click();
    await expect(btnBones).toHaveAttribute('aria-pressed', 'true');
    await expect(toggleMuscles).toHaveAttribute('aria-pressed', 'false');
    await expect(opacitySlider).toHaveCount(0);
    await waitAnimationFrames(page, 4);

    await page.screenshot({
      path: visualAuditPath('02-v2-desktop-skeleton-anterior.png'),
    });

    // RF-03 + RF-04: Músculos isolado -> clicar Mostrar músculos transita para Ossos (nunca tela vazia)
    await btnMuscles.click();
    await expect(btnMuscles).toHaveAttribute('aria-pressed', 'true');
    await expect(toggleMuscles).toHaveAttribute('aria-pressed', 'true');
    await expect(opacitySlider).toHaveCount(0);

    await toggleMuscles.click();
    await expect(btnBones).toHaveAttribute('aria-pressed', 'true');
    await expect(toggleMuscles).toHaveAttribute('aria-pressed', 'false');

    // Reativar Mostrar músculos a partir de Ossos -> Ambos com slider restaurado
    await toggleMuscles.click();
    await expect(btnBoth).toHaveAttribute('aria-pressed', 'true');
    await expect(opacitySlider).toBeVisible();

    // RF-07: Opacidade 30% -> evidência visual 03
    await opacitySlider.fill('30');
    await expect(opacitySlider).toHaveAttribute('aria-valuenow', '30');
    await expect(page.getByTestId('muscle-ghost-hint')).toHaveCount(0);
    await waitAnimationFrames(page, 4);

    await page.screenshot({
      path: visualAuditPath('03-v2-desktop-opacity-30.png'),
    });

    // RF-07: Opacidade 20% -> aviso modo fantasma visível
    await opacitySlider.fill('20');
    await expect(page.getByTestId('muscle-ghost-hint')).toBeVisible();
    await expect(page.getByTestId('muscle-ghost-hint')).toContainText(
      'Seleção direta de ossos ativa',
    );

    // Confirma zero recarregamento de página e zero re-fetch de .glb
    const token = await page.evaluate(
      () => (window as unknown as Record<string, unknown>).__noReloadToken,
    );
    expect(token).toBe('alive');
    expect(glbRequests.length).toBe(glbCountAfterLoad);

    expectZeroRuntimeErrors(diag);
  });

  test('gaveta Estruturas v2 (575), filtros regionais nas 4 macro-regiões, etiqueta 2D, aria-live e evidências 04-06', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    // Abrir gaveta Estruturas
    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    const drawer = page.getByTestId('structure-drawer');
    await expect(drawer).toBeVisible();

    // Contagens dinâmicas por sistema na v2 (575 total = 374 músculos + 201 ossos)
    const systemGroup = drawer.getByRole('group', {
      name: 'Filtrar por sistema anatômico',
    });
    await expect(
      systemGroup.getByRole('button', { name: 'Todas (575)' }),
    ).toBeVisible();
    await expect(
      systemGroup.getByRole('button', { name: 'Músculos (374)' }),
    ).toBeVisible();
    await expect(
      systemGroup.getByRole('button', { name: 'Ossos (201)' }),
    ).toBeVisible();

    // Contagens dinâmicas nas 4 macro-regiões (137 + 104 + 152 + 182 = 575)
    const regionGroup = drawer.getByRole('group', {
      name: 'Filtrar por região anatômica',
    });
    await expect(
      regionGroup.getByRole('button', { name: 'Todas (575)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    const btnHeadNeck = regionGroup.getByRole('button', {
      name: 'Cabeça/Pescoço (137)',
    });
    const btnTrunk = regionGroup.getByRole('button', { name: 'Tronco (104)' });
    const btnUpperLimb = regionGroup.getByRole('button', {
      name: 'M. Superior (152)',
    });
    const btnLowerLimb = regionGroup.getByRole('button', {
      name: 'M. Inferior (182)',
    });
    await expect(btnHeadNeck).toBeVisible();
    await expect(btnTrunk).toBeVisible();
    await expect(btnUpperLimb).toBeVisible();
    await expect(btnLowerLimb).toBeVisible();

    const searchBox = drawer.getByRole('searchbox', {
      name: /Buscar estrutura/i,
    });
    const labelCard = page.getByTestId('anatomy-label-card');

    // 1) Membro inferior: filtra M. Inferior (182) e seleciona Fêmur direito (evidência 04)
    await btnLowerLimb.click();
    await expect(btnLowerLimb).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer).toContainText('182 de 575 estruturas');

    await searchBox.fill('femur direito');
    await drawer
      .getByRole('button', { name: /Fêmur\s+Femur/i })
      .first()
      .click();

    await expect(labelCard).toHaveAttribute('data-active', 'true');
    await expect(labelCard).toHaveAttribute('data-pinned', 'true');
    await expect(labelCard).toBeVisible();
    await expect(labelCard).toContainText('Fêmur');
    await expect(labelCard).toContainText('Femur');
    await expect(labelCard).toContainText('Ósseo');
    await expect(labelCard).toContainText('Lado direito');

    await page.waitForTimeout(650);
    await waitAnimationFrames(page, 4);

    await expect(page.getByTestId('live-announcer')).toContainText(
      'Selecionado: Fêmur, Femur, lado direito',
    );

    // RF-08: etiqueta dentro da viewport sem sobrepor cabeçalho, controles ou gaveta aberta
    const labelBox = await labelCard.boundingBox();
    const headerBox = await page.locator('header').boundingBox();
    const controlsBox = await page.getByTestId('layer-controls').boundingBox();
    const drawerBox = await drawer.boundingBox();

    expect(labelBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(drawerBox).not.toBeNull();

    if (labelBox && headerBox && controlsBox && drawerBox) {
      expect(labelBox.x).toBeGreaterThanOrEqual(0);
      expect(labelBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 2);
      expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(drawerBox.x + 2);
      expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(controlsBox.y + 2);
    }

    // Linha SVG conectora visível com coordenadas finitas
    const connectorCoords = await page
      .locator('[data-testid="anatomy-label-overlay"] svg line')
      .evaluate((el) => ({
        visibility: getComputedStyle(el).visibility,
        x1: Number(el.getAttribute('x1')),
        y1: Number(el.getAttribute('y1')),
        x2: Number(el.getAttribute('x2')),
        y2: Number(el.getAttribute('y2')),
      }));
    expect(connectorCoords.visibility).toBe('visible');
    expect(Number.isFinite(connectorCoords.x1)).toBe(true);
    expect(Number.isFinite(connectorCoords.x2)).toBe(true);

    // Botão fechar [×] >= 44 x 44 px
    const closeLabelBtn = labelCard.getByRole('button', {
      name: 'Fechar etiqueta',
    });
    const closeBtnBox = await closeLabelBtn.boundingBox();
    expect(closeBtnBox).not.toBeNull();
    if (closeBtnBox) {
      expect(closeBtnBox.width).toBeGreaterThanOrEqual(44);
      expect(closeBtnBox.height).toBeGreaterThanOrEqual(44);
    }

    // Fecha gaveta com Esc para evidência visual 04 (Fêmur — membro inferior)
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await waitAnimationFrames(page, 4);

    await page.screenshot({
      path: visualAuditPath('04-v2-desktop-focus-femur.png'),
    });

    // 2) Cabeça e pescoço: filtra Cabeça/Pescoço e seleciona Mandíbula (evidência 05)
    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    await expect(drawer).toBeVisible();
    await drawer
      .getByRole('group', { name: 'Filtrar por região anatômica' })
      .getByRole('button', { name: 'Cabeça/Pescoço (137)' })
      .click();
    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('mandibula');
    await drawer
      .getByRole('button', { name: /Mandíbula/i })
      .first()
      .click();

    await expect(labelCard).toContainText('Mandíbula');
    await expect(labelCard).toContainText('Mandibula');
    await expect(labelCard).toContainText('Ósseo');
    await expect(labelCard).toContainText('Linha média');

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await page.waitForTimeout(700);
    await waitAnimationFrames(page, 4);

    await page.screenshot({
      path: visualAuditPath('05-v2-desktop-focus-skull-mandible.png'),
    });

    // 3) Tronco / dorso posterior: filtra Tronco e seleciona Músculo trapézio direito (evidência 06)
    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    await expect(drawer).toBeVisible();
    await drawer
      .getByRole('group', { name: 'Filtrar por região anatômica' })
      .getByRole('button', { name: 'Tronco (104)' })
      .click();
    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('trapezio direito');
    await drawer
      .getByRole('button', { name: /Músculo trapézio/i })
      .first()
      .click();

    await expect(labelCard).toContainText('Músculo trapézio');
    await expect(labelCard).toContainText('Musculus trapezius');
    await expect(labelCard).toContainText('Muscular');
    await expect(labelCard).toContainText('Lado direito');

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await page.waitForTimeout(700);
    await waitAnimationFrames(page, 4);

    await page.screenshot({
      path: visualAuditPath('06-v2-desktop-focus-trapezius-posterior.png'),
    });

    // 4) Membro superior: filtra M. Superior e valida seleção em PT-BR/Latim + fechamento via [×] e Esc
    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    await expect(drawer).toBeVisible();
    await drawer
      .getByRole('group', { name: 'Filtrar por região anatômica' })
      .getByRole('button', { name: 'M. Superior (152)' })
      .click();
    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('Musculus biceps brachii esquerdo');
    await drawer
      .getByRole('button', { name: /Músculo bíceps braquial/i })
      .first()
      .click();

    await expect(labelCard).toContainText('Músculo bíceps braquial');
    await expect(labelCard).toContainText('Musculus biceps brachii');
    await expect(labelCard).toContainText('Lado esquerdo');

    await page.keyboard.press('Escape'); // fecha gaveta
    await expect(drawer).toHaveCount(0);

    // Fechar etiqueta pelo botão [×]
    await labelCard.getByRole('button', { name: 'Fechar etiqueta' }).click();
    await expect(labelCard).toHaveAttribute('data-active', 'false');

    // Re-selecionar e limpar etiqueta via Esc
    await page
      .getByRole('button', { name: /Abrir lista de estruturas/i })
      .click();
    await drawer
      .getByRole('searchbox', { name: /Buscar estrutura/i })
      .fill('clavicula direita');
    await drawer
      .getByRole('button', { name: /Clavícula/i })
      .first()
      .click();
    await page.keyboard.press('Escape'); // fecha gaveta
    await expect(labelCard).toHaveAttribute('data-active', 'true');
    await page.keyboard.press('Escape'); // limpa seleção
    await expect(labelCard).toHaveAttribute('data-active', 'false');

    expectZeroRuntimeErrors(diag);
  });

  test('interação direta no canvas: órbita, teclado (Setas, +, -, R) e hover/clique sobre o modelo v2', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    const viewportEl = page.getByTestId('canvas-viewport');
    const labelCard = page.getByTestId('anatomy-label-card');

    // Foco no canvas e atalhos de teclado (RF-02)
    await viewportEl.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('+');
    await page.keyboard.press('-');
    await page.keyboard.press('r');
    await expect(page.getByTestId('live-announcer')).toContainText(
      'Vista anatômica redefinida.',
    );
    await page.waitForTimeout(550);
    await waitAnimationFrames(page, 3);

    // Arrasto de órbita no canvas sem gerar erro nem seleção acidental
    await page.mouse.move(640, 320);
    await page.mouse.down();
    await page.mouse.move(740, 300, { steps: 8 });
    await page.mouse.up();
    await expect(labelCard).toHaveAttribute('data-active', 'false');

    // Redefinir vista para voltar ao enquadramento anterior padrão
    await page.keyboard.press('r');
    await page.waitForTimeout(550);
    await waitAnimationFrames(page, 4);

    // Localiza pixel real renderizado da anatomia e testa hover + clique direto (RF-05)
    const analysis = await analyzeCanvasPixels(page);
    expect(analysis.sampleHitPoints.length).toBeGreaterThan(0);

    let hitPoint: { x: number; y: number } | null = null;
    for (const pt of analysis.sampleHitPoints) {
      await page.mouse.move(pt.x, pt.y);
      await page.waitForTimeout(90);
      const isActive = await labelCard.getAttribute('data-active');
      if (isActive === 'true') {
        hitPoint = pt;
        break;
      }
    }

    expect(
      hitPoint,
      'Esperado encontrar ao menos um ponto de hover sobre malha 3D renderizada',
    ).not.toBeNull();
    await expect(labelCard).toHaveAttribute('data-active', 'true');
    const hoveredId = await labelCard.getAttribute('data-anatomy-id');
    expect(hoveredId).toMatch(/^(bone|muscle)\./);

    // Clique simples no mesmo ponto fixa a etiqueta
    if (hitPoint) {
      await page.mouse.click(hitPoint.x, hitPoint.y);
      await expect(labelCard).toHaveAttribute('data-pinned', 'true');
    }

    // Clique no fundo preto livre limpa a seleção
    await page.mouse.click(30, 140);
    await expect(labelCard).toHaveAttribute('data-pinned', 'false');

    expectZeroRuntimeErrors(diag);
  });

  test('modais Como navegar e Créditos validam foco inicial, v2 (575 estruturas / 635 malhas), CC BY-SA 2.1 JP e retorno de foco com Esc', async ({
    page,
  }) => {
    const diag = attachDiagnostics(page);

    await page.goto('/');
    await waitForViewerFullyLoaded(page);

    // Modal Como navegar
    const helpBtn = page.getByRole('button', { name: 'Como navegar' });
    await helpBtn.click();

    const helpModal = page.getByTestId('help-modal');
    await expect(helpModal).toBeVisible();
    await expect(helpModal).toHaveAttribute('role', 'dialog');
    await expect(helpModal).toHaveAttribute('aria-modal', 'true');
    await expect(
      helpModal.getByRole('button', { name: 'Fechar janela Como navegar' }),
    ).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(helpModal).toHaveCount(0);
    await expect(helpBtn).toBeFocused();

    // Modal Créditos v2
    const creditsBtn = page.getByRole('button', {
      name: /Créditos, licenças e escopo/i,
    });
    await creditsBtn.click();

    const creditsModal = page.getByTestId('credits-modal');
    await expect(creditsModal).toBeVisible();
    await expect(creditsModal).toHaveAttribute('role', 'dialog');
    await expect(creditsModal).toHaveAttribute('aria-modal', 'true');
    await expect(
      creditsModal.getByRole('button', {
        name: 'Fechar janela de créditos e licenças',
      }),
    ).toBeFocused();

    const modalText = await creditsModal.textContent();
    expect(modalText).toContain('BodyParts3D');
    expect(modalText).toContain('DBCLS');
    expect(modalText).toContain('CC BY-SA 2.1 JP');
    expect(modalText).toContain('v2');
    expect(modalText).toContain('575 estruturas');
    expect(modalText).toContain('201 ossos');
    expect(modalText).toContain('374 músculos');
    expect(modalText).toContain('635 malhas');
    expect(modalText).toContain('pending_review');
    expect(modalText).toMatch(/estritamente educacional/i);

    const licenseLink = creditsModal.getByRole('link', {
      name: /CC BY-SA 2\.1 JP/i,
    });
    await expect(licenseLink).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en',
    );

    await page.keyboard.press('Escape');
    await expect(creditsModal).toHaveCount(0);
    await expect(creditsBtn).toBeFocused();

    expectZeroRuntimeErrors(diag);
  });
});
