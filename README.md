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

In **Expo Go** on a physical phone, the app usually picks up your dev machine’s LAN IP from Metro (`expoConfig.hostUri`) and calls the API on port **4000** on that same machine. Keep the phone and PC on the same Wi‑Fi, and ensure the API is running (`npm run dev` from repo root).

If the health check still fails, create `apps/mobile/.env` from `.env.example` and set `EXPO_PUBLIC_API_BASE_URL` explicitly (e.g. `http://192.168.1.103:4000/api`). On Windows, allow **Node** through the firewall for port **4000** if requests are blocked. Restart Expo after changing env vars.

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
