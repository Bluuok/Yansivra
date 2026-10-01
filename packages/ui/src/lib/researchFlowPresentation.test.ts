import { describe, it, expect } from 'bun:test';
import type { ResearchRunSummary } from '@finagent/core';
import { researchFlowPresentation } from './researchFlowPresentation';
const run = (changes: Partial<ResearchRunSummary> = {}): ResearchRunSummary => ({ id: 'r1', symbol: 'TEST.US', startedAt: 1, status: 'fetching', plannedCapabilities: ['market.quote', 'company.valuation', 'research.news'], completedCapabilities: [], failedCapabilities: [], ...changes });

describe('research outcome presentation', () => {
  it('deduplicates outcomes, excludes foreign IDs and never exceeds the plan', () => {
    const state = researchFlowPresentation(run({ plannedCapabilities: ['market.quote', 'market.quote'], completedCapabilities: ['market.quote', 'market.quote', 'foreign.result'], failedCapabilities: ['foreign.error'] }));
    expect(state.planned).toBe(1); expect(state.success).toEqual(['market.quote']); expect(state.percent).toBe(100); expect(state.inconsistent).toBe(true); expect(state.foreign).toEqual(['foreign.result', 'foreign.error']);
  });
  it('does not turn zero planned work into completion', () => {
    const state = researchFlowPresentation(run({ plannedCapabilities: [] }));
    expect(state.percent).toBe(0); expect(state.synthesis).toBe('fetching'); expect(state.terminal).toBe(false);
  });
  it('does not mistake all fetched outcomes for a synthesized report', () => {
    const state = researchFlowPresentation(run({ completedCapabilities: ['market.quote', 'company.valuation', 'research.news'] }));
    expect(state.percent).toBe(100); expect(state.synthesis).toBe('fetching');
  });
  it('preserves failure counts and separates unknown capabilities', () => {
    const state = researchFlowPresentation(run({ status: 'partial', plannedCapabilities: ['market.quote', 'market.status', 'vendor.custom'], completedCapabilities: ['market.quote'], failedCapabilities: ['market.status'] }));
    expect(state.groups.find(g => g.key === 'market')).toMatchObject({ successful: 1, failures: 1, state: 'partial' });
    expect(state.groups.find(g => g.key === 'other')).toMatchObject({ planned: 1, remaining: 1 }); expect(state.terminal).toBe(true); expect(state.synthesis).toBe('partial');
  });
  it('does not display conflicting outcomes as successful or doubly count them', () => {
    const state = researchFlowPresentation(run({ completedCapabilities: ['market.quote'], failedCapabilities: ['market.quote'] }));
    expect(state.inconsistent).toBe(true); expect(state.percent).toBe(0); expect(state.remaining).toBe(3); expect(state.synthesis).toBe('inconsistent'); expect(state.groups[0].state).toBe('inconsistent');
  });
  for (const status of ['failed', 'cancelled', 'interrupted', 'partial', 'completed'] as const) it(`stops motion on ${status}`, () => {
    expect(researchFlowPresentation(run({ status })).terminal).toBe(true);
  });
  it('honors cancellation even before the persisted status changes', () => {
    const state = researchFlowPresentation(run({ cancelled: true })); expect(state.terminal).toBe(true); expect(state.synthesis).toBe('cancelled');
  });
});
