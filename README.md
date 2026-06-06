# Handil — מחברים בעלי מקצוע עם דיירים בתל אביב

Handil is a **Hebrew-first mobile marketplace** connecting new residents in Tel Aviv with trusted local service professionals. Built to be better than Midrag — with real booking, verified profiles, RTL-native UX, and a modern stack.

---

## Why Handil beats Midrag

| Feature | Midrag | Handil |
|---|---|---|
| Real booking | ✗ (lead gen only) | ✓ |
| In-app booking status | ✗ | ✓ (accept/reject/complete) |
| Urgency selector | ✗ | ✓ (4 options) |
| RTL-native UI | Partial | ✓ Full RTL |
| Phone call from app | ✗ | ✓ |
| Worker availability badge | ✗ | ✓ |
| Verified worker badge | ✗ | ✓ |
| Crashes? | Frequent | Stable (Expo SDK 54) |
| Architecture | Old (2003) | Modern monorepo |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo SDK 54) + TypeScript |
| Navigation | React Navigation v7 (native stack + bottom tabs) |
| State | Zustand + AsyncStorage (persistent auth) |
| API client | Axios with JWT interceptor |
| Backend | Node.js + Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (30-day tokens, bcryptjs) |

---

## Repository Structure

```
Handil/
├── apps/
│   ├── api/                     # Express REST API
│   │   └── src/
│   │       ├── app.js           # Express app, all routes wired
│   │       ├── server.js        # DB connect + server start
│   │       ├── models/          # Mongoose schemas
│   │       │   ├── User.js
│   │       │   ├── Worker.js
│   │       │   ├── Booking.js
│   │       │   └── Review.js
│   │       ├── routes/          # Route handlers
│   │       │   ├── auth.js      # register, login, me
│   │       │   ├── workers.js   # list, search, get, update profile
│   │       │   ├── bookings.js  # create, list, update status
│   │       │   ├── reviews.js   # create, list by worker
│   │       │   └── categories.js
│   │       ├── middleware/
│   │       │   └── auth.js      # JWT verify middleware
│   │       └── data/
│   │           └── categories.js  # 12 service categories (Hebrew)
│   │
│   └── mobile/                  # Expo React Native app
│       └── src/
│           ├── app/
│           │   └── AppRoot.tsx  # GestureHandler root
│           ├── navigation/
│           │   ├── RootNavigator.tsx   # Auth gate
│           │   ├── AuthNavigator.tsx   # Login/Register
│           │   ├── MainNavigator.tsx   # Bottom tabs
│           │   ├── HomeStack.tsx
│           │   ├── SearchStack.tsx
│           │   ├── BookingsStack.tsx
│           │   └── types.ts
│           ├── screens/
│           │   ├── auth/        LoginScreen, RegisterScreen
│           │   ├── home/        HomeScreen
│           │   ├── workers/     WorkerListScreen, WorkerDetailScreen
│           │   ├── bookings/    BookingsScreen, BookingRequestScreen
│           │   └── profile/     ProfileScreen
│           ├── components/
│           │   ├── common/      Button, Input
│           │   └── workers/     WorkerCard, StarRating
│           ├── services/        authApi, workersApi, bookingsApi, apiClient
│           ├── store/           authStore (Zustand)
│           ├── types/           Shared TypeScript interfaces
│           └── constants/       colors, categories
│
└── packages/
    └── shared/                  # Placeholder — shared types (next phase)
```

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create account (role: resident \| worker) |
| POST | `/login` | — | Login, returns JWT |
| GET | `/me` | ✓ | Fetch own user |

### Workers — `/api/workers`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | List/search workers (`?category=&city=&q=&page=`) |
| GET | `/me` | ✓ worker | Own worker profile |
| PUT | `/me` | ✓ worker | Update profile (bio, categories, rate, etc.) |
| GET | `/:id` | — | Single worker + reviews |

### Bookings — `/api/bookings`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✓ resident | Create booking request |
| GET | `/` | ✓ | My bookings (filtered by role) |
| GET | `/:id` | ✓ | Single booking |
| PATCH | `/:id/status` | ✓ | Update status (worker: accept/reject/complete, resident: cancel) |

### Reviews — `/api/reviews`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✓ resident | Leave review (only for completed bookings) |
| GET | `/worker/:userId` | — | All reviews for a worker |

### Categories — `/api/categories`
| Method | Path | Description |
|---|---|---|
| GET | `/` | All 12 service categories |

---

## Booking Status Lifecycle

```
pending → accepted → completed
       ↘ rejected
       (resident can cancel at any point while pending)
```

---

## Service Categories (12)

אינסטלטור · חשמלאי · נגר · צבעי · מנעולן · ניקיון · מזגנים · הובלות · גינון · ריצוף · מסגרות · תיקון מכשירים

---

## Running the Project

### Prerequisites
- Node.js 20+
- MongoDB running locally (or set `MONGO_URI` to Atlas)
- Expo Go app on your phone

### 1. Install dependencies
```bash
# From repo root
npm install
```

### 2. Start the API
```bash
# Copy and fill in secrets
cp apps/api/.env.example apps/api/.env

npm run dev
# API running at http://localhost:4000
# Health check: GET http://localhost:4000/api/health
```

### 3. Start the mobile app
```bash
npm run mobile
# Scan the QR code with Expo Go on your phone
```

> The mobile app auto-detects the dev machine's IP from Expo Metro.  
> If it fails, set `EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:4000/api` in `apps/mobile/.env`.

---

## RTL / Hebrew Notes

- `I18nManager.forceRTL(true)` is called in `index.ts` — restart Expo after first install
- All inputs use `textAlign: "right"`
- Layout uses `marginStart`/`marginEnd` logical properties where RTL-sensitive
- Navigation back arrows use `arrow-forward` (points right → correct for Hebrew RTL)
- Hebrew error messages from the API

---

## Git Workflow

| Branch | Purpose |
|---|---|
| `main` | Production-ready |
| `dev` | Integration (current) |
| `feature/*` | Individual features |

Commit style: `feat:` / `fix:` / `chore:` / `refactor:`

---

## Roadmap — What's Next

These features are planned for upcoming sprints (Midrag doesn't have any of them):

### Phase 2 — Communication
- [ ] **In-app chat** — Worker ↔ resident messaging (Socket.io)
- [ ] **Push notifications** — Booking updates, new messages (Expo Notifications)

### Phase 3 — Payments
- [ ] **Stripe integration** — Online payment at booking or completion
- [ ] **Price quotes** — Workers send quotes, residents compare
- [ ] **Service packages** — Pre-priced bundles (e.g. "Full apartment clean ₪250")

### Phase 4 — Trust & Discovery
- [ ] **Photo portfolio** — Workers upload past work gallery
- [ ] **Background check badge** — Integration with verification service
- [ ] **AI smart match** — Suggest best worker by category + location + rating
- [ ] **Recurring bookings** — Monthly cleaning, quarterly maintenance

### Phase 5 — Olim Features
- [ ] **Multilingual** — English and Russian alongside Hebrew
- [ ] **New resident guide** — Curated checklist (internet, gas, etc.) with workers
- [ ] **Neighborhood trust** — Recommendations from neighbors in same building

---

## Environment Variables

### `apps/api/.env`
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/handil
JWT_ACCESS_SECRET=replace_with_long_random_secret
```

### `apps/mobile/.env` (optional)
```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.X:4000/api
```
