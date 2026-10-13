const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { schemas } = require('@handil/shared');
const { serverError } = require('../utils/serverError');
const { deleteAccount } = require('../services/deleteAccount');
const { getIO } = require('../socket');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '30d' });

const sanitizeUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  avatar: u.avatar,
  city: u.city || '',
});

// POST /api/auth/register
router.post('/register', validate(schemas.registerSchema), async (req, res) => {
  try {
    // Shape, role, e-mail format and password strength are enforced by the schema
    const { name, email, password, phone, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'האימייל כבר רשום במערכת' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, phone: phone || '', role });

    if (role === 'worker') {
      await Worker.create({ user: user._id });
    }

    res.status(201).json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    // Two sign-ups racing past the lookup above hit the unique index instead
    if (err.code === 11000) return res.status(409).json({ message: 'האימייל כבר רשום במערכת' });
    serverError(res, err);
  }
});

// POST /api/auth/login
router.post('/login', validate(schemas.loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'פרטים שגויים' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'פרטים שגויים' });

    res.json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json(sanitizeUser(req.user));
});

// PUT /api/auth/me  — update profile (city, preferred categories, phone, name, avatar)
router.put('/me', authMiddleware, validate(schemas.updateProfileSchema), async (req, res) => {
  try {
    const { city, preferredCategories, phone, name, avatar } = req.body;
    const update = {};
    if (city !== undefined) update.city = city;
    if (preferredCategories !== undefined) update.preferredCategories = preferredCategories;
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) update.name = name;
    if (avatar !== undefined) update.avatar = avatar;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { returnDocument: 'after' }
    ).select('-password');
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/auth/me — permanently delete the account (password required)
router.delete('/me', authMiddleware, validate(schemas.deleteAccountSchema), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(req.body.password, user.password);
    // 403, not 401: the session is valid, and clients treat 401 as "signed out"
    if (!match) return res.status(403).json({ message: 'סיסמה שגויה' });

    await deleteAccount(user._id);

    // Drop any live socket still authenticated as this user
    try { getIO()?.in(`user:${user._id}`).disconnectSockets(true); } catch {}

    res.json({ message: 'החשבון נמחק' });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
