import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const VISUAL_AUDIT_DIR = path.resolve(
  process.cwd(),
  'test-results',
  'visual-audit-v2',
);

export interface RuntimeDiagnostics {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly httpErrors: string[];
}

export function ensureVisualAuditDir(): void {
  fs.mkdirSync(VISUAL_AUDIT_DIR, { recursive: true });
}

export function visualAuditPath(filename: string): string {
  ensureVisualAuditDir();
  return path.join(VISUAL_AUDIT_DIR, filename);
}

export function attachDiagnostics(page: Page): RuntimeDiagnostics {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const httpErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return { consoleErrors, pageErrors, httpErrors };
}

export function expectZeroRuntimeErrors(diag: RuntimeDiagnostics): void {
  expect(diag.pageErrors, 'Erros não capturados (pageerror)').toEqual([]);
  expect(diag.consoleErrors, 'Erros de console (console.error)').toEqual([]);
  expect(diag.httpErrors, 'Respostas HTTP >= 400').toEqual([]);
}

export async function waitForViewerFullyLoaded(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="canvas-viewport"] canvas')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('status-initial-loading')).toHaveCount(0, {
    timeout: 45_000,
  });
  await expect(page.getByTestId('status-muscular-loading')).toHaveCount(0, {
    timeout: 45_000,
  });
  await expect(page.getByTestId('status-nonblocking')).toHaveCount(0, {
    timeout: 45_000,
  });
  await waitAnimationFrames(page, 4);
}

export async function waitAnimationFrames(
  page: Page,
  count: number = 3,
): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        let remaining = frames;
        const step = () => {
          remaining -= 1;
          if (remaining <= 0) {
            resolve();
          } else {
            requestAnimationFrame(step);
          }
        };
        requestAnimationFrame(step);
      }),
    count,
  );
}

export interface CanvasPixelAnalysis {
  readonly width: number;
  readonly height: number;
  readonly nonBlackSamples: number;
  readonly sampleHitPoints: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

/**
 * Captura o frame real composto pelo WebGL no `<canvas>` e analisa os pixels
 * renderizados (evita falsos pretos quando preserveDrawingBuffer=false).
 */
export async function analyzeCanvasPixels(
  page: Page,
): Promise<CanvasPixelAnalysis> {
  const canvas = page.locator('[data-testid="canvas-viewport"] canvas');
  const pngBuffer = await canvas.screenshot();
  const base64 = pngBuffer.toString('base64');

  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();

    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      throw new Error('Contexto 2D indisponível para análise de pixels.');
    }
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      img.width,
      img.height,
    );

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = width / dpr;
    const cssHeight = height / dpr;
    const stride = 4;
    let nonBlackSamples = 0;
    const hits: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const idx = (y * width + x) * 4;
        const r = data[idx] ?? 0;
        const g = data[idx + 1] ?? 0;
        const b = data[idx + 2] ?? 0;
        if (r > 15 || g > 15 || b > 15) {
          nonBlackSamples += 1;
          const cssX = Math.round(x / dpr);
          const cssY = Math.round(y / dpr);
          // Região segura longe do cabeçalho e da barra inferior
          if (
            cssY > 90 &&
            cssY < cssHeight - 170 &&
            cssX > 40 &&
            cssX < cssWidth - 40
          ) {
            hits.push({ x: cssX, y: cssY });
          }
        }
      }
    }

    // Seleciona até 15 pontos espaçados dentro da malha renderizada
    const sampleHitPoints: Array<{ x: number; y: number }> = [];
    if (hits.length > 0) {
      const step = Math.max(1, Math.floor(hits.length / 15));
      for (let i = Math.floor(step / 2); i < hits.length; i += step) {
        const pt = hits[i];
        if (pt) {
          sampleHitPoints.push(pt);
        }
      }
    }

    return {
      width: cssWidth,
      height: cssHeight,
      nonBlackSamples,
      sampleHitPoints,
    };
  }, base64);
}
