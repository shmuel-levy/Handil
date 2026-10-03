process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

/**
 * Data-integrity regressions: races, final states and notification payloads
 * that each used to let the database end up contradicting itself.
 */

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const Quote   = require('../../src/models/Quote');
const JobPost = require('../../src/models/JobPost');
const Booking = require('../../src/models/Booking');
const Conversation = require('../../src/models/Conversation');
const { reset, eventsOf } = require('../helpers/socketMock');
const {
  createResident, createWorkerUser, createPost, createQuote, createBooking,
  createConversation, tokenFor,
} = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(async () => {
  await db.clear();
  reset();
});
afterAll(() => db.disconnect());

const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

// ─── Concurrent accepts ───────────────────────────────────────────────────────

describe('accepting a job is atomic', () => {
  it('lets exactly one of two concurrent worker accepts win', async () => {
    const resident = await createResident();
    const { user: a } = await createWorkerUser({ name: 'A' });
    const { user: b } = await createWorkerUser({ name: 'B' });
    const post = await createPost(resident._id);

    const [r1, r2] = await Promise.all([
      request(app).post(`/api/posts/${post._id}/accept`).set(auth(a)),
      request(app).post(`/api/posts/${post._id}/accept`).set(auth(b)),
    ]);

    expect([r1.status, r2.status].sort()).toEqual([200, 400]);

    const winner = r1.status === 200 ? a : b;
    const stored = await JobPost.findById(post._id);
    expect(stored.acceptedBy.toString()).toBe(winner._id.toString());

    // The booking must belong to the same worker the post names
    const bookings = await Booking.find({ jobPost: post._id });
    expect(bookings).toHaveLength(1);
    expect(bookings[0].worker.toString()).toBe(winner._id.toString());
  });

  it('refuses a quote accept once a worker has taken the post directly', async () => {
    const resident = await createResident();
    const { user: direct } = await createWorkerUser();
    const { workerProfile: quoter } = await createWorkerUser();
    const post = await createPost(resident._id);
    const quote = await createQuote(post._id, quoter._id);

    await request(app).post(`/api/posts/${post._id}/accept`).set(auth(direct)).expect(200);

    const res = await request(app).patch(`/api/quotes/${quote._id}/accept`).set(auth(resident));
    expect(res.status).toBe(400);
    expect((await Quote.findById(quote._id)).status).toBe('pending');
    expect(await Booking.countDocuments({ jobPost: post._id })).toBe(1);
  });

  it('still returns 404 for a post that does not exist', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .post('/api/posts/64a000000000000000000099/accept')
      .set(auth(worker));
    expect(res.status).toBe(404);
  });
});

// ─── Quote reject ─────────────────────────────────────────────────────────────

describe('rejecting a quote', () => {
  it('cannot reject a quote that was already accepted', async () => {
    const resident = await createResident();
    const { workerProfile } = await createWorkerUser();
    const post = await createPost(resident._id);
    const quote = await createQuote(post._id, workerProfile._id);

    await request(app).patch(`/api/quotes/${quote._id}/accept`).set(auth(resident)).expect(200);
    reset();

    const res = await request(app).patch(`/api/quotes/${quote._id}/reject`).set(auth(resident));

    expect(res.status).toBe(400);
    expect((await Quote.findById(quote._id)).status).toBe('accepted');
    // The worker must not be told they lost a job they actually won
    expect(eventsOf('quote_rejected')).toHaveLength(0);
  });
});

// ─── new_quote notification ───────────────────────────────────────────────────

describe('new_quote notification', () => {
  it("carries the worker's real name", async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser({ name: 'יוסי השרברב' });
    const post = await createPost(resident._id);

    await request(app)
      .post('/api/quotes')
      .set(auth(worker))
      .send({ jobPostId: post._id, proposedPrice: 300 })
      .expect(201);

    const [event] = eventsOf('new_quote');
    expect(event.payload.quote.workerName).toBe('יוסי השרברב');
  });
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

describe('booking creation targets a real worker', () => {
  it('returns 404 when the target user is a resident', async () => {
    const resident = await createResident();
    const other = await createResident();

    const res = await request(app)
      .post('/api/bookings')
      .set(auth(resident))
      .send({ workerUserId: other._id, category: 'plumber' });

    expect(res.status).toBe(404);
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('returns 404 for a user id that does not exist', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(resident))
      .send({ workerUserId: '64a000000000000000000099', category: 'plumber' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id instead of a 500', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/bookings')
      .set(auth(resident))
      .send({ workerUserId: 'not-an-id', category: 'plumber' });
    expect(res.status).toBe(400);
  });
});

describe('finished bookings are final', () => {
  it.each(['cancelled', 'rejected', 'completed'])(
    'a %s booking cannot be moved to completed/accepted by the worker',
    async (finalStatus) => {
      const resident = await createResident();
      const { user: worker } = await createWorkerUser();
      const booking = await createBooking(resident._id, worker._id, { status: finalStatus });

      const target = finalStatus === 'completed' ? 'accepted' : 'completed';
      const res = await request(app)
        .patch(`/api/bookings/${booking._id}/status`)
        .set(auth(worker))
        .send({ status: target });

      expect(res.status).toBe(400);
      expect((await Booking.findById(booking._id)).status).toBe(finalStatus);
    }
  );

  it('a cancelled booking cannot be "completed" and then reviewed', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const booking = await createBooking(resident._id, worker._id, { status: 'cancelled' });

    await request(app)
      .patch(`/api/bookings/${booking._id}/status`)
      .set(auth(worker))
      .send({ status: 'completed' })
      .expect(400);

    const review = await request(app)
      .post('/api/reviews')
      .set(auth(resident))
      .send({ bookingId: booking._id, rating: 5 });
    expect(review.status).toBe(400);
  });
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

describe('chat unread counts', () => {
  it('counts every message when several are sent at once', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post(`/api/chat/conversations/${conv._id}/messages`)
          .set(auth(resident))
          .send({ text: `הודעה ${i}` })
          .expect(201)
      )
    );

    const stored = await Conversation.findById(conv._id);
    expect(stored.unreadCounts.get(worker._id.toString())).toBe(5);
  });

  it('clamps the message page size', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    const res = await request(app)
      .get(`/api/chat/conversations/${conv._id}/messages?limit=100000&page=-3`)
      .set(auth(resident));

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
  });
});
