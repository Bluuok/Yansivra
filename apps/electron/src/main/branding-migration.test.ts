import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { upgradeProfile } from './branding-migration.ts';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'yansivra-upgrade-'));
  const source = join(root, 'old');
  const target = join(root, 'new');
  mkdirSync(join(source, 'store'), { recursive: true });
  return { source, target };
}

describe('profile branding upgrade', () => {
  test('copies history, rebrands linked identifiers and preserves secrets and source', () => {
    const { source, target } = fixture();
    const record = JSON.stringify({ folioRunId: 'run-1', datasetId: 'folio-agent-v1', answer: '```folio-block\n{}\n```', holdings: 'Portfolio', apiKey: 'Folio-sensitive', endpoint: 'https://folio.test' });
    writeFileSync(join(source, 'store', 'history.json'), record);
    writeFileSync(join(source, 'credentials.json'), 'opaque Folio encrypted bytes');
    writeFileSync(join(source, 'store', 'session.jsonl'), record + '\n\n');
    const result = upgradeProfile(source, target);
    expect(result.changedFiles).toBe(2);
    const next = JSON.parse(readFileSync(join(target, 'store', 'history.json'), 'utf8'));
    expect(next.yansivraRunId).toBe('run-1');
    expect(next.datasetId).toBe('yansivra-agent-v1');
    expect(next.answer).toContain('yansivra-block');
    expect(next.holdings).toBe('Portfolio');
    expect(next.apiKey).toBe('Folio-sensitive');
    expect(next.endpoint).toBe('https://folio.test');
    expect(readFileSync(join(target, 'credentials.json'), 'utf8')).toBe('opaque Folio encrypted bytes');
    expect(readFileSync(join(source, 'store', 'history.json'), 'utf8')).toBe(record);
    expect(JSON.parse(readFileSync(join(target, 'store', 'session.jsonl'), 'utf8').trim()).yansivraRunId).toBe('run-1');
  });

  test('does not overwrite or merge an existing destination', () => {
    const { source, target } = fixture();
    mkdirSync(target);
    writeFileSync(join(target, 'user.txt'), 'new data');
    expect(upgradeProfile(source, target).status).toBe('existing');
    expect(readFileSync(join(target, 'user.txt'), 'utf8')).toBe('new data');
    expect(existsSync(join(target, 'store'))).toBe(false);
  });

  test('does not publish malformed or conflicting records', () => {
    for (const text of ['invalid json', '{"folioRunId":"old","yansivraRunId":"new"}']) {
      const { source, target } = fixture();
      writeFileSync(join(source, 'store', 'record.json'), text);
      expect(() => upgradeProfile(source, target)).toThrow();
      expect(existsSync(target)).toBe(false);
      expect(readFileSync(join(source, 'store', 'record.json'), 'utf8')).toBe(text);
    }
  });

  test('rejects nested source and destination directories', () => {
    const { source } = fixture();
    expect(() => upgradeProfile(source, join(source, 'new'))).toThrow();
  });

  test('does not overwrite renamed record files', () => {
    const { source, target } = fixture();
    writeFileSync(join(source, 'store', 'folio.json'), '{"id":"old"}');
    writeFileSync(join(source, 'store', 'yansivra.json'), '{"id":"new"}');
    expect(() => upgradeProfile(source, target)).toThrow();
    expect(existsSync(target)).toBe(false);
  });
});
