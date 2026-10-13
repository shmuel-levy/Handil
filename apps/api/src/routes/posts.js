const router  = require('express').Router();
const JobPost = require('../models/JobPost');
const Worker  = require('../models/Worker');
const auth    = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getIO } = require('../socket');
const {
  schemas, URGENT_TTL_MS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
} = require('@handil/shared');
const { serverError } = require('../utils/serverError');
const { objectIdParam } = require('../middleware/objectIdParam');

router.param('id', objectIdParam('פוסט לא נמצא'));

const URGENCY_SCORE = { urgent: 4, today: 3, week: 2, flexible: 1 };

// Job posts can carry base64 images. They are never needed in a list view, so
// list endpoints exclude them — otherwise every feed refresh downloads every
// image on every post.
const LIST_EXCLUDE = '-images';

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
router.post('/', auth, validate(schemas.createPostSchema), async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ message: 'רק תושבים יכולים לפרסם עבודות' });
    }
    const { title, description, category, budget, images, urgency, location } = req.body;

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
    serverError(res, err);
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
        .select(LIST_EXCLUDE)
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
    serverError(res, err);
  }
});

// ─── GET /api/posts/mine ──────────────────────────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const posts = await JobPost.find({ resident: req.user.id })
      .select(LIST_EXCLUDE)
      .populate('resident', 'name avatar')
      .populate('acceptedBy', 'name avatar phone')
      .sort({ createdAt: -1 });

    // Attach pending quote count to each post (single aggregate, not N queries)
    const Quote = require('../models/Quote');
    const counts = await Quote.aggregate([
      { $match: { jobPost: { $in: posts.map((p) => p._id) }, status: 'pending' } },
      { $group: { _id: '$jobPost', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    const postsWithCounts = posts.map((post) => ({
      ...post.toObject(),
      pendingQuoteCount: countMap[post._id.toString()] ?? 0,
    }));

    res.json({ posts: postsWithCounts });
  } catch (err) {
    serverError(res, err);
  }
});

// ─── GET /api/posts ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    expireUrgentPosts(); // background cleanup

    const { category, status = 'open' } = req.query;
    // Clamp so a client cannot ask for the whole collection in one request
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit) || DEFAULT_PAGE_SIZE));

    const baseFilter = { status };
    if (category) baseFilter.category = category;

    const filter = status === 'open' ? withExpiryFilter(baseFilter) : baseFilter;

    const [posts, total] = await Promise.all([
      JobPost.find(filter)
        .select(LIST_EXCLUDE)
        .populate('resident', 'name avatar')
        .populate('acceptedBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      JobPost.countDocuments(filter),
    ]);

    res.json({ posts: sortByUrgency(posts), total, page: Number(page) });
  } catch (err) {
    serverError(res, err);
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

    // The resident's phone is private until they approve a worker: only the
    // resident and the worker they accepted may see it. Every other signed-in
    // user browsing the feed used to receive it here.
    const viewerId    = req.user._id.toString();
    const isOwner     = post.resident?._id?.toString() === viewerId;
    const isHiredWorker = post.acceptedBy?._id?.toString() === viewerId;
    if (post.resident && !isOwner && !isHiredWorker) {
      post.resident.phone = undefined;
    }

    // Return time remaining if urgent
    const urgencyRemainingMs =
      post.urgency === 'urgent' && post.urgencyExpiresAt
        ? Math.max(0, new Date(post.urgencyExpiresAt).getTime() - Date.now())
        : null;

    res.json({ post, quoteCount, urgencyRemainingMs });
  } catch (err) {
    serverError(res, err);
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
    serverError(res, err);
  }
});

module.exports = router;
