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
COPY scripts ./scripts
COPY src ./src

# Build TypeScript to JavaScript (skip type checking for production build)
RUN echo '{"compilerOptions":{"target":"ES2020","module":"commonjs","outDir":"dist","rootDir":"src","strict":false,"noEmitOnError":false,"skipLibCheck":true,"noImplicitAny":false,"noUnusedLocals":false,"noUnusedParameters":false,"allowJs":true,"esModuleInterop":true,"allowSyntheticDefaultImports":true,"forceConsistentCasingInFileNames":true,"resolveJsonModule":true,"isolatedModules":true,"noFallthroughCasesInSwitch":true,"moduleResolution":"node","baseUrl":".","paths":{"@/*":["src/*"]}},"include":["src/**/*"],"exclude":["node_modules","dist"]}' > tsconfig.build.json && \
    npx tsc -p tsconfig.build.json && \
    npx tsc-alias -p tsconfig.build.json --outDir dist

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs halobuzz

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy package files
COPY package*.json pnpm-lock.yaml ./

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
ENV PORT=5010
ENV API_VERSION=v1
ENV HOST=0.0.0.0

# Switch to non-root user
USER halobuzz

# Expose port
EXPOSE 5010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -f --max-time 2 --connect-timeout 2 http://127.0.0.1:${PORT}/api/v1/monitoring/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]