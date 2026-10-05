import { upgradeProfile } from '../apps/electron/src/main/branding-migration.ts';

const [source, target] = process.argv.slice(2);
if (!source || !target) throw new Error('Usage: bun scripts/upgrade-profile.ts <source> <target>');
// Only paths and counts are reported. No profile or credential contents leave disk.
console.log(JSON.stringify(upgradeProfile(source, target)));
