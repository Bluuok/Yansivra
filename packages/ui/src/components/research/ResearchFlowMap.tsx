import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ResearchRunSummary } from '@finagent/core';
import { groupForCapability, researchFlowPresentation } from '../../lib/researchFlowPresentation';

export const ResearchFlowMap: React.FC<{ run: ResearchRunSummary }> = ({ run }) => {
  const { t } = useTranslation();
  const flow = researchFlowPresentation(run);
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef<{ id: string; completed: Set<string> } | null>(null);
  const signature = JSON.stringify([run.id, run.status, run.cancelled, flow.success, flow.failure, flow.foreign, flow.conflicts]);
  useEffect(() => {
    const before = previous.current;
    previous.current = { id: run.id, completed: new Set(run.completedCapabilities) };
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!before || before.id !== run.id || flow.terminal || flow.inconsistent || document.hidden || query?.matches) return;
    const groups = [...new Set(flow.success.filter(id => !before.completed.has(id)).map(groupForCapability))].slice(0, 2);
    const animations = groups.flatMap(group => {
      const path = root.current?.querySelector<SVGPathElement>(`[data-flow-line="${group}"]`);
      if (!path?.animate) return [];
      return [path.animate([{ strokeDashoffset: 1, opacity: .4 }, { strokeDashoffset: 0, opacity: 1 }],
        { duration: 420, easing: 'ease-out' })];
    });
    const stop = () => animations.forEach(animation => animation.cancel());
    const visibility = () => { if (document.hidden) stop(); };
    const preference = () => { if (query?.matches) stop(); };
    const observer = root.current && typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) stop(); }) : null;
    if (root.current) observer?.observe(root.current);
    document.addEventListener('visibilitychange', visibility); query?.addEventListener?.('change', preference);
    return () => { stop(); observer?.disconnect(); document.removeEventListener('visibilitychange', visibility); query?.removeEventListener?.('change', preference); };
  }, [signature]);

  return <div ref={root} className="desk-flow" data-testid="research-flow-map" data-run-id={run.id} data-inconsistent={flow.inconsistent}>
    <div className="desk-flow-summary"><strong>{t('research.flow.collection')}</strong><span>{flow.success.length} / {flow.planned} {t('research.flow.success')} · {flow.failure.length} {t('research.flow.failed')} · {flow.remaining} {t('research.flow.remaining')}</span></div>
    {flow.inconsistent && <p role="status" className="desk-flow-warning">{t('research.flow.inconsistent')}</p>}
    <div className="desk-flow-progress" role="progressbar" aria-label={t('research.flow.collection')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={flow.percent}><span style={{ width: `${flow.percent}%` }} /></div>
    <p className="desk-flow-note">{!flow.planned ? t('research.flow.preparing') : t('research.flow.collectionNote')}</p>
    <div className="desk-flow-body">
      <ul>{flow.groups.map((group, index) => <li key={group.key} data-state={group.state}><strong>{t(`research.flow.${group.key}`)}</strong><span>{group.planned ? `${group.successful} ${t('research.flow.success')} · ${group.failures} ${t('research.flow.failed')} · ${group.remaining} ${t('research.flow.remaining')}` : t('research.flow.unplanned')}</span>
        <svg aria-hidden="true" viewBox="0 0 110 36" preserveAspectRatio="none"><path data-flow-line={group.key} pathLength="1" d={`M0 18 Q55 ${index % 2 ? 30 : 6} 110 18`} /></svg>
      </li>)}</ul>
      <div className="desk-flow-synthesis"><strong>{t('research.flow.synthesis')}</strong><span>{flow.synthesis === 'inconsistent' ? t('research.flow.inconsistent') : t(`research.runStatus.${flow.synthesis}`)}</span></div>
    </div>
  </div>;
};
