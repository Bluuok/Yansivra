import { afterAll, describe, expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isLongBridgeOnWindowsPath } from './executor.ts';

const directory = mkdtempSync(join(tmpdir(), 'folio-longbridge-path-'));
const empty = join(directory, 'empty');
const binaries = join(directory, 'CLI with spaces');
mkdirSync(empty);
mkdirSync(binaries);
writeFileSync(join(binaries, 'longbridge.exe'), 'test executable candidate');
mkdirSync(join(empty, 'longbridge.exe'));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('Windows Longbridge executable lookup', () => {
  it('finds an executable in a quoted PATH entry containing spaces', () => {
    expect(isLongBridgeOnWindowsPath(`${empty};"${binaries}"`, '.cmd;.exe', empty)).toBe(true);
  });

  it('checks the working directory as Windows command resolution does', () => {
    expect(isLongBridgeOnWindowsPath('', '.exe', binaries)).toBe(true);
  });

  it('does not treat directories or unrelated extensions as executable files', () => {
    expect(isLongBridgeOnWindowsPath(empty, '.exe', empty)).toBe(false);
    expect(isLongBridgeOnWindowsPath(binaries, '.cmd', empty)).toBe(false);
  });
});
