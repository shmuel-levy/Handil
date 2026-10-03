const express = require('express');
const User    = require('../models/User');
const Worker  = require('../models/Worker');
const Review  = require('../models/Review');
const Booking = require('../models/Booking');
const Quote   = require('../models/Quote');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { schemas, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('@handil/shared');

const router = express.Router();

/** Escapes user input before it becomes a RegExp, so `.` or `(` cannot break the query. */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── GET /api/workers ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, city, q } = req.query;
    // Clamp so a client cannot pull the whole directory in one request
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE));

    const filter = {};
    if (category) filter.categories = category;
    if (city)     filter.city = new RegExp(escapeRegex(city), 'i');

    // Name search resolves to user ids first. Filtering in JS after the query
    // used to drop matches that fell outside the current page, so searching a
    // name on page 1 could return nothing while the worker existed on page 2.
    if (q) {
      const matchingUsers = await User.find({ name: new RegExp(escapeRegex(q), 'i') }).select('_id');
      filter.user = { $in: matchingUsers.map((u) => u._id) };
    }

    const [workers, total] = await Promise.all([
      Worker.find(filter)
        .populate('user', 'name phone avatar')
        .sort({ rating: -1, reviewCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Worker.countDocuments(filter),
    ]);

    // Drop profiles whose user document was deleted
    const results = workers.filter((w) => w.user != null);

    res.json({ workers: results, total, page, limit });
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
router.put('/me', authMiddleware, validate(schemas.updateWorkerSchema), async (req, res) => {
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
      { returnDocument: 'after', upsert: true }
    ).populate('user', 'name phone avatar');

    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATCH /api/workers/me/available ─────────────────────────────────────────
// Quick "זמין עכשיו" toggle
router.patch('/me/available', authMiddleware, validate(schemas.availabilitySchema), async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { isAvailable } = req.body;

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { isAvailable },
      { returnDocument: 'after' }
    ).populate('user', 'name phone avatar');

    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/workers/me/verify ─────────────────────────────────────────────
// Records a SELF-DECLARED badge: 'phone' | 'id' | 'bank'.
//
// No proof is checked here, so this endpoint deliberately does NOT grant
// `isVerified`. Showing a platform-verified badge to someone who merely tapped
// a button would mislead residents choosing who to let into their home.
// `isVerified` is reserved for a real review process (proof upload + approval)
// and can only be set out-of-band until that exists.
router.post('/me/verify', authMiddleware, validate(schemas.verifyBadgeSchema), async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { badge } = req.body; // 'phone' | 'id' | 'bank'

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { verificationBadges: badge } },
      { returnDocument: 'after' }
    ).populate('user', 'name phone avatar');

    if (!worker) return res.status(404).json({ message: 'פרופיל עובד לא נמצא' });

    res.json({ worker });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/workers/me/portfolio ──────────────────────────────────────────
// Add portfolio item
router.post('/me/portfolio', authMiddleware, validate(schemas.portfolioItemSchema), async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.status(403).json({ message: 'עובדים בלבד' });
    const { title, description, beforeImage, afterImage, category } = req.body;

    const worker = await Worker.findOneAndUpdate(
      { user: req.user._id },
      { $push: { portfolio: { title, description, beforeImage, afterImage, category } } },
      { returnDocument: 'after' }
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
      { returnDocument: 'after' }
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
