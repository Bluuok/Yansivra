import { expect, test } from 'bun:test';
import { upgradePreferenceKeys } from './branding-migration.ts';

test('moves old preference keys before startup and preserves newer preferences', () => {
  const values = new Map([['folio.theme', 'dark'], ['folio.prefs.navSection', 'today'], ['yansivra.prefs.navSection', 'research'], ['unrelated', 'keep']]);
  upgradePreferenceKeys({ get length() { return values.size; }, key: (index) => [...values.keys()][index] ?? null, getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } });
  expect(values.get('yansivra.theme')).toBe('dark');
  expect(values.get('yansivra.prefs.navSection')).toBe('research');
  expect(values.has('folio.theme')).toBe(false);
  expect(values.has('folio.prefs.navSection')).toBe(false);
  expect(values.get('unrelated')).toBe('keep');
});
