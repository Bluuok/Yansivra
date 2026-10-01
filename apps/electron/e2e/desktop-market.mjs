import assert from 'node:assert/strict';
import { freshProfile, launchDesktop, closeDesktop } from './desktop-harness.mjs';

const { application, page } = await launchDesktop(freshProfile('证券入口 回归 '));
try {
  const nav = page.locator('[data-testid="sidebar"]');
  await nav.getByRole('button', { name: '自选', exact: true }).first().click();
  await nav.getByRole('button', { name: 'NVDA.US', exact: true }).click();
  await page.getByRole('button', { name: 'K 线', exact: true }).click();
  await page.getByRole('button', { name: '1d', exact: true }).waitFor();
  const weekly = page.getByRole('button', { name: '1w', exact: true });
  await weekly.click();
  assert.equal(await weekly.getAttribute('aria-pressed'), 'true');
  const quote = await page.evaluate(() => window.electronAPI.market.getKline({ symbol: 'NVDA.US', period: '1w', limit: 100 }));
  assert.equal(typeof quote.ok, 'boolean', 'real market IPC returns the existing result contract');
  if (!quote.ok) {
    await page.getByRole('button', { name: '重试', exact: true }).waitFor();
    console.log(`PASS watchlist selection and chart period controls; unavailable K-line retains retry (${quote.error.code})`);
  } else {
    console.log('PASS watchlist selection, chart period controls and real K-line IPC response');
  }
} finally { await closeDesktop(application); }
