import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { getDemoAccounts, marketingOutputDir, storageStatePath } from './data/demo-data';
import { ensureDir, installMarketingStyles } from './helpers';
import { runBudgetFlow } from './flows/budget';
import { runChecklistFlow } from './flows/checklist';
import { runDashboardFlow } from './flows/dashboard';
import { runGuestsFlow } from './flows/guests';
import { runVendorsFlow } from './flows/vendors';

const flows = [
  { id: 'dashboard', run: runDashboardFlow },
  { id: 'budget', run: runBudgetFlow },
  { id: 'guests', run: runGuestsFlow },
  { id: 'checklist', run: runChecklistFlow },
  { id: 'vendors', run: runVendorsFlow },
];

test.describe.configure({ mode: 'serial' });

test('grava fluxos demonstrativos com conta demo', async ({ browser }) => {
  for (const account of getDemoAccounts()) {
    for (const flow of flows) {
      const videoDir = path.join(marketingOutputDir, 'recordings', account.code);
      ensureDir(videoDir);

      const context = await browser.newContext({
        storageState: storageStatePath(account.code),
        viewport: { width: 1080, height: 1920 },
        recordVideo: {
          dir: videoDir,
          size: { width: 1080, height: 1920 },
        },
      });
      const page = await context.newPage();

      await installMarketingStyles(page);
      await flow.run(page);

      const video = page.video();
      await context.close();

      if (video) {
        const generatedPath = await video.path();
        const finalPath = path.join(videoDir, `${flow.id}.webm`);
        if (fs.existsSync(finalPath)) fs.rmSync(finalPath);
        fs.renameSync(generatedPath, finalPath);
      }
    }
  }
});
