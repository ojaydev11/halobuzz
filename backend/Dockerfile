FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (sharp, etc.)
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile && pnpm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production \
    PORT=5010 \
    TZ=Australia/Sydney

# Install pnpm in runner stage
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
RUN pnpm prune --prod

COPY --from=builder /app/dist ./dist

EXPOSE 5010

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:5010/healthz || exit 1

CMD ["npx", "ts-node", "dist/index.ts"]


