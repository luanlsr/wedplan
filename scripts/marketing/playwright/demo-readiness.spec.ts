import { test, expect } from '@playwright/test';
import { getDemoAccounts, storageStatePath } from './data/demo-data';
import { openMarketingPage } from './helpers';

test.describe.configure({ mode: 'serial' });

test('contas demo configuradas acessam o painel', async ({ browser }) => {
  for (const account of getDemoAccounts()) {
    const context = await browser.newContext({
      storageState: storageStatePath(account.code),
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    await openMarketingPage(page, '/');
    await expect(page.getByText(/dashboard|orçamento|convidados|tarefas/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /acessar painel/i })).toHaveCount(0);

    await context.close();
  }
});
