#!/usr/bin/env node
/**
 * Fails a release build whose API URL is missing, a placeholder, or insecure.
 *
 * In a release build `apiClient` cannot auto-detect the server, and without
 * EXPO_PUBLIC_API_BASE_URL it fell back to http://localhost:4000 — an app that
 * installs fine and then cannot reach anything. Better to stop the build.
 *
 * Runs before `expo export` (npm run build:web) and as the EAS
 * `eas-build-pre-install` hook. EAS development builds are skipped: they talk
 * to a dev server on the LAN.
 */
const fs   = require('fs');
const path = require('path');

const KEY = 'EXPO_PUBLIC_API_BASE_URL';

/** Same precedence Expo uses for a production build; real env vars win. */
function readFromDotenv() {
  const files = ['.env.production.local', '.env.local', '.env.production', '.env'];
  for (const file of files) {
    const full = path.join(__dirname, '..', file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const m = line.match(new RegExp(`^\\s*${KEY}\\s*=\\s*(.*)\\s*$`));
      if (m && m[1].trim()) return { value: m[1].trim().replace(/^['"]|['"]$/g, ''), source: file };
    }
  }
  return null;
}

/** The URL a production build will compile in, and where it came from. */
function resolveApiUrl() {
  const fromEnv = process.env[KEY]?.trim();
  return fromEnv ? { value: fromEnv, source: 'environment' } : readFromDotenv();
}

module.exports = { KEY, resolveApiUrl };
if (require.main !== module) return;

if (process.env.EAS_BUILD_PROFILE === 'development') {
  console.log(`[check-api-url] EAS development profile — skipping ${KEY} check`);
  process.exit(0);
}

const found = resolveApiUrl();

function fail(reason) {
  console.error(`\n✖ [check-api-url] ${reason}`);
  console.error(`  Set ${KEY} to your deployed API, e.g. https://api.example.com/api`);
  console.error('  • EAS builds: the "env" block of the profile in apps/mobile/eas.json');
  console.error('  • Web export: apps/mobile/.env.production or the shell environment\n');
  process.exit(1);
}

if (!found) fail(`${KEY} is not set.`);

const { value, source } = found;
if (/YOUR_API_URL/i.test(value)) fail(`${KEY} is still the placeholder (${value}) from ${source}.`);

let url;
try { url = new URL(value); } catch { fail(`${KEY} is not a valid URL: "${value}" (from ${source}).`); }

const isLocal = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
if (isLocal && process.env.ALLOW_LOCAL_API_URL !== '1') {
  fail(`${KEY} points at ${url.hostname}, which no user's device can reach.`);
}
if (url.protocol !== 'https:' && !isLocal) {
  fail(`${KEY} must use https:// in a release build (got ${url.protocol}//). ` +
       'iOS and Android block plain-HTTP traffic by default.');
}
if (!/\/api\/?$/.test(url.pathname)) {
  console.warn(`⚠ [check-api-url] ${KEY} does not end in /api — the API mounts every route under /api.`);
}

console.log(`✔ [check-api-url] ${KEY}=${value} (from ${source})`);
