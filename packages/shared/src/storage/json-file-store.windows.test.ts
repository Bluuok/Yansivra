import { describe, expect, it } from 'bun:test';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonFileStore } from './json-file-store.ts';

const windowsTest = process.platform === 'win32' ? it : it.skip;

async function holdWindowsFile(file: string, milliseconds: number) {
  const script = "$handle = [System.IO.File]::Open($env:YANSIVRA_LOCK_TARGET, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read); try { [Console]::Out.WriteLine('LOCK_READY'); [Console]::Out.Flush(); Start-Sleep -Milliseconds $env:YANSIVRA_LOCK_MS } finally { $handle.Dispose() }";
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, YANSIVRA_LOCK_TARGET: file, YANSIVRA_LOCK_MS: String(milliseconds) },
  });
  const closed = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`File lock helper exited ${code}`)));
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('File lock helper was not ready')); }, 10_000);
    let output = '';
    child.stdout.on('data', data => {
      output += String(data);
      if (output.includes('LOCK_READY')) { clearTimeout(timer); resolve(); }
    });
    child.stderr.resume();
    child.once('error', error => { clearTimeout(timer); reject(error); });
    void closed.catch(error => { clearTimeout(timer); reject(error); });
  });
  return { closed };
}

describe('JsonFileStore actual Windows sharing locks', () => {
  windowsTest('preserves the old JSON while locked and publishes after a transient lock releases', async () => {
    const root = await mkdtemp(join(tmpdir(), 'Yansivra 文件锁 transient '));
    try {
      const store = new JsonFileStore(root);
      await store.write('state.json', { version: 'old' });
      const { closed: unlocked } = await holdWindowsFile(join(root, 'state.json'), 300);
      expect(JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))).toEqual({ version: 'old' });
      try { await store.write('state.json', { version: 'new' }); }
      finally { await unlocked; }
      expect(JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))).toEqual({ version: 'new' });
      expect((await readdir(root)).filter(name => name.endsWith('.tmp'))).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15_000);

  windowsTest('reports an unreleased lock without deleting the last good file or leaking a temp file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'Yansivra 文件锁 persistent '));
    try {
      const store = new JsonFileStore(root);
      await store.write('state.json', { version: 'old' });
      const { closed: unlocked } = await holdWindowsFile(join(root, 'state.json'), 2500);
      try {
        await expect(store.write('state.json', { version: 'new' })).rejects.toMatchObject({ code: 'STORAGE_WRITE_FAILED' });
        expect(JSON.parse(await readFile(join(root, 'state.json'), 'utf8'))).toEqual({ version: 'old' });
        expect((await readdir(root)).filter(name => name.endsWith('.tmp'))).toEqual([]);
      } finally { await unlocked; }
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15_000);
});
