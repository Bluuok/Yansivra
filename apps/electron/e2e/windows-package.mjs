import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { freshProfile, launchDesktop, closeDesktop, captureDesktop, repoRoot } from './desktop-harness.mjs';

assert.equal(process.platform, 'win32', 'this acceptance test runs on actual Windows');
const archive = resolve(process.env.FINAGENT_TEST_ARCHIVE ?? join(repoRoot, 'dist/electron/Folio-Desk-0.5.0-beta.1-win-x64.zip'));
assert.ok(existsSync(archive), 'build the Windows ZIP first');
const directory = mkdtempSync(join(tmpdir(), 'Folio 中文 解压 '));
execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  'Expand-Archive -LiteralPath $env:FOLIO_TEST_ARCHIVE -DestinationPath $env:FOLIO_TEST_EXTRACT -ErrorAction Stop'],
  { windowsHide: true, env: { ...process.env, FOLIO_TEST_ARCHIVE: archive, FOLIO_TEST_EXTRACT: directory } });
const executable = join(directory, 'Folio Desk.exe');
assert.ok(existsSync(executable));
const profile = freshProfile('Folio 中文 资料 ', tmpdir());
const { application, page } = await launchDesktop(profile, { executable });
try {
  const runtime = await application.evaluate(({ app, BrowserWindow }) => ({
    packaged: app.isPackaged, resources: process.resourcesPath, profile: app.getPath('userData'),
    extension: process.env.FINAGENT_PI_EXTENSION, title: BrowserWindow.getAllWindows()[0].getTitle(),
    version: app.getVersion(), prefs: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
  }));
  assert.equal(runtime.packaged, true);
  assert.equal(existsSync(join(runtime.resources, 'default_app.asar')), false, 'Electron default shell must not override Folio');
  assert.equal(runtime.profile, profile);
  assert.equal(runtime.version, '0.5.0-beta.1');
  assert.equal(runtime.title, 'Folio Desk');
  assert.equal(runtime.prefs.nodeIntegration, false);
  assert.equal(runtime.prefs.contextIsolation, true);
  assert.equal(runtime.prefs.sandbox, true);
  assert.equal(runtime.extension, join(runtime.resources, 'extensions/finagent/index.js'));
  for (const relative of ['extensions/finagent/index.js', 'extensions/langsmith/index.js', 'skills']) assert.ok(existsSync(join(runtime.resources, relative)));
  assert.ok(runtime.resources.startsWith(directory), 'resources resolve from the extracted app outside source');
  const skills = await page.evaluate(() => window.electronAPI.skills.list());
  assert.equal(skills.ok, true); assert.ok(skills.data.length >= 10);
  const tools = await page.evaluate(() => window.electronAPI.agent.getTools());
  assert.equal(tools.ok, true);
  const definitions = Array.isArray(tools.data) ? tools.data : tools.data.data;
  assert.ok(Array.isArray(definitions), 'existing tools API returns definitions');
  for (const name of ['get_quote', 'get_portfolio', 'get_financials']) assert.ok(definitions.some((tool) => tool.name === name));
  const session = await page.evaluate(() => window.electronAPI.kernel.createSession('Windows 包内本地测试'));
  assert.equal(session.ok, true);
  const start = await page.evaluate((sessionId) => window.electronAPI.kernel.startRun({ sessionId, content: '你好，请确认本地运行状态' }), session.data.id);
  assert.equal(start.ok, true);
  await page.waitForFunction(async ({ sessionId, runId }) => {
    const result = await window.electronAPI.kernel.listRuns(sessionId);
    const run = result.ok && result.data.find((run) => run.id === runId);
    return run && run.status !== 'running';
  }, { sessionId: session.data.id, runId: start.data.id }, { timeout: 30_000 });
  const runs = await page.evaluate((sessionId) => window.electronAPI.kernel.listRuns(sessionId), session.data.id);
  assert.equal(runs.data.find((run) => run.id === start.data.id).status, 'completed');
  const about = await page.evaluate(() => window.electronAPI.about.get());
  assert.equal(about.data.version, runtime.version);
  console.log(`PASS extracted unsigned ZIP outside source (${directory}): renderer, preload, main, ${skills.data.length} skills, bundled extension paths, finance tools, completed local Agent run, version and sandbox`);
  await captureDesktop(application, 'desktop-packaged.png');
  console.log(`PROFILE ${profile}`);
  console.log(`EXECUTABLE ${executable}`);
} finally { await closeDesktop(application); }
