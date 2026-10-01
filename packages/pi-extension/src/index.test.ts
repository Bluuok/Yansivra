import { afterEach, describe, expect, it } from 'bun:test';
import { registerProviderOverrides, registerTools, tools } from './index.ts';

afterEach(() => {
  delete process.env.ANTHROPIC_BASE_URL;
  delete process.env.FINAGENT_PROVIDER_OVERRIDES;
});

describe('pi extension registration', () => {
  it('completes custom models for Pi without overwriting explicit limits or pricing', () => {
    process.env.FINAGENT_PROVIDER_OVERRIDES = JSON.stringify([{
      provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', api: 'openai-completions',
      models: [
        { id: 'minimal' },
        { id: 'full', name: 'Full', reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 4096, cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0 } },
      ],
    }]);
    let registered: Parameters<NonNullable<Parameters<typeof registerProviderOverrides>[0]['registerProvider']>>[1] | undefined;
    registerProviderOverrides({ registerTool: () => {}, registerProvider: (_name, config) => { registered = config; } });
    expect(registered?.models?.[0]).toEqual({ id: 'minimal', name: 'minimal', reasoning: false, input: ['text'], contextWindow: 128000, maxTokens: 8192, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } });
    expect(registered?.models?.[1]).toMatchObject({ name: 'Full', reasoning: true, input: ['text', 'image'], contextWindow: 1048576, maxTokens: 4096, cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0 } });
  });

  it('registers all finance tools', () => {
    const registered: string[] = [];

    registerTools({
      registerTool: (tool) => {
        registered.push(tool.name);
      },
    });

    expect(registered).toEqual(tools.map((tool) => tool.name));
  });

  it('does not point anthropic at a vendor relay when nothing is configured', () => {
    const previous = process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_BASE_URL;
    const calls: Array<{ name: string; config: { baseUrl?: string } }> = [];

    try {
      registerProviderOverrides({
        registerTool: () => undefined,
        registerProvider: (name, config) => {
          calls.push({ name, config });
        },
      });
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_BASE_URL = previous;
    }

    expect(calls).toEqual([]);
  });

  it('prefers ANTHROPIC_BASE_URL from the environment', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://example.test/anthropic';
    const calls: Array<{ name: string; config: { baseUrl?: string } }> = [];

    registerProviderOverrides({
      registerTool: () => undefined,
      registerProvider: (name, config) => {
        calls.push({ name, config });
      },
    });

    expect(calls[0]).toEqual({
      name: 'anthropic',
      config: { baseUrl: 'https://example.test/anthropic' },
    });
  });
});
