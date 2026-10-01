import { beforeAll, afterAll, it, expect } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, createStore } from 'jotai';
import { installHappyDom } from '../../test/setupHappyDom';
import { TestI18n } from '../../test/testI18n';
import { agentPanelVisibleAtom } from '../../atoms';
import { evidenceSelectionAtom, evidenceTriggerAtom, inspectorModeAtom } from '../../atoms/journalAtoms';
import { EvidenceInspector } from './EvidenceInspector';
let restore: () => void; beforeAll(() => { restore = installHappyDom().restore; }); afterAll(() => restore());

it('returns focus to the visible current report after the original report is removed', async () => {
  const store = createStore();
  store.set(evidenceSelectionAtom, { reportId: 'old-report', symbol: 'TEST.US', generatedAt: 1, section: { key: 'valuation', title: '估值', summary: '', verdict: 'neutral', evidence: [] }, capabilityRuns: [], headingId: 'removed-report-heading' });
  store.set(evidenceTriggerAtom, document.createElement('button'));
  store.set(agentPanelVisibleAtom, true); store.set(inspectorModeAtom, 'evidence');
  const heading = document.createElement('h3'); heading.dataset.testid = 'research-report-heading'; heading.tabIndex = -1;
  heading.getClientRects = (() => [{ width: 30, height: 20 }]) as unknown as typeof heading.getClientRects;
  document.body.appendChild(heading);
  const container = document.createElement('div'); document.body.appendChild(container); const root = createRoot(container);
  try {
    await act(async () => root.render(<TestI18n><Provider store={store}><EvidenceInspector /></Provider></TestI18n>));
    await act(async () => { container.querySelector('aside')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(store.get(agentPanelVisibleAtom)).toBe(false); expect(document.activeElement).toBe(heading);
  } finally { await act(async () => root.unmount()); container.remove(); heading.remove(); }
});
