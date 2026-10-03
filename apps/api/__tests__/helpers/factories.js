const bcrypt = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../../src/models/User');
const Worker  = require('../../src/models/Worker');
const Booking = require('../../src/models/Booking');
const JobPost = require('../../src/models/JobPost');
const Quote   = require('../../src/models/Quote');
const Conversation = require('../../src/models/Conversation');
const Message      = require('../../src/models/Message');

const DEFAULT_PASSWORD = 'test1234';

function uniqueEmail() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
}

async function createUser(overrides = {}) {
  const hash = await bcrypt.hash(overrides.password || DEFAULT_PASSWORD, 10);
  return User.create({
    name:  'Test User',
    email: uniqueEmail(),
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
  const { categories, city, rating, reviewCount, ...userOverrides } = overrides;
  const user = await createUser({ role: 'worker', ...userOverrides, ...(city ? { city } : {}) });
  const workerProfile = await Worker.create({
    user: user._id,
    categories: categories || ['plumber'],
    city: city || 'תל אביב',
    rating: rating ?? 4.5,
    reviewCount: reviewCount ?? 5,
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

async function createPost(residentId, overrides = {}) {
  return JobPost.create({
    resident: residentId,
    title: 'נזילה במטבח',
    description: 'נזילה מתחת לכיור',
    category: 'plumber',
    status: 'open',
    urgency: 'flexible',
    location: 'תל אביב',
    ...overrides,
  });
}

async function createQuote(jobPostId, workerProfileId, overrides = {}) {
  return Quote.create({
    jobPost: jobPostId,
    worker:  workerProfileId,
    proposedPrice: 300,
    message: '',
    status: 'pending',
    ...overrides,
  });
}

async function createConversation(participantIds, overrides = {}) {
  return Conversation.create({
    participants: participantIds,
    ...overrides,
  });
}

async function createMessage(conversationId, senderId, overrides = {}) {
  return Message.create({
    conversation: conversationId,
    sender: senderId,
    text: 'שלום',
    readBy: [senderId],
    ...overrides,
  });
}

/** Sign a JWT the auth middleware will accept for this user. */
function tokenFor(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET);
}

module.exports = {
  createUser,
  createResident,
  createWorkerUser,
  createBooking,
  createPost,
  createQuote,
  createConversation,
  createMessage,
  tokenFor,
  DEFAULT_PASSWORD,
};
