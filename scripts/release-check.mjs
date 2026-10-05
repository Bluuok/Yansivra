#!/usr/bin/env node
// Full local release gates, including data-dependent E2E; stop on the first failure.
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platformArtifacts } from './release-artifacts.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronRoot = join(repoRoot, 'apps/electron');

export function releaseGates() {
  return [
    { name: 'unit/integration tests', args: ['test', '--isolate'], cwd: repoRoot },
    { name: 'typecheck', args: ['run', 'typecheck'], cwd: repoRoot },
    { name: 'i18n parity', args: ['run', 'i18n:check'], cwd: repoRoot },
    { name: 'build', args: ['run', 'build'], cwd: repoRoot },
    { name: 'bundled extensions', args: ['run', 'build:extension'], cwd: electronRoot },
    { name: 'Electron golden path (data-dependent, local Agent)', args: ['run', 'test:e2e'], cwd: electronRoot,
      env: { FINAGENT_AGENT_PROVIDER: 'local', FINAGENT_SKIP_E2E_BUILD: '1', FINAGENT_E2E_KEEP_OPEN: '0' } },
    { name: 'platform package + checksums', args: ['run', 'release:package', '--', '--skip-build'], cwd: repoRoot },
    { name: 'packaged smoke', args: ['run', 'test:package-smoke'], cwd: electronRoot },
    { name: 'fresh-install onboarding', args: ['run', 'test:fresh-install'], cwd: electronRoot },
    { name: 'v5 discover/import/automation/outcome', args: ['run', 'test:v5'], cwd: electronRoot,
      env: { FINAGENT_AGENT_PROVIDER: 'local', FINAGENT_SKIP_E2E_BUILD: '1', FINAGENT_E2E_KEEP_OPEN: '0' } },
  ];
}

export function runReleaseChecks({ runner = spawnSync, logger = console, gates = releaseGates(), platform = process.platform } = {}) {
  platformArtifacts(platform); // Reject unsupported hosts before expensive gates.
  for (const [index, gate] of gates.entries()) {
    logger.log(`release:check ${index + 1}/${gates.length}: ${gate.name}`);
    const result = runner('bun', gate.args, { cwd: gate.cwd, stdio: 'inherit',
      env: { ...process.env, FINAGENT_E2E_KEEP_OPEN: '0', ...gate.env } });
    if (result.error || result.signal || result.status !== 0) {
      logger.error(`FAIL ${gate.name}: ${result.error?.message ?? result.signal ?? `exit ${result.status}`}. NOT RELEASEABLE; later gates were not run.`);
      return 1;
    }
  }
  logger.log(`release:check PASSED: ${gates.length} gates. Publishing and project licensing require separate confirmation.`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = runReleaseChecks(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
