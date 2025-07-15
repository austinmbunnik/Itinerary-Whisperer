# Multi-stage build for Node.js Express application

# Stage 1: Base dependencies
FROM node:18-alpine AS base
WORKDIR /usr/src/app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
RUN apk add --no-cache dumb-init

# Stage 2: Dependencies installation
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Development dependencies (for building if needed)
FROM base AS deps-dev
COPY package*.json ./
RUN npm ci

# Stage 4: Application build (if needed for any build steps)
FROM deps-dev AS build
COPY . .
# No build step needed for this Express app, but keeping for future use

# Stage 5: Production runtime
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules

# Copy application source
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs config/ ./config/
COPY --chown=nodejs:nodejs public/ ./public/

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]