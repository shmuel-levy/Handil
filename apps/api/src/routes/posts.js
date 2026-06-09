const router = require('express').Router();
const JobPost = require('../models/JobPost');
const auth = require('../middleware/auth');

// Create post — residents only
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'resident') {
      return res.status(403).json({ message: 'רק תושבים יכולים לפרסם עבודות' });
    }
    const { title, description, category, budget, images, urgency, location } = req.body;
    if (!title || !category) {
      return res.status(400).json({ message: 'כותרת וקטגוריה הם שדות חובה' });
    }
    const post = await JobPost.create({
      resident: req.user.id,
      title,
      description: description || '',
      category,
      budget: budget != null ? Number(budget) : null,
      images: images || [],
      urgency: urgency || 'flexible',
      location: location || 'תל אביב',
    });
    await post.populate('resident', 'name avatar');
    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// Get open posts feed — authenticated users browse
router.get('/', auth, async (req, res) => {
  try {
    const { category, status = 'open', page = 1, limit = 20 } = req.query;
    const filter = { status };
    if (category) filter.category = category;

    const [posts, total] = await Promise.all([
      JobPost.find(filter)
        .populate('resident', 'name avatar')
        .populate('acceptedBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      JobPost.countDocuments(filter),
    ]);
    res.json({ posts, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// Resident's own posts — must come before /:id
router.get('/mine', auth, async (req, res) => {
  try {
    const posts = await JobPost.find({ resident: req.user.id })
      .populate('acceptedBy', 'name avatar phone')
      .sort({ createdAt: -1 });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// Single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await JobPost.findById(req.params.id)
      .populate('resident', 'name avatar phone')
      .populate('acceptedBy', 'name avatar');
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

// Worker accepts a job
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
      { path: 'resident', select: 'name avatar phone' },
      { path: 'acceptedBy', select: 'name avatar' },
    ]);

    // Auto-create a booking so it appears in the worker's Bookings tab
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

// Resident closes their own post
router.post('/:id/close', auth, async (req, res) => {
  try {
    const post = await JobPost.findOne({ _id: req.params.id, resident: req.user.id });
    if (!post) return res.status(404).json({ message: 'פוסט לא נמצא' });
    post.status = 'closed';
    await post.save();
    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: 'שגיאת שרת' });
  }
});

module.exports = router;
