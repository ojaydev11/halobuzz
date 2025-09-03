# syntax=docker/dockerfile:1

# --- build stage ---
FROM node:20-slim AS build
WORKDIR /usr/src/app

# Use pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Install deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# --- runtime stage ---
FROM node:20-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=5020

# Copy built app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./

EXPOSE 5020
CMD ["node","dist/index.js"]
