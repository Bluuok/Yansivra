import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { JudgmentVerdict, ResearchReport, ResearchSection } from '@finagent/core';

export const judgmentReportAtom = atom<ResearchReport | null>(null);
export const journalRevisionAtom = atom(0);
export const selectedJudgmentIdAtom = atom<string | null>(null);
export const reviewTabAtom = atom<'journal' | 'thesis'>('journal');
export interface ReviewDraft {
  requestId: string;
  verdict: JudgmentVerdict;
  observations: string;
  lessons: string;
}
// In-memory drafts survive navigation and inspector switches, not app restarts.
export const reviewDraftAtomFamily = atomFamily((_entryId: string) => atom<ReviewDraft>({
  requestId: crypto.randomUUID(), verdict: 'insufficient_data', observations: '', lessons: '',
}));
export const inspectorModeAtom = atom<'assistant' | 'evidence'>('assistant');
// UI-only focus target, never serialized with reports or journal records.
export const evidenceTriggerAtom = atom<HTMLElement | null>(null);
export const evidenceSelectionAtom = atom<{
  reportId: string;
  symbol: string;
  generatedAt: number;
  section: ResearchSection;
  capabilityRuns: ResearchReport['capabilityRuns'];
  headingId?: string;
} | null>(null);
