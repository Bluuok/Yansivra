import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { freshProfile, launchDesktop, closeDesktop, repoRoot } from './desktop-harness.mjs';

// Exercise copied Chromium storage through actual Electron; no account or model.
const source = freshProfile('品牌升级 旧资料 ');
const target = `${source}-upgraded`;
let desktop = await launchDesktop(source);
try {
  await desktop.page.evaluate(() => {
    localStorage.removeItem('yansivra.theme');
    localStorage.setItem('folio.theme', 'dark');
    localStorage.removeItem('yansivra.prefs.navSection');
    localStorage.setItem('folio.prefs.navSection', JSON.stringify('today'));
    localStorage.setItem('folio.onboarding.completed.v1', '1');
    localStorage.setItem('folio.onboarding.disclaimersAccepted.v1', '1');
  });
} finally { await closeDesktop(desktop.application); }

const upgrade = JSON.parse(execFileSync('bun', [join(repoRoot, 'scripts/upgrade-profile.ts'), source, target], { cwd: repoRoot, windowsHide: true, encoding: 'utf8' }));
assert.equal(upgrade.status, 'copied');
desktop = await launchDesktop(target);
try {
  const result = await desktop.page.evaluate(() => ({
    title: document.title,
    body: document.body.innerText,
    dark: document.documentElement.classList.contains('dark'),
    theme: localStorage.getItem('yansivra.theme'),
    section: localStorage.getItem('yansivra.prefs.navSection'),
    disclaimer: localStorage.getItem('yansivra.onboarding.disclaimersAccepted.v1'),
    oldKeys: Object.keys(localStorage).filter((key) => key.startsWith('folio.')),
    classes: Array.from(document.querySelectorAll('[class]')).some((node) => /\bfolio-/.test(node.className)),
  }));
  assert.equal(result.title, 'Yansivra');
  assert.match(result.body, /Yansivra/);
  assert.doesNotMatch(result.body, /\bFolio\b/i);
  assert.equal(result.dark, true);
  assert.equal(result.theme, 'dark');
  assert.equal(result.section, JSON.stringify('today'));
  assert.equal(result.disclaimer, '1');
  assert.deepEqual(result.oldKeys, []);
  assert.equal(result.classes, false);
  console.log('PASS copied profile, theme/navigation/onboarding upgrade, Yansivra branding and CSS in real Electron');
} finally { await closeDesktop(desktop.application); }
