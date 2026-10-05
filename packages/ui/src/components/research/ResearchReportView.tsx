import React, { useEffect, useId, useRef, useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import type { ResearchReport, ResearchSection } from '@finagent/core';
import { loadResearchDiff, researchDiffAtom } from '../../atoms/diffAtoms';
import { loadResearchReport } from '../../atoms/researchAtoms';
import { EvidenceList } from './EvidenceList';
import { ExportMenu } from './ExportMenu';
import { WhatChangedSection } from './WhatChangedSection';
import { MarkdownContent } from '../chat/MarkdownContent';
import { judgmentReportAtom, evidenceSelectionAtom, evidenceTriggerAtom, inspectorModeAtom } from '../../atoms/journalAtoms';
import { agentPanelVisibleAtom } from '../../atoms';

const STANCE_TONE: Record<ResearchReport['stance'], string> = {
  bullish: 'text-accent',
  bearish: 'text-negative',
  neutral: 'text-text-muted',
};

const VERDICT_TONE: Record<ResearchSection['verdict'], string> = {
  positive: 'text-accent',
  negative: 'text-negative',
  neutral: 'text-text-muted',
  unavailable: 'text-warning',
};

/** Full Deep Research report: stance, sections, cases, catalysts, risks, evidence. */
export const ResearchReportView: React.FC<{
  report: ResearchReport;
  nextAction?: React.ReactNode;
  snapshotMode?: boolean;
}> = ({ report, nextAction, snapshotMode = false }) => {
  const { t } = useTranslation();
  const confidence = Math.round(report.confidence * 100);
  const instance = useId();
  const reportRoot = useRef<HTMLDivElement>(null);
  const anchor = (key: string) => `report-${instance}-${encodeURIComponent(report.id)}-${encodeURIComponent(key)}`;
  const headingId = anchor('heading');
  const sectionIds = report.sections.map((section, index) => anchor(`section-${index}-${section.key}`));
  const goTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const target = document.getElementById(id);
    const container = reportRoot.current?.closest<HTMLElement>('.yansivra-pilot-research-content, .desk-journal');
    if (target && container) container.scrollTo({ top: container.scrollTop + target.getBoundingClientRect().top - container.getBoundingClientRect().top - 24, behavior: 'auto' });
    else target?.scrollIntoView({ block: 'start', behavior: 'auto' });
    target?.focus({ preventScroll: true });
  };
  const [diffState, setDiffState] = useAtom(researchDiffAtom);
  const [previousReport, setPreviousReport] = useState<ResearchReport | null>(null);
  const setJudgmentReport = useSetAtom(judgmentReportAtom);
  const setEvidence = useSetAtom(evidenceSelectionAtom);
  const setTrigger = useSetAtom(evidenceTriggerAtom);
  const setInspectorMode = useSetAtom(inspectorModeAtom);
  const setInspectorVisible = useSetAtom(agentPanelVisibleAtom);
  const inspect = (section: ResearchSection, trigger: HTMLElement) => {
    setTrigger(trigger);
    setEvidence({ reportId: report.id, symbol: report.symbol, generatedAt: report.generatedAt, section, capabilityRuns: report.capabilityRuns, headingId });
    setInspectorMode('evidence'); setInspectorVisible(true);
  };

  // Fetch the latest diff for this symbol; when a previous report exists the
  // What Changed section renders. Degrades to a hidden section when the
  // research:getDiff channel is unwired or the symbol has no history.
  useEffect(() => {
    if (snapshotMode) return;
    let alive = true;
    setDiffState({ loading: true, diff: null });
    setPreviousReport(null);
    void loadResearchDiff(report.symbol).then((diff) => {
      if (!alive) return;
      const matching = diff?.currentReportId === report.id ? diff : null;
      setDiffState({ loading: false, diff: matching });
      if (matching) {
        void loadResearchReport(matching.previousReportId).then((prev) => {
          if (alive && prev) setPreviousReport(prev);
        });
      }
    });
    return () => {
      alive = false;
    };
  }, [report.symbol, report.id, setDiffState, snapshotMode]);

  return (
    <div ref={reportRoot} className="desk-reading yansivra-pilot-report" data-testid="research-report">
      <nav className="desk-report-toc" aria-label={t('research.flow.contents')}>
        <details open><summary>{t('research.flow.contents')}</summary><div>{report.sections.map((section, index) => <a key={sectionIds[index]} href={`#${sectionIds[index]}`} onClick={(event) => goTo(event, sectionIds[index])}>{section.title}</a>)}<a href={`#${anchor('evidence')}`} onClick={(event) => goTo(event, anchor('evidence'))}>{t('research.evidence')}</a></div></details>
      </nav>
      <div className="desk-report-body">
      <div className="yansivra-pilot-verdict">
        <div className="yansivra-pilot-verdict-top">
          <div>
            <div className="yansivra-pilot-verdict-label">
              {t('research.reportFor', { symbol: report.symbol })}
            </div>
            <h3 id={headingId} data-testid="research-report-heading" tabIndex={-1} className={`mt-1 text-[17px] font-bold ${STANCE_TONE[report.stance]}`}>
              {t(`research.stance.${report.stance}`)}
            </h3>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className="yansivra-pilot-verdict-label">
                {t('research.confidence')}
              </div>
              <div className="yansivra-pilot-confidence">
                {confidence}%
              </div>
            </div>
            <ExportMenu report={report} />
            {!snapshotMode && <button type="button" data-testid="record-judgment" className="desk-primary" onClick={() => setJudgmentReport(report)}>{t('journal.record')}</button>}
          </div>
        </div>
        <MarkdownContent content={report.summary} className="yansivra-pilot-summary" />
        <div className="yansivra-pilot-report-meta">
          {t(`research.runStatus.${report.runStatus}`)}{' '}
          · {t('research.capabilityCalls', { count: report.capabilityRuns.length })} ·{' '}
          {new Date(report.generatedAt).toLocaleString()}
        </div>
        <p className="desk-report-confidence-note">{t('research.flow.confidenceNote')}</p>
        {nextAction}
      </div>

      {!snapshotMode && diffState.diff?.currentReportId === report.id && (
        <WhatChangedSection
          diff={diffState.diff}
          previousReport={previousReport ?? undefined}
        />
      )}

      <div id={anchor('signals')} className="yansivra-pilot-report-sections">
        {report.sections.map((section, index) => (
          <SectionCard key={sectionIds[index]} id={sectionIds[index]} section={section} onInspect={(trigger) => inspect(section, trigger)} />
        ))}
      </div>

      <CaseColumn title={t('research.bullCase')} points={report.bullCase} />
      <CaseColumn title={t('research.bearCase')} points={report.bearCase} />
      <CaseColumn title={t('research.catalysts')} points={report.catalysts} />
      <CaseColumn title={t('research.risks')} points={report.risks} />

      <section id={anchor('evidence')} tabIndex={-1} className="yansivra-pilot-evidence">
        <h4 className="yansivra-pilot-evidence-heading">
          {t('research.evidence')}
        </h4>
        <p className="yansivra-pilot-evidence-note">
          {t('research.evidenceNote')}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {report.sections.map((section, index) => (
            <EvidenceList key={sectionIds[index]} section={section} />
          ))}
        </div>
      </section>
      </div>
    </div>
  );
};

const SectionCard: React.FC<{ id: string; section: ResearchSection; onInspect: (trigger: HTMLElement) => void }> = ({ id, section, onInspect }) => {
  const { t } = useTranslation();
  return (
    <article id={id} tabIndex={-1} className="yansivra-pilot-report-section">
      <div className="flex items-center justify-between">
        <h4 className="desk-report-section-heading">{section.title}</h4>
        <span className={`text-[11px] font-semibold ${VERDICT_TONE[section.verdict]}`}>
          {t(`research.verdict.${section.verdict}`)}
        </span>
      </div>
      <MarkdownContent content={section.summary} className="yansivra-pilot-report-section-summary" />
      {section.evidence.length > 0 && (
        <div className="mt-1.5 text-[10.5px] text-text-muted">
          {t('research.flow.references', { count: section.evidence.length })}
        </div>
      )}
      <button type="button" data-testid="inspect-evidence" onClick={(event) => onInspect(event.currentTarget)} className="desk-evidence-trigger mt-3 text-xs font-medium text-accent">{t('journal.showEvidence')}</button>
    </article>
  );
};

const CaseColumn: React.FC<{ title: string; points: string[] }> = ({ title, points }) => {
  if (points.length === 0) return null;
  return (
    <section className="yansivra-pilot-case">
      <h4>
        {title}
      </h4>
      <ul className="mt-2 flex flex-col gap-1.5">
        {points.map((point, index) => (
          <li key={index} className="text-[12.5px] leading-relaxed text-foreground/80">
            <span className="mr-1.5 text-text-muted">•</span>
            <MarkdownContent content={point} className="inline text-[12.5px] text-foreground/80" />
          </li>
        ))}
      </ul>
    </section>
  );
};
