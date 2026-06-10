const express = require('express');
const Worker  = require('../models/Worker');
const Review  = require('../models/Review');
const Booking = require('../models/Booking');
const Quote   = require('../models/Quote');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/workers ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, city, q, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (category) filter.categories = category;
    if (city)     filter.city = new RegExp(city, 'i');

    const workers = await Worker.find(filter)
      .populate('user', 'name phone avatar')
      .sort({ rating: -1, reviewCount: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Filter out workers whose user document was deleted
    const validWorkers = workers.filter((w) => w.user != null);

    const results = q
      ? validWorkers.filter((w) => w.user?.name?.toLowerCase().includes(q.toLowerCase()))
      : validWorkers;

    res.json({ workers: results, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/workers/me ──────────────────────────────────────────────────────
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

// ─── PUT /api/workers/me ──────────────────────────────────────────────────────
router.put('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const {
      bio, categories, city, yearsExperience, hourlyRate,
      isAvailable, urgencyRates, offersTeaching, teachingRate,
    } = req.body;
    const update = {};
    if (bio              !== undefined) update.bio = bio;
    if (categories       !== undefined) update.categories = categories;
    if (city             !== undefined) update.city = city;
    if (yearsExperience  !== undefined) update.yearsExperience = yearsExperience;
    if (hourlyRate       !== undefined) update.hourlyRate = hourlyRate;
    if (isAvailable      !== undefined) update.isAvailable = isAvailable;
    if (urgencyRates     !== undefined) update.urgencyRates = urgencyRates;
    if (offersTeaching   !== undefined) update.offersTeaching = offersTeaching;
    if (teachingRate     !== undefined) update.teachingRate = teachingRate;

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

// ─── PATCH /api/workers/me/available ─────────────────────────────────────────
// Quick "זמין עכשיו" toggle
router.patch('/me/available', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { isAvailable } = req.body;
    if (isAvailable === undefined) return res.status(400).json({ message: 'חסר isAvailable' });

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { isAvailable },
      { new: true }
    ).populate('user', 'name phone avatar');

    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/workers/me/verify ─────────────────────────────────────────────
// Add a verification badge: 'phone' | 'id' | 'bank'
// In production this would require proof upload + admin approval.
// For MVP we accept the badge type and add it directly.
router.post('/me/verify', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { badge } = req.body; // 'phone' | 'id' | 'bank'
    const VALID = ['phone', 'id', 'bank'];
    if (!VALID.includes(badge)) return res.status(400).json({ message: 'תג לא תקין' });

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { verificationBadges: badge } },
      { new: true }
    ).populate('user', 'name phone avatar');

    if (!worker) return res.status(404).json({ message: 'פרופיל עובד לא נמצא' });

    // Auto-set isVerified when worker has all 3 badges
    if (worker.verificationBadges.length >= 3) {
      worker.isVerified = true;
      await worker.save();
    }

    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/workers/me/portfolio ──────────────────────────────────────────
// Add portfolio item
router.post('/me/portfolio', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { title, description, beforeImage, afterImage, category } = req.body;
    if (!title) return res.status(400).json({ message: 'כותרת נדרשת' });

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { $push: { portfolio: { title, description, beforeImage, afterImage, category } } },
      { new: true }
    ).populate('user', 'name phone avatar');

    if (!worker) return res.status(404).json({ message: 'פרופיל עובד לא נמצא' });
    res.status(201).json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/workers/me/portfolio/:itemId ─────────────────────────────────
router.delete('/me/portfolio/:itemId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { portfolio: { _id: req.params.itemId } } },
      { new: true }
    ).populate('user', 'name phone avatar');

    if (!worker) return res.status(404).json({ message: 'פרופיל עובד לא נמצא' });
    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/workers/:id ─────────────────────────────────────────────────────
// Single worker + reviews + reliability stats + portfolio
router.get('/:id', async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id)
      .populate('user', 'name phone avatar createdAt');
    if (!worker) return res.status(404).json({ message: 'עובד לא נמצא' });

    const workerUserId = worker.user._id;

    const [reviews, totalDone, totalCancelled, totalQuotes, acceptedQuotes, quotesList] =
      await Promise.all([
        Review.find({ worker: workerUserId })
          .populate('resident', 'name avatar')
          .sort({ createdAt: -1 })
          .limit(20),
        Booking.countDocuments({ worker: workerUserId, status: 'completed' }),
        Booking.countDocuments({ worker: workerUserId, status: 'cancelled' }),
        Quote.countDocuments({ worker: worker._id }),
        Quote.countDocuments({ worker: worker._id, status: 'accepted' }),
        Quote.find({ worker: worker._id })
          .populate('jobPost', 'createdAt')
          .select('createdAt jobPost'),
      ]);

    // Completion rate — among closed jobs (done + cancelled)
    const closedJobs = totalDone + totalCancelled;
    const completionRate = closedJobs > 0 ? Math.round((totalDone / closedJobs) * 100) : null;

    // Quote accept rate
    const quoteAcceptRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : null;

    // Average response time in hours (quote creation vs post creation)
    const responseTimes = quotesList
      .filter((q) => q.jobPost?.createdAt)
      .map((q) => (new Date(q.createdAt) - new Date(q.jobPost.createdAt)) / 3600000);
    const avgResponseHours =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

    const stats = {
      totalJobsDone: totalDone,
      completionRate,
      quoteAcceptRate,
      avgResponseHours,
    };

    res.json({ worker, reviews, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
