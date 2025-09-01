import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import configurations
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import { setupSocketIO } from '@/config/socket';
import { setupLogger } from '@/config/logger';

// Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authMiddleware } from '@/middleware/auth';

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

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const logger = setupLogger();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// API routes
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/me`, authMiddleware, authRoutes); // GET /me route
app.use(`/api/${process.env.API_VERSION || 'v1'}/wallet`, authMiddleware, walletRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/streams`, authMiddleware, streamsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/gifts`, authMiddleware, giftsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/throne`, authMiddleware, throneRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/og`, authMiddleware, ogRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/chat`, authMiddleware, chatRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/reels`, authMiddleware, reelsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/games`, authMiddleware, gamesRoutes);
import { adminOnly } from '@/middleware/admin';
app.use(`/api/${process.env.API_VERSION || 'v1'}/admin`, authMiddleware, adminOnly, adminRoutes);

// Setup Socket.IO
setupSocketIO(io);

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
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 HaloBuzz Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
