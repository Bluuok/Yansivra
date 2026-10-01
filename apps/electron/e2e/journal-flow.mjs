import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { freshProfile, launchDesktop, closeDesktop, captureDesktop } from './desktop-harness.mjs';
import { seedReports } from './journal-ipc.mjs';

// A Windows read-sharing handle allows reads but blocks atomic replacement.
// This exercises a real write failure without replacing the IPC or repository.
async function lockJournal(file) {
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "$handle = [IO.File]::Open($env:FOLIO_TEST_LOCK_FILE, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read); [Console]::WriteLine('LOCKED'); [Console]::ReadLine() | Out-Null; $handle.Dispose()"],
    { windowsHide: true, env: { ...process.env, FOLIO_TEST_LOCK_FILE: file }, stdio: ['pipe', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    child.stdout.once('data', (data) => String(data).includes('LOCKED') ? resolve() : reject(new Error(String(data))));
    child.once('error', reject); child.once('exit', (code) => { if (code) reject(new Error(`Lock helper exited ${code}`)); });
  });
  return async () => { const exited = once(child, 'exit'); child.stdin.end('\n'); await exited; };
}

const profile = freshProfile('判断界面闭环 ');
const old = seedReports(profile);
let desktop = await launchDesktop(profile);
let unlock;
try {
  let { page, application } = desktop;
  const nav = page.locator('[data-testid="sidebar"]');
  await page.locator('[data-testid="today-continue-research"] li').filter({ hasText: old.summary }).getByRole('button').click();
  await page.locator('[data-testid="research-report-select"]').selectOption('prepared-new-report');
  await page.locator('[data-testid="research-report-select"]').selectOption(old.id);
  assert.ok((await page.locator('[data-testid="research-report"]').innerText()).includes(old.summary));
  const thesis = await page.evaluate((reportId) => window.electronAPI.thesis.saveFromReport({ reportId }), old.id);
  assert.equal(thesis.ok, true, JSON.stringify(thesis));
  assert.equal(thesis.data.summary, old.summary, 'legacy thesis action binds to the selected old report');
  await page.locator('[data-testid="inspect-evidence"]').first().click();
  const inspector = page.locator('[data-testid="evidence-inspector"]');
  await inspector.waitFor();
  assert.ok((await inspector.innerText()).includes('测试引用：估值取决于增长假设'));
  assert.ok((await inspector.innerText()).includes('不可用'));
  await inspector.getByRole('button', { name: '关闭检视栏', exact: true }).click();
  await captureDesktop(application, 'desktop-research.png');
  await page.locator('[data-testid="record-judgment"]').click();
  const rationale = '示例人工判断：保留报告 A；<img src=x onerror="window.__unsafe=1">';
  await page.locator('[data-testid="judgment-rationale"]').fill(rationale);
  await page.locator('[data-testid="judgment-condition-0"]').fill('关键增长假设失效');
  await page.locator('[data-testid="judgment-date"]').fill('2026-01-01');
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await page.locator('[data-testid="judgment-discard-confirm"]').getByRole('button', { name: '继续填写' }).click();
  assert.equal(await page.locator('[data-testid="judgment-rationale"]').inputValue(), rationale);
  await page.locator('[data-testid="judgment-save"]').click();
  await page.locator('[data-testid="journal-view"]').waitFor();
  await page.locator('[data-testid="judgment-original-rationale"]').waitFor();
  assert.equal(await page.locator('[data-testid="judgment-original-rationale"]').innerText(), rationale);
  assert.equal(await page.evaluate(() => window.__unsafe), undefined);
  const saved = await page.evaluate(() => window.electronAPI.journal.list({}));
  assert.equal(saved.data.total, 1);
  const entryId = saved.data.entries[0].id;
  const original = await page.evaluate((entryId) => window.electronAPI.journal.get({ entryId }), entryId);
  assert.equal(original.data.reportSnapshot.id, old.id);
  await page.locator('[data-testid="review-observations"]').fill('示例复盘：新的证据仍不足');
  await nav.getByRole('button', { name: '总览', exact: true }).click();
  await page.locator('[data-testid="pending-review"]').click();
  assert.equal(await page.locator('[data-testid="review-observations"]').inputValue(), '示例复盘：新的证据仍不足');
  unlock = await lockJournal(join(profile, 'journal/entries.json'));
  await page.locator('[data-testid="review-save"]').click();
  await page.locator('[data-testid="review-form"] [role="alert"]').waitFor();
  assert.equal(await page.locator('[data-testid="review-observations"]').inputValue(), '示例复盘：新的证据仍不足');
  const unchanged = await page.evaluate((entryId) => window.electronAPI.journal.get({ entryId }), entryId);
  assert.equal(unchanged.data.reviews.length, 0);
  await unlock(); unlock = null;
  await page.locator('[data-testid="review-save"]').click();
  await page.locator('[data-testid="judgment-review"]').waitFor();
  assert.equal(await page.locator('[data-testid="judgment-review"]').count(), 1);
  assert.equal(await page.locator('[data-testid="judgment-original-rationale"]').innerText(), rationale);
  await page.locator('[data-testid="review-form"] [role="alert"]').waitFor({ state: 'hidden' });
  await page.locator('[data-testid="journal-view"]').evaluate((node) => { node.scrollTop = 0; });
  await captureDesktop(application, 'desktop-journal.png');
  console.log('PASS actual UI: report A selection, evidence/status, dirty-close confirmation, due review, draft retention, safe text, real Windows write failure and retry');
  await closeDesktop(application); desktop = null;
  for (const id of ['prepared-old-report', 'prepared-new-report']) unlinkSync(join(profile, 'store/research/reports', `${id}.json`));
  desktop = await launchDesktop(profile); ({ page } = desktop);
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: '复盘', exact: true }).click();
  await page.locator('[data-testid="judgment-original-rationale"]').waitFor();
  await page.locator('[data-testid="judgment-snapshot"] summary').click();
  assert.ok((await page.locator('[data-testid="judgment-snapshot"]').innerText()).includes(old.summary));
  assert.equal(await page.locator('[data-testid="judgment-review"]').count(), 1);
  await page.locator('[data-testid="review-observations"]').fill('关闭重开后继续人工复盘');
  await page.locator('[data-testid="review-save"]').click();
  await page.locator('[data-testid="judgment-review"]').nth(1).waitFor();
  console.log('PASS actual restart + deleted source reports: independent snapshot and append-only reviews remain usable without market/LLM');
} finally { if (unlock) await unlock(); if (desktop) await closeDesktop(desktop.application); }
