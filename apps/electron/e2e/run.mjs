// Yansivra E2E golden-path smoke — plain Node runner (playwright-core's CDP
// WebSocket handshake is unreliable under Bun; Node drives it reliably).
//
//   FINAGENT_AGENT_PROVIDER=local bun run test:e2e
//
// Steps (each prints PASS/FAIL; exits 1 on any failure):
//   A. three-pane workbench renders + session bootstrap
//   B. NVDA.US click → security header + agent context chip
//   C. rapid symbol switching settles on the last symbol
//   D. agent run streams an answer using the workspace symbol

import { spawn } from 'node:child_process';
import { buildForE2E, debugPort, electronBinary as installedElectron, hasCompletedAssistantAnswer, isolatedEnv, newProfile, stopOwnedProcess, waitForValue } from './runtime-support.mjs';
import { seedLocale } from './seed-locale.mjs';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, '..');
const repoRoot = join(here, '../../..');
const electronMain = join(appRoot, 'src/main/index.js');
const electronBinary = installedElectron(appRoot);

const CDP_PORT = await debugPort();
const CDP_URL = `http://127.0.0.1:${CDP_PORT}`;

// FINAGENT_E2E_KEEP_OPEN=1 — debugging only, NEVER in automated runs: leave
// the app running when the harness finishes and print where it is, instead of
// killing it. Automated runs/CI close only their owned child process.
const KEEP_OPEN = process.env.FINAGENT_E2E_KEEP_OPEN === '1';

let failures = 0;

function pass(name) {
  console.log(`PASS  ${name}`);
}

function fail(name, error) {
  failures += 1;
  console.error(`FAIL  ${name}`);
  console.error(String(error?.stack ?? error).slice(0, 2000));
}

async function waitForPage(context, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pages = context.pages();
    if (pages.length > 0) return pages[pages.length - 1];
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('No renderer page appeared in time');
}

async function waitForCdp(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${CDP_URL}/json/version`);
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Electron CDP endpoint did not come up in time.');
}

async function main() {
  if (!existsSync(electronBinary)) {
    console.error(`Electron binary not found: ${electronBinary}`);
    process.exit(1);
  }
  buildForE2E(appRoot);
  const userDataDir = newProfile('Yansivra golden path ');
  seedLocale(userDataDir, 'en-US');
  const electronProcess = spawn(
    electronBinary,
    [electronMain, `--remote-debugging-port=${CDP_PORT}`, '--no-sandbox'],
    {
      cwd: repoRoot,
      stdio: 'ignore',
      env: {
        ...isolatedEnv(userDataDir, { offline: false, visible: process.argv.includes('--visible') }),
      },
    }
  );

  let browser;
  try {
    await waitForCdp(60_000);
    browser = await chromium.connectOverCDP(CDP_URL, { timeout: 30_000 });
    const context = browser.contexts()[0];
    const page = await waitForPage(context, 30_000);
    await page.waitForLoadState('domcontentloaded');

    const apiKeys = await page
      .evaluate(() => Object.keys(window.electronAPI ?? {}))
      .catch(() => ['eval-failed'])
    console.log('API KEYS:', JSON.stringify(apiKeys))

    // A. Three-pane workbench + session bootstrap
    try {
      await page.getByRole('button', { name: 'New Session', exact: true }).waitFor({ timeout: 15_000 });
      await page.locator('[data-testid="finance-workspace"]').waitFor({ timeout: 15_000 });
      await page.locator('[data-testid="agent-panel"]').waitFor({ timeout: 15_000 });
      // Fresh isolated userData has no sessions — create one so the copilot
      // input renders.
      await page.getByRole('button', { name: 'New Session', exact: true }).click();
      await page.waitForTimeout(2500);
      const inp = page.locator('[data-testid="agent-input"]');
      console.log('INPUT count:', await inp.count());
      console.log('INPUT visible:', await inp.first().isVisible().catch(() => false));
      const box = await inp.first().boundingBox().catch(() => null);
      console.log('INPUT box:', JSON.stringify(box));
      const panelBox = await page.locator('[data-testid="agent-panel"]').first().boundingBox().catch(() => null);
      console.log('PANEL box:', JSON.stringify(panelBox));
      console.log('WINNER size:', await page.evaluate(() => ({ w: innerWidth, h: innerHeight })));
      await inp.first().waitFor({ timeout: 15_000 });
      pass('A: three-pane workbench renders + session created');
    } catch (error) {
      const diag = await page
        .evaluate(async () => {
          const overlay = document.querySelector('[data-testid="onboarding-overlay"]');
          let statuses = []
          let rawErr = null
          try {
            const raw = await window.electronAPI.connections.list()
            statuses = raw?.ok ? raw.data.map((e) => e.status) : []
            rawErr = raw && !raw.ok ? JSON.stringify(raw.error) : null
          } catch (e) {
            rawErr = String(e).slice(0, 200)
          }
          return {
            overlay: !!overlay,
            overlayText: overlay ? overlay.textContent.slice(0, 80) : null,
            statuses,
            rawErr,
          }
        })
        .catch(() => ({ evalFailed: true }))
      console.log('A-DIAG:', JSON.stringify(diag))
      fail('A: three-pane workbench renders + session created', error)
    }

    // A2. Resize the agent panel by dragging the right sash; the layout must
    // stay responsive (chart/table/chat resize correctly — verified by the
    // panes remaining visible and widths changing).
    try {
      const sash = page.locator('.sash').last();
      await sash.waitFor({ timeout: 15_000 });
      const before = await page.locator('[data-testid="agent-panel"]').first().boundingBox();
      const sashBox = await sash.boundingBox();
      await page.mouse.move(sashBox.x + sashBox.width / 2, sashBox.y + 200);
      await page.mouse.down();
      await page.mouse.move(sashBox.x - 80, sashBox.y + 200, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(800);
      const after = await page.locator('[data-testid="agent-panel"]').first().boundingBox();
      if (!before || !after || Math.abs(after.width - before.width) < 20) {
        throw new Error('agent panel width did not change after sash drag');
      }
      pass('A2: agent panel resize works');
    } catch (error) {
      fail('A2: agent panel resize works', error);
    }

    // B. NVDA click → header + context + chart
    try {
      await page.locator('[data-testid="watchlist-row-NVDA.US"]').first().click();
      await page
        .locator('[data-testid="security-header-symbol"]')
        .filter({ hasText: 'NVDA.US' })
        .waitFor({ timeout: 15_000 });
      await page
        .locator('[data-testid="context-chip"]')
        .filter({ hasText: 'NVDA.US' })
        .waitFor({ timeout: 15_000 });
      // Chart tab renders the K-line canvas for the active symbol.
      await page.getByRole('tab', { name: /^Chart$/i }).click();
      await page.locator('[data-testid="chart-canvas"]').waitFor({ timeout: 15_000 });
      await page.locator('[data-testid="chart-canvas"] canvas').first().waitFor({ timeout: 20_000 });
      pass('B: NVDA.US switches header, agent context, and chart');
    } catch (error) {
      fail('B: NVDA.US switches header and agent context', error);
    }

    // C. Rapid switching settles on the last symbol
    try {
      for (const symbol of ['AAPL.US', 'TSLA.US', 'NVDA.US']) {
        await page.locator(`[data-testid="watchlist-row-${symbol}"]`).first().click();
      }
      await page
        .locator('[data-testid="security-header-symbol"]')
        .filter({ hasText: 'NVDA.US' })
        .waitFor({ timeout: 15_000 });
      pass('C: rapid symbol switching settles on NVDA.US');
    } catch (error) {
      fail('C: rapid symbol switching settles on NVDA.US', error);
    }

    // D. Agent run with workspace context
    try {
      await page.locator('[data-testid="watchlist-row-NVDA.US"]').first().click();
      const input = page.locator('[data-testid="agent-input"]');
      await input.waitFor({ timeout: 15_000 });
      const before = await page.evaluate(async () => {
        const snapshot = await window.electronAPI.kernel.hydrate();
        if (!snapshot.ok) throw new Error('Session hydrate failed');
        const ids = [];
        for (const session of snapshot.data.sessions) {
          const runs = await window.electronAPI.kernel.listRuns(session.id);
          if (!runs.ok) throw new Error('Run inventory failed');
          ids.push(...runs.data.map(run => run.id));
        }
        return ids;
      });
      await input.fill('最近走势怎么样？');
      await input.press('Enter');
      const evidence = await waitForValue(() => page.evaluate(async previousIds => {
        const snapshot = await window.electronAPI.kernel.hydrate();
        if (!snapshot.ok) return false;
        for (const session of snapshot.data.sessions) {
          const runs = await window.electronAPI.kernel.listRuns(session.id);
          if (!runs.ok) continue;
          const run = runs.data.find(run => !previousIds.includes(run.id) && run.input === '最近走势怎么样？' && run.status !== 'running');
          if (!run) continue;
          const messages = await window.electronAPI.kernel.getMessages(session.id);
          if (!messages.ok) return false;
          if (run.status === 'completed' && !messages.data.some(message => message.role === 'assistant' && message.content?.trim() === run.answer?.trim())) return false;
          return { run, messages: messages.data };
        }
        return false;
      }, before), { label: 'submitted run and persisted assistant answer' });
      if (!hasCompletedAssistantAnswer(evidence.run, evidence.messages)) {
        throw new Error(`Agent has no completed persisted assistant answer (status ${evidence.run.status})`);
      }
      await page.locator('[data-testid="agent-panel"] .mac-message-assistant').first().waitFor();
      pass('D: submitted run completes with a persisted assistant answer for the workspace symbol');
    } catch (error) {
      fail('D: agent run streams an answer for the workspace symbol', error);
    }
    // E. Deep Research (local provider: deterministic synthesis, real
    // Longbridge capability fetches) → evidence-backed report in the UI.
    try {
      await page.locator('[data-testid="watchlist-row-NVDA.US"]').first().click();
      await page.locator('[data-testid="deep-research-button"]').first().click();
      // SecurityHeader navigates to the research section.
      await page.locator('[data-testid="research-panel"]').waitFor({ timeout: 15_000 });
      await page
        .getByRole('button', { name: /^Deep Research$/i })
        .first()
        .click();
      // Capability fetches + synthesis take a while against the real CLI.
      await page.locator('[data-testid="research-report"]').waitFor({ timeout: 180_000 });
      const reportText = await page.locator('[data-testid="research-report"]').first().textContent();
      if (!/POSITIVE|NEGATIVE|NEUTRAL/.test(reportText ?? '')) {
        throw new Error('report stance missing');
      }
      if (!/Evidence/i.test(reportText ?? '')) {
        throw new Error('evidence section missing');
      }
      pass('E: Deep Research produces an evidence-backed report');
    } catch (error) {
      fail('E: Deep Research produces an evidence-backed report', error);
    }

    // F. Save as Thesis (uses the report from E for NVDA.US)
    try {
      await page.getByRole('button', { name: /^Thesis$/i }).first().click();
      await page.locator('[data-testid="thesis-panel"]').waitFor({ timeout: 15_000 });
      await page.getByRole('button', { name: /Save as Thesis/i }).first().click();
      await page.locator('[data-testid="thesis-card"]').waitFor({ timeout: 30_000 });
      const thesisText = await page.locator('[data-testid="thesis-card"]').first().textContent();
      if (!/Bullish|Bearish|Neutral/.test(thesisText ?? '')) {
        throw new Error('thesis stance missing');
      }
      pass('F: research report saves as an investment thesis');
    } catch (error) {
      fail('F: research report saves as an investment thesis', error);
    }

    // G. Compare NVDA / AMD with structured data
    try {
      await page.getByRole('button', { name: /^Compare$/i }).first().click();
      await page.locator('[data-testid="compare-workspace"]').waitFor({ timeout: 15_000 });
      const dumpCompare = async (label) => {
        const info = await page.evaluate(() => {
          const input = document.querySelector('[data-testid="compare-symbol-input"]');
          const workspace = document.querySelector('[data-testid="compare-workspace"]');
          return { input: input?.value, text: (workspace?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 120) };
        });
        console.log(`G-DUMP ${label}:`, JSON.stringify(info));
      };
      await dumpCompare('mounted');
      await page.locator('[data-testid="compare-symbol-input"]').first().fill('NVDA.US');
      await dumpCompare('filled1');
      await page.locator('[data-testid="compare-add"]').first().click();
      await dumpCompare('added1');
      await page.locator('[data-testid="compare-symbol-input"]').first().fill('AMD.US');
      await dumpCompare('filled2');
      await page.locator('[data-testid="compare-add"]').first().click();
      await dumpCompare('added2');
      await page.locator('[data-testid="compare-table"]').waitFor({ timeout: 120_000 });
      const compareText = await page.locator('[data-testid="compare-table"]').first().textContent();
      if (!/Market Cap/.test(compareText ?? '') || !/NVDA/.test(compareText ?? '')) {
        throw new Error('comparison rows missing');
      }
      pass('G: compare workspace builds a structured comparison');
    } catch (error) {
      console.log(
        'COMPARE WORKSPACE DUMP:',
        (await page
          .locator('[data-testid="compare-workspace"]')
          .first()
          .textContent()
          .catch(() => '(workspace missing)'))?.replace(/\s+/g, ' ').slice(0, 400)
      );
      fail('G: compare workspace builds a structured comparison', error);
    }

    // H. Portfolio risk center
    try {
      await page.getByRole('button', { name: /^Portfolio$/i }).first().click();
      await page.getByRole('button', { name: /Analyze Portfolio/i }).first().click();
      await page.locator('[data-testid="portfolio-risk-panel"]').waitFor({ timeout: 120_000 });
      const riskText = await page.locator('[data-testid="portfolio-risk-panel"]').first().textContent();
      if (!/Concentration|Signals|Allocation/i.test(riskText ?? '')) {
        throw new Error('risk sections missing');
      }
      pass('H: portfolio risk center analyzes the portfolio');
    } catch (error) {
      fail('H: portfolio risk center analyzes the portfolio', error);
    }
  } catch (error) {
    fail('harness setup', error);
  } finally {
    await browser?.close().catch(() => undefined);
    if (KEEP_OPEN) console.log(`KEEP_OPEN owned PID ${electronProcess.pid}, CDP ${CDP_PORT}`);
    else await stopOwnedProcess(electronProcess);
  }

  if (failures > 0) {
    console.error(`E2E failed: ${failures} step(s).`);
    process.exit(1);
  }
  console.log('E2E golden path passed.');
}

main();
