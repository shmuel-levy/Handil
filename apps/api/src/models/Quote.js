const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  jobPost:  { type: mongoose.Schema.Types.ObjectId, ref: 'JobPost',  required: true },
  worker:   { type: mongoose.Schema.Types.ObjectId, ref: 'Worker',   required: true },
  proposedPrice:        { type: Number, required: true, min: 0 },
  message:              { type: String, default: '' },
  estimatedArrivalDate: { type: Date },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

// One quote per worker per post
quoteSchema.index({ jobPost: 1, worker: 1 }, { unique: true });
quoteSchema.index({ worker: 1 });
quoteSchema.index({ jobPost: 1, status: 1 });

module.exports = mongoose.model('Quote', quoteSchema);
