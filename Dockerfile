# syntax=docker/dockerfile:1

# --- build stage ---
FROM node:20-slim AS build
WORKDIR /usr/src/app

# Use pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Install deps
COPY package.json pnpm-lock.yaml ./
# Force cache invalidation
RUN echo "Cache bust: $(date)" > /tmp/cache-bust
RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN echo "Current directory: $(pwd)" && ls -la
RUN echo "Running build command in backend directory..." && cd backend && pnpm run build
RUN echo "After build command, checking backend directory:" && ls -la backend/
RUN echo "Checking if backend/dist exists:" && ls -la backend/dist/ || echo "backend/dist does not exist"

# --- runtime stage ---
FROM node:20-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=5020

# Copy built app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/backend/dist ./dist
COPY --from=build /usr/src/app/backend/package.json ./

# Install ts-node for runtime
RUN npm install -g ts-node

EXPOSE 5020
CMD ["npx", "ts-node", "dist/index.ts"]
