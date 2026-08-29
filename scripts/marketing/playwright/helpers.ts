import fs from 'node:fs';
import path from 'node:path';
import { type Locator, type Page } from '@playwright/test';
import {
  marketingOutputDir,
  publicMarketingScreenshotsDir,
  type MarketingAccount,
  type MarketingRoute,
  type MarketingViewport,
} from './data/demo-data';

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function screenshotPath(account: MarketingAccount, route: MarketingRoute, viewport: MarketingViewport) {
  return path.join(marketingOutputDir, 'screenshots', account.code, `${route.id}-${viewport.name}.png`);
}

export function publicScreenshotPath(account: MarketingAccount, route: MarketingRoute, viewport: MarketingViewport) {
  return path.join(publicMarketingScreenshotsDir, account.code, `${route.id}-${viewport.name}.png`);
}

export async function installMarketingStyles(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0ms !important;
        caret-color: transparent !important;
      }

      [data-marketing-hide],
      [aria-live="polite"],
      [role="status"] {
        visibility: hidden !important;
      }

      #wedplan-marketing-cursor {
        position: fixed;
        left: 0;
        top: 0;
        width: 26px;
        height: 26px;
        border-radius: 999px;
        border: 2px solid rgba(236, 72, 153, 0.92);
        background: rgba(255, 255, 255, 0.84);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-80px, -80px);
      }

      #wedplan-marketing-cursor::after {
        content: "";
        position: absolute;
        left: 7px;
        top: 7px;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(236, 72, 153, 0.96);
      }

      #wedplan-marketing-cursor.is-clicking {
        width: 38px;
        height: 38px;
        margin-left: -6px;
        margin-top: -6px;
        background: rgba(236, 72, 153, 0.16);
      }

      .wedplan-marketing-focus {
        outline: 3px solid rgba(236, 72, 153, 0.75) !important;
        outline-offset: 5px !important;
        box-shadow: 0 0 0 8px rgba(236, 72, 153, 0.12) !important;
      }
    `,
  });

  await page.evaluate(() => {
    if (!document.getElementById('wedplan-marketing-cursor')) {
      const cursor = document.createElement('div');
      cursor.id = 'wedplan-marketing-cursor';
      document.body.appendChild(cursor);
    }
  });
}

export async function waitForWedPlanReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.getByText(/carregando|salvando|processando/i).first().waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

export async function openMarketingPage(page: Page, routePath: string) {
  await page.goto(routePath, { waitUntil: 'domcontentloaded' });
  await waitForWedPlanReady(page);
  await installMarketingStyles(page);
}

export async function captureMarketingScreenshot(page: Page, account: MarketingAccount, route: MarketingRoute, viewport: MarketingViewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await openMarketingPage(page, route.path);

  const outputPath = screenshotPath(account, route, viewport);
  const publicPath = publicScreenshotPath(account, route, viewport);

  ensureDir(path.dirname(outputPath));
  ensureDir(path.dirname(publicPath));

  await page.screenshot({
    path: outputPath,
    fullPage: false,
    animations: 'disabled',
  });

  fs.copyFileSync(outputPath, publicPath);
}

export async function moveMarketingCursor(page: Page, x: number, y: number, steps = 24) {
  await page.mouse.move(x, y, { steps });
  await page.evaluate(
    ({ cursorX, cursorY }) => {
      document.getElementById('wedplan-marketing-cursor')?.style.setProperty('transform', `translate(${cursorX}px, ${cursorY}px)`);
    },
    { cursorX: x, cursorY: y }
  );
}

export async function clickWithMarketingCursor(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) return false;

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveMarketingCursor(page, x, y);
  await page.evaluate(() => document.getElementById('wedplan-marketing-cursor')?.classList.add('is-clicking'));
  await page.mouse.click(x, y);
  await page.waitForTimeout(220);
  await page.evaluate(() => document.getElementById('wedplan-marketing-cursor')?.classList.remove('is-clicking'));
  return true;
}

export async function highlightFirstVisible(page: Page, locators: Locator[]) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    const first = locator.first();
    const visible = await first.isVisible().catch(() => false);
    if (!visible) continue;

    await first.evaluate((element) => element.classList.add('wedplan-marketing-focus'));
    await first.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(650);
    await first.evaluate((element) => element.classList.remove('wedplan-marketing-focus')).catch(() => undefined);
    return true;
  }

  return false;
}
