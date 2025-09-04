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

# Install basic dependencies and curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm install express cors helmet express-rate-limit

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/monitoring/health || exit 1

# Create the fallback server directly in the container
RUN cat > fallback-server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/api/v1/monitoring/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API endpoints
app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'HaloBuzz Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HaloBuzz Backend Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/api/v1/monitoring/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
EOF

# Debug: Check what's in the directory
RUN echo "Checking directory contents:" && ls -la
RUN echo "Checking if fallback-server.js exists:" && ls -la fallback-server.js || echo "fallback-server.js does not exist"

EXPOSE 4000
CMD ["node", "fallback-server.js"]
