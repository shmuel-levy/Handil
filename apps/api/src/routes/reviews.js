const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

async function recalcWorkerRating(workerUserId) {
  const reviews = await Review.find({ worker: workerUserId });
  if (reviews.length === 0) return;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Worker.findOneAndUpdate(
    { user: workerUserId },
    { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
    { returnDocument: 'after' }
  );
}

// POST /api/reviews
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'resident') return res.status(403).json({ message: 'דיירים בלבד' });
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) return res.status(400).json({ message: 'שדות חובה חסרים' });

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.status !== 'completed') {
      return res.status(400).json({ message: 'ניתן לסקור רק הזמנות שהושלמו' });
    }
    if (booking.resident.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'לא ההזמנה שלך' });
    }

    const review = await Review.create({
      booking: bookingId,
      resident: req.user._id,
      worker: booking.worker,
      rating: Number(rating),
      comment: comment || '',
    });

    await recalcWorkerRating(booking.worker);

    const populated = await review.populate('resident', 'name avatar');
    res.status(201).json({ review: populated });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'כבר סקרת הזמנה זו' });
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/worker/:userId
router.get('/worker/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ worker: req.params.userId })
      .populate('resident', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
