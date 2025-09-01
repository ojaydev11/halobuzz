FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (sharp, etc.)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm install && npm run build && ./node_modules/.bin/tsc -p scripts/tsconfig.json

FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

ENV NODE_ENV=production \
    PORT=5010 \
    TZ=Australia/Sydney

COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

EXPOSE 5010

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:5010/healthz || exit 1

CMD ["node", "dist/index.js"]


