import express from 'express';
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

const app = express();
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

// Middleware
app.use(helmet());
app.use(compression());
app.use(corsHandler);
app.use(requestLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'halobuzz-ai-engine',
      version: '1.0.0',
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      environment: NODE_ENV
    }
  });
});

// API routes
app.use('/internal/moderation', moderationRoutes);
app.use('/internal/engagement', engagementRoutes);
app.use('/internal/reputation', reputationRoutes);

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
  logger.info('HaloBuzz AI Engine started', {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  logger.info('Available endpoints:', {
    moderation: '/internal/moderation/*',
    engagement: '/internal/engagement/*',
    reputation: '/internal/reputation/*',
    health: '/health'
  });
});

export default app;
