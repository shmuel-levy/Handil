#!/usr/bin/env node
/**
 * Confirms the exported web bundle really contains the production API URL.
 *
 * Metro caches transformed modules, and EXPO_PUBLIC_* values are inlined
 * during that transform. An export that reused a cache from a run without the
 * variable shipped `http://localhost:4000/api` even though the URL was set.
 * `build:web` now clears the cache; this check proves it worked.
 */
const fs   = require('fs');
const path = require('path');
const { KEY, resolveApiUrl } = require('./check-api-url');

const dir = path.join(__dirname, '..', 'dist', '_expo', 'static', 'js', 'web');
const bundles = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')) : [];
if (!bundles.length) {
  console.error(`✖ [verify-web-bundle] no bundle found in ${dir}`);
  process.exit(1);
}

const expected = resolveApiUrl()?.value?.replace(/\/$/, '');
const code = bundles.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

if (!expected || !code.includes(expected)) {
  console.error(`✖ [verify-web-bundle] the bundle does not contain ${KEY} (${expected}).`);
  console.error('  The app would fall back to localhost. Re-run the build; it clears the Metro cache.');
  process.exit(1);
}

console.log(`✔ [verify-web-bundle] bundle targets ${expected}`);
