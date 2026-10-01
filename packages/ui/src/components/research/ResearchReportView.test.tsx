import { beforeAll, afterAll, it, expect } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, createStore } from 'jotai';
import type { ResearchReport } from '@finagent/core';
import { installHappyDom } from '../../test/setupHappyDom';
import { TestI18n } from '../../test/testI18n';
import { ResearchReportView } from './ResearchReportView';
let restore: () => void; beforeAll(() => { restore = installHappyDom().restore; }); afterAll(() => restore());
const report: ResearchReport = { id: '同符号/报告#1', symbol: 'TEST.US', generatedAt: 1, summary: '静态报告', stance: 'neutral', confidence: .6, runStatus: 'partial',
  sections: [{ key: 'valuation', title: '估值假设', summary: '仍有不确定性', verdict: 'unavailable', evidence: [] }, { key: 'valuation', title: '重复章节键', summary: '另一个章节', verdict: 'neutral', evidence: [] }],
  bullCase: [], bearCase: [], catalysts: [], risks: [], capabilityRuns: [] };

it('keeps snapshot actions static and gives simultaneous reports safe, unique section anchors', async () => {
  let requests = 0;
  (window as unknown as { electronAPI: unknown }).electronAPI = { research: { getDiff: async () => { requests++; return { ok: true, data: null }; } } };
  const container = document.createElement('div'); document.body.appendChild(container); const root = createRoot(container);
  try {
    await act(async () => root.render(<TestI18n><Provider store={createStore()}><ResearchReportView report={report} snapshotMode /><ResearchReportView report={report} snapshotMode /></Provider></TestI18n>));
    expect(requests).toBe(0); expect(container.querySelector('[data-testid="record-judgment"]')).toBeNull();
    const ids = Array.from(container.querySelectorAll('[id]')).map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    expect(ids.some(id => id.includes('%2F'))).toBe(true);
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('.desk-report-toc a'));
    expect(links).toHaveLength(6); expect(links.every(link => ids.includes(link.getAttribute('href')!.slice(1)))).toBe(true);
  } finally { await act(async () => root.unmount()); container.remove(); delete (window as unknown as { electronAPI?: unknown }).electronAPI; }
});
