// Fresh packaged user, no borrowed env/CLI credentials: complete onboarding and restart.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedLocale } from './seed-locale.mjs';
import { isolatedEnv, newProfile, packagedBinary, waitForValue } from './runtime-support.mjs';

const { _electron } = createRequire(import.meta.url)('playwright-core');
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const executablePath = packagedBinary(repoRoot);
const profile = newProfile('Yansivra fresh install ');
seedLocale(profile, 'en-US');
const launch = () => _electron.launch({ executablePath, args: [], cwd: profile,
  env: isolatedEnv(profile), timeout: 45_000 });
let app = await launch();
try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  const wizard = page.locator('[data-testid="onboarding-wizard"]');
  await wizard.waitFor({ timeout: 30_000 });
  assert.match(await wizard.textContent(), /Welcome to Yansivra/);
  console.log('PASS F1: fresh packaged profile shows welcome');
  const next = page.locator('[data-testid="onboarding-continue"]');
  assert.equal(await next.isDisabled(), true);
  await page.locator('[data-testid="disclaimer-accept"]').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="onboarding-continue"]')?.disabled);
  console.log('PASS F2: disclaimers gate Continue');
  await next.click();
  await page.waitForFunction(() => /Connect AI/i.test(document.querySelector('[data-testid="onboarding-wizard"]')?.textContent ?? ''));
  await page.locator('[data-testid="onboarding-skip"]').click();
  await waitForValue(() => page.evaluate(async () => {
    const result = await window.electronAPI.onboarding.getCompleted();
    return result.ok && result.data === true;
  }), { label: 'onboarding completion persistence' });
  console.log('PASS F3: Connect AI + Skip persist completion through real IPC');
  await page.locator('[data-testid="onboarding-overlay"]').waitFor({ state: 'hidden' });
  await page.locator('[data-testid="finance-workspace"]').waitFor();
  console.log('PASS F4: workbench renders after onboarding');
} finally { await app.close(); }
app = await launch();
try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-testid="finance-workspace"]').waitFor();
  const saved = await page.evaluate(() => window.electronAPI.onboarding.getCompleted());
  assert.deepEqual(saved, { ok: true, data: true });
  await page.locator('[data-testid="onboarding-overlay"]').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => localStorage.getItem('yansivra.onboarding.completed.v1')), '1');
  console.log('PASS F5: restarted packaged app retains onboarding completion');
} finally { await app.close(); }
console.log(`Fresh-install E2E passed (${process.platform}, isolated profile).`);
