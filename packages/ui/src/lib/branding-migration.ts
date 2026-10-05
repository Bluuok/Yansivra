import { upgradeBranding } from '../../../core/src/branding-migration.ts';

interface BrandingStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Move browser preferences before atoms initialize; new preferences take priority. */
export function upgradePreferenceKeys(storage: BrandingStorage): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (!key) continue;
    const nextKey = upgradeBranding(key);
    if (key === nextKey) continue;
    const value = storage.getItem(key);
    if (value === null) continue;
    if (storage.getItem(nextKey) === null) storage.setItem(nextKey, value);
    storage.removeItem(key);
  }
}

try {
  if (typeof window !== 'undefined') upgradePreferenceKeys(window.localStorage);
} catch {
  // Restricted or full browser storage must not prevent application startup.
}
