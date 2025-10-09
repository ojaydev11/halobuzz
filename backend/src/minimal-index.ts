import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

// Minimal middleware only
app.use(express.json({ limit: '1kb' }));

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
app.listen(port, host, () => {
  console.log(`🚀 HaloBuzz Backend (Minimal) running on http://${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log(`Health check: http://${host}:${port}/healthz`);
});

export { app };
