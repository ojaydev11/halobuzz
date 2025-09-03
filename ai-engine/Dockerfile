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
RUN ls -la src/models/
RUN pnpm run build

FROM node:20-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=5020
COPY --from=build /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json ./
EXPOSE 5020
CMD ["node","dist/index.js"]