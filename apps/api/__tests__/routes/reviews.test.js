process.env.JWT_ACCESS_SECRET = 'test-secret';

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const Review  = require('../../src/models/Review');
const Worker  = require('../../src/models/Worker');
const { createResident, createWorkerUser, createBooking, tokenFor } = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

/** Resident + worker + a booking already marked completed — the reviewable state. */
async function completedJob() {
  const resident = await createResident();
  const { user: worker, workerProfile } = await createWorkerUser({ rating: 0, reviewCount: 0 });
  const booking = await createBooking(resident._id, worker._id, { status: 'completed' });
  return { resident, worker, workerProfile, booking };
}

// ─── POST /api/reviews ────────────────────────────────────────────────────────

describe('POST /api/reviews', () => {
  it('lets a resident review a completed booking', async () => {
    const { resident, booking } = await completedJob();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 5, comment: 'עבודה מצוינת' });

    expect(res.status).toBe(201);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.comment).toBe('עבודה מצוינת');
    expect(res.body.review.resident.name).toBeDefined(); // populated
  });

  it('accepts a review with no comment', async () => {
    const { resident, booking } = await completedJob();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 4 });

    expect(res.status).toBe(201);
    expect(res.body.review.comment).toBe('');
  });

  it('recalculates the worker average rating and review count', async () => {
    const resident1 = await createResident();
    const resident2 = await createResident();
    const { user: worker, workerProfile } = await createWorkerUser({ rating: 0, reviewCount: 0 });

    const b1 = await createBooking(resident1._id, worker._id, { status: 'completed' });
    const b2 = await createBooking(resident2._id, worker._id, { status: 'completed' });

    await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident1)}`)
      .send({ bookingId: b1._id, rating: 5 });
    await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident2)}`)
      .send({ bookingId: b2._id, rating: 4 });

    const updated = await Worker.findById(workerProfile._id);
    expect(updated.rating).toBe(4.5);
    expect(updated.reviewCount).toBe(2);
  });

  it('rounds the average rating to one decimal place', async () => {
    const worker = await createWorkerUser({ rating: 0, reviewCount: 0 });
    const residents = await Promise.all([createResident(), createResident(), createResident()]);

    // 5, 4, 4 → 4.333… → 4.3
    const ratings = [5, 4, 4];
    for (let i = 0; i < 3; i++) {
      const booking = await createBooking(residents[i]._id, worker.user._id, { status: 'completed' });
      await request(app).post('/api/reviews')
        .set('Authorization', `Bearer ${tokenFor(residents[i])}`)
        .send({ bookingId: booking._id, rating: ratings[i] });
    }

    const updated = await Worker.findById(worker.workerProfile._id);
    expect(updated.rating).toBe(4.3);
    expect(updated.reviewCount).toBe(3);
  });

  it('returns 403 when a worker tries to leave a review', async () => {
    const { worker, booking } = await completedJob();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ bookingId: booking._id, rating: 5 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('דיירים בלבד');
  });

  it('returns 400 when the booking is not completed', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const booking = await createBooking(resident._id, worker._id, { status: 'pending' });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('ניתן לסקור רק הזמנות שהושלמו');
    expect(await Review.countDocuments()).toBe(0);
  });

  it('returns 403 when reviewing someone else booking', async () => {
    const { booking } = await completedJob();
    const stranger = await createResident();

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(stranger)}`)
      .send({ bookingId: booking._id, rating: 1 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('לא ההזמנה שלך');
  });

  it('returns 400 when bookingId is missing', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('שדות חובה חסרים');
  });

  it('returns 400 when rating is missing', async () => {
    const { resident, booking } = await completedJob();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id });

    expect(res.status).toBe(400);
  });

  it('rejects a rating above 5', async () => {
    const { resident, booking } = await completedJob();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 9 });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await Review.countDocuments()).toBe(0);
  });

  it('rejects a rating below 1', async () => {
    const { resident, booking } = await completedJob();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: -3 });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await Review.countDocuments()).toBe(0);
  });

  it('returns 404 or 400 for a non-existent booking', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: '64a000000000000000000099', rating: 5 });

    expect([400, 404]).toContain(res.status);
  });

  it('returns 409 when the same booking is reviewed twice', async () => {
    const { resident, booking } = await completedJob();

    const first = await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 5 });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 1 });

    expect(second.status).toBe(409);
    expect(second.body.message).toBe('כבר סקרת הזמנה זו');
    expect(await Review.countDocuments()).toBe(1);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/reviews').send({ bookingId: 'x', rating: 5 });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/reviews/worker/:userId ──────────────────────────────────────────

describe('GET /api/reviews/worker/:userId', () => {
  it('returns a worker reviews without requiring auth', async () => {
    const { resident, worker, booking } = await completedJob();

    await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: booking._id, rating: 5, comment: 'מעולה' });

    const res = await request(app).get(`/api/reviews/worker/${worker._id}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].comment).toBe('מעולה');
    expect(res.body.reviews[0].resident.name).toBeDefined();
  });

  it('returns only reviews for the requested worker', async () => {
    const r1 = await createResident();
    const r2 = await createResident();
    const { user: workerA } = await createWorkerUser({ rating: 0, reviewCount: 0 });
    const { user: workerB } = await createWorkerUser({ rating: 0, reviewCount: 0 });

    const bA = await createBooking(r1._id, workerA._id, { status: 'completed' });
    const bB = await createBooking(r2._id, workerB._id, { status: 'completed' });

    await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(r1)}`).send({ bookingId: bA._id, rating: 5 });
    await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(r2)}`).send({ bookingId: bB._id, rating: 3 });

    const res = await request(app).get(`/api/reviews/worker/${workerA._id}`);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].rating).toBe(5);
  });

  it('returns an empty list for a worker with no reviews', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app).get(`/api/reviews/worker/${worker._id}`);

    expect(res.status).toBe(200);
    expect(res.body.reviews).toEqual([]);
  });
});
