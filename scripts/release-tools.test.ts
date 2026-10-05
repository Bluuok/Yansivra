import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platformArtifacts, stageArtifacts } from './release-artifacts.mjs';
import { runReleaseChecks } from './release-check.mjs';
import { hasCompletedAssistantAnswer, isolatedEnv, packagedBinary, waitForValue } from '../apps/electron/e2e/runtime-support.mjs';

const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });
const temp = () => { const path = mkdtempSync(join(tmpdir(), 'Yansivra 工程 回归 ')); temporary.push(path); return path; };

test('local release packaging cannot auto-publish on either supported host', () => {
  for (const platform of ['win32', 'darwin']) {
    const args = platformArtifacts(platform).builderArgs;
    expect(args[args.indexOf('--publish') + 1]).toBe('never');
  }
});

test('configured macOS PNG icon meets the native converter minimum size', () => {
  const metadata = JSON.parse(readFileSync(new URL('../apps/electron/package.json', import.meta.url), 'utf8'));
  const icon = readFileSync(new URL('../apps/electron/' + metadata.build.mac.icon, import.meta.url));
  expect(icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(icon.readUInt32BE(16)).toBeGreaterThanOrEqual(512);
  expect(icon.readUInt32BE(20)).toBeGreaterThanOrEqual(512);
});

test('Windows staging copies only current ZIP and writes a portable known SHA-256', () => {
  const directory = temp();
  writeFileSync(join(directory, 'Yansivra-0.5.0-beta.1-win-x64.zip'), 'abc');
  writeFileSync(join(directory, 'Yansivra-0.4.0-win-x64.zip'), 'old');
  writeFileSync(join(directory, 'Yansivra-0.5.0-beta.1-mac-arm64.dmg'), 'mac');
  writeFileSync(join(directory, 'Yansivra-0.5.0-beta.1-mac-arm64.zip'), 'foreign zip');
  writeFileSync(join(directory, 'Yansivra-0.5.0-beta.1-win-arm64.zip'), 'other architecture');
  const destination = join(directory, 'release with spaces');
  const result = stageArtifacts({ directory, destination, platform: 'win32', productName: 'Yansivra', version: '0.5.0-beta.1' });
  expect(result.names).toEqual(['Yansivra-0.5.0-beta.1-win-x64.zip']);
  expect(readFileSync(join(destination, 'SHA256SUMS.txt'), 'utf8')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  Yansivra-0.5.0-beta.1-win-x64.zip\n');
  expect(readFileSync(join(destination, result.names[0]), 'utf8')).toBe('abc');
});

test('missing native artifact and unsupported host fail instead of staging a stale foreign package', () => {
  const directory = temp();
  writeFileSync(join(directory, 'Yansivra-1-win-x64.zip'), 'windows');
  expect(() => stageArtifacts({ directory, destination: join(directory, 'release'), platform: 'darwin', productName: 'Yansivra', version: '1' })).toThrow('No Yansivra-1-');
  expect(() => platformArtifacts('linux')).toThrow('not configured');
});

test('release failure stops before package or subsequent gates', () => {
  const calls: string[][] = [];
  const gates = [{ name: 'tests', args: ['test', '--isolate'] }, { name: 'package', args: ['run', 'release:package'] }];
  const status = runReleaseChecks({ gates, platform: 'win32', logger: { log() {}, error() {} },
    runner: (_command, args) => { calls.push(args); return { status: 2 }; } });
  expect(status).toBe(1);
  expect(calls).toEqual([['test', '--isolate']]);
});

test('spawn failure is not a successful release gate', () => {
  const status = runReleaseChecks({ gates: [{ name: 'missing tool', args: ['test'] }], platform: 'win32',
    logger: { log() {}, error() {} }, runner: () => ({ status: null, error: new Error('ENOENT') }) });
  expect(status).toBe(1);
});

test('packaged binary lookup supports Windows without requiring a macOS app', () => {
  const root = temp();
  mkdirSync(join(root, 'dist/electron/win-unpacked'), { recursive: true });
  const executable = join(root, 'dist/electron/win-unpacked/Yansivra.exe');
  writeFileSync(executable, 'fixture');
  expect(packagedBinary(root, 'win32')).toBe(executable);
  expect(() => packagedBinary(root, 'darwin')).toThrow('No Yansivra package');
});

test('offline app environment cannot borrow real env selectors or API credentials', () => {
  const profile = temp();
  const original = { PATH: '', ELECTRON_RUN_AS_NODE: '1', FINAGENT_ENV_FILE: 'private.env', MASSIVE_API_KEY: 'fake-test-only',
    FINAGENT_E2E_VISIBLE: '1', FINAGENT_USER_DATA_DIR: 'unrelated-user-profile' };
  const env = isolatedEnv(profile, { base: original });
  expect(env.FINAGENT_USER_DATA_DIR).toBe(profile);
  expect(env.FINAGENT_ENV_FILE).toBe(join(profile, '.missing-test-env'));
  expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined();
  expect(env.MASSIVE_API_KEY).toBeUndefined();
  expect(env.FINAGENT_E2E_VISIBLE).toBe('0');
  expect(original.FINAGENT_USER_DATA_DIR).toBe('unrelated-user-profile');
});

test('a rendered user prompt alone cannot satisfy the Agent success assertion', () => {
  const messages = [{ role: 'user', content: 'NVDA 最近走势怎么样？' }];
  expect(/NVDA|走势/.test(messages[0].content)).toBe(true);
  expect(hasCompletedAssistantAnswer({ status: 'running' }, messages)).toBe(false);
  expect(hasCompletedAssistantAnswer({ status: 'failed', answer: 'NVDA test' }, messages)).toBe(false);
  expect(hasCompletedAssistantAnswer({ status: 'completed', answer: 'NVDA test' }, messages)).toBe(false);
});

test('success requires a completed run with its nonempty persisted assistant answer', () => {
  const run = { status: 'completed', answer: 'Local NVDA answer' };
  const messages = [{ role: 'user', content: 'question' }, { role: 'assistant', content: run.answer }];
  expect(hasCompletedAssistantAnswer(run, messages)).toBe(true);
  expect(hasCompletedAssistantAnswer({ ...run, status: 'cancelled' }, messages)).toBe(false);
  expect(hasCompletedAssistantAnswer({ ...run, answer: ' ' }, messages)).toBe(false);
});

test('asynchronous IPC probes must await false before polling for the real value', async () => {
  let calls = 0;
  const value = await waitForValue(async () => { await Promise.resolve(); return ++calls < 3 ? false : { completed: true }; },
    { timeoutMs: 1000, intervalMs: 1 });
  expect(calls).toBe(3);
  expect(value).toEqual({ completed: true });
});

test('an asynchronously resolved false condition times out instead of reporting success', async () => {
  await expect(waitForValue(async () => false, { timeoutMs: 10, intervalMs: 1, label: 'answer persistence' }))
    .rejects.toThrow('Timed out waiting for answer persistence');
});
