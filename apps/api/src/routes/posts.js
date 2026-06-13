const router = require('express').Router();
const JobPost = require('../models/JobPost');
const Worker  = require('../models/Worker');
const auth    = require('../middleware/auth');
const { getIO } = require('../socket');

const URGENCY_SCORE = { urgent: 4, today: 3, week: 2, flexible: 1 };
const URGENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function sortByUrgency(posts) {
  return posts.sort(
    (a, b) =>
      (URGENCY_SCORE[b.urgency] || 1) - (URGENCY_SCORE[a.urgency] || 1) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  );
}

// Filter that excludes expired urgent posts (urgency=urgent AND urgencyExpiresAt < now)
function withExpiryFilter(baseFilter) {
  return {
    ...baseFilter,
    $or: [
      { urgency: { $ne: 'urgent' } },
      { urgencyExpiresAt: { $gt: new Date() } },
    ],
  };
}

// Auto-close expired urgent posts in the background (fire-and-forget)
async function expireUrgentPosts() {
  try {
    await JobPost.updateMany(
      { urgency: 'urgent', status: 'open', urgencyExpiresAt: { $lte: new Date() } },
      { $set: { status: 'closed' } }
    );
  } catch {}
}

// ─── POST /api/posts ──────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ message: 'רק תושבים יכולים לפרסם עבודות' });
    }
    const { title, description, category, budget, images, urgency, location } = req.body;
    if (!title || !category) {
      return res.status(400).json({ message: 'כותרת וקטגוריה הם שדות חובה' });
    }

    const resolvedUrgency = urgency || 'flexible';
    const urgencyExpiresAt =
      resolvedUrgency === 'urgent' ? new Date(Date.now() + URGENT_TTL_MS) : null;

    const post = await JobPost.create({
      resident: req.user.id,
      title,
      description: description || '',
      category,
      budget: budget != null ? Number(budget) : null,
      images: images || [],
      urgency: resolvedUrgency,
      location: location || 'תל אביב',
      urgencyExpiresAt,
    });
    await post.populate('resident', 'name avatar');

    // Real-time: notify all connected workers about the new post
    try {
      const io = getIO();
      if (io) {
        io.emit('new_post', {
          post: {
            _id:      post._id,
            title:    post.title,
            category: post.category,
            location: post.location,
            urgency:  post.urgency,
            budget:   post.budget,
          },
        });
      }
    } catch {}

    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/posts/recommended ───────────────────────────────────────────────
// Smart matching: open + non-expired posts tailored to worker's city + categories
// Priority: city match AND category match → city only → category only → all open
router.get('/recommended', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'בעלי מקצוע בלבד' });
    }

    expireUrgentPosts(); // background cleanup

    const worker = await Worker.findOne({ user: req.user._id });
    const baseFilter = { status: 'open' };

    const cityPattern  = worker?.city
      ? new RegExp(worker.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;
    const workerCats   = worker?.categories?.length ? worker.categories : null;

    // Build match stages from broad → narrow
    const filters = [
      // 1. Best: same city AND same category
      ...(cityPattern && workerCats
        ? [{ ...baseFilter, location: cityPattern, category: { $in: workerCats } }]
        : []),
      // 2. Same category any city
      ...(workerCats
        ? [{ ...baseFilter, category: { $in: workerCats } }]
        : []),
      // 3. Same city any category
      ...(cityPattern
        ? [{ ...baseFilter, location: cityPattern }]
        : []),
      // 4. Fallback: all open
      baseFilter,
    ];

    let posts = [];
    let isPersonalized = false;

    for (const filter of filters) {
      const query = withExpiryFilter(filter);
      const found = await JobPost.find(query)
        .populate('resident', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(30);

      if (found.length >= 3) {
        posts = found;
        isPersonalized = filter !== baseFilter;
        break;
      }
      // collect partial results and keep going
      if (found.length > 0 && posts.length === 0) posts = found;
    }

    res.json({ posts: sortByUrgency(posts), total: posts.length, isPersonalized });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/posts/mine ──────────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const posts = await JobPost.find({ resident: req.user.id })
      .populate('resident', 'name avatar')
      .populate('acceptedBy', 'name avatar phone')
      .sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/posts ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    expireUrgentPosts(); // background cleanup

    const { category, status = 'open', page = 1, limit = 20 } = req.query;
    const baseFilter = { status };
    if (category) baseFilter.category = category;

    const filter = status === 'open' ? withExpiryFilter(baseFilter) : baseFilter;

    const [posts, total] = await Promise.all([
      JobPost.find(filter)
        .populate('resident', 'name avatar')
        .populate('acceptedBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      JobPost.countDocuments(filter),
    ]);

    res.json({ posts: sortByUrgency(posts), total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const Quote = require('../models/Quote');
    const [post, quoteCount] = await Promise.all([
      JobPost.findById(req.params.id)
        .populate('resident', 'name avatar phone')
        .populate('acceptedBy', 'name avatar'),
      Quote.countDocuments({ jobPost: req.params.id, status: { $in: ['pending', 'accepted'] } }),
    ]);
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });

    // Return time remaining if urgent
    const urgencyRemainingMs =
      post.urgency === 'urgent' && post.urgencyExpiresAt
        ? Math.max(0, new Date(post.urgencyExpiresAt).getTime() - Date.now())
        : null;

    res.json({ post, quoteCount, urgencyRemainingMs });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── POST /api/posts/:id/accept ───────────────────────────────────────────────
router.post('/:id/accept', auth, async (req, res) => {
  try {
    if (req.user.role !== 'worker') {
      return res.status(403).json({ message: 'רק בעלי מקצוע יכולים לקבל עבודות' });
    }
    const post = await JobPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });
    if (post.status !== 'open') {
      return res.status(400).json({ message: 'הפוסט כבר לא פתוח לקבלה' });
    }
    post.status = 'accepted';
    post.acceptedBy = req.user.id;
    await post.save();
    await post.populate([
      { path: 'resident',   select: 'name avatar phone' },
      { path: 'acceptedBy', select: 'name avatar' },
    ]);

    const Booking = require('../models/Booking');
    const existing = await Booking.findOne({ jobPost: post._id });
    if (!existing) {
      await Booking.create({
        resident: post.resident._id,
        worker: req.user.id,
        category: post.category,
        description: post.title,
        status: 'accepted',
        price: post.budget ?? null,
      });
    }
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// ─── POST /api/posts/:id/close ────────────────────────────────────────────────
router.post('/:id/close', auth, async (req, res) => {
  try {
    const post = await JobPost.findOne({ _id: req.params.id, resident: req.user._id });
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });
    post.status = 'closed';
    await post.save();
    await post.populate('resident', 'name avatar phone');
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

module.exports = router;
