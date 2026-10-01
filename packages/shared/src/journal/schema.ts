import { z } from 'zod';
import { JOURNAL_LIMITS, type ResearchReport, type JudgmentEntry } from '@finagent/core';
import { createCodeError } from '../agent/errors.ts';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const timestamp = z.number().finite().int().min(0).max(8_640_000_000_000_000);
const stance = z.enum(['bullish', 'neutral', 'bearish']);
const text = (max: number) => z.string().trim().min(1).max(max);
const judgment = z.object({
  stance,
  rationale: text(JOURNAL_LIMITS.rationale),
  assumptions: z.array(text(JOURNAL_LIMITS.point)).max(JOURNAL_LIMITS.points),
  invalidationConditions: z.array(text(JOURNAL_LIMITS.point)).min(1).max(JOURNAL_LIMITS.points),
}).strict();
const verdict = z.enum(['still_valid', 'weakened', 'invalidated', 'insufficient_data']);

export const createJudgmentSchema = z.object({
  requestId: id,
  reportId: id,
  judgment,
  reviewAt: timestamp.optional(),
}).strict();
export const addReviewSchema = z.object({
  entryId: id,
  requestId: id,
  verdict,
  observations: text(JOURNAL_LIMITS.observations),
  lessons: z.string().trim().max(JOURNAL_LIMITS.lessons),
}).strict();
export const getJudgmentSchema = z.object({ entryId: id }).strict();
export const listJudgmentsSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$/).optional(),
  status: z.enum(['all', 'pending', 'reviewed']).default('all'),
  offset: z.number().int().min(0).max(1_000_000).default(0),
  limit: z.number().int().min(1).max(100).default(30),
}).strict();

// A whitelist of the existing typed report, without provider payloads,
// credentials or agent context. Unknown fields are deliberately not copied.
export const reportSnapshotSchema: z.ZodType<ResearchReport> = z.object({
  id,
  symbol: z.string().regex(/^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$/),
  instrumentId: z.string().optional(),
  generatedAt: timestamp,
  strategyId: z.string().optional(),
  locale: z.enum(['zh-CN', 'en-US']).optional(),
  summary: z.string(),
  stance,
  confidence: z.number().finite().min(0).max(1),
  sections: z.array(z.object({
    key: z.string(), title: z.string(),
    verdict: z.enum(['positive', 'negative', 'neutral', 'unavailable']),
    summary: z.string(),
    evidence: z.array(z.object({
      capabilityId: z.string(), runId: z.string(), claim: z.string(),
      fetchedAt: timestamp, summary: z.string().optional(), instrumentId: z.string().optional(),
    })),
  })),
  bullCase: z.array(z.string()), bearCase: z.array(z.string()),
  catalysts: z.array(z.string()), risks: z.array(z.string()),
  capabilityRuns: z.array(z.object({
    runId: z.string(), capabilityId: z.string(),
    status: z.enum(['success', 'failed', 'unavailable', 'cancelled']),
    fetchedAt: timestamp.optional(), marketTime: timestamp.optional(), error: z.string().optional(),
  })),
  runStatus: z.enum(['queued', 'interrupted', 'recovering', 'fetching', 'synthesizing', 'completed', 'partial', 'failed', 'cancelled']),
});
const reviewSchema = z.object({
  id, requestId: id, createdAt: timestamp, verdict,
  observations: text(JOURNAL_LIMITS.observations),
  lessons: z.string().trim().max(JOURNAL_LIMITS.lessons),
}).strict();
const entrySchema: z.ZodType<JudgmentEntry> = z.object({
  schemaVersion: z.literal(1), id, requestId: id, reportId: id,
  symbol: z.string(), createdAt: timestamp, reportSnapshot: reportSnapshotSchema,
  judgment, reviewAt: timestamp.optional(), reviews: z.array(reviewSchema),
}).strict().superRefine((entry, ctx) => {
  if (entry.reportId !== entry.reportSnapshot.id || entry.symbol !== entry.reportSnapshot.symbol) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Snapshot identity mismatch' });
  }
});
export const journalFileSchema = z.object({ schemaVersion: z.literal(1), entries: z.array(entrySchema) }).strict()
  .superRefine((file, ctx) => {
    const entryIds = new Set<string>();
    const reviewIds = new Set<string>();
    const requestIds = new Set<string>();
    for (const entry of file.entries) {
      if (entryIds.has(entry.id) || requestIds.has(entry.requestId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate journal identity' });
      entryIds.add(entry.id); requestIds.add(entry.requestId);
      for (const review of entry.reviews) {
        if (reviewIds.has(review.id) || requestIds.has(review.requestId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate review identity' });
        reviewIds.add(review.id); requestIds.add(review.requestId);
      }
    }
  });

export function validateJournalInput<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw createCodeError('INVALID_ARGUMENT', '判断记录输入无效。请检查必填内容、文本长度、日期和条目数量。');
  return result.data;
}
