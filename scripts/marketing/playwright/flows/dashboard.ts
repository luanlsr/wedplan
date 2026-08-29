import { type Page } from '@playwright/test';
import { highlightFirstVisible, moveMarketingCursor, openMarketingPage } from '../helpers';

export async function runDashboardFlow(page: Page) {
  await openMarketingPage(page, '/');
  await highlightFirstVisible(page, [
    page.getByText(/orçamento|orcamento/i),
    page.getByText(/convidados/i),
    page.getByText(/tarefas/i),
  ]);
  await moveMarketingCursor(page, 870, 320);
  await page.waitForTimeout(700);
  await moveMarketingCursor(page, 520, 640);
  await page.waitForTimeout(700);
}
