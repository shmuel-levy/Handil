process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
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

// ─── POST /api/posts ──────────────────────────────────────────────────────────

describe('POST /api/posts', () => {
  it('lets a resident create a job post', async () => {
    const resident = await createResident();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({
        title: 'נזילה במטבח',
        description: 'נזילה מתחת לכיור',
        category: 'plumber',
        budget: 400,
        urgency: 'today',
        location: 'תל אביב',
      });

    expect(res.status).toBe(201);
    expect(res.body.post.title).toBe('נזילה במטבח');
    expect(res.body.post.status).toBe('open');
    expect(res.body.post.budget).toBe(400);
    expect(res.body.post.resident.name).toBeDefined(); // populated
  });

  it('defaults urgency to flexible and location to תל אביב', async () => {
    const resident = await createResident();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'צביעת סלון', category: 'painter' });

    expect(res.status).toBe(201);
    expect(res.body.post.urgency).toBe('flexible');
    expect(res.body.post.location).toBe('תל אביב');
    expect(res.body.post.urgencyExpiresAt).toBeNull();
  });

  it('stamps a 24h expiry on urgent posts only', async () => {
    const resident = await createResident();

    const urgent = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'פיצוץ צינור', category: 'plumber', urgency: 'urgent' });

    expect(urgent.status).toBe(201);
    expect(urgent.body.post.urgencyExpiresAt).not.toBeNull();

    const ttlMs = new Date(urgent.body.post.urgencyExpiresAt).getTime() - Date.now();
    // ~24h, allowing for test execution time
    expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);

    const relaxed = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'תיקון ארון', category: 'carpenter', urgency: 'week' });

    expect(relaxed.body.post.urgencyExpiresAt).toBeNull();
  });

  it('broadcasts a new_post event to all connected workers', async () => {
    const resident = await createResident();

    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'החלפת מנעול', category: 'locksmith' });

    const events = eventsOf('new_post');
    expect(events).toHaveLength(1);
    expect(events[0].room).toBeNull(); // broadcast, not room-targeted
    expect(events[0].payload.post.title).toBe('החלפת מנעול');
    expect(events[0].payload.post.category).toBe('locksmith');
  });

  it('returns 403 when a worker tries to create a post', async () => {
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ title: 'x', category: 'plumber' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('רק תושבים יכולים לפרסם עבודות');
  });

  it('returns 400 when the title is missing', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ category: 'plumber' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('כותרת וקטגוריה הם שדות חובה');
  });

  it('returns 400 when the category is missing', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'משהו' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/posts').send({ title: 'x', category: 'plumber' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/posts ───────────────────────────────────────────────────────────

describe('GET /api/posts', () => {
  it('returns open posts with a total count', async () => {
    const resident = await createResident();
    await createPost(resident._id, { title: 'א' });
    await createPost(resident._id, { title: 'ב' });
    await createPost(resident._id, { title: 'סגור', status: 'closed' });

    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
  });

  it('filters by category', async () => {
    const resident = await createResident();
    await createPost(resident._id, { category: 'plumber' });
    await createPost(resident._id, { category: 'electrician' });

    const res = await request(app)
      .get('/api/posts?category=electrician')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].category).toBe('electrician');
  });

  it('sorts urgent posts ahead of flexible ones', async () => {
    const resident = await createResident();
    await createPost(resident._id, { title: 'גמיש', urgency: 'flexible' });
    await createPost(resident._id, { title: 'שבוע',  urgency: 'week' });
    await createPost(resident._id, {
      title: 'דחוף', urgency: 'urgent',
      urgencyExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts.map((p) => p.title)).toEqual(['דחוף', 'שבוע', 'גמיש']);
  });

  it('hides urgent posts whose 24h window has passed', async () => {
    const resident = await createResident();
    await createPost(resident._id, { title: 'עדיין תקף', urgency: 'flexible' });
    await createPost(resident._id, {
      title: 'פג תוקף',
      urgency: 'urgent',
      urgencyExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts.map((p) => p.title)).toEqual(['עדיין תקף']);
  });

  it('paginates', async () => {
    const resident = await createResident();
    for (let i = 0; i < 5; i++) await createPost(resident._id, { title: `פוסט ${i}` });

    const page1 = await request(app)
      .get('/api/posts?limit=2&page=1')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);
    const page2 = await request(app)
      .get('/api/posts?limit=2&page=2')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(page1.body.posts).toHaveLength(2);
    expect(page2.body.posts).toHaveLength(2);
    expect(page1.body.total).toBe(5);

    const ids1 = page1.body.posts.map((p) => p._id);
    const ids2 = page2.body.posts.map((p) => p._id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/posts/mine ──────────────────────────────────────────────────────

describe('GET /api/posts/mine', () => {
  it('returns only the calling resident posts', async () => {
    const mine   = await createResident();
    const theirs = await createResident();
    await createPost(mine._id,   { title: 'שלי 1' });
    await createPost(mine._id,   { title: 'שלי 2' });
    await createPost(theirs._id, { title: 'לא שלי' });

    const res = await request(app)
      .get('/api/posts/mine')
      .set('Authorization', `Bearer ${tokenFor(mine)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.posts.map((p) => p.title).sort()).toEqual(['שלי 1', 'שלי 2']);
  });

  it('attaches the pending quote count to each post', async () => {
    const resident = await createResident();
    const { workerProfile: w1 } = await createWorkerUser();
    const { workerProfile: w2 } = await createWorkerUser();

    const busy  = await createPost(resident._id, { title: 'עם הצעות' });
    const quiet = await createPost(resident._id, { title: 'בלי הצעות' });

    await createQuote(busy._id, w1._id);
    await createQuote(busy._id, w2._id, { status: 'rejected' }); // must not count

    const res = await request(app)
      .get('/api/posts/mine')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    const byTitle = Object.fromEntries(res.body.posts.map((p) => [p.title, p.pendingQuoteCount]));
    expect(byTitle['עם הצעות']).toBe(1);
    expect(byTitle['בלי הצעות']).toBe(0);
  });

  it('includes closed and accepted posts', async () => {
    const resident = await createResident();
    await createPost(resident._id, { title: 'פתוח',  status: 'open' });
    await createPost(resident._id, { title: 'התקבל', status: 'accepted' });
    await createPost(resident._id, { title: 'סגור',  status: 'closed' });

    const res = await request(app)
      .get('/api/posts/mine')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.body.posts).toHaveLength(3);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/posts/mine');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/posts/recommended ───────────────────────────────────────────────

describe('GET /api/posts/recommended', () => {
  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/posts/recommended')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('בעלי מקצוע בלבד');
  });

  it('prefers posts matching the worker city and categories', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser({
      categories: ['plumber'], city: 'תל אביב',
    });

    // 3 matches — enough to satisfy the route's "good enough" threshold
    await createPost(resident._id, { title: 'מתאים 1', category: 'plumber', location: 'תל אביב' });
    await createPost(resident._id, { title: 'מתאים 2', category: 'plumber', location: 'תל אביב' });
    await createPost(resident._id, { title: 'מתאים 3', category: 'plumber', location: 'תל אביב' });
    await createPost(resident._id, { title: 'לא מתאים', category: 'gardener', location: 'חיפה' });

    const res = await request(app)
      .get('/api/posts/recommended')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.isPersonalized).toBe(true);
    expect(res.body.posts).toHaveLength(3);
    expect(res.body.posts.every((p) => p.category === 'plumber')).toBe(true);
  });

  it('falls back to all open posts when nothing matches', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser({
      categories: ['welder'], city: 'אילת',
    });

    await createPost(resident._id, { title: 'אחר 1', category: 'gardener', location: 'חיפה' });
    await createPost(resident._id, { title: 'אחר 2', category: 'painter',  location: 'חיפה' });
    await createPost(resident._id, { title: 'אחר 3', category: 'cleaner',  location: 'חיפה' });

    const res = await request(app)
      .get('/api/posts/recommended')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(3);
    expect(res.body.isPersonalized).toBe(false);
  });

  it('excludes expired urgent posts', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser({ categories: ['plumber'] });

    await createPost(resident._id, { title: 'תקף', category: 'plumber' });
    await createPost(resident._id, {
      title: 'פג', category: 'plumber',
      urgency: 'urgent', urgencyExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .get('/api/posts/recommended')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts.map((p) => p.title)).not.toContain('פג');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/posts/recommended');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────

describe('GET /api/posts/:id', () => {
  it('returns the post with its live quote count', async () => {
    const resident = await createResident();
    const { workerProfile: w1 } = await createWorkerUser();
    const { workerProfile: w2 } = await createWorkerUser();
    const post = await createPost(resident._id);

    await createQuote(post._id, w1._id, { status: 'pending' });
    await createQuote(post._id, w2._id, { status: 'accepted' });

    const res = await request(app)
      .get(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.post._id).toBe(post._id.toString());
    expect(res.body.quoteCount).toBe(2); // pending + accepted
    expect(res.body.post.resident.name).toBeDefined();
  });

  it('excludes rejected quotes from the quote count', async () => {
    const resident = await createResident();
    const { workerProfile } = await createWorkerUser();
    const post = await createPost(resident._id);
    await createQuote(post._id, workerProfile._id, { status: 'rejected' });

    const res = await request(app)
      .get(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.body.quoteCount).toBe(0);
  });

  it('reports the remaining time on an urgent post', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id, {
      urgency: 'urgent',
      urgencyExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    const res = await request(app)
      .get(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.urgencyRemainingMs).toBeGreaterThan(0);
    expect(res.body.urgencyRemainingMs).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it('reports null remaining time on a non-urgent post', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id, { urgency: 'flexible' });

    const res = await request(app)
      .get(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.body.urgencyRemainingMs).toBeNull();
  });

  it('returns 404 for a non-existent post', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/posts/64a000000000000000000099')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('פוסט לא נמצא');
  });
});

// ─── POST /api/posts/:id/accept ───────────────────────────────────────────────

describe('POST /api/posts/:id/accept', () => {
  it('lets a worker accept an open post and creates a booking', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id, { budget: 250 });

    const res = await request(app)
      .post(`/api/posts/${post._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.post.status).toBe('accepted');
    expect(res.body.post.acceptedBy._id).toBe(worker._id.toString());

    const booking = await Booking.findOne({ resident: resident._id, worker: worker._id });
    expect(booking).not.toBeNull();
    expect(booking.status).toBe('accepted');
    expect(booking.price).toBe(250);
    expect(booking.category).toBe(post.category);
  });

  it('returns 403 when a resident tries to accept', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post(`/api/posts/${post._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('רק בעלי מקצוע יכולים לקבל עבודות');
  });

  it('returns 400 when the post is no longer open', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id, { status: 'accepted' });

    const res = await request(app)
      .post(`/api/posts/${post._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('הפוסט כבר לא פתוח לקבלה');
  });

  it('returns 404 for a non-existent post', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .post('/api/posts/64a000000000000000000099/accept')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(404);
  });
});

// ─── POST /api/posts/:id/close ────────────────────────────────────────────────

describe('POST /api/posts/:id/close', () => {
  it('lets the owning resident close their post', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post(`/api/posts/${post._id}/close`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.post.status).toBe('closed');

    const stored = await JobPost.findById(post._id);
    expect(stored.status).toBe('closed');
  });

  it('drops a closed post out of the open feed', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id, { title: 'ייסגר' });

    await request(app)
      .post(`/api/posts/${post._id}/close`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    const feed = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(feed.body.posts.map((p) => p.title)).not.toContain('ייסגר');
  });

  it('returns 404 when another user tries to close the post', async () => {
    const owner   = await createResident();
    const stranger = await createResident();
    const post = await createPost(owner._id);

    const res = await request(app)
      .post(`/api/posts/${post._id}/close`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`);

    expect(res.status).toBe(404);

    const stored = await JobPost.findById(post._id);
    expect(stored.status).toBe('open'); // untouched
  });

  it('returns 401 without a token', async () => {
    const resident = await createResident();
    const post = await createPost(resident._id);
    const res = await request(app).post(`/api/posts/${post._id}/close`);
    expect(res.status).toBe(401);
  });
});
