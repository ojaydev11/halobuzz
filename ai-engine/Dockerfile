# syntax=docker/dockerfile:1.7
FROM node:20-slim AS base
WORKDIR /usr/src/app

# Enable pnpm via corepack
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# use a cached pnpm store for faster installs
RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build
RUN ls -la dist/ && echo "Build completed successfully"

FROM node:20-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=build /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json ./
RUN ls -la dist/ && echo "Files in dist directory:" && cat dist/index.js | head -20
RUN echo "Testing Node.js execution:" && node --version && echo "Testing if dist/index.js exists:" && ls -la dist/index.js
EXPOSE 4000
CMD ["sh", "-c", "echo 'Starting AI Engine...' && node dist/index.js || echo 'Node.js failed to start' && exit 1"]