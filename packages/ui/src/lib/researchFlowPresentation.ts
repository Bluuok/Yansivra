import type { ResearchRunSummary } from '@finagent/core';

export type ResearchFlowGroup = 'market' | 'financials' | 'valuation' | 'events' | 'other';
const GROUPS: ResearchFlowGroup[] = ['market', 'financials', 'valuation', 'events', 'other'];
export function groupForCapability(id: string): ResearchFlowGroup {
  if (id.startsWith('market.')) return 'market';
  if (id === 'company.valuation') return 'valuation';
  if (id.startsWith('company.')) return 'financials';
  if (id.startsWith('research.')) return 'events';
  return 'other';
}

/** A presentation of persisted outcomes, never a scheduler or progress clock. */
export function researchFlowPresentation(run: ResearchRunSummary) {
  const planned = new Set(run.plannedCapabilities);
  const completed = new Set(run.completedCapabilities);
  const failed = new Set(run.failedCapabilities);
  const foreign = [...new Set([...completed, ...failed])].filter(id => !planned.has(id));
  const conflicts = [...planned].filter(id => completed.has(id) && failed.has(id));
  const conflicting = new Set(conflicts);
  const success = [...planned].filter(id => completed.has(id) && !conflicting.has(id));
  const failure = [...planned].filter(id => failed.has(id) && !conflicting.has(id));
  const remaining = planned.size - success.length - failure.length;
  const terminal = ['completed', 'partial', 'failed', 'cancelled', 'interrupted'].includes(run.status) || Boolean(run.cancelled);
  const inconsistent = foreign.length > 0 || conflicts.length > 0;
  return {
    planned: planned.size, success, failure, remaining, conflicts, foreign, inconsistent, terminal,
    percent: planned.size ? Math.floor((success.length + failure.length) / planned.size * 100) : 0,
    synthesis: run.cancelled ? 'cancelled' : inconsistent ? 'inconsistent' : run.status,
    groups: GROUPS.map(key => {
      const ids = [...planned].filter(id => groupForCapability(id) === key);
      const successful = ids.filter(id => success.includes(id)).length;
      const failures = ids.filter(id => failure.includes(id)).length;
      return { key, planned: ids.length, successful, failures, remaining: ids.length - successful - failures,
        state: ids.some(id => conflicting.has(id)) ? 'inconsistent' : !ids.length ? 'unplanned' :
          failures ? 'partial' : successful === ids.length ? 'complete' : 'pending' };
    }).filter(group => group.key !== 'other' || group.planned > 0),
  };
}
