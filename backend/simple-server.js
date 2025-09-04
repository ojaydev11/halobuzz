const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const server = createServer(app);

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Basic API endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({ 
    message: "HaloBuzz API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
server.listen(port, host, () => {
  console.log(`🚀 HaloBuzz Backend Server running on http://${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check available at: http://${host}:${port}/healthz`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = { app };
