import express, { Express } from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('🔍 Environment check:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT: ${process.env.PORT}`);
console.log(`- AI_SERVICE_SECRET: ${process.env.AI_SERVICE_SECRET ? 'SET' : 'NOT SET'}`);

// Validate critical AI service secrets
if (!process.env.AI_SERVICE_SECRET) {
  console.error('❌ AI_SERVICE_SECRET is required but not set');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('AI')));
  process.exit(1);
}

const app: Express = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple public health endpoint for probes
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Root health endpoint
app.get('/', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'HaloBuzz AI Engine',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Basic health endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'HaloBuzz AI Engine',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = createServer(app);

// Get port from environment
const PORT = Number(process.env.PORT ?? 4000);

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
console.log(`🚀 Starting AI Engine on port ${PORT}...`);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AI Engine successfully started on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- /healthz (probe)');
  console.log('- / (health)');
  console.log('- /health (health)');
});
