import { randomUUID } from 'node:crypto';
import { JOURNAL_LIMITS, judgmentIsPending, type JudgmentEntry, type JudgmentPage, type ResearchReport } from '@finagent/core';
import { createCodeError } from '../agent/errors.ts';
import { JournalRepository } from './repository.ts';
import { addReviewSchema, createJudgmentSchema, getJudgmentSchema, listJudgmentsSchema, reportSnapshotSchema, validateJournalInput } from './schema.ts';

interface JournalServiceOptions {
  repository: JournalRepository;
  getReport: (reportId: string) => Promise<ResearchReport | undefined>;
  now?: () => number;
}

function conflict(): never {
  throw createCodeError('IDEMPOTENCY_CONFLICT', '该请求编号已用于不同内容。请保留原输入重试，或明确提交一条新记录。');
}
function requestUsed(entries: JudgmentEntry[], requestId: string): boolean {
  return entries.some((entry) => entry.requestId === requestId || entry.reviews.some((review) => review.requestId === requestId));
}

export class JournalService {
  private readonly now: () => number;
  constructor(private readonly options: JournalServiceOptions) { this.now = options.now ?? Date.now; }

  async createFromReport(input: unknown): Promise<JudgmentEntry> {
    const request = validateJournalInput(createJudgmentSchema, input);
    return this.options.repository.mutate(async (entries) => {
      const existing = entries.find((entry) => entry.requestId === request.requestId);
      if (existing) {
        if (existing.reportId !== request.reportId || existing.reviewAt !== request.reviewAt || JSON.stringify(existing.judgment) !== JSON.stringify(request.judgment)) conflict();
        return { result: existing, changed: false };
      }
      if (requestUsed(entries, request.requestId)) conflict();
      const report = await this.options.getReport(request.reportId);
      if (!report) throw createCodeError('REPORT_NOT_FOUND', '所选研究报告不存在，请重新选择报告。');
      const parsed = reportSnapshotSchema.safeParse(report);
      if (!parsed.success || parsed.data.id !== request.reportId) throw createCodeError('REPORT_INVALID', '所选报告内容或身份无效，未保存判断记录。');
      const snapshot = parsed.data;
      if (Buffer.byteLength(JSON.stringify(snapshot), 'utf8') > JOURNAL_LIMITS.snapshotBytes) {
        throw createCodeError('SNAPSHOT_TOO_LARGE', '报告快照超过 512 KiB，未保存；证据未被截断。');
      }
      const entry: JudgmentEntry = {
        schemaVersion: 1, id: randomUUID(), requestId: request.requestId,
        reportId: snapshot.id, symbol: snapshot.symbol, createdAt: this.now(),
        reportSnapshot: snapshot, judgment: request.judgment,
        ...(request.reviewAt !== undefined ? { reviewAt: request.reviewAt } : {}), reviews: [],
      };
      entries.unshift(entry);
      return { result: entry, changed: true };
    });
  }

  async list(input: unknown = {}): Promise<JudgmentPage> {
    const request = validateJournalInput(listJudgmentsSchema, input);
    const now = this.now();
    const entries = (await this.options.repository.read()).filter((entry) =>
      (!request.symbol || entry.symbol === request.symbol) &&
      (request.status === 'all' || (request.status === 'pending' ? judgmentIsPending(entry, now) : entry.reviews.length > 0))
    ).sort((a, b) => b.createdAt - a.createdAt);
    return {
      total: entries.length, offset: request.offset, limit: request.limit,
      entries: entries.slice(request.offset, request.offset + request.limit).map((entry) => ({
        id: entry.id, reportId: entry.reportId, symbol: entry.symbol,
        createdAt: entry.createdAt, reportGeneratedAt: entry.reportSnapshot.generatedAt,
        stance: entry.judgment.stance, rationale: entry.judgment.rationale,
        reviewAt: entry.reviewAt, reviewCount: entry.reviews.length,
        lastReviewedAt: entry.reviews.at(-1)?.createdAt, pending: judgmentIsPending(entry, now),
      })),
    };
  }

  async get(input: unknown): Promise<JudgmentEntry> {
    const request = validateJournalInput(getJudgmentSchema, input);
    const entry = (await this.options.repository.read()).find((entry) => entry.id === request.entryId);
    if (!entry) throw createCodeError('JOURNAL_NOT_FOUND', '判断记录不存在。');
    return entry;
  }

  async addReview(input: unknown): Promise<JudgmentEntry> {
    const request = validateJournalInput(addReviewSchema, input);
    return this.options.repository.mutate(async (entries) => {
      const entry = entries.find((item) => item.id === request.entryId);
      if (!entry) throw createCodeError('JOURNAL_NOT_FOUND', '判断记录不存在。');
      const existing = entry.reviews.find((review) => review.requestId === request.requestId);
      if (existing) {
        if (existing.verdict !== request.verdict || existing.observations !== request.observations || existing.lessons !== request.lessons) conflict();
        return { result: entry, changed: false };
      }
      if (requestUsed(entries, request.requestId)) conflict();
      entry.reviews.push({
        id: randomUUID(), requestId: request.requestId, createdAt: this.now(),
        verdict: request.verdict, observations: request.observations, lessons: request.lessons,
      });
      return { result: entry, changed: true };
    });
  }
}
