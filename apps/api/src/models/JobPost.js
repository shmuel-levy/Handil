const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema(
  {
    resident:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:     { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    category:  { type: String, required: true },
    budget:    { type: Number, default: null, min: 0 },
    images:    [{ type: String }],
    status:    { type: String, enum: ['open', 'accepted', 'closed'], default: 'open' },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    urgency:   { type: String, enum: ['urgent', 'today', 'week', 'flexible'], default: 'flexible' },
    location:  { type: String, default: 'תל אביב' },
    // Urgent posts expire 24h after creation
    urgencyExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for fast expiry queries
// Main worker feed: open posts, newest first
jobPostSchema.index({ status: 1, createdAt: -1 });
// Category-filtered feed
jobPostSchema.index({ category: 1, status: 1, createdAt: -1 });
// "My posts" for a resident
jobPostSchema.index({ resident: 1, createdAt: -1 });
jobPostSchema.index({ urgencyExpiresAt: 1 }, { sparse: true });

module.exports = mongoose.model('JobPost', jobPostSchema);
