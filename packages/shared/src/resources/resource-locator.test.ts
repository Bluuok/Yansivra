import { afterEach, describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import {
  getPiCwd,
  getPiExtensionEntry,
  getRuntimeRoot,
  getSkillsDir,
  isPackaged,
} from './resource-locator.ts';

const PACKAGED = 'FINAGENT_PACKAGED';
const saved = process.env[PACKAGED];
const resourcesDescriptor = Object.getOwnPropertyDescriptor(process, 'resourcesPath');

afterEach(() => {
  if (resourcesDescriptor) Object.defineProperty(process, 'resourcesPath', resourcesDescriptor);
  else Reflect.deleteProperty(process, 'resourcesPath');
  if (saved === undefined) {
    delete process.env[PACKAGED];
  } else {
    process.env[PACKAGED] = saved;
  }
});

describe('ResourceLocator (packaged Windows resources)', () => {
  it('resolves lowercase resources in a path with Chinese characters and spaces', () => {
    const root = resolve('output', '桌面 应用', 'resources');
    Object.defineProperty(process, 'resourcesPath', { value: root, configurable: true });
    process.env[PACKAGED] = '1';
    expect(isPackaged()).toBe(true);
    expect(getRuntimeRoot()).toBe(root);
    expect(getSkillsDir()).toBe(resolve(root, 'skills'));
    expect(getPiExtensionEntry()).toBe(resolve(root, 'extensions', 'finagent', 'index.js'));
  });
  it('requires the packaged flag even when Electron exposes a resources path', () => {
    Object.defineProperty(process, 'resourcesPath', { value: resolve('resources'), configurable: true });
    delete process.env[PACKAGED];
    expect(isPackaged()).toBe(false);
  });
  it('rejects a directory that only ends with the Resources string', () => {
    Object.defineProperty(process, 'resourcesPath', { value: resolve('NotResources'), configurable: true });
    process.env[PACKAGED] = '1';
    expect(isPackaged()).toBe(false);
  });
});

describe('ResourceLocator (dev mode)', () => {
  it('resolves the repo root from import.meta.url, not process.cwd()', () => {
    delete process.env[PACKAGED];
    // Bun tests run under the repo root; the module must not depend on it.
    const root = getRuntimeRoot();
    expect(getSkillsDir()).toBe(resolve(root, 'skills'));
    expect(getPiCwd()).toBe(root);
  });

  it('resolves the dev Pi extension entry to the source .ts file', () => {
    delete process.env[PACKAGED];
    expect(getPiExtensionEntry()).toBe(resolve(getRuntimeRoot(), '.pi', 'extensions', 'finagent', 'index.ts'));
  });

  it('does not report packaged without a real resourcesPath (non-Electron env)', () => {
    process.env[PACKAGED] = '1';
    // No process.resourcesPath in a bare Node/Bun process -> still dev.
    expect(isPackaged()).toBe(false);
  });
});
