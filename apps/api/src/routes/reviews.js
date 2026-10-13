const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { recalcWorkerRating } = require('../utils/rating');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { schemas } = require('@handil/shared');
const { serverError } = require('../utils/serverError');
const { objectIdParam } = require('../middleware/objectIdParam');

const router = express.Router();

router.param('userId', objectIdParam('בעל מקצוע לא נמצא'));

// POST /api/reviews
router.post('/', authMiddleware, validate(schemas.createReviewSchema), async (req, res) => {
  try {
    if (req.user.role !== 'resident') return res.status(403).json({ message: 'דיירים בלבד' });
    const { bookingId, rating, comment } = req.body;

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
    serverError(res, err);
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
    serverError(res, err);
  }
});

module.exports = router;
