import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { X, MessagesSquare } from 'lucide-react';
import { evidenceSelectionAtom, inspectorModeAtom } from '../../atoms/journalAtoms';
import { agentPanelVisibleAtom } from '../../atoms';
import { semanticCapabilityLabelKey } from '../../lib/agentPresentation';

export const EvidenceInspector: React.FC = () => {
  const { t } = useTranslation(); const selection = useAtomValue(evidenceSelectionAtom);
  const setVisible = useSetAtom(agentPanelVisibleAtom); const setMode = useSetAtom(inspectorModeAtom);
  return <aside className="h-full overflow-y-auto border-l border-border bg-surface p-5" data-testid="evidence-inspector">
    <header className="mb-5 flex items-center justify-between gap-2"><h2 className="text-base font-semibold">{t('journal.evidenceTitle')}</h2><div className="flex gap-2"><button type="button" onClick={() => setMode('assistant')} aria-label={t('journal.assistant')} className="rounded p-1 hover:bg-surface-hover"><MessagesSquare className="h-4 w-4" /></button><button type="button" onClick={() => setVisible(false)} aria-label={t('journal.closeInspector')} className="rounded p-1 hover:bg-surface-hover"><X className="h-4 w-4" /></button></div></header>
    <p className="mb-5 text-xs leading-5 text-text-muted">{t('journal.evidenceNote')}</p>
    {selection && <><h3 className="font-semibold">{selection.symbol} · {selection.section.title}</h3><p className="mt-2 text-xs text-text-muted">{t('journal.reportTime')} {new Date(selection.generatedAt).toLocaleString()}</p><div className="mt-5 space-y-4">{selection.section.evidence.length ? selection.section.evidence.map((ref, index) => {
      const run = selection.capabilityRuns.find((run) => run.runId === ref.runId && run.capabilityId === ref.capabilityId);
      return <article key={`${ref.runId}-${index}`} className="rounded-lg border border-border p-4"><p className="text-sm font-medium leading-6">{ref.claim}</p>{ref.summary && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-muted">{ref.summary}</p>}<dl className="mt-4 space-y-2 text-xs text-text-muted"><div>{t(semanticCapabilityLabelKey(ref.capabilityId))} · {t(`journal.execution.${run?.status ?? 'unknown'}`)}</div><div>{t('journal.collected')} {new Date(ref.fetchedAt).toLocaleString()}</div></dl>{run?.error && <p className="mt-3 whitespace-pre-wrap text-xs text-negative">{run.error}</p>}</article>;
    }) : <p className="text-sm text-text-muted">{t('journal.unavailable')}</p>}</div>
    <div className="mt-6 border-t border-border pt-4 space-y-3">{selection.capabilityRuns.filter((run) => run.status !== 'success').map((run) => <div key={run.runId} className="text-xs text-text-muted"><strong>{t(semanticCapabilityLabelKey(run.capabilityId))} · {t(`journal.execution.${run.status}`)}</strong>{run.error && <p className="mt-1 whitespace-pre-wrap">{run.error}</p>}</div>)}</div></>}
  </aside>;
};
