const bcrypt = require('bcryptjs');
const User    = require('../../src/models/User');
const Worker  = require('../../src/models/Worker');
const Booking = require('../../src/models/Booking');

const DEFAULT_PASSWORD = 'test1234';

async function createUser(overrides = {}) {
  const hash = await bcrypt.hash(overrides.password || DEFAULT_PASSWORD, 10);
  return User.create({
    name:  'Test User',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: hash,
    role: 'resident',
    phone: '050-0000000',
    ...overrides,
    // always store the hash, not the plain text
    password: hash,
  });
}

async function createResident(overrides = {}) {
  return createUser({ role: 'resident', ...overrides });
}

async function createWorkerUser(overrides = {}) {
  const user = await createUser({ role: 'worker', ...overrides });
  const workerProfile = await Worker.create({
    user: user._id,
    categories: overrides.categories || ['plumber'],
    city: overrides.city || 'תל אביב',
    rating: overrides.rating || 4.5,
    reviewCount: overrides.reviewCount || 5,
    isAvailable: true,
  });
  return { user, workerProfile };
}

async function createBooking(residentId, workerUserId, overrides = {}) {
  return Booking.create({
    resident: residentId,
    worker:   workerUserId,
    category: 'plumber',
    description: 'Test booking',
    status: 'pending',
    ...overrides,
  });
}

module.exports = { createResident, createWorkerUser, createBooking, DEFAULT_PASSWORD };
