import assert from 'node:assert/strict';
import { freshProfile, launchDesktop, closeDesktop, captureDesktop } from './desktop-harness.mjs';
import { seedReports } from './journal-ipc.mjs';

// Screenshots use labeled fixtures through real main-process storage and IPC.
const profile = freshProfile('产品截图 示例 ');
const report = seedReports(profile);
const { application, page } = await launchDesktop(profile);
try {
  const result = await page.evaluate((reportId) => window.electronAPI.journal.createFromReport({
    requestId: 'showcase-judgment', reportId,
    judgment: { stance: 'neutral', rationale: '示例判断：先核对增长假设，再考虑当前估值是否合理。现有证据不足以形成明确方向。', assumptions: ['收入增长可以延续', '利润率维持稳定'], invalidationConditions: ['新财报显示增长或利润率低于假设'] },
    reviewAt: Date.now() - 86_400_000,
  }), report.id);
  assert.equal(result.ok, true, JSON.stringify(result));
  await page.reload();
  await page.locator('[data-testid="pending-review"]').waitFor();
  await page.locator('[data-testid="today-continue-research"] li').filter({ hasText: report.summary }).waitFor();
  await captureDesktop(application, 'desktop-overview.png');
  await page.locator('[data-testid="today-continue-research"] li').filter({ hasText: report.summary }).getByRole('button').click();
  await page.locator('[data-testid="record-judgment"]').waitFor();
  await page.locator('[data-testid="inspect-evidence"]').first().click();
  await page.locator('[data-testid="evidence-inspector"]').waitFor();
  await page.locator('.folio-pilot-research-content').evaluate((node) => { node.scrollTop = 130; });
  await captureDesktop(application, 'desktop-research.png');
  await page.locator('[data-testid="evidence-inspector"]').getByRole('button', { name: '关闭检视栏', exact: true }).click();
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: '复盘', exact: true }).click();
  await page.locator('[data-testid="judgment-original-rationale"]').waitFor();
  await page.locator('[data-testid="review-observations"]').fill('示例复盘：目前仍缺少新的财报依据，先保留不确定性。');
  await page.locator('[data-testid="review-save"]').click();
  await page.locator('[data-testid="judgment-review"]').waitFor();
  await page.locator('[data-testid="journal-view"]').evaluate((node) => { node.scrollTop = 0; });
  await captureDesktop(application, 'desktop-journal.png');
  console.log('PASS labeled fixture screenshots captured from actual Electron IPC and UI');
} finally { await closeDesktop(application); }
