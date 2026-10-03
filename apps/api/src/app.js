const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const { globalLimiter, authLimiter, writeMutations } = require('./middleware/rateLimit');

const authRoutes     = require('./routes/auth');
const workerRoutes   = require('./routes/workers');
const bookingRoutes  = require('./routes/bookings');
const reviewRoutes   = require('./routes/reviews');
const categoryRoutes = require('./routes/categories');
const postRoutes     = require('./routes/posts');
const quoteRoutes    = require('./routes/quotes');
const chatRoutes     = require('./routes/chat');

const app = express();

// Behind a proxy (Render/Railway/nginx) req.ip must come from X-Forwarded-For,
// otherwise every request looks like it came from the proxy and rate limiting
// would throttle all users as one.
app.set('trust proxy', 1);

// Security headers. The API serves JSON only — no inline scripts to allow, so
// CSP stays on with its restrictive defaults. crossOriginResourcePolicy is
// relaxed because the Expo web client is served from a different origin.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

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

// Request logger — muted under test so Jest output stays readable
if (process.env.NODE_ENV !== 'test') {
  app.use((req, _res, next) => {
    const ts = new Date().toTimeString().slice(0, 8);
    const body = req.body && Object.keys(req.body).length
      ? ' ' + JSON.stringify(req.body).slice(0, 120)
      : '';
    console.log(`📨 [${ts}] ${req.method} ${req.path}${body}`);
    next();
  });
}

// Health check stays outside the rate limiter so uptime probes never trip it.
app.get('/',          (_req, res) => res.status(200).json({ service: 'handil-api', hint: 'GET /api/health' }));
app.get('/api/health',(_req, res) => res.status(200).json({ status: 'ok', service: 'handil-api' }));

app.use('/api', globalLimiter);

// Brute-force protection on the credential endpoints specifically.
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth',       authRoutes);
app.use('/api/workers',    workerRoutes);
app.use('/api/bookings',   writeMutations, bookingRoutes);
app.use('/api/reviews',    writeMutations, reviewRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/posts',      writeMutations, postRoutes);
app.use('/api/quotes',     writeMutations, quoteRoutes);
app.use('/api/chat',       writeMutations, chatRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

module.exports = app;
