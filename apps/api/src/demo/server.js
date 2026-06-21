// Demo server - runs the full API with an in-memory MongoDB.
// No .env file or external database needed.
// Usage: npm run demo (from the repo root)

require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http     = require('http');
const os       = require('os');

const app            = require('../app');
const { initSocket } = require('../socket');

const User         = require('../models/User');
const Worker       = require('../models/Worker');
const Booking      = require('../models/Booking');
const Review       = require('../models/Review');
const JobPost      = require('../models/JobPost');
const Quote        = require('../models/Quote');
const Conversation = require('../models/Conversation');

const seedData = require('./seed');

const PORT = process.env.PORT || 4000;

function getLanIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

async function seed() {
  await User.insertMany(seedData.users);
  await Worker.insertMany(seedData.workers);
  await Booking.insertMany(seedData.bookings);
  await Review.insertMany(seedData.reviews);
  await JobPost.insertMany(seedData.posts);
  await Quote.insertMany(seedData.quotes);

  console.log('  Users    :', seedData.users.length);
  console.log('  Workers  :', seedData.workers.length);
  console.log('  Bookings :', seedData.bookings.length);
  console.log('  Posts    :', seedData.posts.length);
  console.log('  Quotes   :', seedData.quotes.length);
}

async function start() {
  // Force a JWT secret for demo mode if not set
  if (!process.env.JWT_ACCESS_SECRET) {
    process.env.JWT_ACCESS_SECRET = 'handil-demo-secret-do-not-use-in-production';
  }

  console.log('\n--- Handil DEMO MODE ---');
  console.log('Starting in-memory MongoDB...');

  const mongod = await MongoMemoryServer.create();
  const uri    = mongod.getUri();

  await mongoose.connect(uri);
  console.log('MongoDB (in-memory) connected');

  console.log('Seeding demo data...');
  await seed();
  console.log('Demo data ready\n');

  console.log('Demo accounts (password for all: demo1234)');
  console.log('  Resident : dana@demo.com');
  console.log('  Resident : yossi@demo.com');
  console.log('  Worker   : moshe@demo.com  (אינסטלטור, 4.8★)');
  console.log('  Worker   : avi@demo.com    (חשמלאי, 4.6★)');
  console.log('  Worker   : roni@demo.com   (נגר, 4.9★)');
  console.log('  Worker   : sami@demo.com   (צבעי, 4.4★)');
  console.log('  Worker   : george@demo.com (מנעולן, 4.7★)');

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is still in use. Wait a few seconds and try again.\n`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    const lanIPs = getLanIPs();
    console.log(`\nAPI ready at http://localhost:${PORT}`);
    if (lanIPs.length) {
      console.log(`LAN        at http://${lanIPs[0].address}:${PORT}`);
      console.log(`\nFor mobile, set in apps/mobile/.env:`);
      console.log(`  EXPO_PUBLIC_API_BASE_URL=http://${lanIPs[0].address}:${PORT}/api`);
    }
    console.log('\nPress Ctrl+C to stop\n');
  });

  async function shutdown(signal) {
    console.log(`\n${signal} - shutting down`);
    httpServer.close(async () => {
      await mongoose.disconnect();
      await mongod.stop();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start demo server:', err.message);
  process.exit(1);
});
