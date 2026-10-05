#!/usr/bin/env node
// Desktop development: the renderer server and Electron are owned by this process.
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = join(repoRoot, 'apps/electron');
const require = createRequire(join(appRoot, 'package.json'));
for (const script of ['build:preload', 'build:main']) {
  const result = spawnSync('bun', ['run', script], { cwd: appRoot, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(result.error?.message ?? `${script} failed: ${result.status}`);
    process.exit(1);
  }
}
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
let server;
let application;
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  process.exitCode = code;
  if (application?.exitCode === null) application.kill();
  await server?.close();
}
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
try {
  server = await createServer({ configFile: join(appRoot, 'vite.config.ts'), server: { host: '127.0.0.1', port: 5173, strictPort: true } });
  await server.listen();
  server.printUrls();
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  application = spawn(require('electron'), [join(appRoot, 'src/main/index.js'), ...process.argv.slice(2).filter(arg => arg !== '--')], {
    cwd: repoRoot, env, stdio: 'inherit', windowsHide: true,
  });
  application.on('error', error => { console.error(error.message); void close(1); });
  application.on('exit', code => void close(code ?? 1));
} catch (error) {
  console.error(error.message);
  await close(1);
}
