process.env.JWT_ACCESS_SECRET = 'test-secret';

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const User    = require('../../src/models/User');
const Worker  = require('../../src/models/Worker');
const {
  createResident, createWorkerUser, createBooking, createPost, createQuote, tokenFor,
} = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

// ─── GET /api/workers ─────────────────────────────────────────────────────────

describe('GET /api/workers', () => {
  it('lists workers publicly, with the user document populated', async () => {
    await createWorkerUser({ name: 'משה' });
    await createWorkerUser({ name: 'אבי' });

    const res = await request(app).get('/api/workers');

    expect(res.status).toBe(200);
    expect(res.body.workers).toHaveLength(2);
    expect(res.body.workers[0].user.name).toBeDefined();
    expect(res.body.page).toBe(1);
  });

  it('never leaks the password hash', async () => {
    await createWorkerUser();
    const res = await request(app).get('/api/workers');
    expect(res.body.workers[0].user.password).toBeUndefined();
  });

  it('sorts by rating then review count, highest first', async () => {
    await createWorkerUser({ name: 'בינוני', rating: 4.0, reviewCount: 10 });
    await createWorkerUser({ name: 'הכי טוב', rating: 4.9, reviewCount: 3 });
    await createWorkerUser({ name: 'חלש', rating: 3.2, reviewCount: 50 });

    const res = await request(app).get('/api/workers');

    expect(res.body.workers.map((w) => w.user.name)).toEqual(['הכי טוב', 'בינוני', 'חלש']);
  });

  it('filters by category', async () => {
    await createWorkerUser({ categories: ['plumber'] });
    await createWorkerUser({ categories: ['electrician'] });
    await createWorkerUser({ categories: ['plumber', 'tiler'] });

    const res = await request(app).get('/api/workers?category=plumber');

    expect(res.status).toBe(200);
    expect(res.body.workers).toHaveLength(2);
    expect(res.body.workers.every((w) => w.categories.includes('plumber'))).toBe(true);
  });

  it('filters by city, case-insensitively and by partial match', async () => {
    await createWorkerUser({ city: 'תל אביב' });
    await createWorkerUser({ city: 'חיפה' });

    const res = await request(app).get('/api/workers?city=חיפה');

    expect(res.status).toBe(200);
    expect(res.body.workers).toHaveLength(1);
    expect(res.body.workers[0].city).toBe('חיפה');
  });

  it('searches by worker name via q', async () => {
    await createWorkerUser({ name: 'Moshe Plumber' });
    await createWorkerUser({ name: 'Avi Electric' });

    const res = await request(app).get('/api/workers?q=moshe');

    expect(res.status).toBe(200);
    expect(res.body.workers).toHaveLength(1);
    expect(res.body.workers[0].user.name).toBe('Moshe Plumber');
  });

  it('omits worker profiles whose user document was deleted', async () => {
    const { user } = await createWorkerUser({ name: 'רפאים' });
    await createWorkerUser({ name: 'קיים' });
    await User.findByIdAndDelete(user._id); // orphaned Worker profile

    const res = await request(app).get('/api/workers');

    expect(res.status).toBe(200);
    expect(res.body.workers).toHaveLength(1);
    expect(res.body.workers[0].user.name).toBe('קיים');
  });

  it('paginates', async () => {
    for (let i = 0; i < 4; i++) await createWorkerUser({ rating: 5 - i * 0.1 });

    const page1 = await request(app).get('/api/workers?limit=2&page=1');
    const page2 = await request(app).get('/api/workers?limit=2&page=2');

    expect(page1.body.workers).toHaveLength(2);
    expect(page2.body.workers).toHaveLength(2);
    const ids1 = page1.body.workers.map((w) => w._id);
    const ids2 = page2.body.workers.map((w) => w._id);
    expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
  });

  it('returns an empty list when nothing matches', async () => {
    await createWorkerUser({ categories: ['plumber'] });
    const res = await request(app).get('/api/workers?category=welder');
    expect(res.status).toBe(200);
    expect(res.body.workers).toEqual([]);
  });
});

// ─── GET /api/workers/me ──────────────────────────────────────────────────────

describe('GET /api/workers/me', () => {
  it('returns the calling worker own profile', async () => {
    const { user: worker, workerProfile } = await createWorkerUser();

    const res = await request(app)
      .get('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.worker._id).toBe(workerProfile._id.toString());
    expect(res.body.worker.user.name).toBeDefined();
  });

  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('עובדים בלבד');
  });

  it('returns 404 when the worker profile is missing', async () => {
    const { user: worker, workerProfile } = await createWorkerUser();
    await Worker.findByIdAndDelete(workerProfile._id);

    const res = await request(app)
      .get('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/workers/me');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/workers/me ──────────────────────────────────────────────────────

describe('PUT /api/workers/me', () => {
  it('updates the editable profile fields', async () => {
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .put('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({
        bio: 'אינסטלטור ותיק',
        categories: ['plumber', 'tiler'],
        city: 'רמת גן',
        yearsExperience: 12,
        hourlyRate: 180,
      });

    expect(res.status).toBe(200);
    expect(res.body.worker.bio).toBe('אינסטלטור ותיק');
    expect(res.body.worker.categories).toEqual(['plumber', 'tiler']);
    expect(res.body.worker.city).toBe('רמת גן');
    expect(res.body.worker.yearsExperience).toBe(12);
    expect(res.body.worker.hourlyRate).toBe(180);
  });

  it('leaves omitted fields untouched', async () => {
    const { user: worker } = await createWorkerUser({ categories: ['plumber'] });

    await request(app).put('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ bio: 'ביו ראשון', hourlyRate: 150 });

    const res = await request(app).put('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ hourlyRate: 200 });

    expect(res.status).toBe(200);
    expect(res.body.worker.hourlyRate).toBe(200);
    expect(res.body.worker.bio).toBe('ביו ראשון');
    expect(res.body.worker.categories).toEqual(['plumber']);
  });

  it('stores per-urgency rates', async () => {
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .put('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ urgencyRates: { urgent: 400, today: 300, week: 200, flexible: 150 } });

    expect(res.status).toBe(200);
    expect(res.body.worker.urgencyRates.urgent).toBe(400);
    expect(res.body.worker.urgencyRates.flexible).toBe(150);
  });

  it('stores the teaching service opt-in', async () => {
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .put('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ offersTeaching: true, teachingRate: 120 });

    expect(res.status).toBe(200);
    expect(res.body.worker.offersTeaching).toBe(true);
    expect(res.body.worker.teachingRate).toBe(120);
  });

  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .put('/api/workers/me')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ bio: 'לא אמור לעבוד' });

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/workers/me/available ──────────────────────────────────────────

describe('PATCH /api/workers/me/available', () => {
  it('toggles availability off and on', async () => {
    const { user: worker } = await createWorkerUser();

    const off = await request(app)
      .patch('/api/workers/me/available')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ isAvailable: false });

    expect(off.status).toBe(200);
    expect(off.body.worker.isAvailable).toBe(false);

    const on = await request(app)
      .patch('/api/workers/me/available')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ isAvailable: true });

    expect(on.body.worker.isAvailable).toBe(true);
  });

  it('returns 400 when isAvailable is absent', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .patch('/api/workers/me/available')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('חסר isAvailable');
  });

  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .patch('/api/workers/me/available')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ isAvailable: false });

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/workers/me/verify ──────────────────────────────────────────────

describe('POST /api/workers/me/verify', () => {
  it('adds a verification badge', async () => {
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ badge: 'phone' });

    expect(res.status).toBe(200);
    expect(res.body.worker.verificationBadges).toEqual(['phone']);
    expect(res.body.worker.isVerified).toBe(false); // needs all three
  });

  it('does not duplicate a badge already held', async () => {
    const { user: worker } = await createWorkerUser();
    const token = tokenFor(worker);

    await request(app).post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${token}`).send({ badge: 'phone' });
    const res = await request(app).post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${token}`).send({ badge: 'phone' });

    expect(res.status).toBe(200);
    expect(res.body.worker.verificationBadges).toEqual(['phone']);
  });

  it('records all three badges without ever granting platform verification', async () => {
    const { user: worker, workerProfile } = await createWorkerUser();
    const token = tokenFor(worker);

    await request(app).post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${token}`).send({ badge: 'phone' });
    await request(app).post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${token}`).send({ badge: 'id' });
    const res = await request(app).post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${token}`).send({ badge: 'bank' });

    expect(res.status).toBe(200);
    expect(res.body.worker.verificationBadges.sort()).toEqual(['bank', 'id', 'phone']);

    // These badges are self-declared — no proof was checked, so `isVerified`
    // must stay false. Residents rely on it to decide who enters their home.
    const stored = await Worker.findById(workerProfile._id);
    expect(stored.isVerified).toBe(false);
    expect(res.body.worker.isVerified).toBe(false);
  });

  it('returns 400 for an unknown badge type', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ badge: 'superhero' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('תג לא תקין');
  });

  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/workers/me/verify')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ badge: 'phone' });

    expect(res.status).toBe(403);
  });
});

// ─── Portfolio ────────────────────────────────────────────────────────────────

describe('POST /api/workers/me/portfolio', () => {
  it('appends a portfolio item', async () => {
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({
        title: 'שיפוץ אמבטיה',
        description: 'החלפת צנרת מלאה',
        beforeImage: 'before.jpg',
        afterImage: 'after.jpg',
        category: 'plumber',
      });

    expect(res.status).toBe(201);
    expect(res.body.worker.portfolio).toHaveLength(1);
    expect(res.body.worker.portfolio[0].title).toBe('שיפוץ אמבטיה');
    expect(res.body.worker.portfolio[0].beforeImage).toBe('before.jpg');
  });

  it('keeps earlier items when adding another', async () => {
    const { user: worker } = await createWorkerUser();
    const token = tokenFor(worker);

    await request(app).post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${token}`).send({ title: 'ראשון' });
    const res = await request(app).post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${token}`).send({ title: 'שני' });

    expect(res.body.worker.portfolio.map((p) => p.title)).toEqual(['ראשון', 'שני']);
  });

  it('returns 400 without a title', async () => {
    const { user: worker } = await createWorkerUser();
    const res = await request(app)
      .post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ description: 'בלי כותרת' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('כותרת נדרשת');
  });

  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ title: 'x' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/workers/me/portfolio/:itemId', () => {
  it('removes only the named item', async () => {
    const { user: worker } = await createWorkerUser();
    const token = tokenFor(worker);

    await request(app).post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${token}`).send({ title: 'להשאיר' });
    const added = await request(app).post('/api/workers/me/portfolio')
      .set('Authorization', `Bearer ${token}`).send({ title: 'למחוק' });

    const target = added.body.worker.portfolio.find((p) => p.title === 'למחוק');

    const res = await request(app)
      .delete(`/api/workers/me/portfolio/${target._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.worker.portfolio.map((p) => p.title)).toEqual(['להשאיר']);
  });

  it('returns 403 for a resident', async () => {
    const resident = await createResident();
    const res = await request(app)
      .delete('/api/workers/me/portfolio/64a000000000000000000099')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/workers/:id ─────────────────────────────────────────────────────

describe('GET /api/workers/:id', () => {
  it('returns the worker, its reviews and its reliability stats', async () => {
    const { workerProfile } = await createWorkerUser();

    const res = await request(app).get(`/api/workers/${workerProfile._id}`);

    expect(res.status).toBe(200);
    expect(res.body.worker._id).toBe(workerProfile._id.toString());
    expect(res.body.worker.user.name).toBeDefined();
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.stats).toBeDefined();
  });

  it('reports null stats for a worker with no history', async () => {
    const { workerProfile } = await createWorkerUser();
    const res = await request(app).get(`/api/workers/${workerProfile._id}`);

    expect(res.body.stats.totalJobsDone).toBe(0);
    expect(res.body.stats.completionRate).toBeNull();
    expect(res.body.stats.quoteAcceptRate).toBeNull();
    expect(res.body.stats.avgResponseHours).toBeNull();
  });

  it('computes completion rate from completed vs cancelled bookings', async () => {
    const resident = await createResident();
    const { user: worker, workerProfile } = await createWorkerUser();

    await createBooking(resident._id, worker._id, { status: 'completed' });
    await createBooking(resident._id, worker._id, { status: 'completed' });
    await createBooking(resident._id, worker._id, { status: 'completed' });
    await createBooking(resident._id, worker._id, { status: 'cancelled' });
    await createBooking(resident._id, worker._id, { status: 'pending' }); // open, not counted

    const res = await request(app).get(`/api/workers/${workerProfile._id}`);

    expect(res.body.stats.totalJobsDone).toBe(3);
    expect(res.body.stats.completionRate).toBe(75); // 3 of 4 closed jobs
  });

  it('computes the quote acceptance rate', async () => {
    const resident = await createResident();
    const { workerProfile } = await createWorkerUser();

    const p1 = await createPost(resident._id);
    const p2 = await createPost(resident._id);
    const p3 = await createPost(resident._id);
    const p4 = await createPost(resident._id);

    await createQuote(p1._id, workerProfile._id, { status: 'accepted' });
    await createQuote(p2._id, workerProfile._id, { status: 'rejected' });
    await createQuote(p3._id, workerProfile._id, { status: 'rejected' });
    await createQuote(p4._id, workerProfile._id, { status: 'pending' });

    const res = await request(app).get(`/api/workers/${workerProfile._id}`);

    expect(res.body.stats.quoteAcceptRate).toBe(25); // 1 of 4
  });

  it('returns 404 for a non-existent worker', async () => {
    const res = await request(app).get('/api/workers/64a000000000000000000099');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('עובד לא נמצא');
  });
});
