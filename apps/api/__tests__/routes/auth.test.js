process.env.JWT_ACCESS_SECRET = 'test-secret';

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const { createResident, createWorkerUser, DEFAULT_PASSWORD } = require('../helpers/factories');
const Worker  = require('../../src/models/Worker');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('registers a resident and returns token + user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'דנה כהן',
      email: 'dana@test.com',
      password: 'secret123',
      phone: '050-1234567',
      role: 'resident',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('dana@test.com');
    expect(res.body.user.role).toBe('resident');
    expect(res.body.user.password).toBeUndefined();
  });

  it('registers a worker and also creates a Worker profile document', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'משה פלומר',
      email: 'moshe@test.com',
      password: 'secret123',
      role: 'worker',
    });
    expect(res.status).toBe(201);
    const workerDoc = await Worker.findOne({ user: res.body.user.id });
    expect(workerDoc).not.toBeNull();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'x@test.com', password: 'secret123', role: 'resident',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', password: 'secret123', role: 'resident',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'x@test.com', role: 'resident',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when role is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'x@test.com', password: 'secret123',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid role', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'x@test.com', password: 'secret123', role: 'admin',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test', email: 'x@test.com', password: '123', role: 'resident',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First', email: 'same@test.com', password: 'secret123', role: 'resident',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Second', email: 'same@test.com', password: 'secret123', role: 'resident',
    });
    expect(res.status).toBe(409);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns token and user on correct credentials', async () => {
    await createResident({ email: 'login@test.com' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: DEFAULT_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login@test.com');
  });

  it('returns 401 for wrong password', async () => {
    await createResident({ email: 'wrong@test.com' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'wrong@test.com',
      password: 'notthepassword',
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'secret123',
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'secret123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  it('returns user data for a valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me User', email: 'me@test.com', password: 'secret123', role: 'resident',
    });
    const token = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@test.com');
    expect(res.body.password).toBeUndefined();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────

describe('PUT /api/auth/me', () => {
  it('updates city and returns updated user', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Update User', email: 'update@test.com', password: 'secret123', role: 'resident',
    });
    const token = reg.body.token;

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'חיפה' });

    expect(res.status).toBe(200);
    expect(res.body.user.city).toBe('חיפה');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).put('/api/auth/me').send({ city: 'חיפה' });
    expect(res.status).toBe(401);
  });
});
