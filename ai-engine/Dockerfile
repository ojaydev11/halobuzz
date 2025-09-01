FROM node:20-alpine AS builder

WORKDIR /app

# Build dependencies for native modules (canvas, sharp, tfjs-node)
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  pkgconfig \
  cairo-dev \
  pango-dev \
  jpeg-dev \
  giflib-dev \
  librsvg-dev \
  vips-dev \
  libc6-compat

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src

RUN npm install && npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Runtime libraries for native modules + curl for healthcheck
RUN apk add --no-cache \
  cairo \
  pango \
  jpeg \
  giflib \
  librsvg \
  vips \
  libc6-compat \
  curl

ENV NODE_ENV=production \
    PORT=5020

COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist

EXPOSE 5020

# Dummy healthcheck hitting root path; succeeds if server accepts connections
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sS -o /dev/null http://localhost:5020/ || exit 1

CMD ["node", "dist/index.js"]


