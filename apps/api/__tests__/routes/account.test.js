process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

/**
 * Account deletion, phone disclosure to the hired worker, and the generic
 * error contract for unexpected failures.
 */

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const User    = require('../../src/models/User');
const Worker  = require('../../src/models/Worker');
const JobPost = require('../../src/models/JobPost');
const Quote   = require('../../src/models/Quote');
const Booking = require('../../src/models/Booking');
const Review  = require('../../src/models/Review');
const Conversation = require('../../src/models/Conversation');
const Message      = require('../../src/models/Message');
const { reset } = require('../helpers/socketMock');
const {
  createResident, createWorkerUser, createPost, createQuote, createBooking,
  createConversation, createMessage, tokenFor, DEFAULT_PASSWORD,
} = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(async () => {
  await db.clear();
  reset();
});
afterAll(() => db.disconnect());

const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
const deleteMe = (user, password = DEFAULT_PASSWORD) =>
  request(app).delete('/api/auth/me').set(auth(user)).send({ password });

// ─── DELETE /api/auth/me ──────────────────────────────────────────────────────

describe('DELETE /api/auth/me', () => {
  it('requires the password', async () => {
    const resident = await createResident();
    const res = await request(app).delete('/api/auth/me').set(auth(resident)).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('נא להזין סיסמה לאישור');
    expect(await User.exists({ _id: resident._id })).not.toBeNull();
  });

  it('refuses a wrong password and keeps the account', async () => {
    const resident = await createResident();
    const res = await deleteMe(resident, 'wrong-password');
    // 403 rather than 401 — the mobile client signs out on any 401
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('סיסמה שגויה');
    expect(await User.exists({ _id: resident._id })).not.toBeNull();
  });

  it('requires a token', async () => {
    const res = await request(app).delete('/api/auth/me').send({ password: 'x' });
    expect(res.status).toBe(401);
  });

  it('deletes a resident with their posts, quotes, bookings, reviews and chats', async () => {
    const resident = await createResident();
    const { user: workerUser, workerProfile } = await createWorkerUser({ rating: 0, reviewCount: 0 });
    const post = await createPost(resident._id);
    await createQuote(post._id, workerProfile._id);
    const booking = await createBooking(resident._id, workerUser._id, { status: 'completed' });
    await request(app).post('/api/reviews').set(auth(resident))
      .send({ bookingId: booking._id.toString(), rating: 5 }).expect(201);
    const conv = await createConversation([resident._id, workerUser._id]);
    await createMessage(conv._id, resident._id);

    expect((await Worker.findById(workerProfile._id)).reviewCount).toBe(1);

    const res = await deleteMe(resident);
    expect(res.status).toBe(200);

    expect(await User.exists({ _id: resident._id })).toBeNull();
    expect(await JobPost.countDocuments({ resident: resident._id })).toBe(0);
    expect(await Quote.countDocuments({ jobPost: post._id })).toBe(0);
    expect(await Booking.countDocuments({ resident: resident._id })).toBe(0);
    expect(await Review.countDocuments({ resident: resident._id })).toBe(0);
    expect(await Conversation.countDocuments({ _id: conv._id })).toBe(0);
    expect(await Message.countDocuments({ conversation: conv._id })).toBe(0);

    // The reviewed worker no longer carries the deleted resident's rating
    const worker = await Worker.findById(workerProfile._id);
    expect(worker.reviewCount).toBe(0);
    expect(worker.rating).toBe(0);
    // …and the worker account itself is untouched
    expect(await User.exists({ _id: workerUser._id })).not.toBeNull();
  });

  it('deletes a worker and puts the jobs they were hired for back on the board', async () => {
    const resident = await createResident();
    const { user: workerUser, workerProfile } = await createWorkerUser();
    const post = await createPost(resident._id);
    const quote = await createQuote(post._id, workerProfile._id);
    await request(app).patch(`/api/quotes/${quote._id}/accept`).set(auth(resident)).expect(200);

    const res = await deleteMe(workerUser);
    expect(res.status).toBe(200);

    expect(await User.exists({ _id: workerUser._id })).toBeNull();
    expect(await Worker.exists({ _id: workerProfile._id })).toBeNull();
    expect(await Quote.countDocuments({ worker: workerProfile._id })).toBe(0);
    expect(await Booking.countDocuments({ worker: workerUser._id })).toBe(0);

    const reopened = await JobPost.findById(post._id);
    expect(reopened.status).toBe('open');
    expect(reopened.acceptedBy).toBeNull();
  });

  it('invalidates the token — the deleted user can no longer call the API', async () => {
    const resident = await createResident();
    await deleteMe(resident).expect(200);
    const res = await request(app).get('/api/auth/me').set(auth(resident));
    expect(res.status).toBe(401);
  });

  it('frees the e-mail for a new registration', async () => {
    const resident = await createResident({ email: 'again@test.com' });
    await deleteMe(resident).expect(200);
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'חדש', email: 'again@test.com', password: 'secret123', role: 'resident' });
    expect(res.status).toBe(201);
  });
});

// ─── GET /api/quotes/my — phone disclosure ────────────────────────────────────

describe('GET /api/quotes/my', () => {
  it('includes the resident phone only on accepted quotes', async () => {
    const resident = await createResident({ phone: '050-9998888' });
    const { user: workerUser, workerProfile } = await createWorkerUser();
    const wonPost  = await createPost(resident._id, { title: 'זכיתי' });
    const openPost = await createPost(resident._id, { title: 'ממתין' });
    const won = await createQuote(wonPost._id, workerProfile._id);
    await createQuote(openPost._id, workerProfile._id);
    await request(app).patch(`/api/quotes/${won._id}/accept`).set(auth(resident)).expect(200);

    const res = await request(app).get('/api/quotes/my').set(auth(workerUser));
    expect(res.status).toBe(200);

    const byTitle = Object.fromEntries(res.body.quotes.map((q) => [q.jobPost.title, q]));
    expect(byTitle['זכיתי'].jobPost.resident.phone).toBe('050-9998888');
    expect(byTitle['ממתין'].jobPost.resident.phone).toBeUndefined();
    expect(byTitle['ממתין'].jobPost.resident.name).toBeDefined();
  });
});

// ─── Error contract ───────────────────────────────────────────────────────────

describe('unexpected failures', () => {
  it('return a generic message instead of internal error text', async () => {
    const resident = await createResident();
    const spy = jest.spyOn(Booking, 'find').mockImplementationOnce(() => {
      throw new Error('connection pool exhausted at 10.0.0.5:27017');
    });
    const res = await request(app).get('/api/bookings').set(auth(resident));
    spy.mockRestore();

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('שגיאת שרת');
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
  });

  it('malformed ids answer 404 on every resource', async () => {
    const resident = await createResident();
    const paths = [
      ['get',   '/api/bookings/bad-id'],
      ['patch', '/api/bookings/bad-id/status'],
      ['get',   '/api/workers/bad-id'],
      ['get',   '/api/chat/conversations/bad-id/messages'],
      ['patch', '/api/quotes/bad-id/reject'],
      ['get',   '/api/quotes/job/bad-id'],
      ['post',  '/api/posts/bad-id/close'],
    ];
    for (const [method, path] of paths) {
      const res = await request(app)[method](path).set(auth(resident)).send({ status: 'cancelled' });
      expect({ path, status: res.status }).toEqual({ path, status: 404 });
    }
  });

  it('two simultaneous sign-ups with one e-mail give one 201 and one 409', async () => {
    await User.syncIndexes();
    const body = { name: 'כפול', email: 'race@test.com', password: 'secret123', role: 'resident' };
    const [a, b] = await Promise.all([
      request(app).post('/api/auth/register').send(body),
      request(app).post('/api/auth/register').send(body),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});
