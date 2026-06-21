# Handil - Test Plan

## Overview

There are currently zero tests in the codebase. This document defines the full testing strategy - what to test, how to test it, which tools to use, and in what order to introduce tests as the project grows.

The plan is organized by layer (API unit tests, API integration tests, mobile component tests, mobile E2E tests) and then by phase (current features first, then upcoming features from the roadmap).

---

## Tools and Setup

### API (apps/api)

| Purpose | Tool |
|---|---|
| Test runner | Jest |
| HTTP integration tests | Supertest |
| MongoDB in-memory server | `mongodb-memory-server` |
| Mocking | Jest built-in (`jest.fn`, `jest.mock`) |

Install:

```bash
cd apps/api
npm install --save-dev jest supertest mongodb-memory-server
```

Add to `apps/api/package.json`:

```json
"scripts": {
  "test": "jest --runInBand",
  "test:watch": "jest --watch"
},
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/__tests__/**/*.test.js"]
}
```

### Mobile (apps/mobile)

| Purpose | Tool |
|---|---|
| Test runner | Jest (bundled with Expo) |
| Component tests | React Native Testing Library (`@testing-library/react-native`) |
| Mocking navigation | `@react-navigation/testing-library` or manual mock |
| E2E (future) | Detox (native) or Maestro (cross-platform, simpler setup) |

Install:

```bash
cd apps/mobile
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

Add `jest` config to `apps/mobile/package.json`:

```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ]
}
```

---

## Test File Structure

```
apps/api/
  __tests__/
    unit/
      middleware/
        auth.test.js
      routes/
        auth.test.js
        bookings.test.js
        quotes.test.js
        posts.test.js
        reviews.test.js
        chat.test.js
        workers.test.js
        categories.test.js
    integration/
      auth.integration.test.js
      bookings.integration.test.js
      quotes.integration.test.js
      posts.integration.test.js
    helpers/
      db.js          - in-memory MongoDB setup/teardown
      factories.js   - user, worker, booking, post, quote factory functions

apps/mobile/
  __tests__/
    components/
      Button.test.tsx
      Input.test.tsx
      WorkerCard.test.tsx
      StarRating.test.tsx
    screens/
      LoginScreen.test.tsx
      RegisterScreen.test.tsx
      HomeScreen.test.tsx
      WorkerDetailScreen.test.tsx
      BookingRequestScreen.test.tsx
      ChatScreen.test.tsx
    store/
      authStore.test.ts
    services/
      apiClient.test.ts
```

---

## Phase 1 - API Unit Tests (Current Features)

### AUTH - `__tests__/unit/routes/auth.test.js`

**POST /api/auth/register**

| Test case | Expected result |
|---|---|
| Valid resident registration | 201, returns token and sanitized user (no password field) |
| Valid worker registration | 201, Worker document is also created |
| Missing required field (name) | 400, Hebrew error message |
| Missing required field (email) | 400 |
| Missing required field (password) | 400 |
| Missing required field (role) | 400 |
| Invalid role value (e.g. "admin") | 400 |
| Password shorter than 6 characters | 400 |
| Duplicate email | 409 |

**POST /api/auth/login**

| Test case | Expected result |
|---|---|
| Correct credentials | 200, returns token and user |
| Wrong password | 401 |
| Non-existent email | 401 |
| Missing email or password | 400 |

**GET /api/auth/me**

| Test case | Expected result |
|---|---|
| Valid JWT token | 200, returns user data |
| No token | 401 |
| Malformed token | 401 |
| Expired token | 401 |

**PUT /api/auth/me**

| Test case | Expected result |
|---|---|
| Update city | 200, city updated |
| Update name | 200, name updated |
| Update phone | 200, phone updated |
| No auth token | 401 |

---

### AUTH MIDDLEWARE - `__tests__/unit/middleware/auth.test.js`

| Test case | Expected result |
|---|---|
| Valid token - attaches `req.user` and calls `next()` | next() is called, req.user is populated |
| No Authorization header | 401 |
| Token with wrong signature | 401 |
| Expired token | 401 |
| User ID in token does not exist in DB | 401 |

---

### BOOKINGS - `__tests__/unit/routes/bookings.test.js`

**POST /api/bookings**

| Test case | Expected result |
|---|---|
| Resident creates booking | 201, booking created |
| Worker tries to create booking | 403 |
| Missing workerUserId | 400 |
| Missing category | 400 |
| No auth | 401 |

**GET /api/bookings**

| Test case | Expected result |
|---|---|
| Resident gets their own bookings | 200, only bookings where resident = user |
| Worker gets their own bookings | 200, only bookings where worker = user |
| No auth | 401 |

**GET /api/bookings/:id**

| Test case | Expected result |
|---|---|
| Resident fetches their own booking | 200 |
| Worker fetches their own booking | 200 |
| User fetches someone else's booking | 403 |
| Non-existent booking ID | 404 |

**PATCH /api/bookings/:id/status**

| Test case | Expected result |
|---|---|
| Worker sets status to "accepted" | 200 |
| Worker sets status to "rejected" | 200 |
| Worker sets status to "completed" | 200 |
| Worker tries to set status to "cancelled" | 400 |
| Resident sets status to "cancelled" | 200 |
| Resident tries to set status to "accepted" | 400 |
| Unrelated user tries to update status | 403 |
| Non-existent booking | 404 |
| Socket.io `booking_updated` event is emitted to both parties | verify `io.to().emit()` is called |

---

### QUOTES - `__tests__/unit/routes/quotes.test.js`

**POST /api/quotes**

| Test case | Expected result |
|---|---|
| Worker submits quote on an open post | 201, quote created |
| Resident tries to submit a quote | 403 |
| Missing jobPostId | 400 |
| Missing proposedPrice | 400 |
| Post does not exist | 404 |
| Post is not "open" (already accepted) | 400 |
| Worker submits a second quote on the same post | 409 |
| Socket.io `new_quote` event is emitted to the resident | verify `io.to().emit()` is called |

**GET /api/quotes/job/:jobId**

| Test case | Expected result |
|---|---|
| Resident fetches quotes for their own post | 200, quotes sorted by price ascending |
| Another user tries to fetch quotes | 403 |
| Non-existent post | 404 |

**GET /api/quotes/check/:jobId**

| Test case | Expected result |
|---|---|
| Worker who submitted a quote | 200, returns the quote |
| Worker who has not submitted | 200, returns `{ quote: null }` |
| Resident calls this endpoint | 200, returns `{ quote: null }` |

**GET /api/quotes/my**

| Test case | Expected result |
|---|---|
| Worker with submitted quotes | 200, returns their quotes |
| Worker with no quotes | 200, returns empty array |
| Resident calls this endpoint | 200, returns empty array |

**PATCH /api/quotes/:id/accept**

| Test case | Expected result |
|---|---|
| Resident accepts a pending quote | 200, quote status = "accepted" |
| Accepting auto-rejects all other pending quotes on the same post | verify other quotes have status "rejected" |
| Accepting creates a Booking document | verify Booking.create was called with correct data |
| Post status becomes "accepted" | verify post.status = "accepted" |
| Non-resident tries to accept | 403 |
| Quote is already accepted | 400 |
| Post is already closed | 400 |
| Socket.io `quote_accepted` event is emitted to the worker | verify `io.to().emit()` is called |

**PATCH /api/quotes/:id/reject**

| Test case | Expected result |
|---|---|
| Resident rejects a pending quote | 200, quote status = "rejected" |
| Non-resident tries to reject | 403 |
| Socket.io `quote_rejected` event is emitted to the worker | verify `io.to().emit()` is called |

---

### POSTS - `__tests__/unit/routes/posts.test.js`

| Test case | Expected result |
|---|---|
| Resident creates a post | 201 |
| Worker tries to create a post | 403 |
| Missing title | 400 |
| Missing category | 400 |
| Resident fetches feed (all open posts) | 200 |
| Resident fetches their own posts | 200, only their posts |
| Resident deletes their own post | 200 or 204 |
| Resident deletes someone else's post | 403 |

---

### REVIEWS - `__tests__/unit/routes/reviews.test.js`

| Test case | Expected result |
|---|---|
| Resident leaves a review on a completed booking | 201 |
| Review on a non-completed booking | 400 |
| Non-resident tries to leave a review | 403 |
| Rating outside 1-5 range | 400 |
| Fetch reviews for a worker | 200 |

---

### CATEGORIES - `__tests__/unit/routes/categories.test.js`

| Test case | Expected result |
|---|---|
| GET /api/categories returns 12 categories | 200, array of length 12 |
| Each category has id, label, icon fields | verify shape |

---

## Phase 1 - API Integration Tests

Integration tests spin up a real in-memory MongoDB instance and run full HTTP request cycles via Supertest. These complement unit tests by testing the full stack end-to-end at the API level without needing external infrastructure.

### `__tests__/integration/auth.integration.test.js`

- Register a resident, then log in with the same credentials, then call `/me` with the returned token - all three steps in sequence
- Register the same email twice - second request returns 409
- Register a worker - verify both User and Worker documents are created in the database

### `__tests__/integration/bookings.integration.test.js`

- Resident registers, worker registers, resident creates a booking for the worker, worker accepts it, resident cancels - verify status at each step
- Worker tries to create a booking - verify 403 at the DB level (no booking created)

### `__tests__/integration/quotes.integration.test.js`

Full quote lifecycle:
1. Resident creates a job post
2. Two different workers submit quotes
3. Resident fetches quotes - verify both are present, sorted by price
4. Resident accepts one quote - verify:
   - Accepted quote has status "accepted"
   - Other quote has status "rejected"
   - A Booking document was created
   - The post has status "accepted"
5. Resident tries to accept the second quote - verify 400 (post already closed)

### `__tests__/integration/posts.integration.test.js`

- Resident creates a post, it appears in the feed
- Resident deletes their post, it no longer appears in the feed
- Worker cannot create a post

---

## Phase 1 - Mobile Component Tests

### Common Components - `__tests__/components/`

**Button.test.tsx**

| Test case |
|---|
| Renders with label text |
| `onPress` callback is called when pressed |
| Disabled button does not call `onPress` |
| Loading state shows an indicator instead of text |

**Input.test.tsx**

| Test case |
|---|
| Renders with placeholder text |
| `onChangeText` is called on input |
| Shows error message when `error` prop is set |
| `secureTextEntry` hides text when set |

**WorkerCard.test.tsx**

| Test case |
|---|
| Renders worker name, category, and rating |
| Pressing the card calls `onPress` |
| Missing avatar shows fallback initials or icon |

**StarRating.test.tsx**

| Test case |
|---|
| Renders the correct number of filled stars for a rating of 4.0 |
| Renders half-star for non-integer ratings |
| Read-only mode does not respond to touch |

---

### Screen Smoke Tests - `__tests__/screens/`

These are shallow render tests - they verify the screen renders without crashing and shows key UI elements. They mock navigation and API services.

**LoginScreen.test.tsx**

| Test case |
|---|
| Renders email and password inputs |
| Renders login button |
| Shows validation error when submitting empty form |
| Calls `authApi.login` with entered credentials on submit |

**RegisterScreen.test.tsx**

| Test case |
|---|
| Renders all required fields |
| Role selector shows "resident" and "worker" options |
| Shows error for password shorter than 6 characters |

**HomeScreen.test.tsx**

| Test case |
|---|
| Renders category grid |
| Shows loading state while fetching workers |
| Shows worker cards after data loads |

**WorkerDetailScreen.test.tsx**

| Test case |
|---|
| Renders worker name, bio, rating, and category |
| "Book now" button is visible |
| Pressing "Book now" navigates to BookingRequestScreen |

**BookingRequestScreen.test.tsx**

| Test case |
|---|
| Renders category and description fields |
| Submit button calls `bookingsApi.create` |
| Shows confirmation after successful booking |

---

### Store Tests - `__tests__/store/authStore.test.ts`

| Test case |
|---|
| Initial state is unauthenticated (`token: null`, `user: null`) |
| `setAuth(token, user)` updates state correctly |
| `logout()` clears token and user |
| State persists to AsyncStorage after `setAuth` |
| State is restored from AsyncStorage on app start |

---

### Service Tests - `__tests__/services/apiClient.test.ts`

| Test case |
|---|
| Requests include `Authorization: Bearer <token>` header when token is set in the store |
| 401 response triggers `logout()` on the auth store |
| Base URL is set from `EXPO_PUBLIC_API_BASE_URL` when defined |

---

## Phase 2 - Tests for New Features

Add these test suites as each Phase 2 feature is implemented.

### Push Notifications

- `PushNotificationService.test.ts` - verify tokens are registered on login, verify the correct Expo push endpoint is called with the right payload, verify token is cleared on logout
- API: `POST /api/notifications/token` - saves device token; verify only authenticated users can register

### Rich Chat

- `ChatScreen.test.tsx` - image attachment button opens image picker, sending a message calls `chatApi.sendMessage`, typing event is emitted via socket
- API: `POST /api/chat/message` with a file attachment - verify file is stored and message is saved

### Worker Availability

- `WorkerCalendar.test.tsx` - blocked dates cannot be selected in the date picker
- API: `PUT /api/workers/availability` - saves working hours and blocked dates per worker

---

## Phase 3 - Tests for Payments and Tracking

### Escrow Payments (Critical - write before implementing)

The escrow flow is the most sensitive part of the entire system. Tests must be written first (TDD) before the payment code is touched.

**Unit tests:**

| Test case |
|---|
| Payment is held on quote acceptance, not transferred immediately |
| Funds are released only after resident calls the confirm-completion endpoint |
| Auto-release triggers after 48 hours if resident does not confirm |
| Worker cannot trigger their own fund release |
| Only the resident of the booking can confirm completion |
| Dispute creation freezes the escrow and does not auto-release |

**Integration test - full payment lifecycle:**

1. Resident accepts quote
2. Payment is created in "held" status
3. Worker marks booking as completed
4. Resident confirms completion
5. Payment status changes to "released"
6. Verify no duplicate releases are possible

### Instant Booking

- Calendar sync mock - verify available slots are correctly parsed from Google Calendar API response
- Slot selection - verify selecting an unavailable slot is blocked
- Booking confirmation - verify calendar event creation is called after booking

### Real-Time Tracking

- Socket event `worker_location_update` - verify it is emitted at the correct interval when the worker is "on the way"
- Worker status transitions: "on the way" -> "arrived" -> "job started" -> "job done" - verify each transition is valid and fires the right socket event
- Verify location data is not stored persistently (privacy requirement)

---

## Phase 4 - Tests for AI Features

### AI Visual Diagnosis

- Mock the AI model response - verify the UI correctly displays the detected problem type and price range
- Verify the photo/video is not stored on the server if the user does not attach it to a post
- Verify category suggestions match the detected problem type

### AI Bid Review

- Given 3 quotes with different prices, materials, and worker ratings - verify the scoring produces a deterministic, explainable result
- Verify the comparison table shows all quotes
- Verify sorting by price, by score, and by worker rating all work correctly

### Neighborhood Trust

- Verify location data is only shown when both the worker and the resident have opted in
- Verify location is displayed at building/street level only (no GPS coordinates)
- Verify the feature is invisible when either party has not opted in

---

## Phase 5 - Tests for Expansion Features

### AR Measurement

- Verify measurement values are stored correctly with units
- Verify measurements can be attached to a chat message or job post
- Verify the 3D sketch is generated from the measurement points

### Digital Home Passport

- Verify a logbook entry is created automatically when a booking reaches "completed" status
- Verify the entry includes: date, worker name, category, price, materials
- Verify the resident can share a logbook entry and the shared URL does not expose other entries

### Multilingual Support

- Verify all static strings have translations defined for Hebrew, English, and Russian
- Verify RTL layout is active when Hebrew is selected
- Verify LTR layout is active when English or Russian is selected
- Verify the language preference is persisted across app restarts

---

## General Quality Rules

These rules apply to all tests in the project:

1. **No real network calls in unit or component tests.** Mock all API services with `jest.mock`.
2. **No real MongoDB in unit tests.** Use `mongodb-memory-server` for integration tests only. Mock mongoose models in unit tests.
3. **No real Socket.io connections in unit tests.** Mock `getIO()` to return an object with `to().emit()` spies.
4. **Each test is independent.** Database state is reset between each integration test using `beforeEach` cleanup.
5. **Test the behavior, not the implementation.** Assert on HTTP status codes, response shapes, and database state - not on internal function calls (except for socket events and external service calls).
6. **Hebrew error messages are part of the contract.** Assert on the exact Hebrew message strings returned by the API - if they change, tests should catch it.
7. **Write tests before implementing Phase 3 payment features.** The escrow logic is money-critical and must have tests before the code exists.

---

## CI/CD Integration (Future)

When CI/CD is added, the test pipeline should run:

1. `npm test` in `apps/api` - all unit and integration tests
2. `npm test` in `apps/mobile` - all component and store tests
3. Block merges to `main` if any test fails
4. Run E2E tests (Detox/Maestro) on a staging environment after deployment

Suggested GitHub Actions step:

```yaml
- name: Run API tests
  working-directory: apps/api
  run: npm test

- name: Run mobile tests
  working-directory: apps/mobile
  run: npm test
```
