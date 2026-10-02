import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { freshProfile, launchDesktop, closeDesktop, outputRoot } from './desktop-harness.mjs';
import { seedReports } from './journal-ipc.mjs';
import { bounded, boundedCDP } from './frontend-capture.mjs';

// Labeled, disposable fixtures through the production storage and IPC.
const directory = join(outputRoot, 'frontend-validation/final');
mkdirSync(directory, { recursive: true });
const videoDirectory = join(directory, 'matrix-video');
mkdirSync(videoDirectory, { recursive: true });
const profile = freshProfile('前端最终验收 示例 ');
const report = seedReports(profile);
report.sections[0].summary = '示例长中文：核对增长假设、估值边界和证据缺口，保留不确定性。'.repeat(35);
report.sections.push({ key:'valuation', title:'风险边界（示例）', summary:'示例：引用缺失时不能推断已有充分依据。', verdict:'unavailable', evidence:[] });
writeFileSync(join(profile, `store/research/reports/${report.id}.json`), JSON.stringify(report));
writeFileSync(join(profile, 'store/research/runs.json'), JSON.stringify({ runs: [{
  id: 'prepared-partial-run', symbol: report.symbol, status: 'partial', startedAt: report.generatedAt,
  reportId: report.id, plannedCapabilities: ['market.quote', 'company.valuation', 'research.news'],
  completedCapabilities: ['company.valuation'], failedCapabilities: ['research.news'],
}] }));
const result = { fixture: true, sourceCommit: process.env.FOLIO_TEST_COMMIT ?? null, rows: [], screenshots: [], keyboard: {}, fonts: [] };
let desktop;
try {
  // Screencast keeps Chromium painting while the native window stays hidden.
  desktop = await launchDesktop(profile, { recordVideo: { dir: videoDirectory, size: { width:1366, height:768 } } });
  const { application, page } = desktop;
  page.setDefaultTimeout(15000);
  const cdp = boundedCDP(await page.context().newCDPSession(page));
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const created = await page.evaluate(id => window.electronAPI.journal.createFromReport({ requestId: 'frontend-design-entry', reportId: id,
    judgment: { stance: 'neutral', rationale: '示例判断：保留增长假设与缺失依据。'.repeat(18), assumptions: ['示例假设'], invalidationConditions: ['示例失效条件'] }, reviewAt: Date.now() - 86400000 }), report.id);
  assert.equal(created.ok, true);
  await page.reload();
  await page.locator('[data-testid="pending-review"]').waitFor();
  const click = selector => page.locator(selector).evaluate(node => node.click());
  const nav = async name => {
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name, exact: true }).evaluate(node => node.click());
  };
  const openReport = async () => {
    await nav('总览');
    await page.locator('[data-testid="today-continue-research"] li').filter({ hasText: report.summary }).getByRole('button').evaluate(node => node.click());
    await page.locator('[data-testid="record-judgment"]').waitFor();
  };
  const capture = async name => {
    console.log(`CAPTURE ${name}`);
    const png = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    assert.ok(png.data.length > 1000, 'nonempty screenshot');
    writeFileSync(join(directory, `${name}.png`), Buffer.from(png.data, 'base64'));
    result.screenshots.push(`${name}.png`);
    let hidden = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        hidden = !(await application.evaluate(({ BrowserWindow }) => {
          globalThis.__folioWinVis = BrowserWindow.getAllWindows()[0].isVisible();
          return globalThis.__folioWinVis;
        }));
        break;
      } catch (e) {
        if (String(e).includes('garbage collected') && attempt < 2) {
          await new Promise(r => setTimeout(r, 60));
          continue;
        }
        throw e;
      }
    }
    assert.equal(hidden, true);
  };
  await openReport();
  const trigger = page.locator('[data-testid="inspect-evidence"]').first();
  await trigger.focus(); await page.keyboard.press('Enter');
  await page.locator('[data-testid="evidence-inspector"]').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('[data-testid="evidence-inspector"] h2')), true);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(node => document.activeElement === node), true);
  result.keyboard.openAndEscape = true;
  await trigger.focus(); await page.keyboard.press('Enter');
  await page.locator('[data-testid="research-report-select"]').selectOption('prepared-new-report');
  await page.locator('[data-testid="evidence-inspector"]').getByRole('button', { name: '关闭检视栏', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('[data-testid="research-report-heading"]')), true);
  result.keyboard.changedReportFallback = true;
  await click('[data-testid="research-back-origin"]');
  await page.locator('[data-testid="today-view"]').waitFor();
  result.keyboard.backToOverview = true;
  await openReport();
  const content = page.locator('.folio-pilot-research-content');
  await content.evaluate(node => { node.scrollTop = 0; });
  const link = page.locator('.desk-report-toc a').first();
  await link.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.matches('.folio-pilot-report-section')), true);
  assert.ok(await content.evaluate(node => node.scrollTop) > 0);
  result.keyboard.tocContainer = true;
  await content.evaluate(node => { node.scrollTop = 0; });
  const flow = page.locator('[data-testid="research-flow-map"]');
  await flow.waitFor(); assert.equal(await flow.getAttribute('data-run-id'), 'prepared-partial-run');
  assert.equal(await flow.locator('[role="progressbar"]').getAttribute('aria-valuenow'), '66');
  assert.ok((await flow.innerText()).includes('1 失败'));
  result.persistedPartialFlow = true;

  const sizes = [{ name:'1366', width:1366, height:768, zoom:1 }, { name:'1920', width:1920, height:1080, zoom:1 },
    { name:'narrow800', width:800, height:768, zoom:1 }, { name:'zoom125', width:1366, height:768, zoom:1.25 }, { name:'zoom150', width:1366, height:768, zoom:1.5 }];
  for (const size of sizes) {
    // Native content sizing only: do not divide twice through CDP viewport emulation.
    await application.evaluate(({ BrowserWindow }, s) => { const w = BrowserWindow.getAllWindows()[0]; w.webContents.setZoomFactor(1); w.setContentSize(s.width,s.height); w.webContents.setZoomFactor(s.zoom); }, size);
    await page.waitForTimeout(200);
    for (const motion of ['normal','reduced']) {
      await page.emulateMedia({ reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' });
      for (const theme of ['light','dark']) {
        await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
        for (const [name, label, testid] of [['overview','总览','today-view'], ['research','研究','research-report'], ['journal','复盘','journal-view']]) {
          await nav(label); await page.locator(`[data-testid="${testid}"]`).waitFor();
          if (name === 'overview') await page.locator('[data-testid="today-continue-research"] li').filter({ hasText: report.summary }).waitFor();
          if (name === 'journal') await page.locator('[data-testid="judgment-original-rationale"]').waitFor();
          await page.waitForTimeout(650);
          const metrics = await page.evaluate(() => {
            const doc = document.documentElement;
            const node = document.querySelector('[data-testid="today-view"], .folio-pilot-research-content, [data-testid="journal-view"]');
            const running = document.getAnimations().filter(a => a.playState === 'running');
            return { innerWidth, innerHeight, clientWidth: doc.clientWidth, scrollWidth: doc.scrollWidth, dpr:devicePixelRatio,
              contentWidth: node?.clientWidth, contentScrollWidth: node?.scrollWidth,
              running: running.length, animations:running.map(a => ({ infinite:a.effect?.getTiming().iterations === Infinity, target:a.effect?.target?.className })) };
          });
          result.rows.push({ size:size.name, zoom:size.zoom, name, theme, motion, ...metrics });
          console.log(`CASE ${result.rows.length}: ${size.name}/${name}/${theme}/${motion} ${metrics.clientWidth}x${metrics.innerHeight}`);
          writeFileSync(join(directory,'frontend-design-report.json'), JSON.stringify(result,null,2));
          assert.ok(metrics.scrollWidth <= metrics.clientWidth + 1, `page overflow ${JSON.stringify(result.rows.at(-1))}`);
          assert.ok(metrics.contentScrollWidth <= metrics.contentWidth + 1, `content overflow ${JSON.stringify(result.rows.at(-1))}`);
          assert.equal(metrics.running, 0, `terminal animations ${JSON.stringify(result.rows.at(-1))}`);
          if (size.name === '1366' || (name === 'overview' && motion === 'normal' && theme === 'light')) await capture(`${size.name}-${name}-${theme}-${motion}`);
        }
      }
    }
  }
  await application.evaluate(({ BrowserWindow }) => { const w=BrowserWindow.getAllWindows()[0];w.webContents.setZoomFactor(1);w.setContentSize(1366,768); });
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await nav('研究'); await content.evaluate(node => { node.scrollTop = 0; });
  for (const theme of ['light','dark']) {
    await page.evaluate(dark => document.documentElement.classList.toggle('dark',dark),theme==='dark');
    await page.locator('[data-testid="research-report-heading"]').evaluate(node => {
      const scroller=node.closest('.folio-pilot-research-content');
      scroller.scrollTop+=node.getBoundingClientRect().top-scroller.getBoundingClientRect().top-24;
    });
    await page.waitForTimeout(650);await capture(`report-reading-${theme}`);
    await trigger.focus(); await page.keyboard.press('Enter');
    await page.locator('[data-testid="evidence-inspector"]').waitFor({state:'visible'});
    await page.waitForTimeout(250); await capture(`evidence-${theme}-open`);
    await page.locator('[data-testid="inspect-evidence"]').nth(1).evaluate(node=>node.click());
    assert.ok((await page.locator('.desk-inspector-content h3').innerText()).includes('风险边界'));
    await capture(`evidence-${theme}-changed`);
    await page.keyboard.press('Escape');
  }
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const dom = await cdp.send('DOM.getDocument');
  for (const selector of ['.desk-report-confidence-note','.folio-pilot-confidence']) {
    const node = await cdp.send('DOM.querySelector', { nodeId:dom.root.nodeId, selector });
    assert.ok(node.nodeId,`font target exists ${selector}`);
    const fonts = await cdp.send('CSS.getPlatformFontsForNode', { nodeId:node.nodeId });
    assert.ok(fonts.fonts.length,`real font rendered ${selector}`); result.fonts.push({ selector, ...fonts });
  }
  result.passed = true;
  console.log(`PASS ${result.rows.length} actual page/theme/motion/size cases, keyboard, persisted partial flow`);
} catch (error) {
  result.error = String(error.stack ?? error); throw error;
} finally {
  writeFileSync(join(directory,'frontend-design-report.json'), JSON.stringify(result,null,2));
  if (desktop) await bounded(closeDesktop(desktop.application), 'close desktop', 10000);
}
