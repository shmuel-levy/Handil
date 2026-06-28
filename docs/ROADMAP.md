# Handil - Strategic Roadmap

Handil is a Hebrew-first mobile marketplace connecting Tel Aviv residents with local home service professionals. This roadmap defines the phased plan to evolve from a working MVP into a full-featured, AI-powered platform that outcompetes incumbents like Midrag.

---

## Current State - Phase 1 (Complete)

The core platform is live as a monorepo with a Node.js/Express backend and an Expo React Native mobile app.

**What is built:**

- Two user roles: residents and workers, each with tailored screens
- Worker discovery - browse and search by category, city, and rating
- Job post board - residents post jobs, workers submit price quotes
- Direct booking with status transitions (pending, approved, completed, rejected)
- In-app real-time chat via Socket.io
- Star ratings and reviews on completed bookings
- Real-time in-app notification banners for booking updates, new quotes, new messages
- Full Hebrew RTL layout enforced from the root entry point, working on iOS, Android, and Web
- Desktop web layout with sidebar navigation
- 12 predefined service categories in Hebrew
- JWT authentication with 30-day tokens
- Docker-ready API image

**Tech stack:**

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 54) + TypeScript |
| Navigation | React Navigation v7 |
| State | Zustand 5 + AsyncStorage |
| API client | Axios with JWT interceptor |
| Real-time | Socket.io 4 |
| Backend | Node.js + Express 5 |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT + bcryptjs |

---

## Phase 2 - UX and Communication Enhancement

**Goal:** Deepen user engagement, improve the communication experience, and build trust through richer profiles.

**Priority:** High - these are the gaps users will notice first after using the app.

### 2.1 Push Notifications

Users currently only receive in-app notification banners while the app is open. Push notifications will keep users informed when the app is in the background.

- Integrate Expo Notifications + Firebase Cloud Messaging
- Trigger push events for: new booking request, booking status change, new chat message, new quote on a job post, quote accepted/rejected
- Store push tokens per user device in the database
- Handle notification tap to deep-link into the relevant screen

**Dependencies:** `expo-notifications`, Firebase project setup, backend push dispatch service

---

### 2.2 Rich Chat Experience

Current chat supports text messages only. This feature adds the communication tools users expect.

- Image and file attachments in chat messages
- Typing indicator (Socket.io `typing` event per conversation)
- Read receipts (mark messages as read, show double-check icon)
- Message timestamps shown on tap
- Swipe to reply (quote a specific message)

**Dependencies:** File upload endpoint + cloud storage (AWS S3 or Google Cloud Storage), `react-native-image-picker`

---

### 2.3 Enhanced Worker Profiles

Workers need richer profiles to stand out and build trust.

- Verification badges: phone verified, ID verified, bank account linked
- Before/after photo portfolio per completed job
- Performance stats visible on profile: completion rate, average response time, quote acceptance rate
- Availability calendar - workers set working hours and blocked dates
- Service area map - workers define the neighborhoods they cover

**Dependencies:** Backend model changes to `Worker`, cloud storage for portfolio images

---

### 2.4 Advanced Search and Filtering

Current search filters by category, city, and a text query. Add:

- Filter by minimum rating (e.g., 4+ stars only)
- Filter by price range (requires quote history data)
- Filter by immediate availability (workers flagged as available now)
- Sort by: rating, number of reviews, response time, distance
- Save recent searches

---

## Phase 3 - Automation, Transparency, and Payments

**Goal:** Streamline the booking flow, add financial transparency, and introduce real-time logistics features.

### 3.1 In-App Payments with Escrow

The current flow has no payment handling. This is the most critical trust feature.

- Integrate Stripe Connect or PayMe (local Israeli payment gateway)
- Resident pays when accepting a quote - funds are held in escrow
- Funds are released to the worker only after the resident confirms job completion
- If the resident does not confirm within 48 hours of the job completion date, funds auto-release
- Dispute flow: resident or worker can open a dispute, which freezes the escrow and routes to a defined arbitration process
- Workers onboard with Stripe Connect Express (KYC, bank details)
- Receipts and invoices generated automatically and accessible in the app

**User story:** As a resident, I want my payment held securely until I confirm the work is done, so the worker is motivated to complete the job to my satisfaction.

**Acceptance criteria:**
- Resident can pay from within the app after accepting a quote
- Money is not sent directly to the worker
- Resident receives a confirmation button after the scheduled job date
- Worker receives funds only after resident approval
- A dispute mechanism exists with a defined resolution path

---

### 3.2 Instant Booking with Calendar Sync

Currently booking requires manual coordination via chat. Instant booking eliminates this friction.

- Workers sync their availability via Google Calendar API or Microsoft Graph API
- Available time slots are displayed in the worker's profile and during booking
- Resident picks a slot and books in one tap - no back-and-forth needed
- Both parties receive instant confirmation (in-app + push + email)
- Calendar event is created automatically in the worker's calendar
- Cancellation policy enforced: cancel more than 24 hours before = no penalty; cancel less = flagged on profile

**User story:** As a resident, I want to book a service directly from the app in a specific time window and get immediate confirmation, so I don't waste time on phone calls and negotiations.

---

### 3.3 Uber-Like Real-Time Tracking

Once a booking is confirmed and the job date arrives, residents can track the worker on a live map.

- Worker activates tracking from the app when leaving for the job ("On my way")
- Resident sees the worker's live location on a map (Google Maps or Mapbox)
- Location updates every 15-30 seconds via Socket.io or a dedicated location endpoint
- Resident receives push notification when worker is 10 minutes away
- Worker can update status in-app: "On my way", "Arrived", "Job started", "Job done"
- Resident can contact worker directly from the map screen

**User story:** As a resident, I want to see on a map where the professional is while they are on the way to me, so I can prepare accordingly without uncertainty.

**Dependencies:** Google Maps API or Mapbox SDK, background location permissions on mobile

---

## Phase 4 - AI, Optimization, and Trust

**Goal:** Use AI to reduce friction for residents, help workers win better jobs, and build community-level trust.

### 4.1 AI Visual Diagnosis

Residents often do not know what type of professional they need or how much a repair should cost. This feature lowers the barrier to starting a job post.

- Resident takes a photo or short video of the problem from within the app
- AI model (TensorFlow.js or a server-side model via API) analyzes the media
- System identifies the problem type: e.g., water leak, wall crack, electrical fault
- System shows an estimated repair price range based on market data
- System suggests relevant worker categories (e.g., plumber, electrician)
- Resident can attach the photo and the AI estimate to a job post

**User story:** As a resident, I want to upload a photo of my problem and receive an automatic identification plus a price estimate, so I can approach the right professional with realistic expectations.

---

### 4.2 AI Bid Review and Comparison

When a resident receives multiple quotes on a job post, choosing between them is difficult. AI Bid Review makes this decision easier.

- System displays a structured comparison table of all received quotes
- AI analyzes each quote: line items, materials offered, warranty terms, worker rating, and past job history
- Each quote receives an AI-generated score or recommendation with a brief explanation
- Resident can sort and filter by: price, score, delivery time, worker rating
- System explains in plain Hebrew why one quote is higher or lower than another

**User story:** As a resident, I want a smart comparison of the quotes I received so I can understand the real value of each one, not just the price.

---

### 4.3 Neighborhood Trust (Hyper-Local Social Proof)

Trust is built locally. This feature surfaces evidence that a worker has already performed jobs nearby.

- Worker profiles show how many jobs they have completed in the resident's building or street (only when both parties have consented to location sharing)
- Resident can read reviews from neighbors in the same building or street
- The app highlights workers with proven local work history in the resident's area

**User story:** As a resident, I want to see recommendations from professionals who have worked in my building or street, so I feel confident I am hiring someone trusted by my immediate community.

**Privacy requirements:** Location is shown only at the building/street level. Location sharing must be explicitly opt-in by both the worker and the resident. No GPS coordinates are ever displayed publicly.

---

### 4.4 AI Smart Match

Instead of the resident browsing and comparing workers manually, Smart Match proactively recommends the best worker for a job.

- When a resident creates a job post, the AI ranks available workers by match score
- Match factors: category, city, worker rating, number of completed similar jobs, response time, price history, availability
- The system surfaces the top 3-5 matches with an explanation of why each was recommended
- Workers who are a strong match receive a proactive push notification to submit a quote

---

## Phase 5 - Innovation, Expansion, and Property Management

**Goal:** Extend the platform with innovative tools, broaden the addressable market, and position Handil as a property management layer, not just a marketplace.

### 5.1 AR Measurement and Planning

Residents can measure spaces and send accurate dimensions to workers without an in-person preliminary visit.

- Resident uses the phone camera with ARCore (Android) or ARKit (iOS) via Expo
- Place measurement points in 3D space to record length, width, and height
- Measurements are saved and can be attached to a job post or sent via chat
- Worker receives a simple 3D sketch of the measured area alongside the dimensions

**User story:** As a resident, I want to measure my space using my phone camera and send precise dimensions to a professional, so they can give an accurate quote remotely.

**Dependencies:** `expo-camera`, `@react-three/fiber` or a native AR bridge module, ARCore/ARKit permissions

---

### 5.2 Digital Home Passport

Every job completed through Handil becomes a permanent record for the property.

- Each completed booking is automatically added to a digital logbook for the property
- Logbook entries include: date, job type, worker name and contact, price paid, materials used, warranty certificate
- Resident can upload additional documents: invoices, photos, receipts
- Logbook is accessible anytime from the app
- Resident can share the full logbook or specific entries with a third party (e.g., a potential buyer of the apartment)

**User story:** As a property owner, I want every job done through Handil to be documented in a digital passport for my apartment, so I have a comprehensive service history that serves me in the future.

---

### 5.3 Multilingual Support

Hebrew-first is a competitive advantage today, but the Tel Aviv market includes large Russian-speaking and English-speaking populations.

- Add full English and Russian UI translations
- Language selection in onboarding and profile settings
- RTL for Hebrew, LTR for English and Russian - layout switches dynamically
- Error messages and system notifications localized per language
- Worker profiles can include a language badge (e.g., "Speaks Russian")

---

### 5.4 Service Packages

Instead of always starting from a custom job post, residents can order predefined packages.

- Workers can define standard service packages with a fixed price, description, and estimated duration (e.g., "Full apartment cleaning - 250 NIS")
- Packages are discoverable from category screens
- Resident books a package directly without creating a job post
- Packages simplify the booking flow for common, well-defined tasks

---

## Summary Timeline

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Core marketplace - bookings, quotes, chat, RTL | Complete |
| Phase 2 | Push notifications, rich chat, enhanced profiles, advanced search | Next |
| Phase 3 | Escrow payments, instant booking, real-time tracking | Follows Phase 2 |
| Phase 4 | AI diagnosis, AI bid review, neighborhood trust, smart match | Follows Phase 3 |
| Phase 5 | AR measurement, digital home passport, multilingual, service packages | Long-term |

---

## Technology Additions by Phase

| Feature | Technology |
|---|---|
| Push notifications | Expo Notifications + Firebase Cloud Messaging |
| File uploads | AWS S3 or Google Cloud Storage |
| Payments | Stripe Connect or PayMe |
| Calendar sync | Google Calendar API + Microsoft Graph API |
| Real-time tracking | Google Maps SDK or Mapbox + Socket.io |
| AI visual diagnosis | TensorFlow.js or server-side Python model |
| AI bid review | Server-side LLM or custom scoring model |
| AR measurement | ARCore (Android) + ARKit (iOS) via Expo |
| Multilingual | i18n library (e.g., `i18next` with `react-i18next`) |
