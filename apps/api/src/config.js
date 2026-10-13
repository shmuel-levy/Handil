/**
 * Environment configuration and fail-fast validation.
 *
 * The API used to start happily without JWT_ACCESS_SECRET and only blow up
 * later, at the first login, as a 500. Boot-time validation turns that into a
 * clear message before the server ever accepts traffic.
 */

const MIN_SECRET_LENGTH = 16;

/** Read config, with the defaults the app actually uses. */
const config = {
  get port()        { return Number(process.env.PORT ?? 4000); },
  get nodeEnv()     { return process.env.NODE_ENV ?? 'development'; },
  get mongoUri()    { return process.env.MONGO_URI; },
  get jwtSecret()   { return process.env.JWT_ACCESS_SECRET; },
  get isProduction(){ return (process.env.NODE_ENV ?? 'development') === 'production'; },
  get allowedOrigins() {
    return process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
  },
};

/**
 * Throws with an actionable message when required configuration is missing.
 * Returns the list of non-fatal warnings so the caller can print them.
 */
function validateEnv({ requireMongo = false } = {}) {
  const errors   = [];
  const warnings = [];

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    errors.push(
      'JWT_ACCESS_SECRET is missing. Copy apps/api/.env.example to apps/api/.env ' +
      'and set a long random value — without it every login returns 500.'
    );
  } else if (secret.length < MIN_SECRET_LENGTH) {
    const msg = `JWT_ACCESS_SECRET is only ${secret.length} characters; use at least ${MIN_SECRET_LENGTH}.`;
    // A weak secret is fatal in production, a warning while developing.
    if (config.isProduction) errors.push(msg);
    else warnings.push(msg);
  } else if (secret === 'replace_with_a_long_random_secret') {
    errors.push('JWT_ACCESS_SECRET is still the placeholder from .env.example — set a real secret.');
  }

  if (!process.env.MONGO_URI) {
    const msg = 'MONGO_URI is missing — the API will start without a database.';
    if (requireMongo || config.isProduction) errors.push(msg);
    else warnings.push(msg);
  }

  if (config.isProduction && !process.env.ALLOWED_ORIGINS) {
    warnings.push(
      'ALLOWED_ORIGINS is not set in production — CORS currently accepts every origin.'
    );
  }

  if (errors.length) {
    throw new Error(
      'Invalid configuration:\n' + errors.map((e) => `  • ${e}`).join('\n')
    );
  }

  return warnings;
}

module.exports = { config, validateEnv, MIN_SECRET_LENGTH };
