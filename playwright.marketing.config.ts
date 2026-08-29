import { defineConfig } from '@playwright/test';

const baseURL = process.env.MARKETING_BASE_URL || 'http://127.0.0.1:5173';
const shouldStartWebServer = process.env.MARKETING_SKIP_WEBSERVER !== 'true';
const devServerCommand = process.env.MARKETING_DEV_SERVER_COMMAND || 'npm run dev -- --host 127.0.0.1';

export default defineConfig({
  testDir: './scripts/marketing/playwright',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'marketing-output/playwright-report', open: 'never' }],
  ],
  outputDir: 'marketing-output/playwright-results',
  globalSetup: './scripts/marketing/playwright/auth.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20_000,
  },
  webServer: shouldStartWebServer
    ? {
        command: devServerCommand,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
