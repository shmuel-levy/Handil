const express  = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User    = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { getIO } = require('../socket');
const { schemas, WORKER_BOOKING_STATUSES, RESIDENT_BOOKING_STATUSES } = require('@handil/shared');

const FINAL_BOOKING_STATUSES = ['completed', 'rejected', 'cancelled'];

const router = express.Router();

// POST /api/bookings
router.post('/', authMiddleware, validate(schemas.createBookingSchema), async (req, res) => {
  try {
    if (req.user.role !== 'resident') return res.status(403).json({ message: 'דיירים בלבד' });
    const { workerUserId, category, description, scheduledDate } = req.body;

    // Without this a booking could be addressed to any id at all — another
    // resident, or a user that does not exist — and would sit pending forever.
    if (!mongoose.isValidObjectId(workerUserId)) {
      return res.status(400).json({ message: 'מזהה בעל מקצוע לא תקין' });
    }
    const workerUser = await User.findById(workerUserId).select('role');
    if (!workerUser || workerUser.role !== 'worker') {
      return res.status(404).json({ message: 'בעל מקצוע לא נמצא' });
    }

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
router.patch('/:id/status', authMiddleware, validate(schemas.updateBookingStatusSchema), async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'הזמנה לא נמצאה' });

    const isWorker = booking.worker.toString() === req.user._id.toString();
    const isResident = booking.resident.toString() === req.user._id.toString();

    if (!isWorker && !isResident) return res.status(403).json({ message: 'אין גישה' });

    // Finished bookings are final. Otherwise a worker could "complete" a job the
    // resident had cancelled — which would then unlock a review for it.
    if (FINAL_BOOKING_STATUSES.includes(booking.status)) {
      return res.status(400).json({ message: 'לא ניתן לשנות הזמנה שהסתיימה' });
    }

    const workerStatuses = WORKER_BOOKING_STATUSES;
    const residentStatuses = RESIDENT_BOOKING_STATUSES;

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
