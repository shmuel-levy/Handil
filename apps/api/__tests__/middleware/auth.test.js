process.env.JWT_ACCESS_SECRET = 'test-secret';

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');
const app      = require('../../src/app');
const db       = require('../helpers/db');
const { createResident, tokenFor } = require('../helpers/factories');

// /api/auth/me is the thinnest route behind the middleware, so it isolates
// middleware behaviour without route logic getting in the way.
const PROTECTED = '/api/auth/me';

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('auth middleware', () => {
  it('attaches req.user and passes through for a valid token', async () => {
    const user = await createResident({ name: 'מאיה', email: 'maya@test.com' });

    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('maya@test.com');
    expect(res.body.name).toBe('מאיה');
  });

  it('returns 401 when the Authorization header is missing', async () => {
    const res = await request(app).get(PROTECTED);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('returns 401 when the header is not a Bearer scheme', async () => {
    const user = await createResident();
    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', `Token ${tokenFor(user)}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No token provided');
  });

  it('returns 401 for a token signed with the wrong secret', async () => {
    const user = await createResident();
    const forged = jwt.sign({ id: user._id }, 'a-completely-different-secret');

    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token');
  });

  it('returns 401 for an expired token', async () => {
    const user = await createResident();
    const expired = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '-1s' }
    );

    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or expired token');
  });

  it('returns 401 when the token is well-formed but the user no longer exists', async () => {
    const ghostId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: ghostId }, process.env.JWT_ACCESS_SECRET);

    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('User not found');
  });

  it('returns 401 for a malformed token string', async () => {
    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });

  it('never exposes the password hash on req.user', async () => {
    const user = await createResident();
    const res = await request(app)
      .get(PROTECTED)
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.password).toBeUndefined();
  });
});
