# syntax=docker/dockerfile:1

# --- build stage ---
FROM node:20-slim AS build
WORKDIR /usr/src/app

# Use pnpm via corepack
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Copy backend files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN echo "Current directory: $(pwd)" && ls -la
RUN echo "Running build command..." && pnpm run build
RUN echo "After build, checking dist directory:" && ls -la dist/ || echo "dist does not exist"

# --- runtime stage ---
FROM node:20-slim
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=4000

# Copy built app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./

# Install ts-node for runtime
RUN npm install -g ts-node

EXPOSE 4000
CMD ["npx", "ts-node", "dist/index.ts"]