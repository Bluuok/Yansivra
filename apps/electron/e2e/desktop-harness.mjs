import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { _electron } = require('playwright-core');
export const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = join(appRoot, '../..');
export const outputRoot = join(repoRoot, 'output');

export function freshProfile(prefix = '桌面测试 ') {
  mkdirSync(outputRoot, { recursive: true });
  const profile = mkdtempSync(join(outputRoot, prefix));
  writeFileSync(join(profile, 'app-preferences.json'), JSON.stringify({ locale: 'zh-CN' }));
  writeFileSync(join(profile, 'onboarding.json'), JSON.stringify({ completed: true }));
  return profile;
}

export async function launchDesktop(profile, options = {}) {
  const packaged = options.executable ?? process.env.FINAGENT_TEST_PACKAGE;
  const env = {
    ...process.env,
    FINAGENT_USER_DATA_DIR: profile,
    FINAGENT_AGENT_PROVIDER: 'local',
    FINAGENT_FORCE_PROD_LOAD: '1',
    FINAGENT_E2E: '1',
    FINAGENT_E2E_HIDDEN: '1',
    FINAGENT_DEMO_DATA: '0',
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({
    executablePath: packaged ?? require('electron'),
    args: packaged ? [] : [join(appRoot, 'src/main/index.js')],
    cwd: packaged ? profile : repoRoot,
    env,
    timeout: 45_000,
  });
  const page = await application.firstWindow({ timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-testid="finance-workspace"]').waitFor();
  // Persist the real main-process onboarding preference; never replace the IPC.
  await page.evaluate(async () => {
    if (window.electronAPI?.onboarding) await window.electronAPI.onboarding.setCompleted(true);
  });
  await page.reload();
  await page.locator('[data-testid="finance-workspace"]').waitFor();
  await page.locator('[data-testid="onboarding-overlay"]').waitFor({ state: 'hidden' });
  return { application, page };
}

export async function closeDesktop(application) {
  await application.close();
}
