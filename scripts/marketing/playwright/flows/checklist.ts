import { type Page } from '@playwright/test';
import { highlightFirstVisible, moveMarketingCursor, openMarketingPage } from '../helpers';

export async function runChecklistFlow(page: Page) {
  await openMarketingPage(page, '/tarefas');
  await highlightFirstVisible(page, [
    page.getByText(/conclu/i),
    page.getByText(/pendente/i),
    page.getByText(/em progresso/i),
  ]);
  await moveMarketingCursor(page, 830, 430);
  await page.waitForTimeout(650);
  await moveMarketingCursor(page, 520, 760);
  await page.waitForTimeout(650);
}
