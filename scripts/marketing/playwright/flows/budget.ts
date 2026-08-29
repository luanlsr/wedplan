import { type Page } from '@playwright/test';
import { highlightFirstVisible, moveMarketingCursor, openMarketingPage } from '../helpers';

export async function runBudgetFlow(page: Page) {
  await openMarketingPage(page, '/financeiro');
  await highlightFirstVisible(page, [
    page.getByText(/total contratado|contratado/i),
    page.getByText(/total pago|pago/i),
    page.getByText(/restante|saldo/i),
  ]);
  await moveMarketingCursor(page, 820, 460);
  await page.waitForTimeout(650);
  await moveMarketingCursor(page, 350, 760);
  await page.waitForTimeout(650);
}
