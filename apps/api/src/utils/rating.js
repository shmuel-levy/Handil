const Review = require('../models/Review');
const Worker = require('../models/Worker');

/**
 * Recomputes a worker's average rating and review count from their reviews.
 *
 * With no reviews left (e.g. the only reviewer deleted their account) the
 * profile resets to 0 rather than keeping a stale average.
 */
async function recalcWorkerRating(workerUserId) {
  const reviews = await Review.find({ worker: workerUserId }).select('rating');
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  await Worker.updateOne(
    { user: workerUserId },
    { $set: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length } }
  );
}

module.exports = { recalcWorkerRating };
