/**
 * Brings MongoDB indexes in line with the Mongoose schemas.
 *
 * Mongoose creates missing indexes on startup but never changes an existing
 * one. A database created before the Booking `jobPost` index became unique
 * still has the old non-unique version under the same name, so the new rule
 * is silently not enforced there. Run once per existing database:
 *
 *   npm run db:sync-indexes --workspace=api
 *
 * Indexes that exist in the database but not in the schemas are dropped.
 */
require('dotenv').config();
const path     = require('path');
const fs       = require('fs');
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');

  await mongoose.connect(uri, { autoIndex: false });

  const modelsDir = path.join(__dirname, '..', 'src', 'models');
  for (const file of fs.readdirSync(modelsDir)) require(path.join(modelsDir, file));

  for (const name of mongoose.modelNames()) {
    const dropped = await mongoose.model(name).syncIndexes();
    console.log(`✔ ${name.padEnd(12)} ${dropped.length ? `replaced/dropped: ${dropped.join(', ')}` : 'up to date'}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('✖ index sync failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
