import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { delimiter, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export function electronBinary(appRoot) {
  return createRequire(join(appRoot, 'package.json'))('electron');
}

export function packagedBinary(repoRoot, platform = process.platform, product = 'Yansivra') {
  const dist = join(repoRoot, 'dist/electron');
  const candidates = platform === 'win32' ? [join(dist, 'win-unpacked', `${product}.exe`)]
    : platform === 'darwin' ? [process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'mac', 'mac-arm64', 'mac-x64']
      .map(directory => join(dist, directory, `${product}.app/Contents/MacOS/${product}`)) : [];
  const binary = candidates.find(candidate => existsSync(candidate));
  if (!binary) throw new Error(`No ${product} package for ${platform} under ${dist}; build the local package first.`);
  return binary;
}

export function newProfile(prefix = 'Yansivra test ') {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function isolatedEnv(profile, { offline = true, visible = false, base = process.env } = {}) {
  const env = { ...base, FINAGENT_USER_DATA_DIR: profile, FINAGENT_AGENT_PROVIDER: 'local',
    FINAGENT_FORCE_PROD_LOAD: '1', FINAGENT_E2E: '1', FINAGENT_E2E_HIDDEN: visible ? '0' : '1',
    FINAGENT_E2E_VISIBLE: visible ? '1' : '0', FINAGENT_ENV_FILE: join(profile, '.missing-test-env') };
  delete env.ELECTRON_RUN_AS_NODE;
  if (offline) {
    // A clean profile must not borrow the host's authenticated CLI or API keys.
    for (const key of Object.keys(env)) {
      if (/(?:API_KEY|ACCESS_TOKEN|PROVIDER_OVERRIDES)$/.test(key) || key === 'FINAGENT_ENV_FILE_CONTENT') delete env[key];
    }
    const entries = (base.PATH ?? base.Path ?? '').split(delimiter).filter(entry => entry &&
      !['longbridge', 'longbridge.exe', 'longbridge.cmd', 'longbridge.bat'].some(name => existsSync(join(entry.replace(/^"|"$/g, ''), name))));
    delete env.Path;
    env.PATH = entries.join(delimiter);
  }
  return env;
}

export function buildForE2E(appRoot) {
  if (process.env.FINAGENT_SKIP_E2E_BUILD !== '1') {
    execFileSync('bun', ['run', 'build'], { cwd: appRoot, stdio: 'inherit' });
  }
  for (const file of ['src/main/index.js', 'src/preload/index.cjs', 'dist/renderer/index.html']) {
    if (!existsSync(join(appRoot, file))) throw new Error(`Required E2E build missing: ${file}`);
  }
}

export function hasCompletedAssistantAnswer(run, messages) {
  return run?.status === 'completed' && typeof run.answer === 'string' && Boolean(run.answer.trim()) &&
    Array.isArray(messages) && messages.some(message => message.role === 'assistant' && message.content?.trim() === run.answer.trim());
}

export async function debugPort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

export async function stopOwnedProcess(child) {
  if (!child || !Number.isInteger(child.pid) || child.pid <= 0 || child.exitCode !== null || child.signalCode) return;
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }); }
    catch { if (child.exitCode === null) throw new Error(`Owned Electron process ${child.pid} did not exit`); }
    return;
  }
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill();
  let timer;
  const ended = await Promise.race([exited.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), 5000); })]);
  clearTimeout(timer);
  if (!ended) child.kill('SIGKILL');
}

// Await IPC predicates in Node; a browser-side Promise is not a truthy result.
export async function waitForValue(probe, { timeoutMs = 30_000, intervalMs = 100, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await probe();
    if (value) return value;
    await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms`);
}
