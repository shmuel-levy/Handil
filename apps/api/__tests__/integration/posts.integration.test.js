process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const JobPost = require('../../src/models/JobPost');
const { reset } = require('../helpers/socketMock');

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

describe('job board journey', () => {
  it('a post appears in the feed, then disappears once the resident closes it', async () => {
    const resident = await registerUser('דנה',  'dana@p.test',  'resident');
    const worker   = await registerUser('משה', 'moshe@p.test', 'worker');

    const created = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ title: 'מקרר לא מקרר', category: 'appliance_repair' });
    const postId = created.body.post._id;

    const feedBefore = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${worker.token}`);
    expect(feedBefore.body.posts.map((p) => p._id)).toContain(postId);

    const close = await request(app).post(`/api/posts/${postId}/close`)
      .set('Authorization', `Bearer ${resident.token}`);
    expect(close.status).toBe(200);

    const feedAfter = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${worker.token}`);
    expect(feedAfter.body.posts.map((p) => p._id)).not.toContain(postId);

    // …but the resident still sees it on their own list
    const mine = await request(app).get('/api/posts/mine')
      .set('Authorization', `Bearer ${resident.token}`);
    expect(mine.body.posts.map((p) => p._id)).toContain(postId);
    expect(mine.body.posts.find((p) => p._id === postId).status).toBe('closed');
  });

  it('a worker accepting a post directly closes it and opens a booking', async () => {
    const resident = await registerUser('דנה',  'dana2@p.test',  'resident');
    const worker   = await registerUser('משה', 'moshe2@p.test', 'worker');
    const rival    = await registerUser('אבי', 'avi@p.test',    'worker');

    const created = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ title: 'החלפת מנעול', category: 'locksmith', budget: 300 });
    const postId = created.body.post._id;

    const accept = await request(app).post(`/api/posts/${postId}/accept`)
      .set('Authorization', `Bearer ${worker.token}`);
    expect(accept.status).toBe(200);
    expect(accept.body.post.status).toBe('accepted');

    // A second worker is too late
    const late = await request(app).post(`/api/posts/${postId}/accept`)
      .set('Authorization', `Bearer ${rival.token}`);
    expect(late.status).toBe(400);

    // Both sides now share one booking
    const residentBookings = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${resident.token}`);
    const workerBookings = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${worker.token}`);

    expect(residentBookings.body.bookings).toHaveLength(1);
    expect(workerBookings.body.bookings).toHaveLength(1);
    expect(residentBookings.body.bookings[0]._id).toBe(workerBookings.body.bookings[0]._id);
    expect(residentBookings.body.bookings[0].price).toBe(300);
  });

  it('shows each worker a feed tailored to their trade', async () => {
    const resident = await registerUser('דנה', 'dana3@p.test', 'resident');
    const plumber  = await registerUser('משה', 'plumber@p.test', 'worker');

    await request(app).put('/api/workers/me')
      .set('Authorization', `Bearer ${plumber.token}`)
      .send({ categories: ['plumber'], city: 'תל אביב' });

    for (const title of ['נזילה 1', 'נזילה 2', 'נזילה 3']) {
      await request(app).post('/api/posts')
        .set('Authorization', `Bearer ${resident.token}`)
        .send({ title, category: 'plumber', location: 'תל אביב' });
    }
    await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ title: 'גינה', category: 'gardener', location: 'חיפה' });

    const recommended = await request(app).get('/api/posts/recommended')
      .set('Authorization', `Bearer ${plumber.token}`);

    expect(recommended.status).toBe(200);
    expect(recommended.body.isPersonalized).toBe(true);
    expect(recommended.body.posts.every((p) => p.category === 'plumber')).toBe(true);
    expect(recommended.body.posts.map((p) => p.title)).not.toContain('גינה');
  });

  it('an urgent post expires out of the feed after its 24h window', async () => {
    const resident = await registerUser('דנה',  'dana4@p.test',  'resident');
    const worker   = await registerUser('משה', 'moshe4@p.test', 'worker');

    const created = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ title: 'פיצוץ צינור', category: 'plumber', urgency: 'urgent' });
    const postId = created.body.post._id;

    const feedBefore = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${worker.token}`);
    expect(feedBefore.body.posts.map((p) => p._id)).toContain(postId);

    // Wind the clock past the deadline
    await JobPost.findByIdAndUpdate(postId, { urgencyExpiresAt: new Date(Date.now() - 1000) });

    const feedAfter = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${worker.token}`);
    expect(feedAfter.body.posts.map((p) => p._id)).not.toContain(postId);

    // The background sweep also flips it to closed
    const swept = await JobPost.findById(postId);
    expect(swept.status).toBe('closed');
  });

  it('keeps the job board resident-only for posting', async () => {
    const worker = await registerUser('משה', 'moshe5@p.test', 'worker');

    const res = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${worker.token}`)
      .send({ title: 'לא אמור לעבוד', category: 'plumber' });

    expect(res.status).toBe(403);
    expect(await JobPost.countDocuments()).toBe(0);
  });
});
