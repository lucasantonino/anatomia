import { defineConfig, devices } from '@playwright/test';

const WEBGL_CHROMIUM_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

const BASE_URL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: WEBGL_CHROMIUM_ARGS,
    },
  },
  projects: [
    {
      name: 'desktop-1280x720',
      testMatch: /.*(desktop|resilience)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        hasTouch: false,
        isMobile: false,
        launchOptions: {
          args: WEBGL_CHROMIUM_ARGS,
        },
      },
    },
    {
      name: 'mobile-390x844',
      testMatch: /.*mobile\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
        launchOptions: {
          args: WEBGL_CHROMIUM_ARGS,
        },
      },
    },
    {
      name: 'mobile-320x568',
      testMatch: /.*mobile\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
        launchOptions: {
          args: WEBGL_CHROMIUM_ARGS,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
