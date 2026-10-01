import React, { useEffect, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import type { ApiError, JudgmentEntry, JudgmentPage, JudgmentStatus } from '@finagent/core';
import { useFinagentClient } from '../../client';
import { journalRevisionAtom, selectedJudgmentIdAtom } from '../../atoms/journalAtoms';
import { navSectionAtom } from '../../atoms';
import { ResearchReportView } from '../research/ResearchReportView';
import { ReviewForm } from './ReviewForm';
import { JournalError } from './JournalError';
import { useBoundedReveal } from '../motion/useBoundedReveal';

export const JournalView: React.FC = () => {
  const { t } = useTranslation(); const client = useFinagentClient();
  const revision = useAtomValue(journalRevisionAtom); const refresh = useSetAtom(journalRevisionAtom);
  const [selectedId, setSelectedId] = useAtom(selectedJudgmentIdAtom);
  const setSection = useSetAtom(navSectionAtom);
  const [status, setStatus] = useState<JudgmentStatus>('all'); const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<JudgmentPage | null>(null);
  const [entry, setEntry] = useState<JudgmentEntry | null>(null);
  const selectedRef = useRef(selectedId); selectedRef.current = selectedId;
  const [newReviewId, setNewReviewId] = useState<string | null>(null);
  const animatedReviews = useRef(new Set<string>());
  const saved = (result: JudgmentEntry) => {
    if (selectedRef.current !== result.id) return;
    const existing = new Set(entry?.reviews.map(review => review.id));
    const appended = result.reviews.find(review => !existing.has(review.id));
    if (appended) setNewReviewId(appended.id);
    setEntry(result);
  };
  const [listError, setListError] = useState<ApiError | null>(null);
  const [detailError, setDetailError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true; setLoading(true); setListError(null);
    void client.journal.list({ status, offset, limit: 20 }).then((result) => {
      if (!alive) return;
      if (!result.ok) { setListError(result.error); return; }
      setPage(result.data);
      setSelectedId((current) => current ?? result.data.entries[0]?.id ?? null);
    }).catch((error) => { if (alive) setListError({ code: 'IPC_FAILED', message: String(error) }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [client, status, offset, revision, setSelectedId]);
  useEffect(() => {
    let alive = true; setEntry(current => current?.id === selectedId ? current : null); setDetailError(null);
    if (selectedId) void client.journal.get({ entryId: selectedId }).then((result) => {
      if (!alive) return;
      if (result.ok) setEntry(result.data); else setDetailError(result.error);
    }).catch((error) => { if (alive) setDetailError({ code: 'IPC_FAILED', message: String(error) }); });
    return () => { alive = false; };
  }, [client, selectedId, revision]);

  return <div className="desk-journal h-full overflow-y-auto p-6" data-testid="journal-view">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">{t('journal.title')}</h1><p className="mt-2 text-sm text-text-muted">{t('journal.subtitle')}</p></div><button type="button" onClick={() => refresh((value) => value + 1)} className="desk-secondary">{t('common.refresh')}</button></header>
    <div className="mb-5 flex flex-wrap items-center gap-2">{(['all', 'pending', 'reviewed'] as const).map((value) => <button key={value} type="button" onClick={() => { setStatus(value); setOffset(0); }} aria-pressed={status === value} className={status === value ? 'desk-primary' : 'desk-secondary'}>{t(`journal.${value}`)}</button>)}<span className="ml-auto text-xs text-text-muted">{loading ? t('common.loading') : page ? t('journal.count', { count: page.total }) : ''}</span></div>
    {listError && <div className="mb-4"><JournalError error={listError} /></div>}
    {!loading && !listError && page?.total === 0 && <div className="mb-5 rounded-xl border border-border bg-surface p-6"><h2 className="font-semibold">{t('journal.empty')}</h2><p className="mt-2 text-sm text-text-muted">{t('journal.emptyHint')}</p><button type="button" onClick={() => setSection('research')} className="desk-primary mt-4">{t('navigation.startResearch')}</button></div>}
    <div className="desk-journal-columns">
      <div>
        <div className="space-y-2">{page?.entries.map((item) => <button type="button" key={item.id} data-testid={`judgment-row-${item.id}`} onClick={() => setSelectedId(item.id)} aria-pressed={item.id === selectedId} className={`desk-journal-row w-full rounded-xl border p-4 text-left ${item.id === selectedId ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:bg-surface-hover'}`}>
          <div className="flex justify-between gap-3"><strong>{item.symbol}</strong><span className="text-xs text-accent">{t(`journal.stance.${item.stance}`)}</span></div>
          <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{item.rationale}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted"><span>{new Date(item.createdAt).toLocaleDateString()}</span><span>· {item.pending ? t('journal.pending') : t('journal.reviews', { count: item.reviewCount })}</span></div>
        </button>)}</div>
        {page && page.total > page.limit && <div className="mt-4 flex justify-between gap-2"><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - page.limit))} className="desk-secondary">{t('journal.previous')}</button><button type="button" disabled={offset + page.limit >= page.total} onClick={() => setOffset(offset + page.limit)} className="desk-secondary">{t('journal.next')}</button></div>}
      </div>
      <div className="min-w-0 space-y-5" data-testid="judgment-detail">
        {detailError && <JournalError error={detailError} />}
        {selectedId && !entry && !detailError ? <p className="text-sm text-text-muted">{t('common.loading')}</p> : !entry && <p className="text-sm text-text-muted">{t('journal.select')}</p>}
        {entry && entry.id === selectedId && <>
          <article className="rounded-xl border border-border bg-surface p-5" data-testid="judgment-original">
            <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">{t('journal.original')}</h2><span className="text-sm text-accent">{entry.symbol} · {t(`journal.stance.${entry.judgment.stance}`)}</span></div>
            <div className="mt-2 space-y-1 text-xs text-text-muted"><div>{t('journal.recordedTime')} {new Date(entry.createdAt).toLocaleString()}</div><div>{t('journal.reportTime')} {new Date(entry.reportSnapshot.generatedAt).toLocaleString()}</div><div>{entry.reviewAt !== undefined ? `${t('journal.reviewDate')} ${new Date(entry.reviewAt).toLocaleDateString()}` : t('journal.noDate')}</div></div>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7" data-testid="judgment-original-rationale">{entry.judgment.rationale}</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">{[{ title: t('journal.assumptions'), points: entry.judgment.assumptions }, { title: t('journal.conditions'), points: entry.judgment.invalidationConditions }].map((group) => <section key={group.title}><h3 className="mb-2 text-xs font-semibold text-text-muted">{group.title}</h3><ul className="space-y-2 text-sm">{group.points.length ? group.points.map((value, i) => <li key={i} className="whitespace-pre-wrap">• {value}</li>) : <li>—</li>}</ul></section>)}</div>
          </article>
          <details className="rounded-xl border border-border bg-surface p-5" data-testid="judgment-snapshot"><summary className="cursor-pointer font-semibold">{t('journal.snapshot')} · {entry.symbol}</summary><div className="mt-4"><ResearchReportView report={entry.reportSnapshot} snapshotMode /></div></details>
          <section className="rounded-xl border border-border bg-surface p-5" data-testid="judgment-reviews"><h2 className="mb-4 text-lg font-semibold">{t('journal.later')}</h2>{entry.reviews.length === 0 ? <p className="text-sm text-text-muted">{t('journal.noReviews')}</p> : <ol className="space-y-5 border-l border-border pl-5">{entry.reviews.map(review => <ReviewAppend key={review.id} review={review} animate={newReviewId === review.id && !animatedReviews.current.has(review.id)} onEntered={() => animatedReviews.current.add(review.id)} />)}</ol>}</section>
          <ReviewForm key={entry.id} entryId={entry.id} onSaved={saved} />
        </>}
      </div>
    </div>
  </div>;
};


const ReviewAppend: React.FC<{ review: JudgmentEntry['reviews'][number]; animate: boolean; onEntered: () => void }> = ({ review, animate, onEntered }) => {
  const { t } = useTranslation();
  const paper = useRef<HTMLLIElement>(null);
  useBoundedReveal(paper, review.id, true, animate);
  useEffect(() => { if (animate) onEntered(); }, [review.id]);
  return <li ref={paper} data-testid="judgment-review" className="desk-review-append"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-accent">{t(`journal.verdict.${review.verdict}`)}</strong><time className="text-xs text-text-muted">{new Date(review.createdAt).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{review.observations}</p>{review.lessons && <p className="mt-3 whitespace-pre-wrap text-sm text-text-muted">{review.lessons}</p>}</li>;
};
