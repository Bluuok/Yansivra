import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { isolatedEnv } from './runtime-support.mjs';

const require = createRequire(import.meta.url);
const { _electron } = require('playwright-core');
export const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = join(appRoot, '../..');
export const outputRoot = join(repoRoot, 'output');

export function freshProfile(prefix = '桌面测试 ', directory = outputRoot) {
  mkdirSync(directory, { recursive: true });
  const profile = mkdtempSync(join(directory, prefix));
  writeFileSync(join(profile, 'app-preferences.json'), JSON.stringify({ locale: 'zh-CN' }));
  writeFileSync(join(profile, 'onboarding.json'), JSON.stringify({ completed: true }));
  return profile;
}

export async function launchDesktop(profile, options = {}) {
  const packaged = options.executable ?? process.env.FINAGENT_TEST_PACKAGE;
  const env = {
    ...isolatedEnv(profile),
    FINAGENT_DEMO_DATA: '0',
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({
    executablePath: packaged ?? require('electron'),
    args: packaged ? [] : [join(appRoot, 'src/main/index.js')],
    cwd: packaged ? profile : repoRoot,
    env,
    timeout: 45_000,
    ...(options.recordVideo ? { recordVideo: options.recordVideo } : process.env.FINAGENT_TEST_VIDEO_DIR ? { recordVideo: { dir: process.env.FINAGENT_TEST_VIDEO_DIR, size: { width: 1366, height: 768 } } } : {}),
  });
  try {
  const page = await application.firstWindow({ timeout: 30_000 });
  // Hidden acceptance windows must render current state for truthful captures.
  await application.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].webContents.setBackgroundThrottling(false);
  });
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[data-testid="finance-workspace"]').waitFor();
  // Persist the real main-process onboarding preference; never replace the IPC.
  await page.evaluate(async () => {
    if (window.electronAPI?.onboarding) {
      const result = await window.electronAPI.onboarding.setCompleted({ completed: true });
      if (!result.ok) throw new Error('Could not persist test onboarding through real IPC');
    }
  });
  await page.reload();
  await page.locator('[data-testid="finance-workspace"]').waitFor();
  await page.locator('[data-testid="onboarding-overlay"]').waitFor({ state: 'hidden' });
  return { application, page };
  } catch (error) { await application.close().catch(() => undefined); throw error; }
}

export async function captureDesktop(application, name) {
  // Hidden windows can lag one compositor frame behind DOM assertions.
  await new Promise((resolve) => setTimeout(resolve, 400));
  const png = await application.evaluate(async ({ BrowserWindow }) => {
    // Activate page painting for capture while keeping the native window hidden.
    const target = BrowserWindow.getAllWindows()[0];
    globalThis.__yansivraCapture = (async () => {
      await target.capturePage(undefined, { stayHidden: false, stayAwake: true });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return target.capturePage(undefined, { stayHidden: false, stayAwake: true });
    })();
    try { return (await globalThis.__yansivraCapture).toPNG().toString('base64'); }
    finally { delete globalThis.__yansivraCapture; }
  });
  let visible = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      visible = await application.evaluate(({ BrowserWindow }) => {
        globalThis.__yansivraVis = BrowserWindow.getAllWindows()[0].isVisible();
        return globalThis.__yansivraVis;
      });
      break;
    } catch (e) {
      if (String(e).includes('garbage collected') && attempt < 2) {
        await new Promise(r => setTimeout(r, 60));
        continue;
      }
      throw e;
    }
  }
  if (visible) throw new Error('Screenshot capture unexpectedly showed the hidden test window');
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, name), Buffer.from(png, 'base64'));
}

export async function closeDesktop(application) {
  await application.close();
}
