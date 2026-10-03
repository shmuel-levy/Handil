const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    resident: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Set when the booking originated from a job post (direct accept or an
    // accepted quote). Null for a booking requested straight from a profile.
    jobPost: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost', default: null },
    category: { type: String, required: true },
    description: { type: String, default: '', trim: true },
    scheduledDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    price: { type: Number, default: null },
  },
  { timestamps: true }
);

// Each side's booking list
bookingSchema.index({ resident: 1, createdAt: -1 });
bookingSchema.index({ worker: 1, createdAt: -1 });
// Reliability stats counted by status
bookingSchema.index({ worker: 1, status: 1 });
// Guards against creating two bookings for the same job post
bookingSchema.index({ jobPost: 1 }, { sparse: true });

module.exports = mongoose.model('Booking', bookingSchema);
