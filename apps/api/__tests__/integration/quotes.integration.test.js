process.env.JWT_ACCESS_SECRET = 'test-secret';

jest.mock('../../src/socket', () => require('../helpers/socketMock').mock);

const request = require('supertest');
const app     = require('../../src/app');
const db      = require('../helpers/db');
const Quote   = require('../../src/models/Quote');
const Booking = require('../../src/models/Booking');
const JobPost = require('../../src/models/JobPost');
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

describe('quote lifecycle — post to booking, over HTTP only', () => {
  it('runs the full competitive-bid flow end to end', async () => {
    const resident = await registerUser('דנה כהן',    'dana@q.test',  'resident');
    const cheap    = await registerUser('משה זול',     'moshe@q.test', 'worker');
    const pricey   = await registerUser('אבי יקר',     'avi@q.test',   'worker');

    // ── 1. The resident posts a job ────────────────────────────────────────
    const post = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ title: 'נזילה במטבח', category: 'plumber', budget: 600, urgency: 'today' });
    expect(post.status).toBe(201);
    const postId = post.body.post._id;

    // Every connected worker is told about it
    expect(eventsOf('new_post')).toHaveLength(1);

    // ── 2. The post shows up in the workers' feed ──────────────────────────
    const feed = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${cheap.token}`);
    expect(feed.body.posts.map((p) => p._id)).toContain(postId);

    // ── 3. Two workers bid ─────────────────────────────────────────────────
    const bidA = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${pricey.token}`)
      .send({ jobPostId: postId, proposedPrice: 550, message: 'אגיע מחר' });
    const bidB = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${cheap.token}`)
      .send({ jobPostId: postId, proposedPrice: 380, message: 'אגיע היום' });

    expect(bidA.status).toBe(201);
    expect(bidB.status).toBe(201);

    // The resident got a notification per bid
    expect(eventsOf('new_quote')).toHaveLength(2);
    expect(eventsOf('new_quote').every((e) => e.room === `user:${resident.id}`)).toBe(true);

    // ── 4. The resident compares — cheapest first ──────────────────────────
    const list = await request(app).get(`/api/quotes/job/${postId}`)
      .set('Authorization', `Bearer ${resident.token}`);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(2);
    expect(list.body.quotes.map((q) => q.proposedPrice)).toEqual([380, 550]);
    expect(list.body.quotes[0].worker.user.name).toBe('משה זול');

    // The badge on the resident's own post reflects the pending bids
    const mine = await request(app).get('/api/posts/mine')
      .set('Authorization', `Bearer ${resident.token}`);
    expect(mine.body.posts.find((p) => p._id === postId).pendingQuoteCount).toBe(2);

    // ── 5. The resident accepts the cheaper bid ────────────────────────────
    const accept = await request(app).patch(`/api/quotes/${bidB.body.quote._id}/accept`)
      .set('Authorization', `Bearer ${resident.token}`);
    expect(accept.status).toBe(200);

    // …the winner is told
    const won = eventsOf('quote_accepted');
    expect(won).toHaveLength(1);
    expect(won[0].room).toBe(`user:${cheap.id}`);
    expect(won[0].payload.price).toBe(380);

    // …the winning quote is accepted, the loser auto-rejected
    expect((await Quote.findById(bidB.body.quote._id)).status).toBe('accepted');
    expect((await Quote.findById(bidA.body.quote._id)).status).toBe('rejected');

    // …the post is closed to further bidding and credits the winner
    const storedPost = await JobPost.findById(postId);
    expect(storedPost.status).toBe('accepted');
    expect(storedPost.acceptedBy.toString()).toBe(cheap.id);

    // …and exactly one booking exists, at the agreed price
    const bookings = await Booking.find({});
    expect(bookings).toHaveLength(1);
    expect(bookings[0].price).toBe(380);
    expect(bookings[0].status).toBe('accepted');
    expect(bookings[0].worker.toString()).toBe(cheap.id);
    expect(bookings[0].resident.toString()).toBe(resident.id);

    // ── 6. The job is no longer biddable ───────────────────────────────────
    const lateBid = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${pricey.token}`)
      .send({ jobPostId: postId, proposedPrice: 100 });
    expect(lateBid.status).toBe(400);

    const secondAccept = await request(app).patch(`/api/quotes/${bidA.body.quote._id}/accept`)
      .set('Authorization', `Bearer ${resident.token}`);
    expect(secondAccept.status).toBe(400);
    expect(await Booking.countDocuments()).toBe(1); // still exactly one

    // ── 7. It drops out of the open feed ───────────────────────────────────
    const feedAfter = await request(app).get('/api/posts')
      .set('Authorization', `Bearer ${pricey.token}`);
    expect(feedAfter.body.posts.map((p) => p._id)).not.toContain(postId);

    // ── 8. Both sides see the booking from their own side ──────────────────
    const residentView = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${resident.token}`);
    const workerView = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${cheap.token}`);
    const loserView = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${pricey.token}`);

    expect(residentView.body.bookings).toHaveLength(1);
    expect(workerView.body.bookings).toHaveLength(1);
    expect(loserView.body.bookings).toHaveLength(0);

    // ── 9. Worker completes, resident reviews, rating updates ──────────────
    const bookingId = bookings[0]._id;
    const complete = await request(app).patch(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${cheap.token}`)
      .send({ status: 'completed' });
    expect(complete.status).toBe(200);

    const review = await request(app).post('/api/reviews')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ bookingId, rating: 5, comment: 'הגיע מהר, עבודה נקייה' });
    expect(review.status).toBe(201);

    const workerProfile = await request(app).get('/api/workers/me')
      .set('Authorization', `Bearer ${cheap.token}`);
    expect(workerProfile.body.worker.rating).toBe(5);
    expect(workerProfile.body.worker.reviewCount).toBe(1);

    // …and the public profile reflects the completed job
    const publicProfile = await request(app)
      .get(`/api/workers/${workerProfile.body.worker._id}`);
    expect(publicProfile.body.stats.totalJobsDone).toBe(1);
    expect(publicProfile.body.stats.completionRate).toBe(100);
    expect(publicProfile.body.stats.quoteAcceptRate).toBe(100);
    expect(publicProfile.body.reviews).toHaveLength(1);
  });

  it('rejecting a bid leaves the post open for someone else to win', async () => {
    const resident = await registerUser('דנה',  'dana2@q.test',  'resident');
    const first    = await registerUser('ראשון', 'first@q.test',  'worker');
    const second   = await registerUser('שני',   'second@q.test', 'worker');

    const post = await request(app).post('/api/posts')
      .set('Authorization', `Bearer ${resident.token}`)
      .send({ title: 'צביעת סלון', category: 'painter' });
    const postId = post.body.post._id;

    const bidA = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ jobPostId: postId, proposedPrice: 900 });

    // The resident turns the first bid down
    const reject = await request(app).patch(`/api/quotes/${bidA.body.quote._id}/reject`)
      .set('Authorization', `Bearer ${resident.token}`);
    expect(reject.status).toBe(200);
    expect(eventsOf('quote_rejected')).toHaveLength(1);
    expect(eventsOf('quote_rejected')[0].room).toBe(`user:${first.id}`);

    // No booking yet, and the post is still open
    expect(await Booking.countDocuments()).toBe(0);
    expect((await JobPost.findById(postId)).status).toBe('open');

    // A later bid can still win it
    const bidB = await request(app).post('/api/quotes')
      .set('Authorization', `Bearer ${second.token}`)
      .send({ jobPostId: postId, proposedPrice: 700 });
    const accept = await request(app).patch(`/api/quotes/${bidB.body.quote._id}/accept`)
      .set('Authorization', `Bearer ${resident.token}`);

    expect(accept.status).toBe(200);
    expect(await Booking.countDocuments()).toBe(1);
    expect((await Booking.findOne({})).price).toBe(700);
  });
});
