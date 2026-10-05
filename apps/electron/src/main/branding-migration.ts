import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { upgradeBranding, upgradeBrandingRecord } from '../../../../packages/core/src/branding-migration.ts';

export interface ProfileUpgradeResult {
  status: 'copied' | 'existing' | 'absent';
  source: string;
  target: string;
  changedFiles: number;
}

const OPAQUE_FILE = /credential|secret|auth|token|models\.json|\.env/i;
const TRANSIENT = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'DevToolsActivePort']);

/** Copy first, upgrade the copy, then publish. The source is an untouched backup. */
export function upgradeProfile(sourcePath: string, targetPath: string): ProfileUpgradeResult {
  const source = resolve(sourcePath);
  const target = resolve(targetPath);
  const result = { source, target, changedFiles: 0 };
  const inside = (parent: string, child: string) => {
    const rel = relative(parent, child);
    return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
  };
  if (inside(source, target) || inside(target, source)) throw new Error('Profile directories must be separate');
  if (existsSync(target)) return { ...result, status: 'existing' };
  if (!existsSync(source)) return { ...result, status: 'absent' };
  if (!lstatSync(source).isDirectory() || lstatSync(source).isSymbolicLink()) throw new Error('Invalid source profile');
  mkdirSync(dirname(target), { recursive: true });
  const staging = `${target}.upgrade-${randomUUID()}`;
  cpSync(source, staging, {
    recursive: true, errorOnExist: true, force: false,
    filter: (path) => !lstatSync(path).isSymbolicLink() && !TRANSIENT.has(path.split(sep).at(-1)!) && !path.endsWith('.tmp'),
  });
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!OPAQUE_FILE.test(entry.name)) visit(path);
        continue;
      }
      if (!entry.isFile() || OPAQUE_FILE.test(entry.name) || !['.json', '.jsonl'].includes(extname(entry.name))) continue;
      const original = readFileSync(path, 'utf8');
      const jsonl = extname(entry.name) === '.jsonl';
      let parsed: unknown;
      try {
        parsed = jsonl ? original.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line)) : JSON.parse(original);
      } catch {
        throw new Error('Invalid structured profile record');
      }
      const upgraded = upgradeBrandingRecord(parsed);
      // Preserve byte-for-byte content when no branded keys or values changed.
      if (JSON.stringify(parsed) !== JSON.stringify(upgraded)) {
        const converted = jsonl ? (upgraded as unknown[]).map((record) => JSON.stringify(record)).join('\n') + '\n' : `${JSON.stringify(upgraded, null, 2)}\n`;
        writeFileSync(path, converted);
        result.changedFiles++;
      }
      const nextName = upgradeBranding(entry.name);
      if (nextName !== entry.name) {
        const nextPath = join(directory, nextName);
        if (existsSync(nextPath)) throw new Error('Conflicting filenames in branding upgrade');
        renameSync(path, nextPath);
      }
    }
  };
  visit(staging);
  // Do not merge profiles or replace a concurrently created destination.
  if (existsSync(target)) throw new Error('Destination profile appeared during upgrade');
  renameSync(staging, target);
  return { ...result, status: 'copied' };
}
