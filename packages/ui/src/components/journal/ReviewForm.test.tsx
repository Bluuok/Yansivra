import { beforeAll, afterAll, it, expect } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, createStore } from 'jotai';
import type { JudgmentEntry } from '@finagent/core';
import { TestI18n } from '../../test/testI18n';
import { installHappyDom } from '../../test/setupHappyDom';
import { FinagentClientProvider, fallbackClient } from '../../client';
import { reviewDraftAtomFamily } from '../../atoms/journalAtoms';
import { ReviewForm } from './ReviewForm';
let restore: () => void;
beforeAll(() => { restore = installHappyDom().restore; }); afterAll(() => restore());

it('retains draft and request identity on write failure; announces success only after retry succeeds', async () => {
  const store = createStore(); const atom = reviewDraftAtomFamily('fixture-entry');
  store.set(atom, { requestId: 'retry-once', verdict: 'insufficient_data', observations: '还有不确定性', lessons: '先核对证据' });
  const inputs: string[] = []; let fail = true; let saved = 0;
  const client = { ...fallbackClient, journal: { ...fallbackClient.journal,
    addReview: async (input: { requestId: string }) => { inputs.push(input.requestId); return fail ? { ok: false as const, error: { code: 'STORAGE_WRITE_FAILED', message: 'locked' } } : { ok: true as const, data: { id: 'fixture-entry', reviews: [{ id: 'new-review' }] } as JudgmentEntry }; },
  } };
  const container = document.createElement('div'); document.body.appendChild(container); const root = createRoot(container);
  try {
    await act(async () => root.render(<TestI18n><Provider store={store}><FinagentClientProvider client={client}><ReviewForm entryId="fixture-entry" onSaved={() => saved++} /></FinagentClientProvider></Provider></TestI18n>));
    const submit = async () => act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await submit(); expect(store.get(atom).observations).toBe('还有不确定性'); expect(store.get(atom).requestId).toBe('retry-once'); expect(saved).toBe(0); expect(container.querySelector('[role="status"]')).toBeNull();
    fail = false; await submit(); expect(inputs).toEqual(['retry-once', 'retry-once']); expect(saved).toBe(1); expect(store.get(atom).observations).toBe(''); expect(store.get(atom).requestId).not.toBe('retry-once'); expect(container.querySelector('[role="status"]')?.textContent).toBe('Review saved');
  } finally { await act(async () => root.unmount()); container.remove(); }
});
