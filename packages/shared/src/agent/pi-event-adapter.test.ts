import { describe, expect, it } from 'bun:test';
import { PiEventAdapter } from './pi-event-adapter.ts';

function adapter(): PiEventAdapter {
  return new PiEventAdapter({ sessionId: 's1', runId: 'r1', now: () => 1 });
}

describe('PiEventAdapter provider usage (#17)', () => {
  it('reports a provider error as failed even after partial text', () => {
    const mapper = adapter();
    mapper.consume({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: 'partial' } });
    const events = mapper.consume({ type: 'agent_end', messages: [{ role: 'assistant', content: [], stopReason: 'error', errorMessage: 'Insufficient balance' }] });
    expect(events.map(event => event.type)).toEqual(['run_failed']);
    const failed = events.find(event => event.type === 'run_failed');
    expect(failed?.payload).toMatchObject({ error: { code: 'PI_PROVIDER_ERROR', message: 'Insufficient balance' } });
  });

  it('uses only the last assistant outcome after a recovered provider error', () => {
    const events = adapter().consume({ type: 'agent_end', messages: [
      { role: 'assistant', content: [], stopReason: 'error', errorMessage: 'old failure' },
      { role: 'assistant', content: [{ type: 'text', text: 'recovered' }], stopReason: 'stop' },
    ] });
    expect(events.at(-1)?.type).toBe('run_completed');
  });

  it('carries provider-reported usage into the completed message', () => {
    const events = adapter().consume({
      type: 'agent_end',
      messages: [
        { role: 'user', content: 'hi' },
        {
          role: 'assistant',
          content: 'ok',
          usage: { input: 1200, output: 300, cacheRead: 800, cacheWrite: 0, cost: 0.05, totalTokens: 2300 },
        },
      ],
    });

    const completed = events.find((event) => event.type === 'message_completed');
    expect(completed?.payload).toMatchObject({
      usage: { inputTokens: 1200, outputTokens: 300, costUsd: 0.05 },
    });
  });

  it('reads usage from the event itself when the runtime reports it there', () => {
    const events = adapter().consume({
      type: 'agent_end',
      usage: { inputTokens: 10, outputTokens: 4, costUsd: 0.001 },
    });

    const completed = events.find((event) => event.type === 'message_completed');
    expect(completed?.payload).toMatchObject({
      usage: { inputTokens: 10, outputTokens: 4, costUsd: 0.001 },
    });
  });

  it('omits usage when the provider reports none', () => {
    const events = adapter().consume({
      type: 'agent_end',
      messages: [{ role: 'assistant', content: 'ok' }],
    });

    const completed = events.find((event) => event.type === 'message_completed');
    expect(completed).toBeDefined();
    expect(completed?.payload).not.toHaveProperty('usage');
  });
});
