import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JOURNAL_LIMITS, type ResearchReport } from '@finagent/core';
import { JsonFileStore } from '../storage/json-file-store.ts';
import { JournalRepository, JOURNAL_FILE } from './repository.ts';
import { JournalService } from './service.ts';

const NOW = 1_790_841_600_000;
const reportA: ResearchReport = {
  id: 'report-A', symbol: 'NVDA.US', generatedAt: NOW - 100_000,
  summary: 'Older report A', stance: 'bullish', confidence: 0.6,
  sections: [{ key: 'valuation', title: '估值', verdict: 'neutral', summary: 'Existing evidence', evidence: [
    { capabilityId: 'company.valuation', runId: 'run-A', claim: 'Valuation observation', fetchedAt: NOW - 120_000, summary: 'Collected earlier' },
  ] }],
  bullCase: ['Support A'], bearCase: ['Against A'], catalysts: ['Catalyst A'], risks: ['Risk A'],
  capabilityRuns: [{ runId: 'run-A', capabilityId: 'company.valuation', status: 'success', fetchedAt: NOW - 120_000 }],
  runStatus: 'partial', locale: 'zh-CN', strategyId: 'balanced', instrumentId: 'nvda-listing',
};
const judgment = { stance: 'neutral' as const, rationale: 'My own reasoning', assumptions: ['Assumption A'], invalidationConditions: ['Condition A'] };
const createInput = (requestId = 'create-A') => ({ requestId, reportId: reportA.id, judgment, reviewAt: NOW });
const reviewInput = (entryId: string, requestId = 'review-A') => ({ entryId, requestId, verdict: 'insufficient_data' as const, observations: 'Need more evidence', lessons: 'Do not infer certainty' });

let root: string;
let reports: Map<string, ResearchReport>;
let loads: number;
const makeService = (store = new JsonFileStore(root)) => new JournalService({
  repository: new JournalRepository(store), now: () => NOW,
  getReport: async (id) => { loads++; return reports.get(id); },
});
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'yansivra-journal-'));
  reports = new Map([[reportA.id, structuredClone(reportA)], ['report-B', { ...structuredClone(reportA), id: 'report-B', summary: 'Latest B', generatedAt: NOW }]]);
  loads = 0;
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

describe('JournalService persistence and history', () => {
  it('archives the explicitly selected older report, not the latest symbol report', async () => {
    const saved = await makeService().createFromReport(createInput());
    expect(saved.reportId).toBe('report-A');
    expect(saved.reportSnapshot).toEqual(reportA);
    expect(saved.createdAt).toBe(NOW);
    expect(saved.symbol).toBe(reportA.symbol);
    expect(saved.judgment).toEqual(judgment);
  });
  it('retains an independent snapshot after report mutation, deletion and reopening', async () => {
    const saved = await makeService().createFromReport(createInput());
    reports.get(reportA.id)!.summary = 'Changed source';
    reports.clear();
    saved.reportSnapshot.summary = 'Mutated caller object';
    const reopened = await makeService().get({ entryId: saved.id });
    expect(reopened.reportSnapshot).toEqual(reportA);
  });
  it('appends reviews without changing the original judgment or report and without a report loader', async () => {
    const service = makeService();
    const original = await service.createFromReport(createInput());
    reports.clear();
    const updated = await service.addReview(reviewInput(original.id));
    expect(updated.judgment).toEqual(original.judgment);
    expect(updated.reportSnapshot).toEqual(original.reportSnapshot);
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.reviews).toHaveLength(1);
    expect(updated.reviews[0].verdict).toBe('insufficient_data');
    expect(loads).toBe(1);
    expect((await makeService().get({ entryId: original.id })).reviews).toEqual(updated.reviews);
  });
  it('derives due/reviewed state and returns paginated summaries without report payloads', async () => {
    const service = makeService();
    const due = await service.createFromReport(createInput('due'));
    await service.createFromReport({ ...createInput('no-date'), reviewAt: undefined });
    await service.createFromReport({ ...createInput('future'), reviewAt: NOW + 1 });
    expect((await service.list({ status: 'pending' })).entries.map((entry) => entry.id)).toEqual([due.id]);
    const page = await service.list({ limit: 1, offset: 1, symbol: 'NVDA.US' });
    expect(page.total).toBe(3); expect(page.entries).toHaveLength(1);
    expect('reportSnapshot' in page.entries[0]).toBe(false);
    await service.addReview(reviewInput(due.id));
    expect((await service.list({ status: 'pending' })).total).toBe(0);
    expect((await service.list({ status: 'reviewed' })).entries[0].reviewCount).toBe(1);
    expect((await service.list({ symbol: 'AAPL.US' })).total).toBe(0);
  });
});

describe('JournalService idempotency and concurrency', () => {
  it('deduplicates simultaneous creates and retries even after the report was deleted', async () => {
    const service = makeService();
    const results = await Promise.all(Array.from({ length: 8 }, () => service.createFromReport(createInput())));
    expect(new Set(results.map((entry) => entry.id)).size).toBe(1);
    expect((await service.list()).total).toBe(1);
    reports.clear();
    expect((await service.createFromReport(createInput())).id).toBe(results[0].id);
    expect(loads).toBe(1);
  });
  it('rejects altered create content under the same request id', async () => {
    const service = makeService();
    await service.createFromReport(createInput());
    for (const altered of [
      { ...createInput(), reportId: 'report-B' },
      { ...createInput(), reviewAt: NOW + 1 },
      { ...createInput(), judgment: { ...judgment, rationale: 'Changed reasoning' } },
    ]) await expect(service.createFromReport(altered)).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect((await service.list()).total).toBe(1);
  });
  it('deduplicates repeated reviews and rejects an altered review', async () => {
    const service = makeService(); const entry = await service.createFromReport(createInput());
    await Promise.all(Array.from({ length: 8 }, () => service.addReview(reviewInput(entry.id))));
    expect((await service.get({ entryId: entry.id })).reviews).toHaveLength(1);
    await expect(service.addReview({ ...reviewInput(entry.id), verdict: 'invalidated' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(service.addReview({ ...reviewInput(entry.id), observations: 'Changed' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
  it('serializes the entire read/modify/write across repository instances without dropping reviews', async () => {
    const service = makeService(); const entry = await service.createFromReport(createInput());
    const other = makeService(new JsonFileStore(join(root, '.')));
    await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? service : other).addReview(reviewInput(entry.id, `parallel-${index}`))));
    const reviews = (await makeService().get({ entryId: entry.id })).reviews;
    expect(reviews).toHaveLength(20);
    expect(new Set(reviews.map((review) => review.requestId)).size).toBe(20);
  });
  it('rejects request-id reuse across entries and operation kinds', async () => {
    const service = makeService(); const a = await service.createFromReport(createInput());
    const b = await service.createFromReport(createInput('create-B'));
    await service.addReview(reviewInput(a.id));
    await expect(service.addReview(reviewInput(b.id))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(service.addReview(reviewInput(a.id, 'create-A'))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(service.createFromReport(createInput('review-A'))).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
});

describe('JournalService input and storage boundaries', () => {
  it('rejects renderer-owned paths, identities, invalid enums and invalid text', async () => {
    const service = makeService();
    for (const input of [
      { ...createInput(), reportId: '../private' }, { ...createInput(), createdAt: NOW },
      { ...createInput(), symbol: 'AAPL.US' }, { ...createInput(), path: root },
      { ...createInput(), judgment: { ...judgment, stance: 'buy' } },
      { ...createInput(), judgment: { ...judgment, rationale: '   ' } },
      { ...createInput(), judgment: { ...judgment, rationale: 'x'.repeat(JOURNAL_LIMITS.rationale + 1) } },
      { ...createInput(), judgment: { ...judgment, invalidationConditions: [] } },
      { ...createInput(), judgment: { ...judgment, assumptions: ['a', 'b', 'c', 'd'] } },
      { ...createInput(), judgment: { ...judgment, invalidationConditions: ['x'.repeat(501)] } },
      { ...createInput(), reviewAt: NaN }, { ...createInput(), reviewAt: Infinity },
    ]) await expect(service.createFromReport(input)).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(loads).toBe(0);
    await expect(service.list({ status: 'unknown' })).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(service.list({ limit: 1000 })).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    await expect(service.get({ entryId: '../escape' })).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
  });
  it('rejects invalid review input before writing', async () => {
    const service = makeService(); const entry = await service.createFromReport(createInput());
    for (const input of [
      { ...reviewInput(entry.id), verdict: 'right' }, { ...reviewInput(entry.id), observations: ' ' },
      { ...reviewInput(entry.id), observations: 'x'.repeat(4001) }, { ...reviewInput(entry.id), lessons: 'x'.repeat(2001) },
      { ...reviewInput(entry.id), createdAt: NOW },
    ]) await expect(service.addReview(input)).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect((await service.get({ entryId: entry.id })).reviews).toHaveLength(0);
  });
  it('reports missing or mismatched sources and entries explicitly', async () => {
    const service = makeService();
    await expect(service.createFromReport({ ...createInput(), reportId: 'missing' })).rejects.toMatchObject({ code: 'REPORT_NOT_FOUND' });
    reports.set(reportA.id, { ...reportA, id: 'different' });
    await expect(service.createFromReport(createInput())).rejects.toMatchObject({ code: 'REPORT_INVALID' });
    await expect(service.get({ entryId: 'missing' })).rejects.toMatchObject({ code: 'JOURNAL_NOT_FOUND' });
    await expect(service.addReview(reviewInput('missing'))).rejects.toMatchObject({ code: 'JOURNAL_NOT_FOUND' });
  });
  it('copies only the typed report and preserves user text as text', async () => {
    reports.set(reportA.id, Object.assign(structuredClone(reportA), { secret: 'FAKE_DO_NOT_COPY', agentContext: { debug: 'private' } }));
    const entry = await makeService().createFromReport({ ...createInput(), judgment: { ...judgment, rationale: '<script>fake()</script>' } });
    expect(JSON.stringify(entry.reportSnapshot)).not.toContain('FAKE_DO_NOT_COPY');
    expect('agentContext' in entry.reportSnapshot).toBe(false);
    expect(entry.judgment.rationale).toBe('<script>fake()</script>');
  });
  it('rejects an oversized UTF-8 snapshot rather than truncating its evidence', async () => {
    reports.set(reportA.id, { ...reportA, summary: '文'.repeat(JOURNAL_LIMITS.snapshotBytes / 2) });
    await expect(makeService().createFromReport(createInput())).rejects.toMatchObject({ code: 'SNAPSHOT_TOO_LARGE' });
    expect((await makeService().list()).total).toBe(0);
  });
  it('does not overwrite syntactically corrupt or unsupported persisted files', async () => {
    const store = new JsonFileStore(root);
    await makeService(store).createFromReport(createInput());
    for (const damaged of ['{broken', JSON.stringify({ schemaVersion: 2, entries: [] }), JSON.stringify({ schemaVersion: 1, entries: [{}] })]) {
      await writeFile(store.resolve(JOURNAL_FILE), damaged);
      await expect(makeService(store).createFromReport(createInput('new-request'))).rejects.toBeDefined();
      expect(await readFile(store.resolve(JOURNAL_FILE), 'utf8')).toBe(damaged);
    }
  });
  it('does not report success or clear the last good file on write failure, and recovers its queue', async () => {
    class FailingStore extends JsonFileStore {
      fail = false;
      override async write(file: string, data: unknown) {
        if (this.fail) throw Object.assign(new Error('Simulated disk failure'), { code: 'STORAGE_WRITE_FAILED' });
        return super.write(file, data);
      }
    }
    const store = new FailingStore(root); const service = makeService(store);
    const entry = await service.createFromReport(createInput());
    const good = await readFile(store.resolve(JOURNAL_FILE), 'utf8');
    store.fail = true;
    await expect(service.addReview(reviewInput(entry.id))).rejects.toMatchObject({ code: 'STORAGE_WRITE_FAILED' });
    expect(await readFile(store.resolve(JOURNAL_FILE), 'utf8')).toBe(good);
    store.fail = false;
    expect((await service.addReview(reviewInput(entry.id))).reviews).toHaveLength(1);
  });
});
