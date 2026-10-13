process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const Booking = require('../../src/models/Booking');
const { reset, eventsOf } = require('../helpers/socketMock');

beforeAll(() => db.connect());
afterEach(async () => {
  await db.clear();
  reset();
});
afterAll(() => db.disconnect());

async function registerUser(name, email, role) {
  const res = await request(app).post('/api/auth/register')
    .send({ name, email, password: 'secret123', role });
  expect(res.status).toBe(201);
  return { token: res.body.token, id: res.body.user.id };
}

describe('direct booking journey', () => {
  it('walks a booking from request through acceptance to completion and review', async () => {
    const resident = await registerUser('דנה',  'dana@b.test',  'resident');
    const worker   = await registerUser('משה', 'moshe@b.test', 'worker');

    // 1. The resident finds the worker in the public directory
    const directory = await request(app).get('/api/workers');
    expect(directory.body.workers).toHaveLength(1);

    // 2. …and requests a booking
    const create = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({
        workerUserId: worker.id,
        category: 'plumber',
        description: 'ברז דולף באמבטיה',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      });
    expect(create.status).toBe(201);
    expect(create.body.booking.status).toBe('pending');
    const bookingId = create.body.booking._id;

    // 3. It appears on the worker's list
    const workerInbox = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${worker.token}`);
    expect(workerInbox.body.bookings.map((b) => b._id)).toContain(bookingId);
    expect(workerInbox.body.bookings[0].resident.name).toBe('דנה'); // populated

    // 4. The worker accepts — both sides get a live update
    const accept = await request(app).patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ status: 'accepted' });
    expect(accept.status).toBe(200);
    expect(accept.body.booking.status).toBe('accepted');

    const updates = eventsOf('booking_updated');
    expect(updates).toHaveLength(2);
    expect(updates.map((e) => e.room).sort())
      .toEqual([`user:${resident.id}`, `user:${worker.id}`].sort());

    // 5. The worker finishes the job
    const complete = await request(app).patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ status: 'completed' });
    expect(complete.body.booking.status).toBe('completed');

    // 6. Only now can the resident review it
    const review = await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ bookingId, rating: 4, comment: 'עבודה טובה' });
    expect(review.status).toBe(201);

    // 7. The rating lands on the public profile
    const profile = await request(app).get('/api/workers/me')
      .set('Authorization', `Bearer ${worker.token}`);
    expect(profile.body.worker.rating).toBe(4);
    expect(profile.body.worker.reviewCount).toBe(1);
  });

  it('lets the resident cancel while the worker cannot', async () => {
    const resident = await registerUser('דנה',  'dana2@b.test',  'resident');
    const worker   = await registerUser('משה', 'moshe2@b.test', 'worker');

    const create = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ workerUserId: worker.id, category: 'plumber' });
    const bookingId = create.body.booking._id;

    // The worker has no cancel power
    const workerCancel = await request(app).patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ status: 'cancelled' });
    expect(workerCancel.status).toBe(400);

    // The resident does
    const residentCancel = await request(app).patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ status: 'cancelled' });
    expect(residentCancel.status).toBe(200);
    expect((await Booking.findById(bookingId)).status).toBe('cancelled');

    // A cancelled job cannot be reviewed
    const review = await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ bookingId, rating: 1 });
    expect(review.status).toBe(400);
  });

  it('keeps one resident bookings invisible to another', async () => {
    const mine     = await registerUser('שלי',  'mine@b.test',  'resident');
    const theirs   = await registerUser('שלהם', 'other@b.test', 'resident');
    const worker   = await registerUser('משה',  'moshe3@b.test', 'worker');

    const created = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${mine.token}`)
      .send({ workerUserId: worker.id, category: 'plumber' });
    const bookingId = created.body.booking._id;

    const list = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${theirs.token}`);
    expect(list.body.bookings).toHaveLength(0);

    const direct = await request(app).get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${theirs.token}`);
    expect(direct.status).toBe(403);

    const tamper = await request(app).patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${theirs.token}`)
      .send({ status: 'cancelled' });
    expect(tamper.status).toBe(403);
    expect((await Booking.findById(bookingId)).status).toBe('pending');
  });

  it('refuses a worker-initiated booking and writes nothing', async () => {
    const workerA = await registerUser('משה', 'a@b.test', 'worker');
    const workerB = await registerUser('אבי', 'b@b.test', 'worker');

    const res = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${workerA.token}`)
      .send({ workerUserId: workerB.id, category: 'plumber' });

    expect(res.status).toBe(403);
    expect(await Booking.countDocuments()).toBe(0);
  });
});
