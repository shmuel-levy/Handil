const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Always exactly two participants
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    // Context: which job this chat is about (optional)
    jobPost: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', default: null },
    // Denormalized for fast list rendering
    lastMessage:   { type: String, default: '' },
    lastMessageAt: { type: Date,   default: null },
    // Unread count per participant — stored as plain object { userId: count }
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

// Unique conversation per pair (regardless of order)
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
