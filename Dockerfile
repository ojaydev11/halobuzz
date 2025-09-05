# syntax=docker/dockerfile:1.7

# Multi-stage Dockerfile for HaloBuzz Monorepo
# Build any service by setting SERVICE_PATH build arg
# Example: docker build --build-arg SERVICE_PATH=backend -t halobuzz-backend .
# Example: docker build --build-arg SERVICE_PATH=ai-engine -t halobuzz-ai-engine .

ARG SERVICE_PATH=backend
FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# ---- Dependencies stage ----
FROM base AS deps
ARG SERVICE_PATH
WORKDIR /app

# Copy package files for the specified service
COPY ${SERVICE_PATH}/package*.json ./
COPY ${SERVICE_PATH}/pnpm-lock.yaml ./

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    if [ -f "pnpm-lock.yaml" ]; then \
        pnpm install --frozen-lockfile; \
    else \
        echo "No pnpm-lock.yaml found, installing without lockfile"; \
        pnpm install; \
    fi

# ---- Build stage ----
FROM base AS build
ARG SERVICE_PATH
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/pnpm-lock.yaml ./

# Copy source code and config files for the specified service
COPY ${SERVICE_PATH}/tsconfig*.json ./
COPY ${SERVICE_PATH}/src ./src

# Copy scripts if they exist
COPY ${SERVICE_PATH}/scripts ./scripts 2>/dev/null || true

# Build TypeScript to JavaScript
RUN if [ -f "scripts/build.js" ]; then \
        node scripts/build.js; \
    else \
        pnpm run build:ts || pnpm run build; \
    fi

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
ARG SERVICE_PATH
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs halobuzz

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY --from=build /app/package*.json ./
COPY --from=build /app/pnpm-lock.yaml ./

# Install production dependencies only
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/dist ./dist

# Install curl for health checks (before switching to non-root user)
RUN apk add --no-cache curl

# Create logs directory
RUN mkdir -p logs && chown -R halobuzz:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Set API_VERSION for backend service
RUN if [ "$SERVICE_PATH" = "backend" ]; then \
        echo "ENV API_VERSION=v1" >> /tmp/env; \
    fi

# Switch to non-root user
USER halobuzz

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -f --max-time 2 --connect-timeout 2 http://127.0.0.1:4000/api/v1/monitoring/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
