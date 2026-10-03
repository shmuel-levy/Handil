process.env.JWT_ACCESS_SECRET = 'test-secret';

const request      = require('supertest');
const app          = require('../../src/app');
const db           = require('../helpers/db');
const Conversation = require('../../src/models/Conversation');
const Message      = require('../../src/models/Message');
const {
  createResident, createWorkerUser, createPost, createConversation, createMessage, tokenFor,
} = require('../helpers/factories');

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.disconnect());

/** A resident and a worker who have a conversation open between them. */
async function chatPair() {
  const resident = await createResident({ name: 'דנה' });
  const { user: worker } = await createWorkerUser({ name: 'משה' });
  const conversation = await createConversation([resident._id, worker._id]);
  return { resident, worker, conversation };
}

// ─── POST /api/chat/conversations ─────────────────────────────────────────────

describe('POST /api/chat/conversations', () => {
  it('creates a conversation between two users', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: worker._id });

    expect(res.status).toBe(201);
    expect(res.body.conversation.participants).toHaveLength(2);
    // participants come back populated for rendering the header
    expect(res.body.conversation.participants[0].name).toBeDefined();
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it('attaches the job post for context when given', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const post = await createPost(resident._id, { title: 'נזילה במטבח' });

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: worker._id, jobPostId: post._id });

    expect(res.status).toBe(201);
    expect(res.body.conversation.jobPost.title).toBe('נזילה במטבח');
  });

  it('reuses the existing conversation instead of creating a duplicate', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();

    const first = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: worker._id });

    const second = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: worker._id });

    expect(second.body.conversation._id).toBe(first.body.conversation._id);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it('reuses the same conversation when the other side opens it', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();

    const fromResident = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: worker._id });

    const fromWorker = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(worker)}`)
      .send({ otherUserId: resident._id });

    expect(fromWorker.body.conversation._id).toBe(fromResident.body.conversation._id);
    expect(await Conversation.countDocuments()).toBe(1);
  });

  it('returns 400 when otherUserId is missing', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('חסר otherUserId');
  });

  it('refuses a conversation with yourself', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: resident._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('לא ניתן לשלוח הודעה לעצמך');
  });

  it('returns 404 when the other user does not exist', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ otherUserId: '64a000000000000000000099' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('משתמש לא נמצא');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/chat/conversations').send({ otherUserId: 'x' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/chat/conversations ──────────────────────────────────────────────

describe('GET /api/chat/conversations', () => {
  it('returns only conversations the caller takes part in', async () => {
    const { resident, worker } = await chatPair();
    const outsiderA = await createResident();
    const outsiderB = await createResident();
    await createConversation([outsiderA._id, outsiderB._id]);

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    const ids = res.body.conversations[0].participants.map((p) => p._id);
    expect(ids).toEqual(expect.arrayContaining([resident._id.toString(), worker._id.toString()]));
  });

  it('sorts by most recent message first', async () => {
    const resident = await createResident();
    const { user: w1 } = await createWorkerUser();
    const { user: w2 } = await createWorkerUser();

    await createConversation([resident._id, w1._id], {
      lastMessage: 'ישן', lastMessageAt: new Date(Date.now() - 60_000),
    });
    await createConversation([resident._id, w2._id], {
      lastMessage: 'חדש', lastMessageAt: new Date(),
    });

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.body.conversations.map((c) => c.lastMessage)).toEqual(['חדש', 'ישן']);
  });

  it('returns an empty list when the user has no conversations', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations).toEqual([]);
  });
});

// ─── POST /api/chat/conversations/:id/messages ────────────────────────────────

describe('POST /api/chat/conversations/:id/messages', () => {
  it('sends a message', async () => {
    const { resident, conversation } = await chatPair();

    const res = await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: 'מתי תוכל להגיע?' });

    expect(res.status).toBe(201);
    expect(res.body.message.text).toBe('מתי תוכל להגיע?');
    expect(res.body.message.sender.name).toBe('דנה'); // populated
  });

  it('trims the message and marks it read by its sender', async () => {
    const { resident, conversation } = await chatPair();

    const res = await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: '   שלום   ' });

    expect(res.body.message.text).toBe('שלום');
    expect(res.body.message.readBy.map(String)).toContain(resident._id.toString());
  });

  it('updates the conversation summary and the recipient unread count', async () => {
    const { resident, worker, conversation } = await chatPair();

    await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: 'הודעה ראשונה' });

    const stored = await Conversation.findById(conversation._id);
    expect(stored.lastMessage).toBe('הודעה ראשונה');
    expect(stored.lastMessageAt).not.toBeNull();
    expect(stored.unreadCounts.get(worker._id.toString())).toBe(1);
    // the sender's own count stays untouched
    expect(stored.unreadCounts.get(resident._id.toString()) ?? 0).toBe(0);
  });

  it('increments the unread count on each further message', async () => {
    const { resident, worker, conversation } = await chatPair();
    const token = tokenFor(resident);

    for (const text of ['אחת', 'שתיים', 'שלוש']) {
      await request(app)
        .post(`/api/chat/conversations/${conversation._id}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text });
    }

    const stored = await Conversation.findById(conversation._id);
    expect(stored.unreadCounts.get(worker._id.toString())).toBe(3);
  });

  it('truncates the stored summary to 80 characters', async () => {
    const { resident, conversation } = await chatPair();
    const long = 'א'.repeat(200);

    await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: long });

    const stored = await Conversation.findById(conversation._id);
    expect(stored.lastMessage).toHaveLength(80);
  });

  it('returns 400 for an empty or whitespace-only message', async () => {
    const { resident, conversation } = await chatPair();

    const empty = await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: '' });
    const blank = await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: '   ' });

    expect(empty.status).toBe(400);
    expect(blank.status).toBe(400);
    expect(blank.body.message).toBe('הודעה ריקה');
    expect(await Message.countDocuments()).toBe(0);
  });

  it('returns 403 for a non-participant', async () => {
    const { conversation } = await chatPair();
    const stranger = await createResident();

    const res = await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`)
      .send({ text: 'לא אמור לעבור' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('אין גישה לשיחה זו');
    expect(await Message.countDocuments()).toBe(0);
  });

  it('returns 404 for a non-existent conversation', async () => {
    const resident = await createResident();
    const res = await request(app)
      .post('/api/chat/conversations/64a000000000000000000099/messages')
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: 'שלום' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('שיחה לא נמצאה');
  });
});

// ─── GET /api/chat/conversations/:id/messages ─────────────────────────────────

describe('GET /api/chat/conversations/:id/messages', () => {
  it('returns history oldest-first', async () => {
    const { resident, worker, conversation } = await chatPair();

    await createMessage(conversation._id, resident._id, { text: 'ראשונה' });
    await createMessage(conversation._id, worker._id,   { text: 'שנייה' });
    await createMessage(conversation._id, resident._id, { text: 'שלישית' });

    const res = await request(app)
      .get(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(200);
    expect(res.body.messages.map((m) => m.text)).toEqual(['ראשונה', 'שנייה', 'שלישית']);
    expect(res.body.messages[0].sender.name).toBeDefined();
  });

  it('marks the conversation read for the caller', async () => {
    const { resident, worker, conversation } = await chatPair();

    await request(app)
      .post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`)
      .send({ text: 'שלום' });

    const before = await Conversation.findById(conversation._id);
    expect(before.unreadCounts.get(worker._id.toString())).toBe(1);

    await request(app)
      .get(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    const after = await Conversation.findById(conversation._id);
    expect(after.unreadCounts.get(worker._id.toString())).toBe(0);

    const msg = await Message.findOne({ conversation: conversation._id });
    expect(msg.readBy.map(String)).toContain(worker._id.toString());
  });

  it('paginates, newest page first', async () => {
    const { resident, conversation } = await chatPair();
    for (let i = 0; i < 5; i++) {
      await createMessage(conversation._id, resident._id, { text: `הודעה ${i}` });
    }

    const page1 = await request(app)
      .get(`/api/chat/conversations/${conversation._id}/messages?limit=2&page=1`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(page1.status).toBe(200);
    expect(page1.body.messages).toHaveLength(2);
    // newest two, re-reversed into chronological order
    expect(page1.body.messages.map((m) => m.text)).toEqual(['הודעה 3', 'הודעה 4']);
  });

  it('returns 403 for a non-participant', async () => {
    const { conversation } = await chatPair();
    const stranger = await createResident();

    const res = await request(app)
      .get(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent conversation', async () => {
    const resident = await createResident();
    const res = await request(app)
      .get('/api/chat/conversations/64a000000000000000000099/messages')
      .set('Authorization', `Bearer ${tokenFor(resident)}`);

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/chat/unread ─────────────────────────────────────────────────────

describe('GET /api/chat/unread', () => {
  it('returns 0 when there is nothing unread', async () => {
    const { worker } = await chatPair();
    const res = await request(app)
      .get('/api/chat/unread')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.status).toBe(200);
    expect(res.body.unread).toBe(0);
  });

  it('totals unread messages across every conversation', async () => {
    const worker = await createWorkerUser();
    const r1 = await createResident();
    const r2 = await createResident();

    const c1 = await createConversation([r1._id, worker.user._id]);
    const c2 = await createConversation([r2._id, worker.user._id]);

    await request(app).post(`/api/chat/conversations/${c1._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(r1)}`).send({ text: 'א' });
    await request(app).post(`/api/chat/conversations/${c1._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(r1)}`).send({ text: 'ב' });
    await request(app).post(`/api/chat/conversations/${c2._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(r2)}`).send({ text: 'ג' });

    const res = await request(app)
      .get('/api/chat/unread')
      .set('Authorization', `Bearer ${tokenFor(worker.user)}`);

    expect(res.body.unread).toBe(3);
  });

  it('drops back to 0 after the conversation is opened', async () => {
    const { resident, worker, conversation } = await chatPair();

    await request(app).post(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(resident)}`).send({ text: 'שלום' });

    await request(app).get(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    const res = await request(app)
      .get('/api/chat/unread')
      .set('Authorization', `Bearer ${tokenFor(worker)}`);

    expect(res.body.unread).toBe(0);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/chat/unread');
    expect(res.status).toBe(401);
  });
});
