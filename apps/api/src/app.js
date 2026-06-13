const express = require('express');
const cors    = require('cors');

const authRoutes     = require('./routes/auth');
const workerRoutes   = require('./routes/workers');
const bookingRoutes  = require('./routes/bookings');
const reviewRoutes   = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const postRoutes     = require('./routes/posts');
const quoteRoutes    = require('./routes/quotes');
const chatRoutes     = require('./routes/chat');

const app = express();

// CORS: restrict to explicit origins in production; allow all in dev.
// Set ALLOWED_ORIGINS=https://your-app.com,https://www.your-app.com in production .env
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : undefined;

app.use(cors({
  origin: allowedOrigins ?? true,
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Request logger
app.use((req, _res, next) => {
  const ts = new Date().toTimeString().slice(0, 8);
  const body = req.body && Object.keys(req.body).length
    ? ' ' + JSON.stringify(req.body).slice(0, 120)
    : '';
  console.log(`📨 [${ts}] ${req.method} ${req.path}${body}`);
  next();
});

app.get('/',          (_req, res) => res.status(200).json({ service: 'handil-api', hint: 'GET /api/health' }));
app.get('/api/health',(_req, res) => res.status(200).json({ status: 'ok', service: 'handil-api' }));

app.use('/api/auth',       authRoutes);
app.use('/api/workers',    workerRoutes);
app.use('/api/bookings',   bookingRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/posts',      postRoutes);
app.use('/api/quotes',     quoteRoutes);
app.use('/api/chat',       chatRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

module.exports = app;
