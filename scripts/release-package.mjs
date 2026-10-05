#!/usr/bin/env node
// Build local platform artifacts and SHA256SUMS.txt. This script never publishes.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platformArtifacts, stageArtifacts } from './release-artifacts.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const electronRoot = join(repoRoot, 'apps/electron');
const platform = platformArtifacts(process.platform);
const metadata = JSON.parse(readFileSync(join(electronRoot, 'package.json'), 'utf8'));
const run = (args, cwd, env = process.env) => execFileSync('bun', args, { cwd, env, stdio: 'inherit' });
const skipBuild = process.argv.includes('--skip-build');
if (process.argv.slice(2).some(value => !['--', '--skip-build'].includes(value))) throw new Error('Usage: release-package.mjs [--skip-build]');

if (!skipBuild) {
  run(['run', 'build'], repoRoot);
  run(['run', 'build:extension'], electronRoot);
} else {
  for (const name of ['src/main/index.js', 'src/preload/index.cjs', 'dist/renderer/index.html', 'build/extensions/finagent/index.js', 'build/extensions/langsmith/index.js']) {
    if (!existsSync(join(electronRoot, name))) throw new Error(`Prebuilt artifact missing: ${name}; run the build gates first.`);
  }
}

const builderEnv = { ...process.env };
const args = ['run', 'package:builder', ...platform.builderArgs];
const signingEnabled = process.platform === 'darwin' && Boolean(process.env.APPLE_CERTIFICATE_BASE64 && process.env.APPLE_CERT_PASSWORD);
if (signingEnabled) {
  args.push('--config.mac.identity=');
  builderEnv.CSC_LINK = process.env.APPLE_CERTIFICATE_BASE64;
  builderEnv.CSC_KEY_PASSWORD = process.env.APPLE_CERT_PASSWORD;
  builderEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'true';
}
if (process.env.FINAGENT_BUILD_SHA) args.push(`--config.extraMetadata.yansivra.buildSha=${process.env.FINAGENT_BUILD_SHA}`);
if (process.env.FINAGENT_CHANNEL) args.push(`--config.extraMetadata.yansivra.channel=${process.env.FINAGENT_CHANNEL}`);
run(args, electronRoot, builderEnv);
const result = stageArtifacts({ directory: join(repoRoot, 'dist/electron'), destination: join(repoRoot, 'dist/release'),
  platform: process.platform, productName: metadata.build.productName, version: metadata.version });
console.log(`release:package OK: ${result.names.join(', ')}; SHA256SUMS.txt uses SHA-256 on ${process.platform}.`);
console.log(`Apple signing: ${signingEnabled ? 'enabled' : 'disabled'}. No upload or Release was executed.`);
