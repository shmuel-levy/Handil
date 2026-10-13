const rateLimit = require('express-rate-limit');

// Rate limiting is disabled under test so suites can fire hundreds of requests
// from one IP. Set ENABLE_RATE_LIMIT=true to exercise it in a test.
const DISABLED = process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT !== 'true';

const passthrough = (_req, _res, next) => next();

function build({ windowMs, max, message }) {
  if (DISABLED) return passthrough;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Hebrew message — error text is part of the API contract
    handler: (_req, res) => res.status(429).json({ message }),
  });
}

/**
 * Login / register — the brute-force surface.
 * Deliberately strict: a human logging in never needs more than a handful
 * of attempts within 15 minutes.
 */
const authLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 10),
  message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות',
});

/** Anything that creates data — posts, quotes, bookings, reviews, messages. */
const writeLimiter = build({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WRITE_MAX ?? 30),
  message: 'יותר מדי בקשות. המתן רגע ונסה שוב',
});

/** Broad ceiling for the whole API — catches scraping and runaway clients. */
const globalLimiter = build({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GLOBAL_MAX ?? 300),
  message: 'יותר מדי בקשות. המתן רגע ונסה שוב',
});

/**
 * Applies a limiter only to mutating requests.
 * Reads (the job feed, the worker directory, chat history) are refreshed far
 * more often than writes and must not share the write budget.
 */
function mutationsOnly(limiter) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    return limiter(req, res, next);
  };
}

module.exports = {
  authLimiter,
  writeLimiter,
  globalLimiter,
  mutationsOnly,
  writeMutations: mutationsOnly(writeLimiter),
};
