const { Server } = require('socket.io');
const jwt         = require('jsonwebtoken');
const User        = require('./models/User');
const Conversation = require('./models/Conversation');
const Message     = require('./models/Message');
const { schemas } = require('@handil/shared');
const { unreadIncrement } = require('./utils/unread');

const USER_SELECT = 'name avatar role';

let ioInstance = null;

function getIO() { return ioInstance; }

function initSocket(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : '*';

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: Array.isArray(allowedOrigins),
    },
  });
  ioInstance = io;

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('אין טוקן'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select(USER_SELECT);
      if (!user) return next(new Error('משתמש לא נמצא'));
      socket.user = user;
      next();
    } catch {
      next(new Error('טוקן לא תקין'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    // Each user gets their own room for direct notifications
    socket.join(`user:${userId}`);

    // ── join_conversation ────────────────────────────────────────────────────
    socket.on('join_conversation', async ({ conversationId }) => {
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;
        const isParticipant = conv.participants.some((p) => p.toString() === userId);
        if (!isParticipant) return;
        socket.join(`conv:${conversationId}`);
      } catch {}
    });

    // ── leave_conversation ───────────────────────────────────────────────────
    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── send_message ─────────────────────────────────────────────────────────
    socket.on('send_message', async (input, ack) => {
      try {
        const conversationId = input?.conversationId;
        // Same rules as the REST endpoint. The socket used to skip the length
        // limit entirely, so a client could store a message of any size.
        const parsed = schemas.sendMessageSchema.safeParse({ text: input?.text });
        if (!parsed.success) {
          return ack?.({ error: parsed.error.issues[0]?.message ?? 'הודעה ריקה' });
        }
        const { text } = parsed.data;

        const conv = await Conversation.findById(conversationId);
        if (!conv) return ack?.({ error: 'שיחה לא נמצאה' });

        const isParticipant = conv.participants.some((p) => p.toString() === userId);
        if (!isParticipant) return ack?.({ error: 'אין גישה' });

        const msg = await Message.create({
          conversation: conv._id,
          sender: socket.user._id,
          text,
          readBy: [socket.user._id],
        });
        await msg.populate('sender', USER_SELECT);

        // Update conversation summary
        const otherParticipants = conv.participants.filter((p) => p.toString() !== userId);
        await Conversation.findByIdAndUpdate(conv._id, {
          $set: {
            lastMessage: text.substring(0, 80),
            lastMessageAt: new Date(),
          },
          $inc: unreadIncrement(otherParticipants),
        });

        const payload = {
          _id: msg._id,
          conversation: conv._id,
          sender: { _id: socket.user._id, name: socket.user.name, avatar: socket.user.avatar },
          text: msg.text,
          readBy: msg.readBy,
          createdAt: msg.createdAt,
        };

        // Broadcast to everyone in the conversation room
        io.to(`conv:${conversationId}`).emit('new_message', payload);

        // Also push to each other participant's personal room (for notification badge)
        for (const pid of otherParticipants) {
          io.to(`user:${pid}`).emit('conversation_updated', {
            conversationId,
            lastMessage: text.substring(0, 80),
            lastMessageAt: new Date(),
            fromName: socket.user.name,
          });
        }

        ack?.({ message: payload });
      } catch (err) {
        ack?.({ error: 'שגיאת שרת' });
      }
    });

    // ── mark_read ────────────────────────────────────────────────────────────
    socket.on('mark_read', async ({ conversationId } = {}) => {
      try {
        // Without this any signed-in user could mark a stranger's conversation
        // read and broadcast a fake "messages_read" into its room.
        const conv = await Conversation.findById(conversationId).select('participants');
        if (!conv || !conv.participants.some((p) => p.toString() === userId)) return;

        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: socket.user._id } },
          { $addToSet: { readBy: socket.user._id } }
        );
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCounts.${userId}`]: 0 },
        }, { returnDocument: 'after' });
        // Notify the other side that messages were read
        socket.to(`conv:${conversationId}`).emit('messages_read', { conversationId, readBy: userId });
      } catch {}
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initSocket, getIO };
