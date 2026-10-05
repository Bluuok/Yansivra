import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function platformArtifacts(platform) {
  if (platform === 'win32') return { builderArgs: ['--win', '--x64', '--publish', 'never'], extension: '.zip' };
  if (platform === 'darwin') return { builderArgs: ['--mac', '--publish', 'never'], extension: '.dmg' };
  throw new Error(`Release packaging is not configured for ${platform}; supported hosts are Windows and macOS.`);
}

export function stageArtifacts({ directory, destination, platform, productName, version, arch = platform === 'win32' ? 'x64' : process.arch }) {
  const { extension } = platformArtifacts(platform);
  const prefix = `${productName}-${version}-`;
  const expected = `${prefix}${platform === 'win32' ? 'win' : 'mac'}-${arch}${extension}`;
  const names = readdirSync(directory).filter(name => name === expected);
  if (!names.length) throw new Error(`No ${prefix}*${extension} was produced in ${directory}.`);
  mkdirSync(destination, { recursive: true });
  const checksums = names.map(name => {
    const content = readFileSync(join(directory, name));
    copyFileSync(join(directory, name), join(destination, name));
    return `${createHash('sha256').update(content).digest('hex')}  ${name}`;
  }).join('\n') + '\n';
  writeFileSync(join(destination, 'SHA256SUMS.txt'), checksums);
  return { names, checksums };
}
