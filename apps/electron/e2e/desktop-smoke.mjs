import assert from 'node:assert/strict';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { freshProfile, launchDesktop, closeDesktop, outputRoot } from './desktop-harness.mjs';

const { application, page } = await launchDesktop(freshProfile());
try {
  const hasBridge = await page.evaluate(() => Boolean(window.electronAPI?.research?.getReport));
  assert.equal(hasBridge, true, 'real preload research bridge');
  const skills = await page.evaluate(() => window.electronAPI.skills.list());
  assert.equal(skills.ok, true, 'real main-process skill loading');
  assert.ok(skills.data.length >= 10, 'bundled skills are available');
  console.log(`PASS real Electron renderer/preload/main + ${skills.data.length} skills`);
  await page.locator('[data-testid="today-view"]').waitFor();
  assert.equal(await page.locator('[data-testid="agent-panel"]').isVisible(), false, 'assistant starts collapsed');
  const nav = page.locator('[data-testid="sidebar"]');
  for (const name of ['总览', '研究', '复盘', '资产']) assert.equal(await nav.getByRole('button', { name, exact: true }).count(), 1);
  console.log('PASS four primary routes + research-first overview + collapsed assistant');
  for (const [name, testId] of [['研究', 'research-panel'], ['复盘', 'journal-view'], ['资产', 'portfolio-view']]) {
    await nav.getByRole('button', { name, exact: true }).click();
    await page.locator(`[data-testid="${testId}"]`).waitFor();
  }
  await nav.getByRole('button', { name: '复盘', exact: true }).click();
  await page.getByRole('button', { name: '投资逻辑', exact: true }).click();
  await page.locator('[data-testid="thesis-panel"]').waitFor();
  await nav.getByRole('button', { name: '总览', exact: true }).click();
  console.log('PASS actual primary page navigation and preserved investment-thesis entry');
  await page.locator('[data-testid="assistant-toggle"]').click();
  await nav.getByRole('button', { name: '高级工具', exact: true }).click();
  await nav.getByRole('button', { name: '会话', exact: true }).click();
  await nav.getByRole('button', { name: '新建会话', exact: true }).click();
  const input = page.locator('[data-testid="agent-input"]').first();
  await input.waitFor();
  await input.fill('未提交的研究问题');
  await page.locator('[data-testid="assistant-toggle"]').click();
  await page.locator('[data-testid="assistant-toggle"]').click();
  assert.equal(await input.inputValue(), '未提交的研究问题', 'assistant draft survives layout toggle');
  await page.locator('[data-testid="assistant-toggle"]').click();
  await nav.getByRole('button', { name: '总览', exact: true }).click();
  console.log('PASS assistant draft retained across layout changes');
  const cancellation = await page.evaluate(async () => {
    const started = await window.electronAPI.research.start({ symbol: 'NVDA.US', strategyId: 'comprehensive' });
    if (!started.ok) return { started };
    const cancelled = await window.electronAPI.research.cancel({ runId: started.data.id });
    const run = await window.electronAPI.research.getRun({ runId: started.data.id });
    return { started, cancelled, run };
  });
  assert.equal(cancellation.started.ok, true, JSON.stringify(cancellation));
  assert.equal(cancellation.cancelled.ok, true, JSON.stringify(cancellation));
  assert.equal(cancellation.run.data.status, 'cancelled');
  console.log('PASS real research start/cancel and persisted cancelled status');
  const sizes = [
    { width: 1366, height: 768, zoom: 1, name: '1366' },
    { width: 1920, height: 1080, zoom: 1, name: '1920' },
    { width: 1366, height: 768, zoom: 1.25, name: '125-percent' },
    { width: 1920, height: 1080, zoom: 1.25, name: '1920-125-percent' },
    { width: 1366, height: 768, zoom: 1.5, name: '1366-150-percent' },
    { width: 1920, height: 1080, zoom: 1.5, name: '150-percent' },
  ];
  for (const size of sizes) {
    await application.evaluate(({ BrowserWindow }, s) => {
      // Retain the resize promise while CDP awaits a hidden-window frame.
      globalThis.__yansivraResize = new Promise((resolve) => {
        const target = BrowserWindow.getAllWindows()[0];
        target.setSize(s.width, s.height);
        target.webContents.setZoomFactor(s.zoom);
        setTimeout(() => resolve(true), 100);
      });
      return globalThis.__yansivraResize;
    }, size);
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `no horizontal page overflow: ${size.name}`);
    await page.locator('[data-testid="assistant-toggle"]').click();
    await page.waitForTimeout(100);
    const layout = await page.evaluate(() => {
      const center = document.querySelector('[data-testid="finance-workspace"]').getBoundingClientRect();
      const assistant = document.querySelector('[data-testid="agent-panel"]').getBoundingClientRect();
      return { center: center.width, assistant: assistant.width, right: assistant.right, viewport: innerWidth };
    });
    assert.ok(layout.center >= 319 && layout.assistant >= 279 && layout.right <= layout.viewport + 1, `both panes fit when opened: ${size.name} ${JSON.stringify(layout)}`);
    await page.locator('[data-testid="assistant-toggle"]').click();
    if (size.zoom === 1) {
      const capture = await application.evaluate(async ({ BrowserWindow }) => {
        globalThis.__yansivraCapture = BrowserWindow.getAllWindows()[0].capturePage(undefined, { stayHidden: true, stayAwake: true });
        try { return (await globalThis.__yansivraCapture).toPNG().toString('base64'); }
        finally { delete globalThis.__yansivraCapture; }
      });
      assert.ok(capture.length > 1000, 'nonempty hidden-window capture');
      writeFileSync(join(outputRoot, `desktop-${size.name}.png`), Buffer.from(capture, 'base64'));
    }
    console.log(`PASS Windows viewport ${size.name}`);
  }
  const details = await application.evaluate(({ app, BrowserWindow }) => ({
    packaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    title: BrowserWindow.getAllWindows()[0].getTitle(),
  }));
  console.log(JSON.stringify(details));
  console.log('Local provider and explicitly labeled demo data; live market/LLM not exercised.');
} finally {
  await closeDesktop(application);
}
