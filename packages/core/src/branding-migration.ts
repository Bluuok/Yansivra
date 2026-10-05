/** Old names are confined to this one-time upgrade boundary. */
export const LEGACY_PROFILE_NAME = 'Folio';

export function upgradeBranding(text: string): string {
  return text.replace(/Folio|(?<![A-Za-z])folio|(?<![A-Z])FOLIO|\bFOLLO\b|\bFollo\b|\bfollo\b/g, (name) =>
    name === name.toUpperCase() ? 'YANSIVRA' : name[0] === name[0].toUpperCase() ? 'Yansivra' : 'yansivra'
  ).replace(/Yansivra[ -]Desk/g, 'Yansivra');
}

// Connection details and secrets are copied verbatim, never rebranded.
const OPAQUE_FIELD = /api.?key|token|password|secret|encrypted|credential|base.?url|endpoint|^url$/i;

export function upgradeBrandingRecord(value: unknown): unknown {
  if (typeof value === 'string') return upgradeBranding(value);
  if (Array.isArray(value)) return value.map(upgradeBrandingRecord);
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    const nextKey = upgradeBranding(key);
    if (nextKey !== key && Object.hasOwn(source, nextKey)) {
      throw new Error('Conflicting fields in branding upgrade');
    }
    Object.defineProperty(result, nextKey, {
      value: OPAQUE_FIELD.test(key) ? item : upgradeBrandingRecord(item),
      enumerable: true, writable: true, configurable: true,
    });
  }
  return result;
}
