FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first (layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
