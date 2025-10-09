# syntax=docker/dockerfile:1.7
# Production Dockerfile - Compiled TypeScript for full backend with low memory

# ---- Dependencies stage ----
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install ALL dependencies (needed for TypeScript compilation)
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

# Copy source code and TypeScript config
COPY tsconfig*.json ./
COPY src ./src

# Compile TypeScript to JavaScript
# tsc-alias resolves @ paths to relative paths
RUN echo "Building TypeScript..." && \
    pnpm run build && \
    echo "Build complete!" && \
    ls -la dist/ && \
    echo "Dist contents:" && find dist -type f | head -20

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs halobuzz

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

# Install ONLY production dependencies (no TypeScript, ts-node, etc.)
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --prod --frozen-lockfile --no-optional

# Copy compiled JavaScript from build stage
COPY --from=build /app/dist ./dist

# Verify dist was copied
RUN ls -la dist/ && echo "Dist files copied successfully"

# Create necessary directories
RUN mkdir -p logs uploads && chown -R halobuzz:nodejs logs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV API_VERSION=v1
ENV HOST=0.0.0.0

# Node.js memory limit for 1GB instances
ENV NODE_OPTIONS="--max-old-space-size=768"

# Switch to non-root user
USER halobuzz

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f --max-time 2 --connect-timeout 2 http://127.0.0.1:${PORT}/healthz || exit 1

# Start with compiled JavaScript (NOT ts-node!)
CMD ["node", "dist/index.js"]
