import { execa } from 'execa';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { LongBridgeError, isLongBridgeError } from './errors.ts';

export interface ExecutorOptions {
  timeout?: number;
}

export async function executeLongBridge(
  args: string[],
  options: ExecutorOptions = {}
): Promise<string> {
  const { timeout = 30000 } = options;

  try {
    const { stdout } = await execa('longbridge', args, {
      timeout,
    });
    return stdout;
  } catch (error) {
    const normalized = normalizeLongBridgeError(error);
    // On Windows, cross-spawn can route missing commands through cmd.exe.
    // That produces exit code 1 and localized stderr instead of ENOENT.
    if (
      process.platform === 'win32' &&
      normalized.code === 'LONGBRIDGE_UNKNOWN' &&
      (error as ExecaLikeError)?.exitCode === 1 &&
      !isLongBridgeOnWindowsPath()
    ) {
      throw new LongBridgeError('LongBridge CLI is not installed or not on PATH', 'LONGBRIDGE_NOT_INSTALLED');
    }
    throw normalized;
  }
}

/** Check executable candidates without depending on cmd.exe's output language. */
export function isLongBridgeOnWindowsPath(
  pathValue = process.env.PATH ?? '',
  pathExtValue = process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD',
  cwd = process.cwd()
): boolean {
  const directories = [cwd, ...pathValue.split(';').map((entry) => entry.replace(/^"|"$/g, '')).filter(Boolean)];
  const extensions = ['', ...(pathExtValue || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)];
  for (const directory of directories) {
    for (const extension of extensions) {
      try {
        if (statSync(join(directory, `longbridge${extension}`)).isFile()) return true;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        // An inaccessible PATH entry is not evidence that the CLI is missing.
        if (code !== 'ENOENT' && code !== 'ENOTDIR') return true;
      }
    }
  }
  return false;
}

interface ExecaLikeError extends Error {
  code?: string;
  exitCode?: number;
  timedOut?: boolean;
  stderr?: string;
  stdout?: string;
}

export function normalizeLongBridgeError(error: unknown): LongBridgeError {
  if (isLongBridgeError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const execaError = error as ExecaLikeError;
    const details = `${error.message}\n${execaError.stderr ?? ''}\n${execaError.stdout ?? ''}`.toLowerCase();

    if (execaError.code === 'ENOENT' || details.includes('enoent')) {
      return new LongBridgeError('LongBridge CLI is not installed or not on PATH', 'LONGBRIDGE_NOT_INSTALLED');
    }
    if (execaError.timedOut || details.includes('timed out') || details.includes('timeout')) {
      return new LongBridgeError('LongBridge command timed out', 'LONGBRIDGE_TIMEOUT');
    }
    if (
      details.includes('429002') ||
      details.includes('rate limited') ||
      details.includes('request is limited') ||
      details.includes('slow down request frequency')
    ) {
      return new LongBridgeError(
        'LongBridge API rate limit reached. Wait a moment and retry.',
        'LONGBRIDGE_RATE_LIMITED'
      );
    }
    if (
      details.includes('not authenticated') ||
      details.includes('authentication failed') ||
      details.includes('auth required') ||
      details.includes('unauthorized') ||
      details.includes('oauth failed') ||
      details.includes('please login') ||
      details.includes('please log in')
    ) {
      return new LongBridgeError('LongBridge authentication is required', 'LONGBRIDGE_NOT_AUTHED');
    }

    return new LongBridgeError(error.message, 'LONGBRIDGE_UNKNOWN');
  }

  return new LongBridgeError('Unknown LongBridge failure', 'LONGBRIDGE_UNKNOWN');
}
