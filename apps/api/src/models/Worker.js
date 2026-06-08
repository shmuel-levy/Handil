const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, default: '', trim: true },
    categories: [{ type: String, trim: true }],
    city: { type: String, default: 'תל אביב', trim: true },
    yearsExperience: { type: Number, default: 0, min: 0 },
    hourlyRate: { type: Number, default: null },
    urgencyRates: {
      urgent:   { type: Number, default: null },
      today:    { type: Number, default: null },
      week:     { type: Number, default: null },
      flexible: { type: Number, default: null },
    },
    offersTeaching: { type: Boolean, default: false },
    teachingRate:   { type: Number, default: null },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    gallery: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Worker', workerSchema);
