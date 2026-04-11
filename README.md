# Handil

Handil is a Hebrew-first mobile platform connecting new residents in Tel Aviv with trusted local handymen.

## Tech stack

- Mobile: React Native (Expo) + TypeScript
- Backend: Node.js + Express
- Database: MongoDB

## Repository structure

- `apps/mobile` - Expo mobile app
- `apps/api` - Express API server
- `packages/shared` - shared types and constants (next phase)

## Quick start

### 1) Mobile app

From repo root (after `npm install` at root):

```bash
npm run mobile
```

Or from the app folder (`dev` / `mobile` / `start` all run Expo):

```bash
cd apps/mobile
npm install
npm run start
# same: npm run dev   npm run mobile
```

On a **physical phone**, create `apps/mobile/.env` from `.env.example` and set `EXPO_PUBLIC_API_BASE_URL` to your computer's LAN address (same Wi‑Fi), for example `http://192.168.1.10:4000/api`. Restart Expo after changing env vars.

### 2) API server

From repo root:

```bash
npm install
npm run dev
```

Or from the API folder:

```bash
cd apps/api
cp .env.example .env
npm install
npm run dev
```

Health endpoint:

- `GET http://localhost:4000/api/health`

## Git workflow

- `main`: production-ready code
- `dev`: daily integration branch
- `feature/*`: task branches

Suggested commit style:

- `feat: add worker profile schema`
- `fix: resolve rtl alignment in auth screen`
- `chore: setup api env variables`
