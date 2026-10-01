import { beforeAll, afterAll, it, expect } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ResearchRunSummary } from '@finagent/core';
import { installHappyDom } from '../../test/setupHappyDom';
import { TestI18n } from '../../test/testI18n';
import { ResearchFlowMap } from './ResearchFlowMap';
let restore: () => void;
beforeAll(() => { restore = installHappyDom().restore; });
afterAll(() => restore());
const base: ResearchRunSummary = { id: 'live', symbol: 'TEST.US', status: 'fetching', startedAt: 1,
  plannedCapabilities: ['market.quote', 'company.financials', 'company.valuation', 'research.news'], completedCapabilities: ['market.quote'], failedCapabilities: [] };

it('does not replay an old outcome when a saved plan or conflicting result is corrected', async () => {
  const container = document.createElement('div'); document.body.appendChild(container); const root = createRoot(container);
  const oldAnimate = Element.prototype.animate; let calls = 0;
  Element.prototype.animate = (() => { calls++; return { cancel() {} } as Animation; }) as typeof Element.prototype.animate;
  const show = async (run: ResearchRunSummary) => act(async () => { root.render(<TestI18n><ResearchFlowMap run={run} /></TestI18n>); });
  try {
    await show({ ...base, completedCapabilities: ['market.quote', 'company.financials'], failedCapabilities: ['company.financials'] });
    await show({ ...base, completedCapabilities: ['market.quote', 'company.financials'] }); expect(calls).toBe(0);
    await show({ ...base, completedCapabilities: ['market.quote', 'company.financials', 'vendor.custom'] });
    await show({ ...base, plannedCapabilities: [...base.plannedCapabilities, 'vendor.custom'], completedCapabilities: ['market.quote', 'company.financials', 'vendor.custom'] }); expect(calls).toBe(0);
    await show({ ...base, plannedCapabilities: [...base.plannedCapabilities, 'vendor.custom'], completedCapabilities: ['market.quote', 'company.financials', 'vendor.custom', 'company.valuation'] }); expect(calls).toBe(1);
  } finally { await act(async () => root.unmount()); Element.prototype.animate = oldAnimate; container.remove(); }
});

it('keeps restored results static, batches new groups to two finite lines, and stops on terminal/unmount', async () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const oldAnimate = Element.prototype.animate;
  const animations: Array<{ canceled: boolean; duration: unknown }> = [];
  Element.prototype.animate = ((_frames: unknown, options: KeyframeAnimationOptions) => {
    const record = { canceled: false, duration: options.duration }; animations.push(record);
    return { cancel: () => { record.canceled = true; } } as Animation;
  }) as typeof Element.prototype.animate;
  const show = async (run: ResearchRunSummary) => act(async () => { root.render(<TestI18n><ResearchFlowMap run={run} /></TestI18n>); });
  try {
    await show(base); expect(animations).toHaveLength(0);
    const completed = { ...base, completedCapabilities: [...base.plannedCapabilities] };
    await show(completed); expect(animations).toHaveLength(2); expect(animations.every(a => a.duration === 420)).toBe(true);
    await show({ ...completed, completedCapabilities: [...completed.completedCapabilities, 'market.quote'] }); expect(animations).toHaveLength(2);
    await show({ ...completed, status: 'partial' }); expect(animations.every(a => a.canceled)).toBe(true);
    await show({ ...completed, id: 'restored-other' }); expect(animations).toHaveLength(2);
    expect(container.textContent).toContain('Report synthesis');
  } finally { await act(async () => root.unmount()); Element.prototype.animate = oldAnimate; container.remove(); }
});

it('does not replay hidden or reduced-motion completions on reappearance', async () => {
  const container = document.createElement('div'); document.body.appendChild(container); const root = createRoot(container);
  const oldAnimate = Element.prototype.animate; const oldMedia = window.matchMedia;
  let calls = 0; let canceled = 0; let reduced = false;
  Element.prototype.animate = (() => { calls++; return { cancel: () => { canceled++; } } as Animation; }) as typeof Element.prototype.animate;
  window.matchMedia = (() => ({ matches: reduced, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  const show = async (run: ResearchRunSummary) => act(async () => { root.render(<TestI18n><ResearchFlowMap run={run} /></TestI18n>); });
  try {
    await show(base);
    await show({ ...base, completedCapabilities: ['market.quote', 'company.financials'] }); expect(calls).toBe(1);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); expect(canceled).toBeGreaterThan(0);
    await show({ ...base, completedCapabilities: ['market.quote', 'company.financials', 'company.valuation'] }); expect(calls).toBe(1);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));
    reduced = true; await show({ ...base, completedCapabilities: [...base.plannedCapabilities] }); expect(calls).toBe(1);
    reduced = false; await show({ ...base, completedCapabilities: [...base.plannedCapabilities] }); expect(calls).toBe(1);
  } finally { await act(async () => root.unmount()); Element.prototype.animate = oldAnimate; window.matchMedia = oldMedia; delete (document as unknown as { hidden?: boolean }).hidden; container.remove(); }
});
