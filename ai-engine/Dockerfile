# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/pnpm-lock.yaml ./

# Copy source code and config files
COPY tsconfig*.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN pnpm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs ai-engine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install production dependencies only
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown -R ai-engine:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Switch to non-root user
USER ai-engine

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/monitoring/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]