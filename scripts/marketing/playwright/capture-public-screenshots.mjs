import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.MARKETING_BASE_URL || 'http://127.0.0.1:5173';
const outputDir = path.resolve(process.cwd(), 'marketing-output', 'public-screenshots');
const publicDir = path.resolve(process.cwd(), 'public', 'marketing', 'screenshots', 'public');

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const urlFor = (route) => new URL(route, baseURL).toString();

const waitReady = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByText(/carregando|salvando|processando/i).first().waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => undefined);
  await page.getByRole('button', { name: /recusar/i }).click({ timeout: 1_500 }).catch(() => undefined);
  await page.waitForTimeout(400);
};

const capture = async (page, id, route) => {
  await page.goto(urlFor(route), { waitUntil: 'domcontentloaded' });
  await waitReady(page);

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitReady(page);

    const fileName = `${id}-${viewport.name}.png`;
    const outputPath = path.join(outputDir, fileName);
    const publicPath = path.join(publicDir, fileName);

    ensureDir(path.dirname(outputPath));
    ensureDir(path.dirname(publicPath));

    await page.screenshot({ path: outputPath, fullPage: false, animations: 'disabled' });
    fs.copyFileSync(outputPath, publicPath);
    console.log(outputPath);
  }
};

const openPaymentAcceptanceStep = async (page) => {
  await page.goto(urlFor('/'), { waitUntil: 'domcontentloaded' });
  await waitReady(page);
  await page.evaluate(() => {
    sessionStorage.setItem('wedplan_checkout_state_v2', JSON.stringify({
      fullName: 'Mariana Demo',
      email: 'demo.publico@wedplan.com.br',
      phone: '(11) 99999-0000',
      partnerName: 'Mariana',
      weddingName: 'Mariana & Gabriel',
      weddingDate: '2027-05-15',
      weddingCity: 'Sao Paulo, SP',
      planCode: 'pro_couple',
      billingInterval: 'monthly',
      cpfCnpj: '',
      paymentMethod: 'credit_card',
      acceptedTerms: false,
      acceptedPrivacy: false,
      paymentUrl: null,
      checkoutSessionId: null,
      successPlan: null,
      successValue: null,
    }));
  });
  await page.goto(urlFor('/checkout/pagamento'), { waitUntil: 'domcontentloaded' });
  await waitReady(page);
};

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await capture(page, 'landing', '/');
  await capture(page, 'free-tools', '/ferramentas');
  await capture(page, 'terms', '/termos-de-uso');
  await capture(page, 'privacy', '/politica-de-privacidade');
  await capture(page, 'checkout-personal', '/checkout/dados-pessoais');

  await openPaymentAcceptanceStep(page);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitReady(page);
    if (viewport.name === 'mobile') {
      await page.getByText(/Li e aceito os Termos de Uso/i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    const fileName = `checkout-payment-acceptance-${viewport.name}.png`;
    const outputPath = path.join(outputDir, fileName);
    const publicPath = path.join(publicDir, fileName);

    ensureDir(path.dirname(outputPath));
    ensureDir(path.dirname(publicPath));

    await page.screenshot({ path: outputPath, fullPage: false, animations: 'disabled' });
    fs.copyFileSync(outputPath, publicPath);
    console.log(outputPath);
  }

  await browser.close();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
