/**
 * Validates the API's environment the same way the server does at startup,
 * without starting it. Useful before a deploy:
 *
 *   npm run check:config --workspace=api
 */
require('dotenv').config({ quiet: true });
const { validateEnv } = require('../src/config');

try {
  for (const warning of validateEnv({ requireMongo: true })) console.warn(`⚠  ${warning}`);
  console.log('✔ API configuration OK');
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
