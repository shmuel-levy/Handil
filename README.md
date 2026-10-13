# Handil — מחברים בעלי מקצוע עם דיירים בתל אביב

Handil is a **Hebrew-first marketplace** connecting Tel Aviv residents with local service professionals. Residents post a job, workers send price quotes, the resident picks one — and the two sides get a booking, live chat and a review at the end. One Expo codebase runs on iOS, Android and the web, fully right-to-left.

---

## Why Handil beats Midrag

| Feature | Midrag | Handil |
|---|---|---|
| Real booking | ✗ (lead gen only) | ✓ |
| Competing quotes on a job | ✗ | ✓ (sorted by price / rating) |
| In-app chat | ✗ | ✓ (real-time, Socket.io) |
| In-app booking status | ✗ | ✓ (accept / reject / complete) |
| Urgency selector | ✗ | ✓ (4 levels, urgent posts expire in 24h) |
| RTL-native UI | Partial | ✓ Full RTL |
| Phone kept private until you hire | ✗ | ✓ |
| Architecture | Old (2003) | Modern monorepo |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile + web | React Native 0.81 (Expo SDK 54) + TypeScript |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| State | Zustand 5 + AsyncStorage (persistent auth) |
| API client | Axios with JWT interceptor (auto sign-out on expired token) |
| Real-time | Socket.io 4 |
| Backend | Node.js 20 + Express 5 |
| Database | MongoDB + Mongoose 9 |
| Validation | zod schemas shared by API and app (`@handil/shared`) |
| Security | helmet, CORS allow-list, rate limiting, bcrypt, JWT (30 days) |

---

## Repository Structure

```
Handil/
├── apps/
│   ├── api/                       # Express REST + Socket.io API
│   │   ├── Dockerfile             # build from the REPO ROOT (see Deployment)
│   │   ├── scripts/               # seed data, index migration
│   │   ├── __tests__/             # Jest: routes, middleware, socket, integration
│   │   └── src/
│   │       ├── app.js             # Express app, security middleware, routes
│   │       ├── server.js          # config check, DB connect, graceful shutdown
│   │       ├── config.js          # fail-fast env validation
│   │       ├── socket.js          # Socket.io auth, chat, notifications
│   │       ├── models/            # User, Worker, JobPost, Quote, Booking,
│   │       │                      # Review, Conversation, Message
│   │       ├── routes/            # auth, workers, posts, quotes, bookings,
│   │       │                      # reviews, chat, categories
│   │       ├── services/          # deleteAccount
│   │       ├── middleware/        # auth, validate, rateLimit, objectIdParam
│   │       └── demo/              # in-memory demo server with seed data
│   │
│   └── mobile/                    # Expo app (iOS / Android / web)
│       ├── scripts/               # release URL guard, bundle verification
│       └── src/
│           ├── app/               # AppRoot: auth gate, socket lifecycle
│           ├── navigation/        # tabs + stacks per area
│           ├── screens/           # auth, home, workers, posts, bookings,
│           │                      # chat, profile, info
│           ├── components/        # common UI + construction "job site" theme
│           ├── services/          # API + socket clients
│           ├── store/             # auth + notification stores
│           └── constants/         # colors, theme, categories
│
├── packages/
│   └── shared/                    # @handil/shared — categories, enums, limits,
│                                  # zod request schemas (used by both apps)
└── docs/                          # ROADMAP, TEST_PLAN, DEPLOYMENT
```

---

## How a job flows

```
resident posts a job ──► workers see it live (new_post) and send quotes
                                         │
resident compares quotes ◄───────────────┘   (new_quote, live)
        │
        └─► accepts one ──► post: accepted · other quotes: rejected
                           booking created at the quoted price
                           worker notified (quote_accepted) and now sees
                           the resident's phone number
                                         │
worker marks the booking completed ──────┘
        │
        └─► resident leaves a 1–5 star review ──► worker rating recalculated
```

A worker can never take a job without the resident accepting their quote. Booking statuses: `pending → accepted → completed`, or `rejected` / `cancelled`; finished bookings are final.

---

## API Endpoints

All routes are under `/api`. ✓ = requires `Authorization: Bearer <token>`.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create account (`resident` \| `worker`) |
| POST | `/login` | — | Returns a JWT |
| GET | `/me` | ✓ | Own user |
| PUT | `/me` | ✓ | Update name, phone, city, avatar, preferred categories |
| DELETE | `/me` | ✓ | **Delete account permanently** (body: `{ password }`) |

### Job posts — `/api/posts`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✓ resident | Create a job post |
| GET | `/` | ✓ | Open posts (`?category=&page=&limit=`) |
| GET | `/recommended` | ✓ worker | Posts matched to the worker's city and trades |
| GET | `/mine` | ✓ resident | Own posts with pending-quote counts |
| GET | `/:id` | ✓ | One post. The resident's phone is included only for the resident and the hired worker |
| POST | `/:id/close` | ✓ owner | Close a post |

### Quotes — `/api/quotes`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✓ worker | Submit a quote (one per worker per post) |
| GET | `/job/:jobId` | ✓ owner | All quotes on my post, cheapest first |
| GET | `/check/:jobId` | ✓ worker | Have I already quoted this post? |
| GET | `/my` | ✓ worker | My quotes (resident phone included on accepted ones) |
| PATCH | `/:id/accept` | ✓ owner | Accept → booking created, other quotes rejected |
| PATCH | `/:id/reject` | ✓ owner | Reject a pending quote |

### Workers — `/api/workers`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Directory (`?category=&city=&q=&page=`) |
| GET | `/:id` | — | Profile + reviews + reliability stats |
| GET / PUT | `/me` | ✓ worker | Own profile |
| PATCH | `/me/available` | ✓ worker | "Available now" toggle |
| POST | `/me/verify` | ✓ worker | Self-declared badge (does not grant `isVerified`) |
| POST / DELETE | `/me/portfolio[/:itemId]` | ✓ worker | Portfolio items |

### Bookings, reviews, chat, categories
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bookings` | ✓ resident | Book a worker directly from their profile |
| GET | `/bookings[/:id]` | ✓ | My bookings / one booking |
| PATCH | `/bookings/:id/status` | ✓ | Worker: accept / reject / complete · resident: cancel |
| POST | `/reviews` | ✓ resident | Review a completed booking |
| GET | `/reviews/worker/:userId` | — | A worker's reviews |
| POST / GET | `/chat/conversations` | ✓ | Start or list conversations |
| GET / POST | `/chat/conversations/:id/messages` | ✓ participant | History / send (REST fallback) |
| GET | `/chat/unread` | ✓ | Total unread messages |
| GET | `/categories` | — | The 12 service categories |
| GET | `/health` | — | Health check (not rate limited) |

### Socket.io events
Connect with `auth: { token }`. Server → client: `new_post`, `new_quote`, `quote_accepted`, `quote_rejected`, `booking_updated`, `new_message`, `conversation_updated`, `messages_read`. Client → server: `join_conversation`, `leave_conversation`, `send_message` (with ack), `mark_read`.

Malformed ids return `404`; unexpected failures return `500 { message: "שגיאת שרת" }` and are logged server-side, never echoed to the client.

---

## Service Categories (12)

אינסטלטור · חשמלאי · נגר · צבעי · מנעולן · ניקיון · מזגנים · הובלות · גינון · ריצוף · מסגרות · תיקון מכשירים

---

## Running locally

**Prerequisites:** Node.js 20+, MongoDB (local or Atlas), Expo Go on your phone.

```bash
npm install                                  # from the repo root — installs every workspace
cp apps/api/.env.example apps/api/.env       # then set JWT_ACCESS_SECRET (16+ chars)

npm run dev        # API on http://localhost:4000 (prints your LAN URL)
npm run mobile     # Expo — scan the QR code with Expo Go
npm run web        # web app on http://localhost:8082
npm run dev:all    # API + web together
```

No MongoDB? `npm run demo:all` runs the API on an in-memory database with seed data, plus the web app.

The phone app auto-detects your computer's address from Expo. If that fails, set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000/api` in `apps/mobile/.env`.

### Useful commands

| Command | What it does |
|---|---|
| `npm test` | API test suite (in-memory MongoDB, no setup needed) |
| `npm run typecheck` | TypeScript check of the app |
| `npm run build` | Production web build → `apps/mobile/dist` (needs `EXPO_PUBLIC_API_BASE_URL`) |
| `npm start` | Start the API without nodemon |
| `npm run db:sync-indexes --workspace=api` | Align MongoDB indexes with the schemas (run once on existing databases) |
| `npm run check:config --workspace=api` | Validate the API's environment variables |

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full checklist: MongoDB Atlas, the API Docker image, environment variables, the web build, and iOS/Android builds with EAS.

---

## Environment Variables

### `apps/api/.env`
| Variable | Required | Notes |
|---|---|---|
| `JWT_ACCESS_SECRET` | ✓ | 16+ random characters. The server refuses to start without it |
| `MONGO_URI` | ✓ in production | e.g. a MongoDB Atlas connection string |
| `PORT` | | default `4000` |
| `NODE_ENV` | | `production` when deployed |
| `ALLOWED_ORIGINS` | if you deploy the web app | comma-separated web origins allowed by CORS and Socket.io. Unset = every origin allowed (a warning is logged in production) |
| `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_WRITE_MAX` / `RATE_LIMIT_GLOBAL_MAX` | | override the defaults (10 / 15 min, 30 / min, 300 / min) |

### `apps/mobile`
| Variable | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `.env` (dev, optional) · `eas.json` / `.env.production` (release, **required**) | Must be `https://…/api` for release builds. Builds stop if it is missing, a placeholder, or localhost |

---

## RTL / Hebrew Notes

- `I18nManager.forceRTL(true)` is called in `index.ts` on native; the web sets `dir="rtl"` on `<html>`. Restart Expo after the first install
- Inputs use `textAlign: "right"`; layout uses `marginStart` / `marginEnd` where direction matters
- Back arrows use `arrow-forward` (points right, correct for RTL)
- API error messages are Hebrew and are part of the API contract

---

## Git Workflow

| Branch | Purpose |
|---|---|
| `main` | Production-ready |
| `dev` | Integration |
| `feature/*` | Individual features |

Commit style: `feat:` / `fix:` / `chore:` / `refactor:` / `test:`. CI runs the API tests, the app type check, `expo-doctor`, a production web build, and builds and boots the API Docker image.

---

## Roadmap

Phase 1 (core marketplace) is done. See **[docs/ROADMAP.md](docs/ROADMAP.md)** for what's next: push notifications, image storage off the database, payments with escrow, instant booking, AI quote comparison, multilingual UI.
