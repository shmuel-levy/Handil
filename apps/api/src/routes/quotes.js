const router = require('express').Router();
const Quote   = require('../models/Quote');
const Worker  = require('../models/Worker');
const JobPost = require('../models/JobPost');
const Booking = require('../models/Booking');
const auth    = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getIO } = require('../socket');
const { schemas } = require('@handil/shared');
const { serverError } = require('../utils/serverError');
const { objectIdParam } = require('../middleware/objectIdParam');

router.param('id', objectIdParam('הצעה לא נמצאה'));
router.param('jobId', objectIdParam('פוסט לא נמצא'));

// ─── helpers ─────────────────────────────────────────────────────────────────

const WORKER_SELECT = 'user bio rating reviewCount city yearsExperience categories';
const USER_SELECT   = 'name avatar phone';

// ─── POST /quotes ─────────────────────────────────────────────────────────────
// Worker submits a quote for a job post
router.post('/', auth, validate(schemas.createQuoteSchema), async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'רק בעלי מקצוע יכולים לשלוח הצעות' });
    }
    const { jobPostId, proposedPrice, message, estimatedArrivalDate } = req.body;

    const post = await JobPost.findById(jobPostId);
    if (!post)            return res.status(404).json({ message: 'פוסט לא נמצא' });
    if (post.status !== 'open') {
      return res.status(400).json({ message: 'הפוסט כבר לא פתוח לקבלת הצעות' });
    }

    const workerDoc = await Worker.findOne({ user: req.user._id });
    if (!workerDoc) return res.status(404).json({ message: 'פרופיל בעל מקצוע לא נמצא' });

    const existing = await Quote.findOne({ jobPost: jobPostId, worker: workerDoc._id });
    if (existing) {
      return res.status(409).json({ message: 'כבר שלחת הצעה לפוסט הזה', quote: existing });
    }

    const quote = await Quote.create({
      jobPost: jobPostId,
      worker:  workerDoc._id,
      proposedPrice: Number(proposedPrice),
      message: message || '',
      estimatedArrivalDate: estimatedArrivalDate ? new Date(estimatedArrivalDate) : undefined,
    });

    await quote.populate({ path: 'worker', select: WORKER_SELECT, populate: { path: 'user', select: USER_SELECT } });

    // Real-time: notify the resident that a new quote arrived
    try {
      const io = getIO();
      if (io) {
        const residentId = typeof post.resident === 'object' ? post.resident._id : post.resident;
        io.to(`user:${residentId}`).emit('new_quote', {
          postId:    post._id.toString(),
          postTitle: post.title,
          quote: {
            _id:           quote._id,
            proposedPrice: quote.proposedPrice,
            // workerDoc.user is an unpopulated ObjectId; the sender is the worker
            workerName:    req.user.name ?? '',
            workerRating:  workerDoc.rating,
          },
        });
      }
    } catch {}

    res.status(201).json({ quote });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'כבר שלחת הצעה לפוסט הזה' });
    }
    serverError(res, err);
  }
});

// ─── GET /quotes/job/:jobId ───────────────────────────────────────────────────
// Resident sees all quotes for their post (sorted cheapest first)
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const post = await JobPost.findById(req.params.jobId);
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });

    const residentId = typeof post.resident === 'object' ? post.resident._id : post.resident;
    if (residentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'אין הרשאה לצפות בהצעות' });
    }

    const quotes = await Quote.find({ jobPost: req.params.jobId })
      .populate({ path: 'worker', select: WORKER_SELECT, populate: { path: 'user', select: USER_SELECT } })
      .sort({ proposedPrice: 1 });

    res.json({ quotes, total: quotes.length });
  } catch (err) {
    serverError(res, err);
  }
});

// ─── GET /quotes/check/:jobId ────────────────────────────────────────────────
// Worker checks if they already have a quote for this post
router.get('/check/:jobId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.json({ quote: null });

    const workerDoc = await Worker.findOne({ user: req.user._id });
    if (!workerDoc) return res.json({ quote: null });

    const quote = await Quote.findOne({ jobPost: req.params.jobId, worker: workerDoc._id });
    res.json({ quote });
  } catch (err) {
    serverError(res, err);
  }
});

// ─── GET /quotes/my ──────────────────────────────────────────────────────────
// Worker sees all their submitted quotes
router.get('/my', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') return res.json({ quotes: [] });

    const workerDoc = await Worker.findOne({ user: req.user._id });
    if (!workerDoc) return res.json({ quotes: [] });

    const quotes = await Quote.find({ worker: workerDoc._id })
      .populate({ path: 'jobPost', populate: { path: 'resident', select: 'name avatar phone' } })
      .sort({ createdAt: -1 });

    // The resident's phone is released only once they accept this worker's
    // quote — that is the moment the "your quote was accepted" notice needs it.
    const result = quotes.map((q) => {
      const obj = q.toObject();
      if (q.status !== 'accepted' && obj.jobPost?.resident) {
        delete obj.jobPost.resident.phone;
      }
      return obj;
    });

    res.json({ quotes: result });
  } catch (err) {
    serverError(res, err);
  }
});

// ─── PATCH /quotes/:id/accept ─────────────────────────────────────────────────
// Resident accepts a quote → creates Booking, rejects other quotes, closes feed
router.patch('/:id/accept', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id)
      .populate({ path: 'worker', select: WORKER_SELECT, populate: { path: 'user', select: USER_SELECT } });
    if (!quote) return res.status(404).json({ message: 'הצעה לא נמצאה' });
    if (quote.status !== 'pending') {
      return res.status(400).json({ message: 'ניתן לקבל רק הצעות בהמתנה' });
    }

    const existingPost = await JobPost.findById(quote.jobPost);
    if (!existingPost) return res.status(404).json({ message: 'פוסט לא נמצא' });

    const residentId = typeof existingPost.resident === 'object' ? existingPost.resident._id : existingPost.resident;
    if (residentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'אין הרשאה לאשר הצעה זו' });
    }

    const workerUserId = quote.worker.user._id;

    // Claim the post atomically. A separate "is it open?" check followed by a
    // save let two concurrent accepts both succeed, leaving the post and
    // booking disagreeing about who got the job.
    const post = await JobPost.findOneAndUpdate(
      { _id: existingPost._id, status: 'open' },
      { $set: { status: 'accepted', acceptedBy: workerUserId } },
      { returnDocument: 'after' }
    );
    if (!post) {
      return res.status(400).json({ message: 'הפוסט כבר לא פתוח' });
    }

    // The remaining writes span three collections. Transactions would need a
    // replica set (local dev and the test suite run a standalone mongod), so
    // instead each step is undone if a later one fails — otherwise a failed
    // booking insert left the post "accepted" with no booking behind it.
    let booking = null;
    try {
      booking = await Booking.create({
        resident:    residentId,
        worker:      workerUserId,
        jobPost:     post._id,
        category:    post.category,
        description: post.title,
        status:      'accepted',
        price:       quote.proposedPrice,
      });

      const claimed = await Quote.findOneAndUpdate(
        { _id: quote._id, status: 'pending' },
        { $set: { status: 'accepted' } },
        { returnDocument: 'after' }
      );
      if (!claimed) throw new Error('quote no longer pending');
      quote.status = 'accepted';
    } catch (err) {
      if (booking) await Booking.deleteOne({ _id: booking._id }).catch(() => {});
      await JobPost.updateOne(
        { _id: post._id, status: 'accepted', acceptedBy: workerUserId },
        { $set: { status: 'open', acceptedBy: null } }
      ).catch(() => {});
      if (process.env.NODE_ENV !== 'test') console.error('quote accept rolled back:', err.message);
      return res.status(409).json({ message: 'לא ניתן לאשר את ההצעה כרגע, נסו שוב' });
    }

    // Reject all other pending quotes for this post
    await Quote.updateMany(
      { jobPost: post._id, _id: { $ne: quote._id }, status: 'pending' },
      { $set: { status: 'rejected' } }
    );

    await post.populate([
      { path: 'resident',   select: 'name avatar phone' },
      { path: 'acceptedBy', select: 'name avatar' },
    ]);

    // Real-time: notify the worker their quote was accepted
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${quote.worker.user._id}`).emit('quote_accepted', {
          quoteId:   quote._id.toString(),
          postId:    post._id.toString(),
          postTitle: post.title,
          price:     quote.proposedPrice,
        });
      }
    } catch {}

    res.json({ quote, post });
  } catch (err) {
    serverError(res, err);
  }
});

// ─── PATCH /quotes/:id/reject ─────────────────────────────────────────────────
// Resident rejects a single quote
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'הצעה לא נמצאה' });
    // An accepted quote already has a booking behind it — rejecting it here
    // would leave that booking live while the worker is told they lost.
    if (quote.status !== 'pending') {
      return res.status(400).json({ message: 'ניתן לדחות רק הצעות בהמתנה' });
    }

    const post = await JobPost.findById(quote.jobPost);
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });

    const residentId = typeof post.resident === 'object' ? post.resident._id : post.resident;
    if (residentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'אין הרשאה לדחות הצעה זו' });
    }

    quote.status = 'rejected';
    await quote.save();

    // Real-time: notify the worker their quote was rejected
    try {
      const io = getIO();
      if (io) {
        const workerDoc = await Worker.findById(quote.worker).select('user');
        if (workerDoc?.user) {
          io.to(`user:${workerDoc.user}`).emit('quote_rejected', {
            quoteId:   quote._id.toString(),
            postTitle: post.title,
          });
        }
      }
    } catch {}

    res.json({ quote });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
