import { resolve } from 'node:path';
import type { JudgmentEntry } from '@finagent/core';
import { JsonFileStore } from '../storage/json-file-store.ts';
import { createCodeError } from '../agent/errors.ts';
import { journalFileSchema } from './schema.ts';

export const JOURNAL_FILE = 'journal/entries.json';
const mutations = new Map<string, Promise<unknown>>();

export class JournalRepository {
  private readonly lockKey: string;
  constructor(private readonly store: JsonFileStore) {
    const file = resolve(store.resolve(JOURNAL_FILE));
    this.lockKey = process.platform === 'win32' ? file.toLowerCase() : file;
  }

  async read(): Promise<JudgmentEntry[]> {
    const raw = await this.store.read<unknown>(JOURNAL_FILE, { schemaVersion: 1, entries: [] });
    const result = journalFileSchema.safeParse(raw);
    if (!result.success) throw createCodeError('JOURNAL_CORRUPT', '判断记录文件格式损坏或版本不支持，已保留原文件。请恢复备份后重试。');
    return result.data.entries;
  }

  mutate<T>(operation: (entries: JudgmentEntry[]) => Promise<{ result: T; changed: boolean }>): Promise<T> {
    const previous = mutations.get(this.lockKey) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(async () => {
      const entries = await this.read();
      const outcome = await operation(entries);
      if (outcome.changed) {
        // Validate before publishing; never replace the last good file with an invalid result.
        const file = journalFileSchema.parse({ schemaVersion: 1, entries });
        await this.store.write(JOURNAL_FILE, file);
      }
      return structuredClone(outcome.result);
    });
    mutations.set(this.lockKey, pending);
    const cleanup = () => { if (mutations.get(this.lockKey) === pending) mutations.delete(this.lockKey); };
    void pending.then(cleanup, cleanup);
    return pending;
  }
}
