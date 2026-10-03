process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-long-enough';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const JobPost = require('../../src/models/JobPost');
const User    = require('../../src/models/User');
const { reset } = require('../helpers/socketMock');
const {
  MAX_POST_IMAGES, MAX_IMAGE_BYTES, PASSWORD_MIN_LENGTH, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE,
} = require('@handil/shared');
const {
  createResident, createWorkerUser, createPost, tokenFor,
} = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(async () => { await db.clear(); reset(); });
afterAll(() => db.disconnect());

/** A base64 data URI of roughly `bytes` decoded size. */
function fakeImage(bytes) {
  return 'data:image/jpeg;base64,' + 'A'.repeat(Math.ceil((bytes * 4) / 3));
}

// ─── shape enforcement ────────────────────────────────────────────────────────

describe('request validation', () => {
  it('reports per-field errors alongside the Hebrew message', async () => {
    const res = await request(app).post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('שדות חובה חסרים');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(1);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'role', 'password'])
    );
  });

  it('rejects a malformed email address', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'דנה', email: 'not-an-email', password: 'secret123', role: 'resident',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('כתובת אימייל לא תקינה');
  });

  it(`enforces the ${PASSWORD_MIN_LENGTH}-character password minimum`, async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'דנה', email: 'short@test.com', password: 'a'.repeat(PASSWORD_MIN_LENGTH - 1), role: 'resident',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`הסיסמה חייבת להיות לפחות ${PASSWORD_MIN_LENGTH} תווים`);
  });

  it('strips unknown fields instead of trusting them (no mass assignment)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'דנה', email: 'strip@test.com', password: 'secret123', role: 'resident',
      avatar: 'injected', isAdmin: true, _id: '64a000000000000000000001',
    });

    expect(res.status).toBe(201);
    const stored = await User.findOne({ email: 'strip@test.com' });
    expect(stored._id.toString()).not.toBe('64a000000000000000000001');
    expect(stored.avatar).toBe('');
    expect(stored.isAdmin).toBeUndefined();
  });

  it('trims whitespace off incoming strings', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: '  דנה כהן  ', email: '  TRIM@Test.com ', password: 'secret123', role: 'resident',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('דנה כהן');
    expect(res.body.user.email).toBe('trim@test.com');
  });

  it('rejects an out-of-range review rating with a Hebrew message', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bookingId: '64a000000000000000000099', rating: 7 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('הדירוג חייב להיות בין 1 ל-5');
  });

  it('rejects an unknown urgency level', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'x', category: 'plumber', urgency: 'yesterday' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('רמת דחיפות לא תקינה');
  });

  it('rejects a negative quote price', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ jobPostId: post._id, proposedPrice: -50 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('המחיר לא יכול להיות שלילי');
  });
});

// ─── image limits ─────────────────────────────────────────────────────────────

describe('image limits on job posts', () => {
  it(`refuses more than ${MAX_POST_IMAGES} images`, async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({
        title: 'עם תמונות', category: 'plumber',
        images: Array.from({ length: MAX_POST_IMAGES + 1 }, () => fakeImage(1000)),
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`ניתן לצרף עד ${MAX_POST_IMAGES} תמונות`);
  });

  it('refuses a single oversized image', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'תמונה ענקית', category: 'plumber', images: [fakeImage(MAX_IMAGE_BYTES + 5000)] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/תמונה גדולה מדי/);
  });

  it('accepts images within the limits', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'תקין', category: 'plumber', images: [fakeImage(5000), fakeImage(5000)] });

    expect(res.status).toBe(201);
  });
});

// ─── images excluded from list payloads ───────────────────────────────────────

describe('list endpoints exclude image payloads', () => {
  async function seedPostWithImage(residentId) {
    return createPost(residentId, { title: 'עם תמונה', images: [fakeImage(20000)] });
  }

  it('omits images from the worker feed', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    await seedPostWithImage(resident._id);

    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].images).toBeUndefined();
  });

  it('omits images from the resident own-posts list', async () => {
    const resident = await createResident();
    await seedPostWithImage(resident._id);

    const res = await request(app)
      .get('/api/posts/mine')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.body.posts[0].images).toBeUndefined();
  });

  it('omits images from the recommended feed', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser({ categories: ['plumber'] });
    await seedPostWithImage(resident._id);

    const res = await request(app)
      .get('/api/posts/recommended')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts[0].images).toBeUndefined();
  });

  it('still returns images on the single-post detail view', async () => {
    const resident = await createResident();
    const post = await seedPostWithImage(resident._id);

    const res = await request(app)
      .get(`/api/posts/${post._id}`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.post.images)).toBe(true);
    expect(res.body.post.images).toHaveLength(1);
  });
});

// ─── pagination clamping ──────────────────────────────────────────────────────

describe('pagination is clamped', () => {
  it(`caps the post feed page size at ${MAX_PAGE_SIZE}`, async () => {
    const resident = await createResident();
    for (let i = 0; i < MAX_PAGE_SIZE + 5; i++) {
      await createPost(resident._id, { title: `פוסט ${i}` });
    }

    const res = await request(app)
      .get('/api/posts?limit=9999')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts.length).toBeLessThanOrEqual(MAX_PAGE_SIZE);
  });

  it('falls back to the default page size for junk input', async () => {
    const resident = await createResident();
    for (let i = 0; i < DEFAULT_PAGE_SIZE + 3; i++) {
      await createPost(resident._id, { title: `פוסט ${i}` });
    }

    const res = await request(app)
      .get('/api/posts?limit=abc&page=-4')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(res.body.page).toBe(1);
  });

  it(`caps the worker directory page size at ${MAX_PAGE_SIZE}`, async () => {
    for (let i = 0; i < 5; i++) await createWorkerUser();

    const res = await request(app).get('/api/workers?limit=9999');
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(MAX_PAGE_SIZE);
    expect(res.body.total).toBe(5);
  });
});

// ─── name search ──────────────────────────────────────────────────────────────

describe('worker name search', () => {
  it('finds a match that falls outside the first page', async () => {
    // Higher-rated workers crowd page 1; the match sits well past it.
    for (let i = 0; i < 6; i++) await createWorkerUser({ name: `Filler ${i}`, rating: 5 });
    await createWorkerUser({ name: 'מרים הנגרית', rating: 1 });

    const res = await request(app).get('/api/workers?q=מרים&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.workers).toHaveLength(1);
    expect(res.body.workers[0].user.name).toBe('מרים הנגרית');
  });

  it('matches case-insensitively on a partial name', async () => {
    await createWorkerUser({ name: 'Moshe Plumber' });
    await createWorkerUser({ name: 'Avi Electric' });

    const res = await request(app).get('/api/workers?q=MOSHE');
    expect(res.body.workers).toHaveLength(1);
    expect(res.body.workers[0].user.name).toBe('Moshe Plumber');
  });

  it('treats regex metacharacters in the query as literal text', async () => {
    await createWorkerUser({ name: 'Normal Worker' });

    // An unescaped "(" would throw and 500 the endpoint
    const res = await request(app).get('/api/workers?q=' + encodeURIComponent('('));
    expect(res.status).toBe(200);
    expect(res.body.workers).toEqual([]);
  });

  it('combines a name search with a category filter', async () => {
    await createWorkerUser({ name: 'דוד', categories: ['plumber'] });
    await createWorkerUser({ name: 'דוד', categories: ['gardener'] });

    const res = await request(app).get('/api/workers?q=דוד&category=plumber');
    expect(res.body.total).toBe(1);
    expect(res.body.workers[0].categories).toContain('plumber');
  });
});

// ─── booking ↔ job post link ──────────────────────────────────────────────────

describe('bookings created from a job post are linked to it', () => {
  it('records jobPost when a worker accepts a post directly', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id);

    await request(app)
      .post(`/api/posts/${post._id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    const Booking = require('../../src/models/Booking');
    const booking = await Booking.findOne({ jobPost: post._id });
    expect(booking).not.toBeNull();
    expect(booking.jobPost.toString()).toBe(post._id.toString());
  });

  it('leaves jobPost null for a booking made straight from a profile', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ workerUserId: worker._id, category: 'plumber' });

    expect(res.status).toBe(201);
    expect(res.body.booking.jobPost).toBeNull();
  });
});

// ─── shared categories ────────────────────────────────────────────────────────

describe('categories come from the shared package', () => {
  it('serves exactly what @handil/shared defines', async () => {
    const { CATEGORIES } = require('@handil/shared');
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual(CATEGORIES);
  });
});
