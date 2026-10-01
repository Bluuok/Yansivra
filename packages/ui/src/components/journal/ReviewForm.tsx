import React, { useRef, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { JOURNAL_LIMITS, type ApiError, type JudgmentEntry, type JudgmentVerdict } from '@finagent/core';
import { useFinagentClient } from '../../client';
import { reviewDraftAtomFamily, journalRevisionAtom } from '../../atoms/journalAtoms';
import { JournalError } from './JournalError';

export const ReviewForm: React.FC<{ entryId: string; onSaved: (entry: JudgmentEntry) => void }> = ({ entryId, onSaved }) => {
  const { t } = useTranslation(); const client = useFinagentClient();
  const [draft, setDraft] = useAtom(reviewDraftAtomFamily(entryId));
  const setRevision = useSetAtom(journalRevisionAtom);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busyRef.current) return;
    if (!draft.observations.trim()) { setError({ code: 'INVALID_ARGUMENT', message: t('journal.invalid') }); return; }
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const result = await client.journal.addReview({ ...draft, entryId });
      if (!result.ok) { setError(result.error); return; }
      onSaved(result.data);
      setDraft({ requestId: crypto.randomUUID(), verdict: 'insufficient_data', observations: '', lessons: '' });
      setRevision((value) => value + 1);
    } catch (error) { setError({ code: 'IPC_FAILED', message: error instanceof Error ? error.message : String(error) }); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <form onSubmit={(event) => void submit(event)} className="desk-form rounded-xl border border-border bg-surface p-5" data-testid="review-form">
    <h3 className="text-base font-semibold">{t('journal.addReview')}</h3>
    {error && <JournalError error={error} />}
    <fieldset disabled={busy} className="space-y-4">
      <label>{t('journal.verdictLabel')}<select data-testid="review-verdict" value={draft.verdict} onChange={(event) => setDraft((value) => ({ ...value, verdict: event.target.value as JudgmentVerdict }))}>{(['still_valid', 'weakened', 'invalidated', 'insufficient_data'] as const).map((value) => <option key={value} value={value}>{t(`journal.verdict.${value}`)}</option>)}</select></label>
      <label>{t('journal.observations')} *<textarea data-testid="review-observations" rows={3} maxLength={JOURNAL_LIMITS.observations} required value={draft.observations} onChange={(event) => setDraft((value) => ({ ...value, observations: event.target.value }))} /></label>
      <label>{t('journal.lessons')}<textarea data-testid="review-lessons" rows={2} maxLength={JOURNAL_LIMITS.lessons} value={draft.lessons} onChange={(event) => setDraft((value) => ({ ...value, lessons: event.target.value }))} /></label>
      <div className="flex justify-end"><button type="submit" data-testid="review-save" className="desk-primary">{busy ? t('journal.busy') : t('journal.append')}</button></div>
    </fieldset>
  </form>;
};
