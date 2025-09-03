import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import middleware
import { 
  requestLogger, 
  errorHandler, 
  corsHandler 
} from './middleware/auth';
import {
  validateServiceJWT,
  validateHMACSignature,
  internalIPAllowlist,
  internalAPILimiter,
  requestId,
  sanitizeAIInput,
  aiSecurityHeaders,
  auditAIDecision
} from './middleware/security';

// Import routes
import moderationRoutes from './routes/moderation';
import engagementRoutes from './routes/engagement';
import reputationRoutes from './routes/reputation';

// Import services
import { ModerationService } from './services/ModerationService';
import { EngagementService } from './services/EngagementService';
import { ReputationShield } from './services/ReputationShield';

// Import utilities
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Validate critical AI service secrets
if (!process.env.AI_SERVICE_SECRET) {
  console.error('AI_SERVICE_SECRET is required but not set');
  process.exit(1);
}

const app: Express = express();

// Trust proxy for Railway
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.BACKEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize services
const moderationService = ModerationService.getInstance();
const engagementService = EngagementService.getInstance();
const reputationShield = ReputationShield.getInstance();

// Security middleware
app.use(requestId);
app.use(aiSecurityHeaders);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'none'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "no-referrer" }
}));
app.use(compression());
app.use(corsHandler);
app.use(requestLogger);

// Rate limiting for all requests
app.use(internalAPILimiter);

// Input sanitization
app.use(sanitizeAIInput);

// Body parsing with strict limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Public health check endpoint (no auth required)
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'halobuzz-ai-engine',
    version: '1.0.0',
    status: 'healthy'
  });
});

// Detailed health check (no sensitive info)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'halobuzz-ai-engine',
      version: '1.0.0',
      status: 'healthy',
      timestamp: Date.now(),
      uptime: Math.floor(process.uptime()),
      environment: NODE_ENV === 'production' ? 'production' : 'development'
    }
  });
});

// Protected internal API routes
app.use('/internal/moderation', 
  internalIPAllowlist, 
  validateServiceJWT, 
  validateHMACSignature,
  auditAIDecision,
  moderationRoutes
);
app.use('/internal/engagement', 
  internalIPAllowlist, 
  validateServiceJWT, 
  validateHMACSignature,
  auditAIDecision,
  engagementRoutes
);
app.use('/internal/reputation', 
  internalIPAllowlist, 
  validateServiceJWT, 
  validateHMACSignature,
  auditAIDecision,
  reputationRoutes
);

// Socket.IO event handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Handle AI warning events from moderation service
  moderationService.on('ai:warning', (warningEvent) => {
    socket.emit('ai:warning', warningEvent);
    logger.info('AI warning event emitted', { 
      userId: warningEvent.userId,
      action: warningEvent.action.action 
    });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: Date.now()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info('🤖 HaloBuzz AI Engine started', {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    security: 'HARDENED',
    authentication: 'JWT + HMAC',
    rateLimit: 'ENABLED'
  });
  
  logger.info('Available endpoints:', {
    public: '/ (health)',
    health: '/health',
    moderation: '/internal/moderation/* (PROTECTED)',
    engagement: '/internal/engagement/* (PROTECTED)',
    reputation: '/internal/reputation/* (PROTECTED)'
  });
  
  logger.info('Security features:', {
    ipAllowlist: 'ENABLED',
    jwtAuth: 'ENABLED',
    hmacSignature: 'ENABLED',
    rateLimiting: 'ENABLED',
    inputSanitization: 'ENABLED',
    auditLogging: 'ENABLED'
  });
});

export default app;
