const User         = require('../models/User');
const Worker       = require('../models/Worker');
const JobPost      = require('../models/JobPost');
const Quote        = require('../models/Quote');
const Booking      = require('../models/Booking');
const Review       = require('../models/Review');
const Conversation = require('../models/Conversation');
const Message      = require('../models/Message');
const { recalcWorkerRating } = require('../utils/rating');

/**
 * Permanently removes a user and the personal data tied to them.
 *
 * App Store and Google Play both require in-app account deletion, and the
 * privacy policy promises it. Data that only exists because of this user goes
 * with them; data that belongs to the other party is repaired instead:
 *   - jobs this worker had been hired for go back on the board as open
 *   - workers this resident reviewed get their rating recalculated
 */
async function deleteAccount(userId) {
  const [workerDoc, myPosts, conversations, writtenReviews] = await Promise.all([
    Worker.findOne({ user: userId }).select('_id'),
    JobPost.find({ resident: userId }).select('_id'),
    Conversation.find({ participants: userId }).select('_id'),
    Review.find({ resident: userId }).select('worker'),
  ]);

  const postIds = myPosts.map((p) => p._id);
  const convIds = conversations.map((c) => c._id);
  const reviewedWorkers = [...new Set(writtenReviews.map((r) => r.worker.toString()))];

  await Promise.all([
    Quote.deleteMany({ jobPost: { $in: postIds } }),
    workerDoc ? Quote.deleteMany({ worker: workerDoc._id }) : null,
    JobPost.deleteMany({ resident: userId }),
    JobPost.updateMany(
      { acceptedBy: userId, status: 'accepted' },
      { $set: { status: 'open', acceptedBy: null } }
    ),
    Booking.deleteMany({ $or: [{ resident: userId }, { worker: userId }] }),
    Review.deleteMany({ $or: [{ resident: userId }, { worker: userId }] }),
    Message.deleteMany({ conversation: { $in: convIds } }),
    Conversation.deleteMany({ _id: { $in: convIds } }),
    Worker.deleteOne({ user: userId }),
  ]);

  await User.deleteOne({ _id: userId });

  await Promise.all(reviewedWorkers.map((id) => recalcWorkerRating(id)));
}

module.exports = { deleteAccount };
