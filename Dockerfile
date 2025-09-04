# syntax=docker/dockerfile:1

# --- build stage ---
FROM node:20-slim AS build
WORKDIR /usr/src/app

# Use pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy backend files
COPY backend/package.json backend/pnpm-lock.yaml backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/scripts ./scripts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the TypeScript code
RUN pnpm run build

# Verify build output
RUN echo "Build completed. Checking dist directory:" && ls -la dist/


# --- runtime stage ---
FROM node:20-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=4000

# Install basic dependencies
RUN npm install express cors helmet express-rate-limit

# Copy the fallback server
COPY backend/dist/fallback-server.js ./fallback-server.js

# Debug: Check what's in the directory
RUN echo "Checking directory contents:" && ls -la
RUN echo "Checking if fallback-server.js exists:" && ls -la fallback-server.js || echo "fallback-server.js does not exist"

EXPOSE 4000
CMD ["node", "fallback-server.js"]
