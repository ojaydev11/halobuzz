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

// Import configurations
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { setupSocketIO, setupRedisAdapter } from '@/config/socket';
import { setupLogger } from '@/config/logger';
import { validateSecrets } from '@/config/secrets';
import { featureFlags } from '@/config/flags';

// Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authMiddleware } from '@/middleware/auth';
import { metricsMiddleware } from '@/middleware/metrics';
import { 
  securityMonitoringMiddleware, 
  authenticationMonitoringMiddleware, 
  dataAccessMonitoringMiddleware, 
  rateLimitMonitoringMiddleware 
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
import gamesRoutes from '@/routes/games';
import adminRoutes from '@/routes/admin';
import configRoutes from '@/routes/config';
import kycRoutes from '@/routes/kyc';
import monitoringRoutes from '@/routes/monitoring';
import securityRoutes from '@/routes/security';

// New creator economy routes
import nftRoutes from '@/routes/nft';
import subscriptionRoutes from '@/routes/subscription';
import creatorAnalyticsRoutes from '@/routes/creator-analytics';
import commerceRoutes from '@/routes/commerce';

// Phase 4: Interactive Features routes
import collaborationRoutes from '@/routes/collaboration';
import storytellingRoutes from '@/routes/storytelling';

// Phase 5: Web3 & Blockchain Integration routes
import blockchainRoutes from '@/routes/blockchain';
import daoRoutes from '@/routes/dao';

// Phase 6: Advanced Discovery & UX routes
import culturalRoutes from '@/routes/cultural';
import wellbeingRoutes from '@/routes/wellbeing';

// Load environment variables
dotenv.config();

// Validate critical secrets
validateSecrets();

const app = express();

// Trust proxy for Railway/Vercel
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
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
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Device-ID',
    'X-Request-ID'
  ],
  maxAge: 600 // 10 minutes preflight cache
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

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: "ok" });
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
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authLimiter, loginSlowDown, authRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/me`, authMiddleware, authRoutes); // GET /me route
app.use(`/api/${process.env.API_VERSION || 'v1'}/wallet`, authMiddleware, paymentLimiter, walletRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/streams`, authMiddleware, socialLimiter, streamsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/gifts`, authMiddleware, socialLimiter, giftsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/throne`, authMiddleware, socialLimiter, throneRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/og`, authMiddleware, ogRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/chat`, authMiddleware, socialLimiter, chatRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/reels`, authMiddleware, reelsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/games`, authMiddleware, gamesRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/config`, authMiddleware, configRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/kyc`, authMiddleware, kycRoutes);
import { adminOnly } from '@/middleware/admin';
app.use(`/api/${process.env.API_VERSION || 'v1'}/admin`, authMiddleware, adminOnly, adminRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/monitoring`, monitoringRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/security`, securityRoutes);

// New creator economy routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/nft`, nftRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/subscription`, subscriptionRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/analytics`, creatorAnalyticsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/commerce`, commerceRoutes);

// Phase 4: Interactive Features routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/collaboration`, collaborationRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/storytelling`, storytellingRoutes);

// Phase 5: Web3 & Blockchain Integration routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/blockchain`, blockchainRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/dao`, daoRoutes);

// Phase 6: Advanced Discovery & UX routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/cultural`, culturalRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/wellbeing`, wellbeingRoutes);

// Start cron scheduler
import { cronScheduler } from './cron';
cronScheduler.start();

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
      logger.warn('Database connection failed:', error.message);
      logger.warn('Continuing without database - some features will be disabled');
    }

    // Connect to Redis (with fallback)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed:', error.message);
      logger.warn('Continuing without Redis - caching and real-time features will be disabled');
    }

    // Initialize feature flags (with fallback)
    try {
      await featureFlags.initializeFlags();
      logger.info('Feature flags initialized successfully');
    } catch (error) {
      logger.warn('Feature flags initialization failed:', error.message);
      logger.warn('Continuing with default feature flags');
    }

    // Setup Socket.IO with Redis adapter for multi-instance scaling (with fallback)
    try {
      setupSocketIO(io);
      await setupRedisAdapter(io);
      logger.info('Socket.IO configured with Redis adapter');
    } catch (error) {
      logger.warn('Socket.IO Redis adapter setup failed:', error.message);
      logger.warn('Continuing with basic Socket.IO setup');
    }

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 HaloBuzz Backend Server running on port ${PORT}`);
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
