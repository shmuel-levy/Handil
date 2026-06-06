const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const bookingRoutes = require('./routes/bookings');
const reviewRoutes = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const postRoutes = require('./routes/posts');

const app = express();

app.use(cors());
app.use(express.json());

// Root — friendly response for browsers hitting localhost:4000
app.get('/', (_req, res) => {
  res.status(200).json({ service: 'handil-api', hint: 'GET /api/health' });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'handil-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/posts', postRoutes);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
