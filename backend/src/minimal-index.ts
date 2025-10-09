import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

const apiVersion = process.env.API_VERSION || 'v1';
app.get(`/api/${apiVersion}/monitoring/health`, (_req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
server.listen(port, host, () => {
  console.log(`🚀 HaloBuzz Backend (Minimal) running on http://${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://${host}:${port}/healthz`);
});

export { app };
