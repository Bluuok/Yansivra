import React, { useRef, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { JOURNAL_LIMITS, type ApiError, type ResearchReport, type ResearchStance } from '@finagent/core';
import { useFinagentClient } from '../../client';
import { judgmentReportAtom, journalRevisionAtom, selectedJudgmentIdAtom, reviewTabAtom } from '../../atoms/journalAtoms';
import { navSectionAtom } from '../../atoms';
import { Dialog } from '../primitives/Dialog';
import { JournalError } from './JournalError';

export const JudgmentDialog: React.FC = () => {
  const [report, setReport] = useAtom(judgmentReportAtom);
  return report ? <JudgmentForm key={report.id} report={report} close={() => setReport(null)} /> : null;
};

const JudgmentForm: React.FC<{ report: ResearchReport; close: () => void }> = ({ report, close }) => {
  const { t } = useTranslation();
  const client = useFinagentClient();
  const setRevision = useSetAtom(journalRevisionAtom);
  const setSelected = useSetAtom(selectedJudgmentIdAtom);
  const setTab = useSetAtom(reviewTabAtom);
  const setSection = useSetAtom(navSectionAtom);
  const [stance, setStance] = useState<ResearchStance>('neutral');
  const [rationale, setRationale] = useState('');
  const [assumptions, setAssumptions] = useState(['', '', '']);
  const [conditions, setConditions] = useState(['', '', '']);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const busyRef = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const dirty = Boolean(rationale || date || stance !== 'neutral' || assumptions.some(Boolean) || conditions.some(Boolean));
  const requestClose = () => { if (!busyRef.current) { if (dirty) setDiscard(true); else close(); } };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    const points = conditions.map((value) => value.trim()).filter(Boolean);
    const reviewAt = date ? new Date(`${date}T00:00:00`).getTime() : undefined;
    if (!rationale.trim() || points.length === 0 || (reviewAt !== undefined && !Number.isFinite(reviewAt))) {
      setError({ code: 'INVALID_ARGUMENT', message: t('journal.invalid') }); return;
    }
    busyRef.current = true; setBusy(true); setError(null);
    try {
      const result = await client.journal.createFromReport({
        requestId: requestId.current, reportId: report.id,
        judgment: { stance, rationale, assumptions: assumptions.map((value) => value.trim()).filter(Boolean), invalidationConditions: points },
        ...(reviewAt !== undefined ? { reviewAt } : {}),
      });
      if (!result.ok) { setError(result.error); return; }
      setRevision((value) => value + 1); setSelected(result.data.id); setTab('journal'); setSection('thesis'); close();
    } catch (error) { setError({ code: 'IPC_FAILED', message: error instanceof Error ? error.message : String(error) }); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <Dialog open onClose={requestClose} title={t('journal.record')} className="max-h-[calc(100vh-3rem)] overflow-y-auto !max-w-2xl !rounded-xl">
    {discard ? <div className="space-y-4" data-testid="judgment-discard-confirm"><h3 className="font-semibold">{t('journal.discard')}</h3><p className="text-sm text-text-muted">{t('journal.discardHint')}</p><div className="flex justify-end gap-3"><button type="button" onClick={() => setDiscard(false)} className="desk-secondary">{t('journal.keepEditing')}</button><button type="button" onClick={close} className="desk-primary">{t('journal.discardAction')}</button></div></div> : <form onSubmit={(event) => void submit(event)} className="desk-form" data-testid="judgment-form">
      <div className="rounded-lg bg-background p-3 text-sm"><strong>{report.symbol}</strong><div className="mt-1 text-xs text-text-muted">{t('journal.reportTime')} {new Date(report.generatedAt).toLocaleString()}</div><p className="mt-2 text-xs text-text-muted">{t('journal.snapshotNotice')}</p></div>
      {error && <JournalError error={error} />}
      <fieldset disabled={busy} className="space-y-4">
        <label>{t('journal.stanceLabel')}<select data-testid="judgment-stance" value={stance} onChange={(event) => setStance(event.target.value as ResearchStance)}>{(['bullish', 'neutral', 'bearish'] as const).map((value) => <option key={value} value={value}>{t(`journal.stance.${value}`)}</option>)}</select></label>
        <label>{t('journal.rationale')} *<textarea data-testid="judgment-rationale" required rows={3} maxLength={JOURNAL_LIMITS.rationale} value={rationale} onChange={(event) => setRationale(event.target.value)} /><span className="text-xs text-text-muted">{rationale.length} / {JOURNAL_LIMITS.rationale}</span></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">{assumptions.map((value, index) => <label key={index}>{t('journal.point', { label: t('journal.assumptions'), number: index + 1 })}<input maxLength={JOURNAL_LIMITS.point} value={value} onChange={(event) => setAssumptions((values) => values.map((item, i) => i === index ? event.target.value : item))} /></label>)}</div>
          <div className="space-y-2">{conditions.map((value, index) => <label key={index}>{t('journal.point', { label: t('journal.conditions'), number: index + 1 })}{index === 0 ? ' *' : ''}<input data-testid={`judgment-condition-${index}`} required={index === 0} maxLength={JOURNAL_LIMITS.point} value={value} onChange={(event) => setConditions((values) => values.map((item, i) => i === index ? event.target.value : item))} /></label>)}</div>
        </div>
        <label>{t('journal.reviewDate')}<input type="date" data-testid="judgment-date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={requestClose} className="desk-secondary">{t('common.cancel')}</button><button type="submit" data-testid="judgment-save" className="desk-primary">{busy ? t('journal.busy') : t('journal.save')}</button></div>
      </fieldset>
    </form>}
  </Dialog>;
};
