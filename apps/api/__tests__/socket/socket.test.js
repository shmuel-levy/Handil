process.env.JWT_ACCESS_SECRET = 'test-secret';

const http         = require('http');
const jwt          = require('jsonwebtoken');
const mongoose     = require('mongoose');
const { io: ioClient } = require('socket.io-client');

const app          = require('../../src/app');
const { initSocket } = require('../../src/socket');
const db           = require('../helpers/db');
const Conversation = require('../../src/models/Conversation');
const Message      = require('../../src/models/Message');
const { MESSAGE_MAX } = require('@handil/shared');
const {
  createResident, createWorkerUser, createConversation, tokenFor,
} = require('../helpers/factories');

let httpServer;
let ioServer;
let baseUrl;

/** Every client opened by a test, so we can close them all afterwards. */
let openClients = [];

beforeAll(async () => {
  await db.connect();
  httpServer = http.createServer(app);
  ioServer   = initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

afterEach(async () => {
  for (const client of openClients) client.close();
  openClients = [];
  await db.clear();
});

afterAll(async () => {
  ioServer.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await db.disconnect();
});

/** Open a client and resolve once it is connected (or reject on auth failure). */
function connect(token) {
  const client = ioClient(baseUrl, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  openClients.push(client);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timed out')), 8000);
    client.on('connect', () => { clearTimeout(timer); resolve(client); });
    client.on('connect_error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/** Resolve with the next payload of `event`, or reject if it never arrives. */
function nextEvent(client, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeoutMs
    );
    client.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

/** Promise wrapper around an emit that expects an ack. */
function emitWithAck(client, event, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ack for "${event}"`)), timeoutMs);
    client.emit(event, payload, (ack) => { clearTimeout(timer); resolve(ack); });
  });
}

/** Assert that `event` does NOT arrive within the window. */
async function expectNoEvent(client, event, windowMs = 600) {
  let fired = false;
  const handler = () => { fired = true; };
  client.on(event, handler);
  await new Promise((r) => setTimeout(r, windowMs));
  client.off(event, handler);
  expect(fired).toBe(false);
}

// ─── Handshake auth ───────────────────────────────────────────────────────────

describe('socket handshake auth', () => {
  it('accepts a valid token', async () => {
    const user = await createResident();
    const client = await connect(tokenFor(user));
    expect(client.connected).toBe(true);
  });

  it('rejects a connection with no token', async () => {
    await expect(connect(undefined)).rejects.toThrow('אין טוקן');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const user = await createResident();
    const forged = jwt.sign({ id: user._id }, 'a-different-secret');
    await expect(connect(forged)).rejects.toThrow('טוקן לא תקין');
  });

  it('rejects an expired token', async () => {
    const user = await createResident();
    const expired = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '-1s' });
    await expect(connect(expired)).rejects.toThrow('טוקן לא תקין');
  });

  it('rejects a token for a user that no longer exists', async () => {
    const ghostId = new mongoose.Types.ObjectId();
    const token = jwt.sign({ id: ghostId }, process.env.JWT_ACCESS_SECRET);
    await expect(connect(token)).rejects.toThrow('משתמש לא נמצא');
  });
});

// ─── send_message ─────────────────────────────────────────────────────────────

describe('send_message', () => {
  it('persists the message and acks it back to the sender', async () => {
    const resident = await createResident({ name: 'דנה' });
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    const client = await connect(tokenFor(resident));
    const ack = await emitWithAck(client, 'send_message', {
      conversationId: conv._id.toString(),
      text: 'מתי תוכל להגיע?',
    });

    expect(ack.error).toBeUndefined();
    expect(ack.message.text).toBe('מתי תוכל להגיע?');
    expect(ack.message.sender.name).toBe('דנה');

    const stored = await Message.findOne({ conversation: conv._id });
    expect(stored).not.toBeNull();
    expect(stored.text).toBe('מתי תוכל להגיע?');
  });

  it('delivers new_message to the other participant in the conversation room', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const senderClient   = await connect(tokenFor(resident));
    const receiverClient = await connect(tokenFor(worker));

    receiverClient.emit('join_conversation', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 300)); // let the join land

    const incoming = nextEvent(receiverClient, 'new_message');
    senderClient.emit('send_message', { conversationId: convId, text: 'שלום' });

    const payload = await incoming;
    expect(payload.text).toBe('שלום');
    expect(payload.conversation).toBe(convId);
  });

  it('pushes conversation_updated to the recipient personal room even without joining', async () => {
    const resident = await createResident({ name: 'דנה' });
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    const senderClient   = await connect(tokenFor(resident));
    const receiverClient = await connect(tokenFor(worker));
    // deliberately NOT joining the conversation room — this is the badge path

    const incoming = nextEvent(receiverClient, 'conversation_updated');
    senderClient.emit('send_message', {
      conversationId: conv._id.toString(),
      text: 'הודעה חדשה',
    });

    const payload = await incoming;
    expect(payload.conversationId).toBe(conv._id.toString());
    expect(payload.lastMessage).toBe('הודעה חדשה');
    expect(payload.fromName).toBe('דנה');
  });

  it('updates the conversation summary and the recipient unread count', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    const client = await connect(tokenFor(resident));
    await emitWithAck(client, 'send_message', {
      conversationId: conv._id.toString(),
      text: 'הודעה ראשונה',
    });

    const stored = await Conversation.findById(conv._id);
    expect(stored.lastMessage).toBe('הודעה ראשונה');
    expect(stored.lastMessageAt).not.toBeNull();
    expect(stored.unreadCounts.get(worker._id.toString())).toBe(1);
  });

  it('acks an error for an empty message and stores nothing', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    const client = await connect(tokenFor(resident));
    const ack = await emitWithAck(client, 'send_message', {
      conversationId: conv._id.toString(),
      text: '   ',
    });

    expect(ack.error).toBe('הודעה ריקה');
    expect(await Message.countDocuments()).toBe(0);
  });

  it('refuses to post into a conversation the sender is not part of', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const stranger = await createResident();
    const conv = await createConversation([resident._id, worker._id]);

    const client = await connect(tokenFor(stranger));
    const ack = await emitWithAck(client, 'send_message', {
      conversationId: conv._id.toString(),
      text: 'לא אמור לעבור',
    });

    expect(ack.error).toBe('אין גישה');
    expect(await Message.countDocuments()).toBe(0);
  });

  it('acks an error for a non-existent conversation', async () => {
    const resident = await createResident();
    const client = await connect(tokenFor(resident));

    const ack = await emitWithAck(client, 'send_message', {
      conversationId: '64a000000000000000000099',
      text: 'שלום',
    });

    expect(ack.error).toBe('שיחה לא נמצאה');
  });
});

// ─── join / leave_conversation ────────────────────────────────────────────────

describe('join_conversation / leave_conversation', () => {
  it('does not deliver room messages to a non-participant who tries to join', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const stranger = await createResident();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const senderClient   = await connect(tokenFor(resident));
    const strangerClient = await connect(tokenFor(stranger));

    strangerClient.emit('join_conversation', { conversationId: convId }); // silently ignored
    await new Promise((r) => setTimeout(r, 300));

    senderClient.emit('send_message', { conversationId: convId, text: 'פרטי' });
    await expectNoEvent(strangerClient, 'new_message');
  });

  it('stops delivering room messages after leave_conversation', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const senderClient   = await connect(tokenFor(resident));
    const receiverClient = await connect(tokenFor(worker));

    receiverClient.emit('join_conversation', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 300));
    receiverClient.emit('leave_conversation', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 300));

    senderClient.emit('send_message', { conversationId: convId, text: 'אחרי יציאה' });
    await expectNoEvent(receiverClient, 'new_message');
  });
});

// ─── mark_read ────────────────────────────────────────────────────────────────

describe('mark_read', () => {
  it('zeroes the unread count and marks messages read', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const senderClient = await connect(tokenFor(resident));
    await emitWithAck(senderClient, 'send_message', { conversationId: convId, text: 'שלום' });

    const before = await Conversation.findById(conv._id);
    expect(before.unreadCounts.get(worker._id.toString())).toBe(1);

    const receiverClient = await connect(tokenFor(worker));
    receiverClient.emit('mark_read', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 500));

    const after = await Conversation.findById(conv._id);
    expect(after.unreadCounts.get(worker._id.toString())).toBe(0);

    const msg = await Message.findOne({ conversation: conv._id });
    expect(msg.readBy.map(String)).toContain(worker._id.toString());
  });

  it('tells the other side that the messages were read', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const senderClient   = await connect(tokenFor(resident));
    const receiverClient = await connect(tokenFor(worker));

    senderClient.emit('join_conversation', { conversationId: convId });
    receiverClient.emit('join_conversation', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 300));

    await emitWithAck(senderClient, 'send_message', { conversationId: convId, text: 'שלום' });

    const readReceipt = nextEvent(senderClient, 'messages_read');
    receiverClient.emit('mark_read', { conversationId: convId });

    const payload = await readReceipt;
    expect(payload.conversationId).toBe(convId);
    expect(payload.readBy).toBe(worker._id.toString());
  });

  it('ignores mark_read from someone outside the conversation', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const stranger = await createResident();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const senderClient = await connect(tokenFor(resident));
    senderClient.emit('join_conversation', { conversationId: convId });
    await new Promise((r) => setTimeout(r, 300));
    await emitWithAck(senderClient, 'send_message', { conversationId: convId, text: 'שלום' });

    const strangerClient = await connect(tokenFor(stranger));
    strangerClient.emit('mark_read', { conversationId: convId });

    await expectNoEvent(senderClient, 'messages_read');
    const msg = await Message.findOne({ conversation: conv._id });
    expect(msg.readBy.map(String)).not.toContain(stranger._id.toString());
  });
});

// ─── send_message limits ──────────────────────────────────────────────────────

describe('send_message validation', () => {
  it('rejects a message over the shared length limit, like the REST endpoint', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);

    const client = await connect(tokenFor(resident));
    const ack = await emitWithAck(client, 'send_message', {
      conversationId: conv._id.toString(),
      text: 'א'.repeat(MESSAGE_MAX + 1),
    });

    expect(ack.error).toBe('ההודעה ארוכה מדי');
    expect(await Message.countDocuments()).toBe(0);
  });

  it('counts every message when several arrive at once', async () => {
    const resident = await createResident();
    const { user: worker } = await createWorkerUser();
    const conv = await createConversation([resident._id, worker._id]);
    const convId = conv._id.toString();

    const client = await connect(tokenFor(resident));
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        emitWithAck(client, 'send_message', { conversationId: convId, text: `הודעה ${i}` })
      )
    );

    const stored = await Conversation.findById(conv._id);
    expect(stored.unreadCounts.get(worker._id.toString())).toBe(5);
  });
});
