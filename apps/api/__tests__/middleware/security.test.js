process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-long-enough';

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const { validateEnv } = require('../../src/config');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// ─── helmet ───────────────────────────────────────────────────────────────────

describe('security headers', () => {
  it('sets the standard helmet headers on API responses', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('removes the Express fingerprint header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('keeps resources readable cross-origin for the Expo web client', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});

// ─── config validation ────────────────────────────────────────────────────────

describe('validateEnv', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env.JWT_ACCESS_SECRET = ORIGINAL.JWT_ACCESS_SECRET;
    process.env.NODE_ENV          = ORIGINAL.NODE_ENV;
    delete process.env.MONGO_URI;
  });

  it('throws a clear error when the JWT secret is missing', () => {
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => validateEnv()).toThrow(/JWT_ACCESS_SECRET is missing/);
  });

  it('rejects the placeholder secret from .env.example', () => {
    process.env.JWT_ACCESS_SECRET = 'replace_with_a_long_random_secret';
    expect(() => validateEnv()).toThrow(/still the placeholder/);
  });

  it('treats a short secret as fatal in production but a warning in development', () => {
    process.env.JWT_ACCESS_SECRET = 'tiny';

    process.env.NODE_ENV = 'production';
    expect(() => validateEnv()).toThrow(/at least 16/);

    process.env.NODE_ENV = 'development';
    const warnings = validateEnv();
    expect(warnings.join(' ')).toMatch(/at least 16/);
  });

  it('warns rather than throws when MONGO_URI is absent in development', () => {
    process.env.NODE_ENV = 'development';
    const warnings = validateEnv();
    expect(warnings.join(' ')).toMatch(/MONGO_URI is missing/);
  });

  it('demands MONGO_URI when the caller requires it', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateEnv({ requireMongo: true })).toThrow(/MONGO_URI is missing/);
  });

  it('passes cleanly on a valid configuration', () => {
    process.env.NODE_ENV = 'development';
    process.env.MONGO_URI = 'mongodb://localhost:27017/handil';
    expect(validateEnv()).toEqual([]);
  });
});

// ─── rate limiting ────────────────────────────────────────────────────────────
// The limiter is disabled under NODE_ENV=test so the other suites can fire
// freely; this block re-enables it in an isolated module registry.

describe('rate limiting', () => {
  const express = require('express');

  /**
   * Loads the limiter module with rate limiting switched on, in an isolated
   * registry, and mounts it on a throwaway app. Isolating only this module
   * keeps the shared mongoose connection the other suites rely on intact.
   */
  function buildLimitedApp(envOverrides, mount) {
    const saved = {};
    for (const [k, v] of Object.entries(envOverrides)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }

    let limiters;
    jest.isolateModules(() => {
      limiters = require('../../src/middleware/rateLimit');
    });

    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }

    const testApp = express();
    testApp.use(express.json());
    mount(testApp, limiters);
    return testApp;
  }

  it('blocks repeated attempts with a Hebrew 429 once the window is exhausted', async () => {
    const testApp = buildLimitedApp(
      { ENABLE_RATE_LIMIT: 'true', RATE_LIMIT_AUTH_MAX: '3' },
      (a, { authLimiter }) => {
        a.post('/login', authLimiter, (_req, res) => res.status(401).json({ message: 'פרטים שגויים' }));
      }
    );

    // The first 3 pass through and fail authentication normally
    for (let i = 0; i < 3; i++) {
      const res = await request(testApp).post('/login').send({ email: 'a@b.c', password: 'x' });
      expect(res.status).toBe(401);
    }

    // The 4th is refused by the limiter itself
    const blocked = await request(testApp).post('/login').send({ email: 'a@b.c', password: 'x' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe('יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות');
  });

  it('lets reads through while still limiting writes on the same router', async () => {
    const testApp = buildLimitedApp(
      { ENABLE_RATE_LIMIT: 'true', RATE_LIMIT_WRITE_MAX: '2' },
      (a, { writeMutations }) => {
        a.use('/posts', writeMutations);
        a.get('/posts',  (_req, res) => res.json({ ok: true }));
        a.post('/posts', (_req, res) => res.status(201).json({ ok: true }));
      }
    );

    // Reads are never throttled, however many there are
    for (let i = 0; i < 25; i++) {
      const res = await request(testApp).get('/posts');
      expect(res.status).toBe(200);
    }

    // Writes share a much smaller budget
    expect((await request(testApp).post('/posts')).status).toBe(201);
    expect((await request(testApp).post('/posts')).status).toBe(201);
    const third = await request(testApp).post('/posts');
    expect(third.status).toBe(429);
  });

  it('is disabled by default under test so suites can run freely', async () => {
    const testApp = buildLimitedApp({}, (a, { authLimiter }) => {
      a.post('/login', authLimiter, (_req, res) => res.json({ ok: true }));
    });

    for (let i = 0; i < 30; i++) {
      const res = await request(testApp).post('/login').send({});
      expect(res.status).toBe(200);
    }
  });

  it('never rate-limits the health check on the real app', async () => {
    for (let i = 0; i < 12; i++) {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    }
  });
});
