# Handil API image.
#
# Build from the REPOSITORY ROOT, not from apps/api:
#
#   docker build -f apps/api/Dockerfile -t handil-api .
#
# The API depends on the workspace package @handil/shared, which is not
# published to npm. Only the root context contains it and the root lockfile.

FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Manifests first so the dependency layer is cached until they change.
# Only the workspaces the API needs are copied; npm installs just those.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev --workspace=api --include-workspace-root=false \
 && npm cache clean --force

COPY packages/shared/src packages/shared/src
COPY apps/api/src apps/api/src

WORKDIR /app/apps/api
USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/api/health" || exit 1

CMD ["node", "src/server.js"]
