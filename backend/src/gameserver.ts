#!/usr/bin/env node

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { AgentOrchestrator } from './agents/AgentOrchestrator.js';
import { NetcodeAgent } from './agents/NetcodeAgent.js';
import { MatchmakingAgent } from './agents/MatchmakingAgent.js';
import { TelemetryAgent } from './agents/TelemetryAgent.js';

const app = express();
const server = createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5011;
const SERVER_ID = process.env.SERVER_ID || 'game-server-1';
const MAX_CONCURRENT_MATCHES = parseInt(process.env.MAX_CONCURRENT_MATCHES || '10');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    serverId: SERVER_ID,
    activeMatches: orchestrator.getActiveMatches(),
    maxMatches: MAX_CONCURRENT_MATCHES,
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  const metrics = orchestrator.getMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// Initialize agent orchestrator
const orchestrator = new AgentOrchestrator();

async function startGameServer() {
  try {
    console.log(`🎮 Starting HaloBuzz Game Server ${SERVER_ID}...`);

    // Initialize agents
    const netcodeAgent = new NetcodeAgent({
      id: `netcode-${SERVER_ID}`,
      name: 'Netcode Agent',
      description: 'Handles real-time game networking',
      maxConcurrency: MAX_CONCURRENT_MATCHES
    });

    const matchmakingAgent = new MatchmakingAgent({
      id: `matchmaking-${SERVER_ID}`,
      name: 'Matchmaking Agent',
      description: 'Manages game lobbies and player matching'
    });

    const telemetryAgent = new TelemetryAgent({
      id: `telemetry-${SERVER_ID}`,
      name: 'Telemetry Agent',
      description: 'Collects game metrics and analytics'
    });

    // Register agents with orchestrator
    await orchestrator.registerAgent(netcodeAgent);
    await orchestrator.registerAgent(matchmakingAgent);
    await orchestrator.registerAgent(telemetryAgent);

    // Initialize orchestrator
    await orchestrator.initialize();

    // Set up WebSocket handling
    io.on('connection', (socket) => {
      console.log(`🔌 Player connected: ${socket.id}`);

      // Forward socket to netcode agent
      netcodeAgent.handlePlayerConnection(socket);

      socket.on('disconnect', () => {
        console.log(`🔌 Player disconnected: ${socket.id}`);
        netcodeAgent.handlePlayerDisconnection(socket.id);
      });

      // Handle matchmaking requests
      socket.on('findMatch', async (data) => {
        try {
          const response = await orchestrator.processMessage({
            id: `match-${Date.now()}`,
            type: 'FIND_MATCH',
            sender: 'client',
            recipient: `matchmaking-${SERVER_ID}`,
            payload: { ...data, playerId: socket.id },
            timestamp: Date.now()
          });

          if (response) {
            socket.emit('matchFound', response.payload);
          }
        } catch (error) {
          console.error('Matchmaking error:', error);
          socket.emit('matchError', { error: 'Failed to find match' });
        }
      });

      // Handle game input
      socket.on('gameInput', async (data) => {
        await orchestrator.processMessage({
          id: `input-${Date.now()}`,
          type: 'GAME_INPUT',
          sender: socket.id,
          recipient: `netcode-${SERVER_ID}`,
          payload: data,
          timestamp: Date.now()
        });
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 Game Server ${SERVER_ID} running on port ${PORT}`);
      console.log(`📊 Max concurrent matches: ${MAX_CONCURRENT_MATCHES}`);
      console.log(`🔧 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down game server gracefully...');
      await orchestrator.shutdown();
      server.close(() => {
        console.log('✅ Game server shutdown complete');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start game server:', error);
    process.exit(1);
  }
}

// Add method to orchestrator for health checks
(orchestrator as any).getActiveMatches = function() {
  return this.agents.get(`netcode-${SERVER_ID}`)?.activeMatches?.size || 0;
};

(orchestrator as any).getMetrics = function() {
  const agents = Array.from(this.agents.values());
  let metrics = '';

  agents.forEach(agent => {
    metrics += `# HELP agent_messages_total Total messages processed by agent\n`;
    metrics += `# TYPE agent_messages_total counter\n`;
    metrics += `agent_messages_total{agent="${agent.config.id}"} ${agent.metrics.totalMessages}\n`;

    metrics += `# HELP agent_response_time_ms Average response time in milliseconds\n`;
    metrics += `# TYPE agent_response_time_ms gauge\n`;
    metrics += `agent_response_time_ms{agent="${agent.config.id}"} ${agent.metrics.averageResponseTime}\n`;
  });

  return metrics;
};

startGameServer();