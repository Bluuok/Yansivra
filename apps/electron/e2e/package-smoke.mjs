// Packaged resources and local Agent completion, launched outside the source repo.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasCompletedAssistantAnswer, isolatedEnv, newProfile, packagedBinary, waitForValue } from './runtime-support.mjs';

const { _electron } = createRequire(import.meta.url)('playwright-core');
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const profile = newProfile('Yansivra package smoke ');
const app = await _electron.launch({ executablePath: packagedBinary(repoRoot), args: [], cwd: profile,
  env: isolatedEnv(profile), timeout: 45_000 });
try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-testid="finance-workspace"]').waitFor({ timeout: 30_000 });
  const runtime = await app.evaluate(({ app }) => ({ packaged: app.isPackaged, resources: process.resourcesPath, profile: app.getPath('userData') }));
  assert.equal(runtime.packaged, true);
  assert.equal(runtime.profile, profile);
  assert.ok(!runtime.resources.startsWith(join(repoRoot, 'apps')), 'packaged resources do not resolve from source');
  assert.ok(existsSync(join(runtime.resources, 'skills')));
  for (const file of ['finagent/index.js', 'langsmith/index.js']) assert.ok(existsSync(join(runtime.resources, 'extensions', file)));
  assert.equal(await page.evaluate(() => Boolean(window.electronAPI)), true);
  console.log('PASS A: packaged renderer/preload/main and extension resources');
  const skills = await page.evaluate(() => window.electronAPI.skills.list());
  assert.equal(skills.ok, true);
  assert.ok(Array.isArray(skills.data) && skills.data.length >= 10);
  console.log(`PASS B: ${skills.data.length} packaged skills`);
  const tools = await page.evaluate(() => window.electronAPI.agent.getTools());
  assert.equal(tools.ok, true);
  const definitions = Array.isArray(tools.data) ? tools.data : tools.data?.data;
  assert.ok(Array.isArray(definitions));
  for (const name of ['get_quote', 'get_portfolio', 'get_market_depth', 'get_financials', 'get_calendar_events']) {
    assert.ok(definitions.some(tool => tool.name === name), `finance tool missing: ${name}`);
  }
  console.log('PASS C: finance tool registrations');
  const session = await page.evaluate(() => window.electronAPI.kernel.createSession('Package smoke'));
  assert.equal(session.ok, true);
  const started = await page.evaluate(sessionId => window.electronAPI.kernel.startRun({ sessionId, content: 'Hello, are you there?' }), session.data.id);
  assert.equal(started.ok, true);
  const evidence = await waitForValue(() => page.evaluate(async ({ sessionId, runId }) => {
    const result = await window.electronAPI.kernel.listRuns(sessionId);
    if (!result.ok) throw new Error('Packaged run inventory failed');
    const run = result.data.find(run => run.id === runId);
    if (!run || run.status === 'running') return false;
    const messages = await window.electronAPI.kernel.getMessages(sessionId);
    if (!messages.ok) throw new Error('Packaged message inventory failed');
    if (run.status === 'completed' && !messages.data.some(message => message.role === 'assistant' && message.content?.trim() === run.answer?.trim())) return false;
    return { run, messages: messages.data };
  }, { sessionId: session.data.id, runId: started.data.id }), { label: 'packaged Agent answer persistence' });
  assert.equal(hasCompletedAssistantAnswer(evidence.run, evidence.messages), true, 'local run completed with a persisted assistant answer');
  console.log('PASS D: local Agent completes with nonempty answer');
} finally { await app.close(); }
console.log('Packaged app smoke passed; no live provider calls.');
