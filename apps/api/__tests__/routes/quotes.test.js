process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const Quote   = require('../../src/models/Quote');
const JobPost = require('../../src/models/JobPost');
const Booking = require('../../src/models/Booking');
const { reset, eventsOf } = require('../helpers/socketMock');
const {
  createResident, createWorkerUser, createPost, createQuote, tokenFor,
} = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(async () => {
  await db.clear();
  reset();
});
afterAll(() => db.disconnect());

// ─── POST /api/quotes ─────────────────────────────────────────────────────────

describe('POST /api/quotes', () => {
  it('lets a worker submit a quote on an open post', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 450, message: 'אגיע היום' });

    expect(res.status).toBe(201);
    expect(res.body.quote.proposedPrice).toBe(450);
    expect(res.body.quote.message).toBe('אגיע היום');
    expect(res.body.quote.status).toBe('pending');
    // worker is populated with its nested user
    expect(res.body.quote.worker.user.name).toBeDefined();
  });

  it('stores the estimated arrival date when supplied', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);
    const eta = new Date(Date.now() + 86400000);

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 200, estimatedArrivalDate: eta.toISOString() });

    expect(res.status).toBe(201);
    expect(new Date(res.body.quote.estimatedArrivalDate).getTime()).toBe(eta.getTime());
  });

  it('notifies the resident with a new_quote event', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id, { title: 'נזילה' });

    await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 450 });

    const events = eventsOf('new_quote');
    expect(events).toHaveLength(1);
    expect(events[0].room).toBe(`user:${resident._id}`);
    expect(events[0].payload.postId).toBe(post._id.toString());
    expect(events[0].payload.postTitle).toBe('נזילה');
    expect(events[0].payload.quote.proposedPrice).toBe(450);
  });

  it('returns 403 when a resident tries to submit a quote', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ jobPostId: post._id, proposedPrice: 100 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('רק בעלי מקצוע יכולים לשלוח הצעות');
  });

  it('returns 400 when jobPostId is missing', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ proposedPrice: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('חסרים שדות חובה');
  });

  it('returns 400 when proposedPrice is missing', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id });

    expect(res.status).toBe(400);
  });

  it('accepts a proposedPrice of 0 (free quote) rather than treating it as missing', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 0 });

    expect(res.status).toBe(201);
    expect(res.body.quote.proposedPrice).toBe(0);
  });

  it('returns 404 when the post does not exist', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: '64a000000000000000000099', proposedPrice: 100 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('פוסט לא נמצא');
  });

  it('returns 400 when the post is no longer open', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id, { status: 'accepted' });

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('הפוסט כבר לא פתוח לקבלת הצעות');
  });

  it('returns 409 when the same worker quotes the post twice', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const first = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 500 });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: 400 });

    expect(second.status).toBe(409);
    expect(second.body.message).toBe('כבר שלחת הצעה לפוסט הזה');
    expect(await Quote.countDocuments({ jobPost: post._id })).toBe(1);
  });

  it('lets two different workers quote the same post', async () => {
    const resident = await createResident();
    const { user: w1 } = await createWorkerUser();
    const { user: w2 } = await createWorkerUser();
    const post = await createPost(resident._id);

    const a = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(w1)}`)
      .send({ jobPostId: post._id, proposedPrice: 500 });
    const b = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(w2)}`)
      .send({ jobPostId: post._id, proposedPrice: 350 });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(await Quote.countDocuments({ jobPost: post._id })).toBe(2);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/quotes').send({ jobPostId: 'x', proposedPrice: 1 });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/quotes/job/:jobId ───────────────────────────────────────────────

describe('GET /api/quotes/job/:jobId', () => {
  it('returns the resident own quotes sorted cheapest first', async () => {
    const resident = await createResident();
    const { workerProfile: w1 } = await createWorkerUser();
    const { workerProfile: w2 } = await createWorkerUser();
    const { workerProfile: w3 } = await createWorkerUser();
    const post = await createPost(resident._id);

    await createQuote(post._id, w1._id, { proposedPrice: 500 });
    await createQuote(post._id, w2._id, { proposedPrice: 200 });
    await createQuote(post._id, w3._id, { proposedPrice: 350 });

    const res = await request(app)
      .get(`/api/quotes/job/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.quotes.map((q) => q.proposedPrice)).toEqual([200, 350, 500]);
    expect(res.body.quotes[0].worker.user.name).toBeDefined();
  });

  it('returns 403 when another user asks for the quotes', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const res = await request(app)
      .get(`/api/quotes/job/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('אין הרשאה לצפות בהצעות');
  });

  it('returns 404 for a non-existent post', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/quotes/job/64a000000000000000000099')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(404);
  });

  it('returns an empty list for a post with no quotes', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id);

    const res = await request(app)
      .get(`/api/quotes/job/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.quotes).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

// ─── GET /api/quotes/check/:jobId ─────────────────────────────────────────────

describe('GET /api/quotes/check/:jobId', () => {
  it('returns the quote a worker already submitted', async () => {
    const resident = await createResident();
    const { user: worker, workerProfile } = await createWorkerUser();
    const post  = await createPost(resident._id);
    const quote = await createQuote(post._id, workerProfile._id, { proposedPrice: 275 });

    const res = await request(app)
      .get(`/api/quotes/check/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.quote._id).toBe(quote._id.toString());
    expect(res.body.quote.proposedPrice).toBe(275);
  });

  it('returns null when the worker has not quoted this post', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const res = await request(app)
      .get(`/api/quotes/check/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.quote).toBeNull();
  });

  it('returns null for a resident', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id);

    const res = await request(app)
      .get(`/api/quotes/check/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.quote).toBeNull();
  });
});

// ─── GET /api/quotes/my ───────────────────────────────────────────────────────

describe('GET /api/quotes/my', () => {
  it('returns every quote the worker submitted, newest first', async () => {
    const resident = await createResident();
    const { user: worker, workerProfile } = await createWorkerUser();
    const { workerProfile: otherProfile } = await createWorkerUser();

    const p1 = await createPost(resident._id, { title: 'ראשון' });
    const p2 = await createPost(resident._id, { title: 'שני' });
    const p3 = await createPost(resident._id, { title: 'של אחר' });

    await createQuote(p1._id, workerProfile._id);
    await createQuote(p2._id, workerProfile._id);
    await createQuote(p3._id, otherProfile._id); // another worker — must not appear

    const res = await request(app)
      .get('/api/quotes/my')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.quotes).toHaveLength(2);
    // jobPost is populated so the worker can render the job title
    expect(res.body.quotes[0].jobPost.title).toBeDefined();
  });

  it('returns an empty list for a worker with no quotes', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .get('/api/quotes/my')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.quotes).toEqual([]);
  });

  it('returns an empty list for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/quotes/my')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.quotes).toEqual([]);
  });
});

// ─── PATCH /api/quotes/:id/accept ─────────────────────────────────────────────

describe('PATCH /api/quotes/:id/accept', () => {
  async function scenario() {
    const resident = await createResident();
    const { user: winnerUser, workerProfile: winner } = await createWorkerUser();
    const { user: loserUser,  workerProfile: loser  } = await createWorkerUser();
    const post = await createPost(resident._id, { title: 'נזילה במטבח', category: 'plumber' });

    const winningQuote = await createQuote(post._id, winner._id, { proposedPrice: 350 });
    const losingQuote  = await createQuote(post._id, loser._id,  { proposedPrice: 500 });

    return { resident, winnerUser, loserUser, post, winningQuote, losingQuote };
  }

  it('marks the accepted quote as accepted', async () => {
    const { resident, winningQuote } = await scenario();

    const res = await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.quote.status).toBe('accepted');
  });

  it('auto-rejects every other pending quote on the post', async () => {
    const { resident, winningQuote, losingQuote } = await scenario();

    await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect((await Quote.findById(losingQuote._id)).status).toBe('rejected');
  });

  it('marks the post accepted and records the winning worker', async () => {
    const { resident, winnerUser, post, winningQuote } = await scenario();

    const res = await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.body.post.status).toBe('accepted');

    const stored = await JobPost.findById(post._id);
    expect(stored.status).toBe('accepted');
    expect(stored.acceptedBy.toString()).toBe(winnerUser._id.toString());
  });

  it('creates a booking at the quoted price', async () => {
    const { resident, winnerUser, winningQuote } = await scenario();

    await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    const booking = await Booking.findOne({ resident: resident._id, worker: winnerUser._id });
    expect(booking).not.toBeNull();
    expect(booking.status).toBe('accepted');
    expect(booking.price).toBe(350);
    expect(booking.category).toBe('plumber');
    expect(booking.description).toBe('נזילה במטבח');
  });

  it('notifies the winning worker with a quote_accepted event', async () => {
    const { resident, winnerUser, post, winningQuote } = await scenario();

    await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    const events = eventsOf('quote_accepted');
    expect(events).toHaveLength(1);
    expect(events[0].room).toBe(`user:${winnerUser._id}`);
    expect(events[0].payload.postId).toBe(post._id.toString());
    expect(events[0].payload.price).toBe(350);
  });

  it('returns 403 when a different user tries to accept', async () => {
    const { winningQuote } = await scenario();
    const stranger = await createResident();

    const res = await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('אין הרשאה לאשר הצעה זו');
    expect((await Quote.findById(winningQuote._id)).status).toBe('pending');
  });

  it('returns 400 when the quote is not pending', async () => {
    const { resident, winningQuote } = await scenario();
    await Quote.findByIdAndUpdate(winningQuote._id, { status: 'rejected' });

    const res = await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('ניתן לקבל רק הצעות בהמתנה');
  });

  it('refuses a second acceptance once the post is closed', async () => {
    const { resident, winningQuote, losingQuote } = await scenario();

    await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    // the loser was auto-rejected, so this trips the "not pending" guard first
    const res = await request(app)
      .patch(`/api/quotes/${losingQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(400);
    expect(await Booking.countDocuments()).toBe(1); // no duplicate booking
  });

  it('returns 400 when the post is already closed but the quote is still pending', async () => {
    const { resident, post, winningQuote } = await scenario();
    await JobPost.findByIdAndUpdate(post._id, { status: 'closed' });

    const res = await request(app)
      .patch(`/api/quotes/${winningQuote._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('הפוסט כבר לא פתוח');
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('returns 404 for a non-existent quote', async () => {
    const resident = await createResident();
    const res = await request(app)
      .patch('/api/quotes/64a000000000000000000099/accept')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('הצעה לא נמצאה');
  });
});

// ─── PATCH /api/quotes/:id/reject ─────────────────────────────────────────────

describe('PATCH /api/quotes/:id/reject', () => {
  it('lets the resident reject a pending quote', async () => {
    const resident = await createResident();
    const { workerProfile } = await createWorkerUser();
    const post  = await createPost(resident._id);
    const quote = await createQuote(post._id, workerProfile._id);

    const res = await request(app)
      .patch(`/api/quotes/${quote._id}/reject`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.quote.status).toBe('rejected');
  });

  it('notifies the worker with a quote_rejected event', async () => {
    const resident = await createResident();
    const { user: worker, workerProfile } = await createWorkerUser();
    const post  = await createPost(resident._id, { title: 'נזילה' });
    const quote = await createQuote(post._id, workerProfile._id);

    await request(app)
      .patch(`/api/quotes/${quote._id}/reject`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    const events = eventsOf('quote_rejected');
    expect(events).toHaveLength(1);
    expect(events[0].room).toBe(`user:${worker._id}`);
    expect(events[0].payload.postTitle).toBe('נזילה');
  });

  it('leaves the post open so other quotes can still win', async () => {
    const resident = await createResident();
    const { workerProfile } = await createWorkerUser();
    const post  = await createPost(resident._id);
    const quote = await createQuote(post._id, workerProfile._id);

    await request(app)
      .patch(`/api/quotes/${quote._id}/reject`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect((await JobPost.findById(post._id)).status).toBe('open');
  });

  it('returns 403 when a different user tries to reject', async () => {
    const resident = await createResident();
    const stranger = await createResident();
    const { workerProfile } = await createWorkerUser();
    const post  = await createPost(resident._id);
    const quote = await createQuote(post._id, workerProfile._id);

    const res = await request(app)
      .patch(`/api/quotes/${quote._id}/reject`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('אין הרשאה לדחות הצעה זו');
  });

  it('returns 404 for a non-existent quote', async () => {
    const resident = await createResident();
    const res = await request(app)
      .patch('/api/quotes/64a000000000000000000099/reject')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(404);
  });
});
