import { type Page } from '@playwright/test';
import { highlightFirstVisible, moveMarketingCursor, openMarketingPage } from '../helpers';

export async function runVendorsFlow(page: Page) {
  await openMarketingPage(page, '/fornecedores');
  await highlightFirstVisible(page, [
    page.getByText(/fornecedor/i),
    page.getByText(/contrato/i),
    page.getByText(/serviço|servico/i),
  ]);
  await moveMarketingCursor(page, 820, 500);
  await page.waitForTimeout(650);
  await moveMarketingCursor(page, 440, 760);
  await page.waitForTimeout(650);
}
