import { BaseAgent, AgentMessage } from './AgentOrchestrator';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { EventEmitter } from 'events';

interface NetworkConfig {
  tickRate: number; // 30-60 Hz
  bufferSize: number; // Client buffer frames
  lagCompensationWindow: number; // ms to rewind for hit validation
  snapshotInterval: number; // ms between full snapshots
  maxClients: number;
  port: number;
}

interface ClientState {
  id: string;
  socket: WebSocket;
  lastUpdate: number;
  rtt: number;
  jitter: number;
  packetLoss: number;
  sequence: number;
  acknowledged: number;
  buffer: GameInput[];
  position: Vector3;
  velocity: Vector3;
  health: number;
  isConnected: boolean;
}

interface GameInput {
  sequence: number;
  timestamp: number;
  move: Vector3;
  aim: Vector3;
  fire: boolean;
  checksum: number;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface GameSnapshot {
  tick: number;
  timestamp: number;
  entities: EntityState[];
  events: GameEvent[];
}

interface EntityState {
  id: string;
  type: 'player' | 'projectile' | 'pickup' | 'environment';
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  health?: number;
  data?: any;
}

interface GameEvent {
  type: 'damage' | 'death' | 'pickup' | 'spawn';
  actorId: string;
  targetId?: string;
  position: Vector3;
  data?: any;
}

export class NetcodeAgent extends BaseAgent {
  private server: WebSocketServer | null = null;
  private httpServer: any = null;
  private clients = new Map<string, ClientState>();
  private gameState: GameSnapshot = { tick: 0, timestamp: Date.now(), entities: [], events: [] };
  private networkConfig: NetworkConfig;
  private tickTimer: NodeJS.Timeout | null = null;
  private snapshotHistory: GameSnapshot[] = [];
  private networkMetrics = {
    totalClients: 0,
    activeClients: 0,
    avgRTT: 0,
    avgJitter: 0,
    packetLossRate: 0,
    serverFrameTime: 0,
    ticksProcessed: 0,
  };

  constructor(config: any) {
    super({
      id: 'netcode',
      name: 'Netcode & Scale Agent',
      role: 'Infrastructure',
      priority: 1,
      dependencies: [],
      timeout: 5000,
      retryCount: 3,
    });

    this.networkConfig = {
      tickRate: 30, // 30 Hz default
      bufferSize: 64, // 64 frame buffer
      lagCompensationWindow: 200, // 200ms lag compensation
      snapshotInterval: 1000, // Full snapshot every 1s
      maxClients: 100,
      port: 8080,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Netcode Agent...');

    // Create HTTP server for WebSocket upgrade
    this.httpServer = createServer();

    // Create WebSocket server
    this.server = new WebSocketServer({ server: this.httpServer });

    // Set up connection handling
    this.server.on('connection', (socket, request) => {
      this.handleNewConnection(socket, request);
    });

    // Start the server
    await new Promise<void>((resolve, reject) => {
      this.httpServer.listen(this.networkConfig.port, (error: any) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info(`Netcode server listening on port ${this.networkConfig.port}`);
          resolve();
        }
      });
    });

    // Start game tick loop
    this.startGameTick();

    // Start periodic snapshot cleanup
    this.startSnapshotCleanup();

    this.setStatus('idle');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const startTime = Date.now();
    let success = true;

    try {
      this.setStatus('busy');

      switch (message.data.action) {
        case 'get_server_status':
          return this.getServerStatus(message);

        case 'update_tick_rate':
          return this.updateTickRate(message);

        case 'kick_client':
          return this.kickClient(message);

        case 'get_lag_compensation_data':
          return this.getLagCompensationData(message);

        case 'simulate_load':
          return this.simulateLoad(message);

        default:
          throw new Error(`Unknown action: ${message.data.action}`);
      }

    } catch (error) {
      success = false;
      this.logger.error('Netcode Agent processing error:', error);

      return {
        id: this.generateMessageId(),
        type: 'response',
        from: this.networkConfig.id,
        to: message.from,
        data: { error: error.message },
        timestamp: Date.now(),
        correlationId: message.id,
      };

    } finally {
      this.updateMetrics(Date.now() - startTime, success);
      this.setStatus('idle');
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Netcode Agent...');

    // Stop game tick
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    // Disconnect all clients
    this.clients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(1001, 'Server shutting down');
      }
    });

    // Close server
    if (this.server) {
      this.server.close();
    }

    if (this.httpServer) {
      this.httpServer.close();
    }

    this.setStatus('offline');
  }

  // Connection Management
  private handleNewConnection(socket: WebSocket, request: any): void {
    const clientId = this.generateClientId();

    if (this.clients.size >= this.networkConfig.maxClients) {
      socket.close(1013, 'Server full');
      return;
    }

    const client: ClientState = {
      id: clientId,
      socket,
      lastUpdate: Date.now(),
      rtt: 0,
      jitter: 0,
      packetLoss: 0,
      sequence: 0,
      acknowledged: 0,
      buffer: [],
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      isConnected: true,
    };

    this.clients.set(clientId, client);
    this.networkMetrics.activeClients = this.clients.size;

    this.logger.info(`Client connected: ${clientId} (${this.clients.size}/${this.networkConfig.maxClients})`);

    // Set up message handling
    socket.on('message', (data) => {
      this.handleClientMessage(clientId, data);
    });

    socket.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    socket.on('pong', () => {
      this.handleClientPong(clientId);
    });

    // Send initial welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      clientId,
      config: {
        tickRate: this.networkConfig.tickRate,
        bufferSize: this.networkConfig.bufferSize,
      },
    });

    // Add player entity to game state
    this.gameState.entities.push({
      id: clientId,
      type: 'player',
      position: client.position,
      velocity: client.velocity,
      rotation: { x: 0, y: 0, z: 0 },
      health: client.health,
    });
  }

  private handleClientMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'input':
          this.processClientInput(clientId, message);
          break;

        case 'ping':
          this.handleClientPing(clientId, message);
          break;

        case 'ready':
          this.handleClientReady(clientId);
          break;

        default:
          this.logger.warn(`Unknown message type from ${clientId}: ${message.type}`);
      }

    } catch (error) {
      this.logger.error(`Error processing message from ${clientId}:`, error);
    }
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    this.networkMetrics.activeClients = this.clients.size;

    // Remove player entity from game state
    this.gameState.entities = this.gameState.entities.filter(entity => entity.id !== clientId);

    this.logger.info(`Client disconnected: ${clientId} (${this.clients.size}/${this.networkConfig.maxClients})`);
  }

  // Game Tick System
  private startGameTick(): void {
    const tickInterval = 1000 / this.networkConfig.tickRate;

    this.tickTimer = setInterval(() => {
      this.processTick();
    }, tickInterval);
  }

  private processTick(): void {
    const tickStart = Date.now();

    // Increment tick counter
    this.gameState.tick++;
    this.gameState.timestamp = tickStart;

    // Process client inputs with lag compensation
    this.processAllClientInputs();

    // Update game simulation
    this.updateGameSimulation();

    // Send delta snapshots to clients
    this.sendDeltaSnapshots();

    // Send full snapshot periodically
    if (this.gameState.tick % (this.networkConfig.snapshotInterval / (1000 / this.networkConfig.tickRate)) === 0) {
      this.sendFullSnapshot();
    }

    // Update performance metrics
    const tickTime = Date.now() - tickStart;
    this.updateServerMetrics(tickTime);

    // Performance budget check
    const targetFrameTime = 1000 / this.networkConfig.tickRate;
    if (tickTime > targetFrameTime * 1.5) {
      this.logger.warn(`Slow server frame: ${tickTime}ms (target: ${targetFrameTime}ms)`);
    }
  }

  private processAllClientInputs(): void {
    for (const [clientId, client] of this.clients) {
      // Process buffered inputs with lag compensation
      const compensatedTime = Date.now() - client.rtt / 2;
      const inputsToProcess = client.buffer.filter(input =>
        input.timestamp <= compensatedTime && input.sequence > client.acknowledged
      );

      for (const input of inputsToProcess) {
        this.processValidatedInput(clientId, input);
        client.acknowledged = input.sequence;
      }

      // Clean up processed inputs
      client.buffer = client.buffer.filter(input => input.sequence > client.acknowledged);
    }
  }

  private processValidatedInput(clientId: string, input: GameInput): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Validate input integrity
    if (!this.validateInput(input)) {
      this.logger.warn(`Invalid input from client ${clientId}`);
      return;
    }

    // Apply movement
    const deltaTime = 1 / this.networkConfig.tickRate;
    const maxSpeed = 10; // units per second

    // Clamp movement to prevent cheating
    const moveVector = this.clampVector(input.move, 1.0);
    client.velocity.x = moveVector.x * maxSpeed;
    client.velocity.z = moveVector.z * maxSpeed;

    // Update position
    client.position.x += client.velocity.x * deltaTime;
    client.position.z += client.velocity.z * deltaTime;

    // Update entity in game state
    const entity = this.gameState.entities.find(e => e.id === clientId);
    if (entity) {
      entity.position = { ...client.position };
      entity.velocity = { ...client.velocity };
    }

    // Handle shooting
    if (input.fire) {
      this.processShootingInput(clientId, input);
    }
  }

  private processShootingInput(clientId: string, input: GameInput): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Lag compensation: rewind game state to when shot was fired
    const shotTime = input.timestamp;
    const rewindSnapshot = this.getHistoricalSnapshot(shotTime);

    if (rewindSnapshot) {
      // Perform hit detection on rewound state
      const hit = this.performHitDetection(clientId, input.aim, rewindSnapshot);

      if (hit) {
        // Apply damage and create damage event
        this.gameState.events.push({
          type: 'damage',
          actorId: clientId,
          targetId: hit.targetId,
          position: hit.position,
          data: { damage: 25, weapon: 'rifle' },
        });

        this.logger.debug(`Hit confirmed: ${clientId} -> ${hit.targetId}`);
      }
    }
  }

  // Snapshot Management
  private sendDeltaSnapshots(): void {
    // Create delta from last sent snapshot
    const deltaSnapshot = this.createDeltaSnapshot();

    // Send to all connected clients
    this.clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, {
          type: 'delta_snapshot',
          tick: this.gameState.tick,
          timestamp: this.gameState.timestamp,
          delta: deltaSnapshot,
          your_state: {
            position: client.position,
            health: client.health,
          },
          net_stats: {
            rtt: client.rtt,
            jitter: client.jitter,
            loss: client.packetLoss,
          },
        });
      }
    });

    // Store snapshot in history for lag compensation
    this.snapshotHistory.push({ ...this.gameState });
  }

  private sendFullSnapshot(): void {
    this.clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        this.sendToClient(clientId, {
          type: 'full_snapshot',
          tick: this.gameState.tick,
          timestamp: this.gameState.timestamp,
          entities: this.gameState.entities,
          events: this.gameState.events,
        });
      }
    });

    // Clear events after full snapshot
    this.gameState.events = [];
  }

  private createDeltaSnapshot(): any {
    // Simple delta: only changed entities
    // In production, would use more sophisticated delta compression
    return {
      entities: this.gameState.entities.filter(entity => this.hasEntityChanged(entity)),
      events: this.gameState.events,
    };
  }

  // Utility Methods
  private validateInput(input: GameInput): boolean {
    // Basic input validation
    if (!input.move || !input.aim) return false;

    // Check for impossible values
    if (Math.abs(input.move.x) > 1 || Math.abs(input.move.z) > 1) return false;

    // Verify checksum if provided
    if (input.checksum) {
      const calculatedChecksum = this.calculateInputChecksum(input);
      return input.checksum === calculatedChecksum;
    }

    return true;
  }

  private clampVector(vector: Vector3, maxLength: number): Vector3 {
    const length = Math.sqrt(vector.x * vector.x + vector.z * vector.z);
    if (length > maxLength) {
      const scale = maxLength / length;
      return {
        x: vector.x * scale,
        y: vector.y,
        z: vector.z * scale,
      };
    }
    return vector;
  }

  private getHistoricalSnapshot(timestamp: number): GameSnapshot | null {
    // Find closest snapshot to the timestamp
    return this.snapshotHistory
      .filter(snap => snap.timestamp <= timestamp + this.networkConfig.lagCompensationWindow)
      .sort((a, b) => Math.abs(a.timestamp - timestamp) - Math.abs(b.timestamp - timestamp))[0] || null;
  }

  private performHitDetection(shooterId: string, aimVector: Vector3, snapshot: GameSnapshot): any {
    // Simplified hit detection - in production would use proper ray casting
    const shooter = snapshot.entities.find(e => e.id === shooterId);
    if (!shooter) return null;

    // Check for hits on other players
    for (const entity of snapshot.entities) {
      if (entity.id === shooterId || entity.type !== 'player') continue;

      const distance = this.calculateDistance(shooter.position, entity.position);
      if (distance < 1.0) { // Simple distance-based hit
        return {
          targetId: entity.id,
          position: entity.position,
        };
      }
    }

    return null;
  }

  private calculateDistance(pos1: Vector3, pos2: Vector3): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(data));
      } catch (error) {
        this.logger.error(`Error sending to client ${clientId}:`, error);
      }
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Message Handlers for Agent Communication
  private getServerStatus(message: AgentMessage): AgentMessage {
    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.networkConfig.id,
      to: message.from,
      data: {
        status: 'running',
        metrics: this.networkMetrics,
        config: this.networkConfig,
        clients: this.clients.size,
      },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private updateTickRate(message: AgentMessage): AgentMessage {
    const newTickRate = message.data.tickRate;

    if (newTickRate < 10 || newTickRate > 120) {
      throw new Error('Tick rate must be between 10 and 120 Hz');
    }

    this.networkConfig.tickRate = newTickRate;

    // Restart tick timer with new rate
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.startGameTick();
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.networkConfig.id,
      to: message.from,
      data: { success: true, newTickRate },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  // Additional helper methods would be implemented here...
  private processClientInput(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Add input to buffer
    const input: GameInput = {
      sequence: message.sequence,
      timestamp: message.timestamp,
      move: message.input.move,
      aim: message.input.aim,
      fire: message.input.fire || false,
      checksum: message.checksum || 0,
    };

    client.buffer.push(input);
    client.lastUpdate = Date.now();
  }

  private handleClientPing(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Send pong back with same timestamp
    this.sendToClient(clientId, {
      type: 'pong',
      timestamp: message.timestamp,
    });
  }

  private handleClientPong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Update RTT calculation
    const now = Date.now();
    const rtt = now - client.lastUpdate;

    // Exponential moving average
    client.rtt = client.rtt * 0.8 + rtt * 0.2;
  }

  private handleClientReady(clientId: string): void {
    // Client is ready to receive game data
    this.logger.debug(`Client ready: ${clientId}`);
  }

  private updateGameSimulation(): void {
    // Basic physics simulation
    const deltaTime = 1 / this.networkConfig.tickRate;

    // Update entity positions based on velocity
    for (const entity of this.gameState.entities) {
      if (entity.type === 'projectile') {
        entity.position.x += entity.velocity.x * deltaTime;
        entity.position.y += entity.velocity.y * deltaTime;
        entity.position.z += entity.velocity.z * deltaTime;
      }
    }

    // Remove expired entities
    this.gameState.entities = this.gameState.entities.filter(entity => {
      if (entity.type === 'projectile') {
        // Remove projectiles after 5 seconds
        return (Date.now() - (entity.data?.spawnTime || 0)) < 5000;
      }
      return true;
    });
  }

  private updateServerMetrics(frameTime: number): void {
    this.networkMetrics.ticksProcessed++;

    // Update average frame time
    const alpha = 0.1; // Smoothing factor
    this.networkMetrics.serverFrameTime = this.networkMetrics.serverFrameTime * (1 - alpha) + frameTime * alpha;

    // Update network metrics from clients
    let totalRTT = 0;
    let totalJitter = 0;
    let totalLoss = 0;
    let activeClients = 0;

    for (const client of this.clients.values()) {
      if (client.isConnected) {
        totalRTT += client.rtt;
        totalJitter += client.jitter;
        totalLoss += client.packetLoss;
        activeClients++;
      }
    }

    if (activeClients > 0) {
      this.networkMetrics.avgRTT = totalRTT / activeClients;
      this.networkMetrics.avgJitter = totalJitter / activeClients;
      this.networkMetrics.packetLossRate = totalLoss / activeClients;
    }
  }

  private startSnapshotCleanup(): void {
    // Clean up old snapshots every 5 seconds
    setInterval(() => {
      const cutoff = Date.now() - this.networkConfig.lagCompensationWindow * 2;
      this.snapshotHistory = this.snapshotHistory.filter(snap => snap.timestamp > cutoff);
    }, 5000);
  }

  private hasEntityChanged(entity: EntityState): boolean {
    // Simple change detection - in production would use more sophisticated tracking
    return true; // For now, assume all entities change each tick
  }

  private calculateInputChecksum(input: GameInput): number {
    // Simple checksum calculation
    const str = JSON.stringify({
      move: input.move,
      aim: input.aim,
      fire: input.fire,
      timestamp: input.timestamp,
    });

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private kickClient(message: AgentMessage): AgentMessage {
    const { clientId, reason } = message.data;
    const client = this.clients.get(clientId);

    if (client) {
      client.socket.close(1008, reason || 'Kicked by admin');
      this.handleClientDisconnect(clientId);
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.networkConfig.id,
      to: message.from,
      data: { success: !!client, clientId },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private getLagCompensationData(message: AgentMessage): AgentMessage {
    const { timestamp } = message.data;
    const snapshot = this.getHistoricalSnapshot(timestamp);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.networkConfig.id,
      to: message.from,
      data: { snapshot, found: !!snapshot },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private simulateLoad(message: AgentMessage): AgentMessage {
    const { clientCount, duration } = message.data;

    // Create simulated clients for load testing
    this.logger.info(`Simulating ${clientCount} clients for ${duration}ms`);

    // This would spawn bot clients for testing
    // Implementation would create WebSocket connections and send realistic traffic

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.networkConfig.id,
      to: message.from,
      data: { success: true, simulatedClients: clientCount },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }
}