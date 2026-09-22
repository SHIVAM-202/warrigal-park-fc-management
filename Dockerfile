# Multi-Stage Production Dockerfile for Warrigal Park FC Management System
# Base layer
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Dependencies layer
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production

# Production runtime stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/warrigal_park.sqlite

# Create directory for persistent SQLite database and set ownership
RUN mkdir -p /app/data && chown -R node:node /app

# Copy production node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node config/ ./config/
COPY --chown=node:node .env.production ./.env

USER node
EXPOSE 3000

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
