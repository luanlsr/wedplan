import { type Page } from '@playwright/test';
import { highlightFirstVisible, moveMarketingCursor, openMarketingPage } from '../helpers';

export async function runGuestsFlow(page: Page) {
  await openMarketingPage(page, '/convidados');
  await highlightFirstVisible(page, [
    page.getByText(/confirmados/i),
    page.getByText(/pendentes/i),
    page.getByText(/convidados totais|total/i),
  ]);
  await moveMarketingCursor(page, 760, 520);
  await page.waitForTimeout(650);
  await moveMarketingCursor(page, 390, 780);
  await page.waitForTimeout(650);
}
