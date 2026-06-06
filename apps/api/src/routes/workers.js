const express = require('express');
const Worker = require('../models/Worker');
const Review = require('../models/Review');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/workers?category=&city=&q=&page=1
router.get('/', async (req, res) => {
  try {
    const { category, city, q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (category) filter.categories = category;
    if (city) filter.city = new RegExp(city, 'i');

    const workers = await Worker.find(filter)
      .populate('user', 'name phone avatar')
      .sort({ rating: -1, reviewCount: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const results = q
      ? workers.filter((w) =>
          w.user?.name?.toLowerCase().includes(q.toLowerCase())
        )
      : workers;

    res.json({ workers: results, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/workers/me — own worker profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const worker = await Worker.findOne({ user: req.user._id }).populate('user', 'name phone avatar');
    if (!worker) return res.status(404).json({ message: 'פרופיל עובד לא נמצא' });
    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/workers/me — update own worker profile
router.put('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { bio, categories, city, yearsExperience, hourlyRate, isAvailable } = req.body;
    const update = {};
    if (bio !== undefined) update.bio = bio;
    if (categories !== undefined) update.categories = categories;
    if (city !== undefined) update.city = city;
    if (yearsExperience !== undefined) update.yearsExperience = yearsExperience;
    if (hourlyRate !== undefined) update.hourlyRate = hourlyRate;
    if (isAvailable !== undefined) update.isAvailable = isAvailable;

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      update,
      { new: true, upsert: true }
    ).populate('user', 'name phone avatar');

    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/workers/:id — single worker profile + reviews
router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id).populate('user', 'name phone avatar createdAt');
    if (!worker) return res.status(404).json({ message: 'עובד לא נמצא' });

    const reviews = await Review.find({ worker: worker.user._id })
      .populate('resident', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ worker, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
