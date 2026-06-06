const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema(
  {
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    category: { type: String, required: true },
    budget: { type: Number, default: null, min: 0 },
    images: [{ type: String }],
    status: { type: String, enum: ['open', 'accepted', 'closed'], default: 'open' },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    urgency: { type: String, enum: ['urgent', 'today', 'week', 'flexible'], default: 'flexible' },
    location: { type: String, default: 'תל אביב' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobPost', jobPostSchema);
