const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Worker = require('../models/Worker');
const authMiddleware = require('../middleware/auth');

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
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'שדות חובה חסרים' });
    }
    if (!['resident', 'worker'].includes(role)) {
      return res.status(400).json({ message: 'תפקיד לא חוקי' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'הסיסמה חייבת להיות לפחות 6 תווים' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'האימייל כבר רשום במערכת' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, phone: phone || '', role });

    if (role === 'worker') {
      await Worker.create({ user: user._id });
    }

    res.status(201).json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'נא להזין אימייל וסיסמה' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'פרטים שגויים' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'פרטים שגויים' });

    res.json({ token: signToken(user._id), user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json(sanitizeUser(req.user));
});

// PUT /api/auth/me  — update profile (city, preferred categories, phone, name)
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { city, preferredCategories, phone, name } = req.body;
    const update = {};
    if (city !== undefined) update.city = city;
    if (preferredCategories !== undefined) update.preferredCategories = preferredCategories;
    if (phone !== undefined) update.phone = phone;
    if (name !== undefined) update.name = name;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true }
    ).select('-password');
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
