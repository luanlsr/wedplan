import fs from 'node:fs';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { authStateDir, getBaseUrl, getDemoAccounts, storageStatePath } from './data/demo-data';

function resolveUrl(baseUrl: string, route: string) {
  return new URL(route, baseUrl).toString();
}

async function loginDemoAccount(baseUrl: string, email: string, password: string, outputPath: string) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(resolveUrl(baseUrl, '/login'), { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/exemplo@email.com/i).fill(email);
  await page.getByPlaceholder(/senha|••••/i).fill(password);
  await page.getByRole('button', { name: /acessar painel/i }).click();

  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 35_000 }),
    page.getByText(/e-mail ou senha incorretos|credenciais|inválid/i).waitFor({ state: 'visible', timeout: 35_000 }).then(() => {
      throw new Error(`Falha ao autenticar a conta demo ${email}. Confira e-mail/senha e se a conta esta ativa.`);
    }),
  ]);

  await page.waitForLoadState('networkidle').catch(() => undefined);
  await context.storageState({ path: outputPath });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use?.baseURL?.toString() || getBaseUrl();
  const accounts = getDemoAccounts();

  fs.mkdirSync(authStateDir, { recursive: true });

  for (const account of accounts) {
    const statePath = storageStatePath(account.code);
    const shouldReuse = fs.existsSync(statePath) && process.env.MARKETING_FORCE_LOGIN !== 'true';

    if (shouldReuse) continue;

    await loginDemoAccount(baseUrl, account.email, account.password, path.resolve(statePath));
  }
}
