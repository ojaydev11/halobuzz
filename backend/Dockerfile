# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies for Alpine Linux
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    libc6-compat \
    curl \
    && ln -sf python3 /usr/bin/python

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Set mongodb-memory-server to use system binaries and skip download
ENV MONGOMS_DOWNLOAD_DIR=/opt/mongodb-binaries
ENV MONGOMS_VERSION=7.0.0
ENV MONGOMS_DISABLE_POSTINSTALL=1
ENV MONGOMS_SYSTEM_BINARY=/usr/bin/mongod

# Install dependencies with cache mount
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install build dependencies for Alpine Linux
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers \
    libc6-compat

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/pnpm-lock.yaml ./

# Copy source code and config files
COPY tsconfig*.json ./
COPY scripts ./scripts
COPY src ./src

# Skip TypeScript compilation entirely - use ts-node at runtime
RUN echo "Skipping TypeScript compilation - will use ts-node at runtime"

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Install runtime dependencies for Alpine Linux
RUN apk add --no-cache \
    curl \
    libc6-compat \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs halobuzz

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Set mongodb-memory-server environment variables for production
ENV MONGOMS_DOWNLOAD_DIR=/opt/mongodb-binaries
ENV MONGOMS_VERSION=7.0.0
ENV MONGOMS_DISABLE_POSTINSTALL=1
ENV MONGOMS_SYSTEM_BINARY=/usr/bin/mongod

# Install production dependencies only
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod

# Copy source code (no dist directory needed)
COPY --from=build /app/src ./src
COPY --from=build /app/package*.json ./
COPY --from=build /app/pnpm-lock.yaml ./

# Create logs directory
RUN mkdir -p logs && chown -R halobuzz:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV API_VERSION=v1
ENV HOST=0.0.0.0

# Switch to non-root user
USER halobuzz

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -f --max-time 2 --connect-timeout 2 http://127.0.0.1:${PORT}/api/v1/health || exit 1

# Start the application
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/index.ts"]