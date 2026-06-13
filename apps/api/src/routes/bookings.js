const express = require('express');
const Booking = require('../models/Booking');
const authMiddleware = require('../middleware/auth');
const { getIO } = require('../socket');

const router = express.Router();

// POST /api/bookings
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'resident') return res.status(403).json({ message: 'דיירים בלבד' });
    const { workerUserId, category, description, scheduledDate } = req.body;
    if (!workerUserId || !category) return res.status(400).json({ message: 'שדות חובה חסרים' });

    const booking = await Booking.create({
      resident: req.user._id,
      worker: workerUserId,
      category,
      description: description || '',
      scheduledDate: scheduledDate || null,
    });

    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filter =
      req.user.role === 'resident'
        ? { resident: req.user._id }
        : { worker: req.user._id };

    const bookings = await Booking.find(filter)
      .populate('resident', 'name phone avatar')
      .populate('worker', 'name phone avatar')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/bookings/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('resident', 'name phone avatar')
      .populate('worker', 'name phone avatar');
    if (!booking) return res.status(404).json({ message: 'הזמנה לא נמצאה' });

    const owns =
      booking.resident._id.toString() === req.user._id.toString() ||
      booking.worker._id.toString() === req.user._id.toString();
    if (!owns) return res.status(403).json({ message: 'אין גישה' });

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/bookings/:id/status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'הזמנה לא נמצאה' });

    const isWorker = booking.worker.toString() === req.user._id.toString();
    const isResident = booking.resident.toString() === req.user._id.toString();

    if (!isWorker && !isResident) return res.status(403).json({ message: 'אין גישה' });

    const workerStatuses = ['accepted', 'rejected', 'completed'];
    const residentStatuses = ['cancelled'];

    if (isWorker && !workerStatuses.includes(status)) {
      return res.status(400).json({ message: 'סטטוס לא חוקי לעובד' });
    }
    if (isResident && !residentStatuses.includes(status)) {
      return res.status(400).json({ message: 'דיירים יכולים רק לבטל' });
    }

    booking.status = status;
    await booking.save();

    // Real-time: notify both resident and worker about status change
    try {
      const io = getIO();
      if (io) {
        const payload = {
          bookingId: booking._id.toString(),
          status,
        };
        io.to(`user:${booking.resident}`).emit('booking_updated', payload);
        io.to(`user:${booking.worker}`).emit('booking_updated', payload);
      }
    } catch {}

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
