import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { freshProfile, launchDesktop, closeDesktop } from './desktop-harness.mjs';

export function seedReports(profile) {
  const directory = join(profile, 'store/research/reports');
  mkdirSync(directory, { recursive: true });
  const now = Date.now();
  const report = {
    id: 'prepared-old-report', symbol: 'NVDA.US', generatedAt: now - 86_400_000,
    summary: '示例研究报告 A：用于离线桌面验收的准备数据，不是在线研究结果。',
    stance: 'neutral', confidence: 0.6, runStatus: 'partial', locale: 'zh-CN',
    sections: [{ key: 'valuation', title: '估值与假设', verdict: 'neutral', summary: '示例依据，部分数据尚不可用。', evidence: [{ capabilityId: 'company.valuation', runId: 'prepared-evidence', claim: '测试引用：估值取决于增长假设', fetchedAt: now - 90_000_000, summary: '明确标注的离线验收数据' }] }],
    bullCase: ['示例：需求延续'], bearCase: ['示例：增长放缓'], catalysts: ['示例：新财报'], risks: ['示例：证据不足'],
    capabilityRuns: [{ runId: 'prepared-evidence', capabilityId: 'company.valuation', status: 'success', fetchedAt: now - 90_000_000 }, { runId: 'missing-data', capabilityId: 'research.news', status: 'unavailable', error: 'Offline fixture: source unavailable' }],
  };
  const latest = { ...report, id: 'prepared-new-report', generatedAt: now, summary: '示例研究报告 B：较新的报告。' };
  for (const item of [report, latest]) writeFileSync(join(directory, `${item.id}.json`), JSON.stringify(item));
  writeFileSync(join(profile, 'store/research/index.json'), JSON.stringify({ reports: [latest, report].map(({ id, symbol, generatedAt, stance, confidence }) => ({ id, symbol, generatedAt, stance, confidence })) }));
  return report;
}

export async function runJournalIpc() {
  const profile = freshProfile('判断记录 IPC ');
  const old = seedReports(profile);
  let desktop = await launchDesktop(profile);
  try {
    const request = { requestId: 'ipc-create', reportId: old.id, judgment: { stance: 'neutral', rationale: '人工判断：保留旧报告的依据', assumptions: ['增长持续'], invalidationConditions: ['关键假设不再成立'] }, reviewAt: Date.now() - 1 };
    const response = await desktop.page.evaluate((input) => window.electronAPI.journal.createFromReport(input), request);
    assert.equal(response.ok, true, JSON.stringify(response));
    const entry = response.data;
    assert.equal(entry.reportSnapshot.id, old.id);
    assert.equal(entry.reportSnapshot.summary, old.summary);
    const repeated = await desktop.page.evaluate((input) => window.electronAPI.journal.createFromReport(input), request);
    assert.equal(repeated.data.id, entry.id);
    const invalid = await desktop.page.evaluate((input) => window.electronAPI.journal.createFromReport({ ...input, path: '../private' }), request);
    assert.equal(invalid.ok, false);
    assert.equal(invalid.error.code, 'INVALID_ARGUMENT');
    const summaries = await desktop.page.evaluate(() => window.electronAPI.journal.list({ status: 'pending' }));
    assert.equal(summaries.data.total, 1);
    assert.equal('reportSnapshot' in summaries.data.entries[0], false);
    console.log('PASS real four-channel bridge: older report snapshot, deduplication, input validation, summary list');
    await closeDesktop(desktop.application); desktop = null;
    for (const id of ['prepared-old-report', 'prepared-new-report']) unlinkSync(join(profile, 'store/research/reports', `${id}.json`));
    desktop = await launchDesktop(profile);
    const reopened = await desktop.page.evaluate((entryId) => window.electronAPI.journal.get({ entryId }), entry.id);
    assert.equal(reopened.data.reportSnapshot.summary, old.summary);
    const afterDeletion = await desktop.page.evaluate((input) => window.electronAPI.journal.createFromReport(input), request);
    assert.equal(afterDeletion.data.id, entry.id);
    const review = { entryId: entry.id, requestId: 'ipc-review', verdict: 'insufficient_data', observations: '重启后人工复盘，证据仍不足', lessons: '保留不确定性' };
    for (let index = 0; index < 2; index++) {
      const result = await desktop.page.evaluate((input) => window.electronAPI.journal.addReview(input), review);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.data.reviews.length, 1);
    }
    await desktop.page.evaluate(async (input) => Promise.all(Array.from({ length: 6 }, (_, i) => window.electronAPI.journal.addReview({ ...input, requestId: `ipc-concurrent-${i}` }))), review);
    const final = await desktop.page.evaluate((entryId) => window.electronAPI.journal.get({ entryId }), entry.id);
    assert.equal(final.data.reviews.length, 7);
    assert.deepEqual(final.data.judgment, request.judgment);
    console.log('PASS actual restart/report deletion, append-only review, duplicate retries and concurrent reviews');
  } finally { if (desktop) await closeDesktop(desktop.application); }
}
if (process.argv[1]?.endsWith('journal-ipc.mjs')) await runJournalIpc();
