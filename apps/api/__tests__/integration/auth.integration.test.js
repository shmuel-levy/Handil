process.env.JWT_ACCESS_SECRET = 'test-secret';

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const User    = require('../../src/models/User');
const Worker  = require('../../src/models/Worker');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

describe('auth journey', () => {
  it('registers, logs in, reads and updates the profile with the issued token', async () => {
    // 1. Register
    const register = await request(app).post('/api/auth/register').send({
      name: 'דנה כהן',
      email: 'dana@journey.test',
      password: 'secret123',
      phone: '050-1234567',
      role: 'resident',
    });
    expect(register.status).toBe(201);
    expect(register.body.token).toBeDefined();

    // 2. Log in with the same credentials — a fresh, independent token
    const login = await request(app).post('/api/auth/login').send({
      email: 'dana@journey.test',
      password: 'secret123',
    });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(register.body.user.id);
    const token = login.body.token;

    // 3. Read the profile back
    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.name).toBe('דנה כהן');
    expect(me.body.city).toBe('');

    // 4. Update it — this is the onboarding wizard's final step
    const update = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'תל אביב', preferredCategories: ['plumber', 'electrician'] });
    expect(update.status).toBe(200);
    expect(update.body.user.city).toBe('תל אביב');

    // 5. The change is durable, not just echoed back
    const meAgain = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meAgain.body.city).toBe('תל אביב');

    const stored = await User.findById(register.body.user.id);
    expect(stored.preferredCategories).toEqual(['plumber', 'electrician']);
  });

  it('stores the password only as a hash', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'משה', email: 'moshe@journey.test', password: 'secret123', role: 'resident',
    });

    const stored = await User.findOne({ email: 'moshe@journey.test' });
    expect(stored.password).not.toBe('secret123');
    expect(stored.password.startsWith('$2')).toBe(true); // bcrypt
  });

  it('creates both a User and a Worker document when registering a worker', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'אבי חשמלאי', email: 'avi@journey.test', password: 'secret123', role: 'worker',
    });
    expect(res.status).toBe(201);

    const user = await User.findById(res.body.user.id);
    expect(user.role).toBe('worker');

    const profile = await Worker.findOne({ user: res.body.user.id });
    expect(profile).not.toBeNull();

    // The new worker can immediately reach the worker-only endpoint
    const me = await request(app)
      .get('/api/workers/me')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
  });

  it('refuses a duplicate email and leaves exactly one user behind', async () => {
    const payload = {
      name: 'ראשון', email: 'dup@journey.test', password: 'secret123', role: 'resident',
    };

    const first  = await request(app).post('/api/auth/register').send(payload);
    const second = await request(app).post('/api/auth/register').send({ ...payload, name: 'שני' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(await User.countDocuments({ email: 'dup@journey.test' })).toBe(1);
  });

  it('normalises the email to lowercase so login is case-insensitive', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Case Test', email: 'MiXeD@Journey.Test', password: 'secret123', role: 'resident',
    });

    const login = await request(app).post('/api/auth/login').send({
      email: 'mixed@journey.test', password: 'secret123',
    });

    expect(login.status).toBe(200);
  });
});
