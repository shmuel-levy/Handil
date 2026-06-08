const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true, default: '' },
    role: { type: String, enum: ['resident', 'worker'], required: true },
    avatar: { type: String, default: '' },
    city: { type: String, default: '', trim: true },
    preferredCategories: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
