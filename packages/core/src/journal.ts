import type { ResearchReport, ResearchStance } from './research.ts';

export const JOURNAL_LIMITS = {
  rationale: 4000,
  point: 500,
  points: 3,
  observations: 4000,
  lessons: 2000,
  snapshotBytes: 512 * 1024,
} as const;

export type JudgmentVerdict = 'still_valid' | 'weakened' | 'invalidated' | 'insufficient_data';
export type JudgmentStatus = 'all' | 'pending' | 'reviewed';
export interface PersonalJudgment {
  stance: ResearchStance;
  rationale: string;
  assumptions: string[];
  invalidationConditions: string[];
}
export interface JudgmentReview {
  id: string;
  requestId: string;
  createdAt: number;
  verdict: JudgmentVerdict;
  observations: string;
  lessons: string;
}
export interface JudgmentEntry {
  schemaVersion: 1;
  id: string;
  requestId: string;
  reportId: string;
  symbol: string;
  createdAt: number;
  reportSnapshot: ResearchReport;
  judgment: PersonalJudgment;
  reviewAt?: number;
  reviews: JudgmentReview[];
}
export interface CreateJudgmentInput {
  requestId: string;
  reportId: string;
  judgment: PersonalJudgment;
  reviewAt?: number;
}
export interface AddJudgmentReviewInput {
  entryId: string;
  requestId: string;
  verdict: JudgmentVerdict;
  observations: string;
  lessons: string;
}
export interface ListJudgmentsInput {
  symbol?: string;
  status?: JudgmentStatus;
  offset?: number;
  limit?: number;
}
export interface JudgmentSummary {
  id: string;
  reportId: string;
  symbol: string;
  createdAt: number;
  reportGeneratedAt: number;
  stance: ResearchStance;
  rationale: string;
  reviewAt?: number;
  reviewCount: number;
  lastReviewedAt?: number;
  pending: boolean;
}
export interface JudgmentPage {
  entries: JudgmentSummary[];
  total: number;
  offset: number;
  limit: number;
}

export function judgmentIsPending(entry: Pick<JudgmentEntry, 'reviewAt' | 'reviews'>, now: number): boolean {
  return entry.reviewAt !== undefined && entry.reviewAt <= now && entry.reviews.length === 0;
}
