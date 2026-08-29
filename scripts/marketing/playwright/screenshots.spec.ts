import { test } from '@playwright/test';
import { appMarketingRoutes, getDemoAccounts, screenshotViewports, storageStatePath } from './data/demo-data';
import { captureMarketingScreenshot } from './helpers';

test.describe.configure({ mode: 'serial' });

test('gera screenshots profissionais das telas principais', async ({ browser }) => {
  for (const account of getDemoAccounts()) {
    for (const viewport of screenshotViewports) {
      const context = await browser.newContext({
        storageState: storageStatePath(account.code),
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      for (const route of appMarketingRoutes) {
        await test.step(`${account.code} / ${route.id} / ${viewport.name}`, async () => {
          await captureMarketingScreenshot(page, account, route, viewport);
        });
      }

      await context.close();
    }
  }
});
