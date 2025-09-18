import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import dotenv from 'dotenv';
import path from 'path';
import fileType from 'file-type';
import listEndpoints from 'express-list-endpoints';

// Load environment variables
dotenv.config();

// Set max listeners to prevent memory leak warnings
process.setMaxListeners(30);

// Handle uncaught exceptions and unhandled rejections
let isShuttingDown = false;

process.on('uncaughtException', (error) => {
  if (isShuttingDown) return;
  console.error('Uncaught Exception:', error);
  isShuttingDown = true;
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (isShuttingDown) return;
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  isShuttingDown = true;
  process.exit(1);
});

// Import configurations
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import healthRoutes from './routes/health';
import { setupSocketIO, setupRedisAdapter } from '@/config/socket';
import { setupLogger } from '@/config/logger';
import { validateSecrets } from '@/config/secrets';
import { featureFlags } from '@/config/flags';

// Import realtime layer
import { createRealtime } from '@/realtime/socket';
import { setIo } from '@/realtime/emitters';

// Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authMiddleware } from '@/middleware/auth';
import { metricsMiddleware } from '@/middleware/metrics';
import { 
  securityMonitoringMiddleware, 
  authenticationMonitoringMiddleware, 
  dataAccessMonitoringMiddleware, 
  rateLimitMonitoringMiddleware,
  suspiciousPatternDetectionMiddleware,
  fileUploadMonitoringMiddleware
} from '@/middleware/securityMonitoring';
import {
  requestId,
  trustProxy,
  httpsOnly,
  globalLimiter,
  authLimiter,
  loginSlowDown,
  paymentLimiter,
  socialLimiter,
  deviceFingerprint,
  securityHeaders,
  sanitizeInput
} from '@/middleware/security';

// Import routes
import authRoutes from '@/routes/auth';
import walletRoutes from '@/routes/wallet';
import streamsRoutes from '@/routes/streams';
import giftsRoutes from '@/routes/gifts';
import throneRoutes from '@/routes/throne';
import ogRoutes from '@/routes/og';
import chatRoutes from '@/routes/chat';
import reelsRoutes from '@/routes/reels';
import searchRoutes from '@/routes/search';
import globalExpansionRoutes from '@/routes/global-expansion';
import creatorEconomyRoutes from '@/routes/creator-economy';
import gamesRoutes from '@/routes/games';
import gamesRoutesV2 from '@/routes/games-v2';
import adminRoutes from '@/routes/admin';
import configRoutes from '@/routes/config';
import kycRoutes from '@/routes/kyc';
import monitoringRoutes from '@/routes/monitoring';
import securityRoutes from '@/routes/security';
import aiContentStudioRoutes from '@/routes/aiContentStudio';

// New AI services routes
import aiContentRoutes from '@/routes/ai-content';

// New creator economy routes
import nftRoutes from '@/routes/nft';
import subscriptionRoutes from '@/routes/subscription';
import creatorAnalyticsRoutes from '@/routes/creator-analytics';
import commerceRoutes from '@/routes/commerce';

// Phase 4: Interactive Features routes
// import collaborationRoutes from '@/routes/collaboration';
// import storytellingRoutes from '@/routes/storytelling';

// Phase 5: Web3 & Blockchain Integration routes
// import blockchainRoutes from '@/routes/blockchain';
// import daoRoutes from '@/routes/dao';

// Phase 6: Advanced Discovery & UX routes
// import culturalRoutes from '@/routes/cultural';
// import wellbeingRoutes from '@/routes/wellbeing';

// Validate critical secrets
validateSecrets();

const app = express();

// Trust proxy for Railway/Vercel
app.set('trust proxy', 1);
const server = createServer(app);

// Create Socket.IO instance for existing functionality
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Create new realtime layer for live channels
const liveIo = createRealtime(server);

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const logger = setupLogger();

// Enhanced security middleware
app.use(requestId);
app.use(trustProxy);
app.use(httpsOnly);
app.use(securityHeaders);

// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://api.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "no-referrer" }
}));

// Enhanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log blocked origins for security monitoring
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-TOTP-Token', 'X-Device-ID'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400 // 24 hours
}));

// Global rate limiting
app.use(globalLimiter);

// Input sanitization
app.use(sanitizeInput);

// Device fingerprinting
app.use(deviceFingerprint);

// Metrics collection middleware
app.use(metricsMiddleware);

// Security monitoring middleware
app.use(securityMonitoringMiddleware);
app.use(authenticationMonitoringMiddleware);
app.use(dataAccessMonitoringMiddleware);
app.use(rateLimitMonitoringMiddleware);
app.use(suspiciousPatternDetectionMiddleware);
app.use(fileUploadMonitoringMiddleware);

// Body parsing middleware with stricter limits
app.use(express.json({ 
  limit: '512kb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    if ((req as any).path && (req as any).path.includes('/webhooks/')) {
      (req as any).rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// Compression middleware
app.use(compression());

// Request logging
app.use(requestLogger);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (before any middleware that might cause issues)
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: "ok" });
});


// Public health check for monitoring
const apiVersion = process.env.API_VERSION || 'v1';

app.get(`/api/${apiVersion}/monitoring/health`, (req, res) => {
  res.json({ 
    status: "healthy", 
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Enhanced health check routes
app.use('/api/v1', healthRoutes);

// Debug endpoint to list all routes
app.get('/api/v1/monitoring/routes', (_req, res) => {
  res.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      API_VERSION: process.env.API_VERSION || 'v1',
      PORT: process.env.PORT,
      HOST: process.env.HOST
    },
    routes: listEndpoints(app)
  });
});

// Maintenance mode check
app.use(async (req, res, next) => {
  if (await featureFlags.isMaintenanceMode() && !req.path.includes('/healthz')) {
    return res.status(503).json({
      error: 'Service temporarily unavailable for maintenance',
      retryAfter: 3600
    });
  }
  next();
});

// API routes with enhanced security
logger.info(`Mounting auth routes at /api/${apiVersion}/auth`);
app.use(`/api/${apiVersion}/auth`, authLimiter, loginSlowDown, authRoutes);
app.use(`/api/${apiVersion}/me`, authMiddleware, authRoutes); // GET /me route
app.use(`/api/${apiVersion}/wallet`, authMiddleware, paymentLimiter, walletRoutes);
app.use(`/api/${apiVersion}/streams`, authMiddleware, socialLimiter, streamsRoutes);
app.use(`/api/${apiVersion}/gifts`, authMiddleware, socialLimiter, giftsRoutes);
app.use(`/api/${apiVersion}/throne`, authMiddleware, socialLimiter, throneRoutes);
app.use(`/api/${apiVersion}/og`, authMiddleware, ogRoutes);
app.use(`/api/${apiVersion}/chat`, authMiddleware, socialLimiter, chatRoutes);
app.use(`/api/${apiVersion}/reels`, authMiddleware, reelsRoutes);
app.use(`/api/${apiVersion}/search`, searchRoutes);
app.use(`/api/${apiVersion}/global-expansion`, globalExpansionRoutes);
app.use(`/api/${apiVersion}/creator-economy`, authMiddleware, creatorEconomyRoutes);
app.use(`/api/${apiVersion}/games`, authMiddleware, gamesRoutes);
app.use(`/api/${apiVersion}/games/v2`, gamesRoutesV2); // New enhanced games with staking
app.use(`/api/${apiVersion}/config`, authMiddleware, configRoutes);
app.use(`/api/${apiVersion}/kyc`, authMiddleware, kycRoutes);
import { adminOnly } from '@/middleware/admin';
app.use(`/api/${apiVersion}/admin`, authMiddleware, adminOnly, adminRoutes);
app.use(`/api/${apiVersion}/monitoring`, monitoringRoutes);
app.use(`/api/${apiVersion}/security`, securityRoutes);

// New creator economy routes
app.use(`/api/${apiVersion}/nft`, nftRoutes);
app.use(`/api/${apiVersion}/subscription`, subscriptionRoutes);
app.use(`/api/${apiVersion}/analytics`, creatorAnalyticsRoutes);
app.use(`/api/${apiVersion}/commerce`, commerceRoutes);

// AI Content Studio routes
app.use(`/api/${apiVersion}/ai-content-studio`, aiContentStudioRoutes);

// AI Content Generation routes
app.use(`/api/${apiVersion}/ai-content`, authMiddleware, aiContentRoutes);

// Phase 4: Interactive Features routes
// app.use(`/api/${process.env.API_VERSION || 'v1'}/collaboration`, collaborationRoutes);
// app.use(`/api/${process.env.API_VERSION || 'v1'}/storytelling`, storytellingRoutes);

// Phase 5: Web3 & Blockchain Integration routes
// app.use(`/api/${process.env.API_VERSION || 'v1'}/blockchain`, blockchainRoutes);
// app.use(`/api/${process.env.API_VERSION || 'v1'}/dao`, daoRoutes);

// Phase 6: Advanced Discovery & UX routes
// app.use(`/api/${process.env.API_VERSION || 'v1'}/cultural`, culturalRoutes);
// app.use(`/api/${process.env.API_VERSION || 'v1'}/wellbeing`, wellbeingRoutes);

// Start cron scheduler
// import { cronScheduler } from './cron';
// cronScheduler.start();

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const startServer = async () => {
  try {
    // Check required environment variables
    const requiredEnvVars = ['MONGODB_URI', 'REDIS_URL', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.warn(`Missing environment variables: ${missingVars.join(', ')}`);
      logger.warn('Starting server in limited mode - some features may not work');
    }

    // Connect to database (with fallback)
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.warn('Database connection failed:', error instanceof Error ? error.message : String(error));
      logger.warn('Continuing without database - some features will be disabled');
    }

    // Connect to Redis (with fallback)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed:', error instanceof Error ? error.message : String(error));
      logger.warn('Continuing without Redis - caching and real-time features will be disabled');
    }

    // Initialize feature flags (with fallback)
    try {
      await featureFlags.initializeFlags();
      logger.info('Feature flags initialized successfully');
    } catch (error) {
      logger.warn('Feature flags initialization failed:', error instanceof Error ? error.message : String(error));
      logger.warn('Continuing with default feature flags');
    }

    // Setup Socket.IO with Redis adapter for multi-instance scaling (with fallback)
    try {
      setupSocketIO(io);
      await setupRedisAdapter(io);
      logger.info('Socket.IO configured with Redis adapter');
    } catch (error) {
      logger.warn('Socket.IO Redis adapter setup failed:', error instanceof Error ? error.message : String(error));
      logger.warn('Continuing with basic Socket.IO setup');
    }

    // Setup live realtime layer
    try {
      setIo(liveIo);
      logger.info('Live realtime layer configured successfully');
    } catch (error) {
      logger.warn('Live realtime layer setup failed:', error instanceof Error ? error.message : String(error));
      logger.warn('Continuing without live realtime features');
    }

    // Start server
    server.listen(port, host, () => {
      logger.info(`🚀 HaloBuzz Backend Server running on http://${host}:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
      logger.info(`Security hardening: ENABLED`);
      logger.info(`Feature flags: ENABLED`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Export app for testing
export { app };

startServer();
