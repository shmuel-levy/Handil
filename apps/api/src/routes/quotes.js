const router = require('express').Router();
const Quote   = require('../models/Quote');
const Worker  = require('../models/Worker');
const JobPost = require('../models/JobPost');
const Booking = require('../models/Booking');
const auth    = require('../middleware/auth');
const { getIO } = require('../socket');

// ─── helpers ─────────────────────────────────────────────────────────────────

const WORKER_SELECT = 'user bio rating reviewCount city yearsExperience categories';
const USER_SELECT   = 'name avatar phone';

// ─── POST /quotes ─────────────────────────────────────────────────────────────
// Worker submits a quote for a job post
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'רק בעלי מקצוע יכולים לשלוח הצעות' });
    }
    const { jobPostId, proposedPrice, message, estimatedArrivalDate } = req.body;
    if (!jobPostId || proposedPrice == null) {
      return res.status(400).json({ message: 'חסרים שדות חובה' });
    }

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
            workerName:    workerDoc.user?.name ?? '',
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
    res.status(500).json({ message: 'שגיאת שרת' });
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
    res.status(500).json({ message: 'שגיאת שרת' });
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
    res.status(500).json({ message: 'שגיאת שרת' });
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
      .populate({ path: 'jobPost', populate: { path: 'resident', select: 'name avatar' } })
      .sort({ createdAt: -1 });

    res.json({ quotes });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
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

    const post = await JobPost.findById(quote.jobPost);
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });
    if (post.status !== 'open') {
      return res.status(400).json({ message: 'הפוסט כבר לא פתוח' });
    }

    const residentId = typeof post.resident === 'object' ? post.resident._id : post.resident;
    if (residentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'אין הרשאה לאשר הצעה זו' });
    }

    // Accept this quote
    quote.status = 'accepted';
    await quote.save();

    // Reject all other pending quotes for this post
    await Quote.updateMany(
      { jobPost: post._id, _id: { $ne: quote._id }, status: 'pending' },
      { $set: { status: 'rejected' } }
    );

    // Mark the post as accepted
    post.status   = 'accepted';
    post.acceptedBy = quote.worker.user._id;
    await post.save();
    await post.populate([
      { path: 'resident',   select: 'name avatar phone' },
      { path: 'acceptedBy', select: 'name avatar' },
    ]);

    // Create Booking
    await Booking.create({
      resident:    residentId,
      worker:      quote.worker.user._id,
      category:    post.category,
      description: post.title,
      status:      'accepted',
      price:       quote.proposedPrice,
    });

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
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── PATCH /quotes/:id/reject ─────────────────────────────────────────────────
// Resident rejects a single quote
router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'הצעה לא נמצאה' });

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
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

module.exports = router;
