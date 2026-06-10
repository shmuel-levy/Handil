const router        = require('express').Router();
const Conversation  = require('../models/Conversation');
const Message       = require('../models/Message');
const User          = require('../models/User');
const auth          = require('../middleware/auth');

const USER_SELECT = 'name avatar role';

// ─── POST /api/chat/conversations ─────────────────────────────────────────────
// Start or fetch a conversation between current user and another user
// Body: { otherUserId, jobPostId? }
router.post('/conversations', auth, async (req, res) => {
  try {
    const { otherUserId, jobPostId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: 'חסר otherUserId' });
    if (otherUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'לא ניתן לשלוח הודעה לעצמך' });
    }

    const other = await User.findById(otherUserId).select(USER_SELECT);
    if (!other) return res.status(404).json({ message: 'משתמש לא נמצא' });

    // Look for existing conversation between these two users
    const participants = [req.user._id, otherUserId].sort();
    let conv = await Conversation.findOne({ participants: { $all: participants } })
      .populate('participants', USER_SELECT)
      .populate('jobPost', 'title category');

    if (!conv) {
      conv = await Conversation.create({
        participants,
        jobPost: jobPostId || null,
      });
      conv = await conv.populate([
        { path: 'participants', select: USER_SELECT },
        { path: 'jobPost',      select: 'title category' },
      ]);
    }

    res.status(201).json({ conversation: conv });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/chat/conversations ──────────────────────────────────────────────
// My conversations, sorted by last message
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', USER_SELECT)
      .populate('jobPost', 'title category')
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/chat/conversations/:id/messages ─────────────────────────────────
// Message history for a conversation (paginated)
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'שיחה לא נמצאה' });

    const isParticipant = conv.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: 'אין גישה לשיחה זו' });

    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', USER_SELECT)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Mark all as read for current user
    await Message.updateMany(
      { conversation: req.params.id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(req.params.id, {
      $set: { [`unreadCounts.${req.user._id}`]: 0 },
    });

    res.json({ messages: messages.reverse(), page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── POST /api/chat/conversations/:id/messages ────────────────────────────────
// Send a message (REST fallback — primary path is Socket.io)
router.post('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'הודעה ריקה' });

    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ message: 'שיחה לא נמצאה' });

    const isParticipant = conv.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: 'אין גישה לשיחה זו' });

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      text: text.trim(),
      readBy: [req.user._id],
    });
    await msg.populate('sender', USER_SELECT);

    // Update conversation summary
    const otherParticipants = conv.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );
    const unreadUpdate = {};
    for (const pid of otherParticipants) {
      const cur = conv.unreadCounts?.get?.(pid.toString()) ?? 0;
      unreadUpdate[`unreadCounts.${pid}`] = cur + 1;
    }

    await Conversation.findByIdAndUpdate(conv._id, {
      $set: {
        lastMessage: text.trim().substring(0, 80),
        lastMessageAt: new Date(),
        ...unreadUpdate,
      },
    });

    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/chat/unread ─────────────────────────────────────────────────────
// Total unread message count across all conversations
router.get('/unread', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id });
    const total = conversations.reduce((sum, c) => {
      const count = c.unreadCounts?.get?.(req.user._id.toString()) ?? 0;
      return sum + count;
    }, 0);
    res.json({ unread: total });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

module.exports = router;
