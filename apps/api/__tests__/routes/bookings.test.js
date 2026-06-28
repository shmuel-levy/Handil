process.env.JWT_ACCESS_SECRET = 'test-secret';

const request = require('supertest');
const jwt     = require('jsonwebtoken');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const { createResident, createWorkerUser, createBooking } = require('../helpers/factories');

// Mock Socket.io so booking status changes don't crash without a real server
jest.mock('../../src/socket', () => ({
  getIO: () => ({ to: () => ({ emit: () => {} }) }),
  initSocket: () => {},
}));

function tokenFor(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET);
}

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// ─── POST /api/bookings ───────────────────────────────────────────────────────

describe('POST /api/bookings', () => {
  it('resident creates a booking successfully', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ workerUserId: workerUser._id, category: 'plumber', description: 'Fix a leak' });

    expect(res.status).toBe(201);
    expect(res.body.booking.category).toBe('plumber');
    expect(res.body.booking.status).toBe('pending');
  });

  it('returns 403 when a worker tries to create a booking', async () => {
    const { user: workerUser } = await createWorkerUser();
    const { user: otherWorker } = await createWorkerUser();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(workerUser)}`)
      .send({ workerUserId: otherWorker._id, category: 'plumber' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when workerUserId is missing', async () => {
    const resident = await createResident();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ category: 'plumber' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when category is missing', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ workerUserId: workerUser._id });

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/bookings').send({ workerUserId: 'x', category: 'plumber' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/bookings ────────────────────────────────────────────────────────

describe('GET /api/bookings', () => {
  it('resident sees only their own bookings', async () => {
    const resident1 = await createResident();
    const resident2 = await createResident();
    const { user: workerUser } = await createWorkerUser();

    await createBooking(resident1._id, workerUser._id);
    await createBooking(resident1._id, workerUser._id);
    await createBooking(resident2._id, workerUser._id);

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(resident1)}`);

    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(2);
  });

  it('worker sees only their own bookings', async () => {
    const resident = await createResident();
    const { user: worker1 } = await createWorkerUser();
    const { user: worker2 } = await createWorkerUser();

    await createBooking(resident._id, worker1._id);
    await createBooking(resident._id, worker2._id);

    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(worker1)}`);

    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(1);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/bookings/:id ────────────────────────────────────────────────────

describe('GET /api/bookings/:id', () => {
  it('resident can fetch their own booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.booking._id).toBe(booking._id.toString());
  });

  it('worker can fetch their own booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${tokenFor(workerUser)}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 for an unrelated user', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const otherUser = await createResident();
    const res = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${tokenFor(otherUser)}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent booking', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/bookings/64a000000000000000000099')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/bookings/:id/status ──────────────────────────────────────────

describe('PATCH /api/bookings/:id/status', () => {
  it('worker can accept a booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(workerUser)}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('accepted');
  });

  it('worker can reject a booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(workerUser)}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('rejected');
  });

  it('worker can mark a booking as completed', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(workerUser)}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('completed');
  });

  it('worker cannot cancel a booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(workerUser)}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
  });

  it('resident can cancel a booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
  });

  it('resident cannot accept a booking', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(400);
  });

  it('returns 403 for an unrelated user', async () => {
    const resident = await createResident();
    const { user: workerUser } = await createWorkerUser();
    const booking = await createBooking(resident._id, workerUser._id);
    const other = await createResident();

    const res = await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(other)}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent booking', async () => {
    const resident = await createResident();
    const res = await request(app)
      .patch('/api/bookings/64a000000000000000000099/status')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(404);
  });
});
