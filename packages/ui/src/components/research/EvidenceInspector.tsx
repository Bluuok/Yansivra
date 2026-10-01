import React, { useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { X, MessagesSquare } from 'lucide-react';
import { evidenceSelectionAtom, evidenceTriggerAtom, inspectorModeAtom } from '../../atoms/journalAtoms';
import { agentPanelVisibleAtom } from '../../atoms';
import { semanticCapabilityLabelKey } from '../../lib/agentPresentation';
import { useBoundedReveal } from '../motion/useBoundedReveal';

export const EvidenceInspector: React.FC = () => {
  const { t } = useTranslation();
  const selection = useAtomValue(evidenceSelectionAtom);
  const trigger = useAtomValue(evidenceTriggerAtom);
  const visible = useAtomValue(agentPanelVisibleAtom);
  const mode = useAtomValue(inspectorModeAtom);
  const setVisible = useSetAtom(agentPanelVisibleAtom);
  const setMode = useSetAtom(inspectorModeAtom);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const identity = selection ? JSON.stringify([selection.reportId, selection.section.key, selection.section.title]) : null;
  useBoundedReveal(content, identity, visible && mode === 'evidence');
  useEffect(() => { if (selection && visible && mode === 'evidence') heading.current?.focus({ preventScroll: true }); }, [identity, visible, mode]);
  const close = () => {
    setVisible(false);
    const visibleTarget = (node: HTMLElement | null | undefined) => node?.isConnected && node.getClientRects().length ? node : null;
    const originalHeading = selection?.headingId ? document.getElementById(selection.headingId) : null;
    const currentHeading = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="research-report-heading"]')).find(node => visibleTarget(node));
    (visibleTarget(trigger) ?? visibleTarget(originalHeading) ?? currentHeading)?.focus({ preventScroll: true });
  };
  return <aside className="desk-inspector h-full overflow-y-auto border-l border-border bg-surface p-5" data-testid="evidence-inspector" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <header className="mb-5 flex items-center justify-between gap-2"><h2 ref={heading} tabIndex={-1} className="text-base font-semibold">{t('journal.evidenceTitle')}</h2><div className="flex gap-2"><button type="button" onClick={() => setMode('assistant')} aria-label={t('journal.assistant')} className="desk-inspector-control"><MessagesSquare aria-hidden="true" className="h-4 w-4" /></button><button type="button" onClick={close} aria-label={t('journal.closeInspector')} className="desk-inspector-control"><X aria-hidden="true" className="h-4 w-4" /></button></div></header>
    <p className="desk-inspector-note">{t('journal.evidenceNote')}</p>
    <div ref={content} className="desk-inspector-content">{selection && <><h3>{selection.symbol} · {selection.section.title}</h3><p className="desk-inspector-note">{t('journal.reportTime')} {new Date(selection.generatedAt).toLocaleString()}</p>
      {selection.section.evidence.length ? selection.section.evidence.map((ref, index) => {
        const run = selection.capabilityRuns.find(run => run.runId === ref.runId && run.capabilityId === ref.capabilityId);
        return <article key={`${ref.runId}-${ref.capabilityId}-${index}`} className="desk-evidence-source"><h4>{ref.claim}</h4>{ref.summary && <p>{ref.summary}</p>}<dl><div>{t(semanticCapabilityLabelKey(ref.capabilityId))} · {t(`journal.execution.${run?.status ?? 'unknown'}`)}</div><div>{t('journal.collected')} {new Date(ref.fetchedAt).toLocaleString()}</div></dl>{run?.error && <p className="desk-evidence-error">{run.error}</p>}</article>;
      }) : <p>{t('journal.unavailable')}</p>}
      <div className="desk-evidence-outcomes">{selection.capabilityRuns.filter(run => run.status !== 'success').map(run => <div key={run.runId}><strong>{t(semanticCapabilityLabelKey(run.capabilityId))} · {t(`journal.execution.${run.status}`)}</strong>{run.error && <p>{run.error}</p>}</div>)}</div>
    </>}</div>
  </aside>;
};
