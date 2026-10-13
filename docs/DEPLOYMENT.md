# Deploying Handil

Three things get deployed: the **API** (a Docker container), the **database** (MongoDB), and the **app**, as a website and/or as iOS and Android builds. Do them in this order, because the app needs the API's public URL at build time.

---

## 1. Database — MongoDB Atlas

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com). The free M0 tier is enough to launch.
2. Create a database user, and allow network access from your API host (or `0.0.0.0/0` if the host has no fixed IP).
3. Copy the connection string, e.g. `mongodb+srv://handil:<password>@cluster0.xxxx.mongodb.net/handil`. This is `MONGO_URI`.

Indexes are created automatically when the API first starts.

**Upgrading an existing database** (one created before October 2026): run once

```bash
MONGO_URI="mongodb+srv://..." npm run db:sync-indexes --workspace=api
```

This makes the "one booking per job" index unique. On a brand-new database it is a no-op.

---

## 2. API — Docker

The image **must be built from the repository root**, because the API uses the workspace package `packages/shared`:

```bash
docker build -f apps/api/Dockerfile -t handil-api .
```

Run it with these environment variables:

| Variable | Value |
|---|---|
| `MONGO_URI` | the Atlas connection string |
| `JWT_ACCESS_SECRET` | a long random value, e.g. `openssl rand -base64 48`. **Never reuse the dev one** |
| `ALLOWED_ORIGINS` | the web app's origin(s), e.g. `https://handil.co.il,https://www.handil.co.il` |
| `PORT` | usually set by the host; defaults to `4000` |

`NODE_ENV=production` is already set in the image. The server checks its configuration at startup and exits with a clear message if something required is missing.

**Hosts that work well:** Render, Railway, Fly.io, Google Cloud Run, or any VPS with Docker.
- Point the host at `apps/api/Dockerfile` with the **build context set to the repo root**.
- Health check path: `/api/health` (the image also has a built-in Docker `HEALTHCHECK`).
- The host must support **WebSockets**, which chat and live notifications need. All of the hosts above do.
- Serve over **HTTPS**. Release builds of the app refuse plain HTTP.
- Run **a single instance** for now. Socket.io rooms live in memory, so scaling to more than one instance needs the Socket.io Redis adapter first.

Check it: `curl https://api.your-domain/api/health` should return `{"status":"ok","service":"handil-api"}`.

---

## 3. App

The API's public URL (ending in `/api`) is compiled into the app, so set it before building.

### Website

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.your-domain/api npm run build
```

The output in `apps/mobile/dist/` is a static site. Upload it to Netlify, Vercel, Cloudflare Pages, S3 or similar, and configure **all routes to fall back to `index.html`**. Add the site's origin to the API's `ALLOWED_ORIGINS`.

The build stops early if the URL is missing, a placeholder, localhost or plain HTTP. After exporting, it checks the bundle actually contains the URL. (Metro's cache once let a build silently keep `localhost`; the build now clears that cache.)

### iOS and Android — EAS

1. `npm install -g eas-cli` and `eas login`.
2. In `apps/mobile`, run `eas init` once to link the project to your Expo account.
3. In `apps/mobile/eas.json`, replace `https://YOUR_API_URL/api` with your real URL in the `preview` and `production` profiles. Until you do, EAS builds stop with an explanation.
4. Build:
   ```bash
   cd apps/mobile
   eas build --profile preview --platform android    # installable APK for testers
   eas build --profile production --platform all     # store builds
   eas submit --profile production --platform ios    # / android
   ```

Store checklist:
- Bundle id / package: `com.handil.app` (in `app.json`). Change it before the first store upload if you want a different one, because it can't be changed afterwards.
- Apple and Google require in-app account deletion. It's under Profile → מחיקת חשבון.
- The privacy policy and terms are in the app (Home / Profile → מדיניות פרטיות / תנאי שימוש). The stores also want them at a public URL, so host the same text on your website.
- Only photo-library access is requested (with a Hebrew explanation). There's no camera or microphone access.

The `development` EAS profile builds a dev client, which needs `expo-dev-client` installed first (`npx expo install expo-dev-client`). It isn't installed now, because installing it changes `npx expo start` to target dev builds instead of Expo Go.

---

## 4. After deploying

- [ ] `GET /api/health` returns ok over HTTPS
- [ ] Register a resident and a worker from the live app
- [ ] Post a job → the worker sees it appear live → quote → accept → chat → complete → review
- [ ] Open the web app from an origin **not** in `ALLOWED_ORIGINS`: API calls should be blocked
- [ ] Delete a test account from Profile and confirm you can't log in with it again

## Known limits (not blockers for launch)

- **Images are stored inside MongoDB** as base64 (up to 4 per post, 2 MB each). That's fine at launch volume. Move them to S3/Cloudinary before the database grows large.
- **No push notifications yet.** Users get live updates only while the app is open.
- **No password reset by e-mail yet.** It needs an e-mail provider (e.g. Resend, SendGrid).
- **Single API instance** (see above).
