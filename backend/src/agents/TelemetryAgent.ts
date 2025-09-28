import { BaseAgent, AgentMessage } from './AgentOrchestrator';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';

interface GameEvent {
  eventId: string;
  eventType: string;
  gameMode: string;
  matchId?: string;
  playerId?: string;
  timestamp: number;
  properties: Record<string, any>;
  sessionId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface PlayerMetrics {
  playerId: string;
  sessionId: string;
  gameMode: string;
  matchId?: string;
  startTime: number;
  lastActivity: number;
  events: GameEvent[];
  performance: {
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    healing: number;
    objectiveScore: number;
    accuracyPercentage: number;
  };
  technical: {
    avgFps: number;
    avgPing: number;
    packetsLost: number;
    disconnections: number;
    clientVersion: string;
    platform: string;
    deviceInfo: any;
  };
}

interface MatchMetrics {
  matchId: string;
  gameMode: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  players: string[];
  events: GameEvent[];
  outcome: {
    winners: string[];
    losers: string[];
    averagePerformance: Record<string, number>;
  };
  server: {
    region: string;
    serverId: string;
    avgTickRate: number;
    maxConcurrentPlayers: number;
    totalBandwidthUsed: number;
  };
}

interface SystemMetrics {
  timestamp: number;
  activeMatches: number;
  concurrentPlayers: number;
  totalEvents: number;
  eventRate: number; // events per second
  serverLoad: {
    cpuUsage: number;
    memoryUsage: number;
    networkBandwidth: number;
    diskIO: number;
  };
  gameSpecific: Record<string, {
    activeMatches: number;
    queuedPlayers: number;
    averageMatchDuration: number;
    completionRate: number;
  }>;
}

interface Alert {
  id: string;
  type: 'performance' | 'security' | 'gameplay' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  matchId?: string;
  playerId?: string;
  properties: Record<string, any>;
  resolved: boolean;
  resolvedAt?: number;
}

interface Dashboard {
  id: string;
  name: string;
  gameMode?: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
  filters: Record<string, any>;
}

interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'heatmap' | 'timeline';
  title: string;
  query: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

// Event Schema Definitions
const EVENT_SCHEMAS = {
  // Core game events
  'match.started': {
    required: ['matchId', 'gameMode', 'playerIds', 'serverRegion'],
    properties: {
      matchId: 'string',
      gameMode: 'string',
      playerIds: 'array',
      serverRegion: 'string',
      expectedDuration: 'number'
    }
  },
  'match.ended': {
    required: ['matchId', 'duration', 'outcome'],
    properties: {
      matchId: 'string',
      duration: 'number',
      outcome: 'object',
      reason: 'string'
    }
  },
  'player.joined': {
    required: ['playerId', 'matchId', 'teamId'],
    properties: {
      playerId: 'string',
      matchId: 'string',
      teamId: 'string',
      connectionTime: 'number'
    }
  },
  'player.left': {
    required: ['playerId', 'matchId', 'reason'],
    properties: {
      playerId: 'string',
      matchId: 'string',
      reason: 'string',
      duration: 'number'
    }
  },
  'player.death': {
    required: ['victimId', 'killerId', 'weapon'],
    properties: {
      victimId: 'string',
      killerId: 'string',
      weapon: 'string',
      headshot: 'boolean',
      distance: 'number',
      position: 'object'
    }
  },
  'player.achievement': {
    required: ['playerId', 'achievementId'],
    properties: {
      playerId: 'string',
      achievementId: 'string',
      progress: 'number',
      unlocked: 'boolean'
    }
  },

  // Performance events
  'performance.fps_drop': {
    required: ['playerId', 'fps', 'duration'],
    properties: {
      playerId: 'string',
      fps: 'number',
      duration: 'number',
      cause: 'string'
    }
  },
  'performance.lag_spike': {
    required: ['playerId', 'latency', 'duration'],
    properties: {
      playerId: 'string',
      latency: 'number',
      duration: 'number',
      packetLoss: 'number'
    }
  },
  'performance.server_overload': {
    required: ['serverId', 'cpuUsage', 'memoryUsage'],
    properties: {
      serverId: 'string',
      cpuUsage: 'number',
      memoryUsage: 'number',
      activeMatches: 'number'
    }
  },

  // Security events
  'security.suspected_cheat': {
    required: ['playerId', 'cheatType', 'confidence'],
    properties: {
      playerId: 'string',
      cheatType: 'string',
      confidence: 'number',
      evidence: 'object'
    }
  },
  'security.rate_limit_exceeded': {
    required: ['playerId', 'action', 'rate'],
    properties: {
      playerId: 'string',
      action: 'string',
      rate: 'number',
      limit: 'number'
    }
  }
};

export class TelemetryAgent extends BaseAgent {
  private eventBuffer: GameEvent[] = [];
  private playerMetrics = new Map<string, PlayerMetrics>();
  private matchMetrics = new Map<string, MatchMetrics>();
  private systemMetrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private dashboards: Dashboard[] = [];

  // Processing configuration
  private batchSize = 1000;
  private flushInterval = 5000; // 5 seconds
  private retentionDays = 30;
  private maxBufferSize = 10000;

  // Alert thresholds
  private alertThresholds = {
    highLatency: 200,
    lowFps: 30,
    highCpuUsage: 80,
    highMemoryUsage: 90,
    suspiciousKillRate: 10,
    highDisconnectionRate: 0.15,
  };

  private processingTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    this.logger.info('Telemetry & Analytics Agent initializing...');

    // Initialize default dashboards
    await this.createDefaultDashboards();

    // Start processing timers
    this.startEventProcessing();
    this.startMetricsCollection();

    // Initialize data retention cleanup
    this.startDataRetentionCleanup();

    this.setStatus('idle');
    this.logger.info('Telemetry Agent initialized with real-time analytics');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const startTime = Date.now();
    let success = true;

    try {
      this.setStatus('busy');

      switch (message.data.action) {
        case 'track_event':
          return await this.handleTrackEvent(message);
        case 'get_metrics':
          return await this.handleGetMetrics(message);
        case 'create_alert':
          return await this.handleCreateAlert(message);
        case 'get_dashboard':
          return await this.handleGetDashboard(message);
        case 'query_events':
          return await this.handleQueryEvents(message);
        case 'player_session_start':
          return await this.handlePlayerSessionStart(message);
        case 'player_session_end':
          return await this.handlePlayerSessionEnd(message);
        case 'match_metrics':
          return await this.handleMatchMetrics(message);
        default:
          throw new Error(`Unknown telemetry action: ${message.data.action}`);
      }

    } catch (error) {
      success = false;
      this.logger.error('Telemetry processing error:', error);

      return {
        id: this.generateMessageId(),
        type: 'response',
        from: this.config.id,
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
    this.logger.info('Telemetry Agent shutting down...');

    // Stop all timers
    if (this.processingTimer) clearInterval(this.processingTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);

    // Flush remaining events
    await this.flushEventBuffer();

    this.setStatus('offline');
    this.logger.info('Telemetry Agent shutdown complete');
  }

  // Core event handling
  private async handleTrackEvent(message: AgentMessage): Promise<AgentMessage> {
    const { eventType, gameMode, matchId, playerId, properties, sessionId } = message.data;

    // Validate event schema
    if (!this.validateEventSchema(eventType, properties)) {
      throw new Error(`Invalid event schema for ${eventType}`);
    }

    const event: GameEvent = {
      eventId: this.generateEventId(),
      eventType,
      gameMode,
      matchId,
      playerId,
      timestamp: Date.now(),
      properties,
      sessionId,
      severity: this.determineSeverity(eventType, properties),
    };

    // Add to buffer
    this.eventBuffer.push(event);

    // Update player metrics if applicable
    if (playerId) {
      this.updatePlayerMetrics(playerId, event);
    }

    // Update match metrics if applicable
    if (matchId) {
      this.updateMatchMetrics(matchId, event);
    }

    // Check for immediate alerts
    await this.checkEventAlerts(event);

    // Flush buffer if it's getting full
    if (this.eventBuffer.length >= this.maxBufferSize) {
      await this.flushEventBuffer();
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true, eventId: event.eventId },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleGetMetrics(message: AgentMessage): Promise<AgentMessage> {
    const { type, timeRange, filters } = message.data;

    let metrics: any;

    switch (type) {
      case 'system':
        metrics = this.getSystemMetrics(timeRange);
        break;
      case 'player':
        metrics = this.getPlayerMetrics(filters?.playerId, timeRange);
        break;
      case 'match':
        metrics = this.getMatchMetrics(filters?.gameMode, timeRange);
        break;
      case 'performance':
        metrics = this.getPerformanceMetrics(timeRange);
        break;
      default:
        throw new Error(`Unknown metrics type: ${type}`);
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { metrics },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleQueryEvents(message: AgentMessage): Promise<AgentMessage> {
    const { query, limit = 100, offset = 0 } = message.data;

    const events = await this.queryEvents(query, limit, offset);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { events, total: events.length },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handlePlayerSessionStart(message: AgentMessage): Promise<AgentMessage> {
    const { playerId, sessionId, gameMode, deviceInfo, clientVersion } = message.data;

    const playerMetric: PlayerMetrics = {
      playerId,
      sessionId,
      gameMode,
      startTime: Date.now(),
      lastActivity: Date.now(),
      events: [],
      performance: {
        kills: 0,
        deaths: 0,
        assists: 0,
        damage: 0,
        healing: 0,
        objectiveScore: 0,
        accuracyPercentage: 0,
      },
      technical: {
        avgFps: 60,
        avgPing: 50,
        packetsLost: 0,
        disconnections: 0,
        clientVersion,
        platform: deviceInfo?.platform || 'unknown',
        deviceInfo,
      },
    };

    this.playerMetrics.set(`${playerId}:${sessionId}`, playerMetric);

    this.logger.info(`Player session started: ${playerId} (${sessionId})`);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleMatchMetrics(message: AgentMessage): Promise<AgentMessage> {
    const { matchId, gameMode, players, serverInfo } = message.data;

    const matchMetric: MatchMetrics = {
      matchId,
      gameMode,
      startTime: Date.now(),
      players,
      events: [],
      outcome: {
        winners: [],
        losers: [],
        averagePerformance: {},
      },
      server: {
        region: serverInfo.region,
        serverId: serverInfo.serverId,
        avgTickRate: serverInfo.tickRate || 30,
        maxConcurrentPlayers: players.length,
        totalBandwidthUsed: 0,
      },
    };

    this.matchMetrics.set(matchId, matchMetric);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  // Event processing and analytics
  private startEventProcessing(): void {
    this.processingTimer = setInterval(async () => {
      if (this.eventBuffer.length > 0) {
        await this.flushEventBuffer();
      }
    }, this.flushInterval);
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    PerformanceMonitor.markStart('telemetry_flush');

    const eventsToProcess = this.eventBuffer.splice(0, this.batchSize);

    // Process events in batches
    await this.processEventBatch(eventsToProcess);

    PerformanceMonitor.markEnd('telemetry_flush');

    this.logger.info(`Processed ${eventsToProcess.length} events`);
  }

  private async processEventBatch(events: GameEvent[]): Promise<void> {
    // Group events by type for efficient processing
    const eventsByType = this.groupEventsByType(events);

    // Process each event type
    for (const [eventType, typeEvents] of Object.entries(eventsByType)) {
      await this.processEventType(eventType, typeEvents);
    }

    // Update system metrics
    this.updateSystemMetrics(events);

    // Run anomaly detection
    await this.runAnomalyDetection(events);
  }

  private async processEventType(eventType: string, events: GameEvent[]): Promise<void> {
    switch (eventType) {
      case 'match.started':
        await this.processMatchStartEvents(events);
        break;
      case 'match.ended':
        await this.processMatchEndEvents(events);
        break;
      case 'player.death':
        await this.processPlayerDeathEvents(events);
        break;
      case 'performance.fps_drop':
        await this.processPerformanceEvents(events);
        break;
      case 'security.suspected_cheat':
        await this.processSecurityEvents(events);
        break;
      default:
        // Generic processing for unknown events
        this.logger.debug(`Processing ${events.length} ${eventType} events`);
    }
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
  }

  private collectSystemMetrics(): void {
    const now = Date.now();
    const recentEvents = this.eventBuffer.filter(e => now - e.timestamp < 60000);

    const systemMetric: SystemMetrics = {
      timestamp: now,
      activeMatches: this.matchMetrics.size,
      concurrentPlayers: this.playerMetrics.size,
      totalEvents: this.eventBuffer.length,
      eventRate: recentEvents.length / 60,
      serverLoad: {
        cpuUsage: this.getCpuUsage(),
        memoryUsage: this.getMemoryUsage(),
        networkBandwidth: this.getNetworkBandwidth(),
        diskIO: this.getDiskIO(),
      },
      gameSpecific: this.calculateGameSpecificMetrics(),
    };

    this.systemMetrics.push(systemMetric);

    // Keep only last hour of system metrics
    const oneHourAgo = now - 3600000;
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > oneHourAgo);
  }

  // Alert system
  private async checkEventAlerts(event: GameEvent): Promise<void> {
    const alerts: Alert[] = [];

    // Performance alerts
    if (event.eventType === 'performance.lag_spike' && event.properties.latency > this.alertThresholds.highLatency) {
      alerts.push(this.createAlert('performance', 'high', `High latency detected: ${event.properties.latency}ms`, event));
    }

    if (event.eventType === 'performance.fps_drop' && event.properties.fps < this.alertThresholds.lowFps) {
      alerts.push(this.createAlert('performance', 'medium', `Low FPS detected: ${event.properties.fps}`, event));
    }

    // Security alerts
    if (event.eventType === 'security.suspected_cheat') {
      const severity = event.properties.confidence > 0.8 ? 'critical' : 'high';
      alerts.push(this.createAlert('security', severity, `Suspected cheating: ${event.properties.cheatType}`, event));
    }

    // Gameplay alerts
    if (event.eventType === 'player.death') {
      const killerId = event.properties.killerId;
      const recentKills = this.countRecentKills(killerId, 300000); // 5 minutes

      if (recentKills > this.alertThresholds.suspiciousKillRate) {
        alerts.push(this.createAlert('gameplay', 'high', `Suspicious kill rate: ${recentKills} kills in 5 minutes`, event));
      }
    }

    // Add all new alerts
    for (const alert of alerts) {
      this.alerts.push(alert);
      await this.notifyAlert(alert);
    }

    // Clean up old alerts
    this.cleanupOldAlerts();
  }

  private createAlert(type: Alert['type'], severity: Alert['severity'], message: string, event: GameEvent): Alert {
    return {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      matchId: event.matchId,
      playerId: event.playerId,
      properties: { ...event.properties },
      resolved: false,
    };
  }

  private async notifyAlert(alert: Alert): Promise<void> {
    // Notify Game Director about critical alerts
    if (alert.severity === 'critical') {
      this.emit('message', {
        id: this.generateMessageId(),
        type: 'event',
        from: this.config.id,
        to: 'game-director',
        data: {
          event: 'critical_alert',
          alert,
        },
        timestamp: Date.now(),
      });
    }

    this.logger.warn(`Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  // Dashboard system
  private async createDefaultDashboards(): Promise<void> {
    // Real-time overview dashboard
    const overviewDashboard: Dashboard = {
      id: 'overview',
      name: 'Real-time Overview',
      refreshInterval: 5000,
      filters: {},
      widgets: [
        {
          id: 'concurrent-players',
          type: 'metric',
          title: 'Concurrent Players',
          query: 'SELECT COUNT(DISTINCT playerId) FROM active_sessions',
          position: { x: 0, y: 0, width: 3, height: 2 },
          config: { format: 'number', trend: true },
        },
        {
          id: 'active-matches',
          type: 'metric',
          title: 'Active Matches',
          query: 'SELECT COUNT(*) FROM active_matches',
          position: { x: 3, y: 0, width: 3, height: 2 },
          config: { format: 'number', trend: true },
        },
        {
          id: 'events-per-second',
          type: 'chart',
          title: 'Events per Second',
          query: 'SELECT timestamp, COUNT(*) FROM events GROUP BY timestamp',
          position: { x: 0, y: 2, width: 6, height: 3 },
          config: { type: 'line', interval: '1m' },
        },
        {
          id: 'server-performance',
          type: 'chart',
          title: 'Server Performance',
          query: 'SELECT timestamp, cpuUsage, memoryUsage FROM system_metrics',
          position: { x: 0, y: 5, width: 6, height: 3 },
          config: { type: 'area', metrics: ['cpuUsage', 'memoryUsage'] },
        },
      ],
    };

    // Game mode specific dashboards
    for (const gameMode of ['halo-royale', 'halo-arena', 'halo-rally', 'halo-raids', 'halo-tactics']) {
      const gameDashboard: Dashboard = {
        id: `${gameMode}-dashboard`,
        name: `${gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Analytics`,
        gameMode,
        refreshInterval: 10000,
        filters: { gameMode },
        widgets: [
          {
            id: 'match-duration',
            type: 'chart',
            title: 'Average Match Duration',
            query: `SELECT timestamp, AVG(duration) FROM matches WHERE gameMode = '${gameMode}'`,
            position: { x: 0, y: 0, width: 4, height: 3 },
            config: { type: 'line', format: 'duration' },
          },
          {
            id: 'player-performance',
            type: 'heatmap',
            title: 'Player Performance Heatmap',
            query: `SELECT playerId, AVG(kills), AVG(deaths) FROM player_stats WHERE gameMode = '${gameMode}'`,
            position: { x: 4, y: 0, width: 4, height: 3 },
            config: { xAxis: 'kills', yAxis: 'deaths' },
          },
        ],
      };

      this.dashboards.push(gameDashboard);
    }

    this.dashboards.push(overviewDashboard);
    this.logger.info(`Created ${this.dashboards.length} default dashboards`);
  }

  private async handleGetDashboard(message: AgentMessage): Promise<AgentMessage> {
    const { dashboardId } = message.data;

    const dashboard = this.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    // Execute widget queries and populate data
    const dashboardWithData = await this.populateDashboardData(dashboard);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { dashboard: dashboardWithData },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async populateDashboardData(dashboard: Dashboard): Promise<Dashboard> {
    const dashboardWithData = { ...dashboard };

    for (const widget of dashboardWithData.widgets) {
      try {
        const data = await this.executeQuery(widget.query, dashboard.filters);
        widget.config.data = data;
      } catch (error) {
        this.logger.error(`Error executing widget query: ${widget.id}`, error);
        widget.config.data = [];
      }
    }

    return dashboardWithData;
  }

  // Utility methods
  private validateEventSchema(eventType: string, properties: any): boolean {
    const schema = EVENT_SCHEMAS[eventType as keyof typeof EVENT_SCHEMAS];
    if (!schema) {
      this.logger.warn(`Unknown event type: ${eventType}`);
      return true; // Allow unknown events for flexibility
    }

    // Check required properties
    for (const required of schema.required) {
      if (!(required in properties)) {
        this.logger.warn(`Missing required property '${required}' for event type '${eventType}'`);
        return false;
      }
    }

    return true;
  }

  private determineSeverity(eventType: string, properties: any): GameEvent['severity'] {
    if (eventType.startsWith('security')) return 'critical';
    if (eventType.includes('error') || eventType.includes('crash')) return 'error';
    if (eventType.includes('warning') || eventType.includes('performance')) return 'warning';
    return 'info';
  }

  private updatePlayerMetrics(playerId: string, event: GameEvent): void {
    const sessionKey = `${playerId}:${event.sessionId || 'unknown'}`;
    const metrics = this.playerMetrics.get(sessionKey);

    if (!metrics) return;

    metrics.lastActivity = Date.now();
    metrics.events.push(event);

    // Update performance stats based on event type
    switch (event.eventType) {
      case 'player.death':
        if (event.properties.killerId === playerId) {
          metrics.performance.kills++;
        }
        if (event.properties.victimId === playerId) {
          metrics.performance.deaths++;
        }
        break;
      case 'player.damage':
        metrics.performance.damage += event.properties.amount || 0;
        break;
      case 'player.healing':
        metrics.performance.healing += event.properties.amount || 0;
        break;
    }

    // Update technical stats
    if (event.properties.fps) {
      metrics.technical.avgFps = (metrics.technical.avgFps + event.properties.fps) / 2;
    }
    if (event.properties.ping) {
      metrics.technical.avgPing = (metrics.technical.avgPing + event.properties.ping) / 2;
    }
  }

  private updateMatchMetrics(matchId: string, event: GameEvent): void {
    const metrics = this.matchMetrics.get(matchId);
    if (!metrics) return;

    metrics.events.push(event);

    // Update match end time and duration
    if (event.eventType === 'match.ended') {
      metrics.endTime = event.timestamp;
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.outcome = event.properties.outcome || metrics.outcome;
    }
  }

  private groupEventsByType(events: GameEvent[]): Record<string, GameEvent[]> {
    return events.reduce((groups, event) => {
      if (!groups[event.eventType]) {
        groups[event.eventType] = [];
      }
      groups[event.eventType].push(event);
      return groups;
    }, {} as Record<string, GameEvent[]>);
  }

  private async runAnomalyDetection(events: GameEvent[]): Promise<void> {
    // Detect unusual patterns
    const eventCounts = this.groupEventsByType(events);

    for (const [eventType, typeEvents] of Object.entries(eventCounts)) {
      const count = typeEvents.length;
      const historicalAverage = this.getHistoricalEventAverage(eventType);

      // Alert if event count is 3x higher than normal
      if (count > historicalAverage * 3) {
        const alert = this.createAlert('system', 'medium', `Unusual spike in ${eventType}: ${count} events (avg: ${historicalAverage})`, typeEvents[0]);
        this.alerts.push(alert);
        await this.notifyAlert(alert);
      }
    }
  }

  private countRecentKills(killerId: string, timeWindowMs: number): number {
    const cutoff = Date.now() - timeWindowMs;
    return this.eventBuffer.filter(e =>
      e.eventType === 'player.death' &&
      e.properties.killerId === killerId &&
      e.timestamp > cutoff
    ).length;
  }

  private getHistoricalEventAverage(eventType: string): number {
    // Simplified - would use proper historical data in production
    const baselineRates: Record<string, number> = {
      'player.death': 100,
      'match.started': 10,
      'match.ended': 10,
      'performance.lag_spike': 5,
      'security.suspected_cheat': 1,
    };

    return baselineRates[eventType] || 50;
  }

  // Metrics calculation methods
  private getSystemMetrics(timeRange?: { start: number; end: number }): SystemMetrics[] {
    if (!timeRange) {
      return this.systemMetrics.slice(-60); // Last hour
    }

    return this.systemMetrics.filter(m =>
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  private getPlayerMetrics(playerId?: string, timeRange?: { start: number; end: number }): any {
    const metrics = Array.from(this.playerMetrics.values());

    let filtered = playerId ? metrics.filter(m => m.playerId === playerId) : metrics;

    if (timeRange) {
      filtered = filtered.filter(m =>
        m.startTime >= timeRange.start && m.startTime <= timeRange.end
      );
    }

    return {
      totalSessions: filtered.length,
      averageSessionDuration: this.calculateAverageSessionDuration(filtered),
      performanceStats: this.aggregatePerformanceStats(filtered),
      technicalStats: this.aggregateTechnicalStats(filtered),
    };
  }

  private getMatchMetrics(gameMode?: string, timeRange?: { start: number; end: number }): any {
    let matches = Array.from(this.matchMetrics.values());

    if (gameMode) {
      matches = matches.filter(m => m.gameMode === gameMode);
    }

    if (timeRange) {
      matches = matches.filter(m =>
        m.startTime >= timeRange.start && m.startTime <= timeRange.end
      );
    }

    return {
      totalMatches: matches.length,
      completedMatches: matches.filter(m => m.endTime).length,
      averageDuration: this.calculateAverageDuration(matches),
      completionRate: matches.filter(m => m.endTime).length / matches.length,
    };
  }

  private getPerformanceMetrics(timeRange?: { start: number; end: number }): any {
    const performanceEvents = this.eventBuffer.filter(e =>
      e.eventType.startsWith('performance') &&
      (!timeRange || (e.timestamp >= timeRange.start && e.timestamp <= timeRange.end))
    );

    return {
      totalPerformanceEvents: performanceEvents.length,
      fpsDrops: performanceEvents.filter(e => e.eventType === 'performance.fps_drop').length,
      lagSpikes: performanceEvents.filter(e => e.eventType === 'performance.lag_spike').length,
      averageFps: this.calculateAverageFps(performanceEvents),
      averageLatency: this.calculateAverageLatency(performanceEvents),
    };
  }

  // System monitoring stubs
  private getCpuUsage(): number { return Math.random() * 100; }
  private getMemoryUsage(): number { return Math.random() * 100; }
  private getNetworkBandwidth(): number { return Math.random() * 1000; }
  private getDiskIO(): number { return Math.random() * 100; }

  private calculateGameSpecificMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const gameMode of ['halo-royale', 'halo-arena', 'halo-rally', 'halo-raids', 'halo-tactics']) {
      const matches = Array.from(this.matchMetrics.values()).filter(m => m.gameMode === gameMode);
      metrics[gameMode] = {
        activeMatches: matches.filter(m => !m.endTime).length,
        queuedPlayers: 0, // Would get from matchmaking agent
        averageMatchDuration: this.calculateAverageDuration(matches),
        completionRate: matches.filter(m => m.endTime).length / Math.max(1, matches.length),
      };
    }

    return metrics;
  }

  private calculateAverageSessionDuration(sessions: PlayerMetrics[]): number {
    if (sessions.length === 0) return 0;
    const now = Date.now();
    return sessions.reduce((sum, s) => sum + (s.lastActivity - s.startTime), 0) / sessions.length;
  }

  private aggregatePerformanceStats(sessions: PlayerMetrics[]): any {
    if (sessions.length === 0) return {};

    return {
      averageKills: sessions.reduce((sum, s) => sum + s.performance.kills, 0) / sessions.length,
      averageDeaths: sessions.reduce((sum, s) => sum + s.performance.deaths, 0) / sessions.length,
      averageAssists: sessions.reduce((sum, s) => sum + s.performance.assists, 0) / sessions.length,
    };
  }

  private aggregateTechnicalStats(sessions: PlayerMetrics[]): any {
    if (sessions.length === 0) return {};

    return {
      averageFps: sessions.reduce((sum, s) => sum + s.technical.avgFps, 0) / sessions.length,
      averagePing: sessions.reduce((sum, s) => sum + s.technical.avgPing, 0) / sessions.length,
      totalDisconnections: sessions.reduce((sum, s) => sum + s.technical.disconnections, 0),
    };
  }

  private calculateAverageDuration(matches: MatchMetrics[]): number {
    const completed = matches.filter(m => m.duration);
    if (completed.length === 0) return 0;
    return completed.reduce((sum, m) => sum + m.duration!, 0) / completed.length;
  }

  private calculateAverageFps(events: GameEvent[]): number {
    const fpsEvents = events.filter(e => e.properties.fps);
    if (fpsEvents.length === 0) return 60;
    return fpsEvents.reduce((sum, e) => sum + e.properties.fps, 0) / fpsEvents.length;
  }

  private calculateAverageLatency(events: GameEvent[]): number {
    const latencyEvents = events.filter(e => e.properties.latency);
    if (latencyEvents.length === 0) return 50;
    return latencyEvents.reduce((sum, e) => sum + e.properties.latency, 0) / latencyEvents.length;
  }

  private async executeQuery(query: string, filters: Record<string, any>): Promise<any[]> {
    // Mock query execution - in production would use actual database
    this.logger.debug(`Executing query: ${query}`, filters);
    return [];
  }

  private async queryEvents(query: any, limit: number, offset: number): Promise<GameEvent[]> {
    // Simple in-memory query - production would use proper database
    let events = [...this.eventBuffer];

    if (query.eventType) {
      events = events.filter(e => e.eventType === query.eventType);
    }

    if (query.playerId) {
      events = events.filter(e => e.playerId === query.playerId);
    }

    if (query.timeRange) {
      events = events.filter(e =>
        e.timestamp >= query.timeRange.start && e.timestamp <= query.timeRange.end
      );
    }

    return events.slice(offset, offset + limit);
  }

  // Event processing methods
  private async processMatchStartEvents(events: GameEvent[]): Promise<void> {
    this.logger.info(`Processing ${events.length} match start events`);
  }

  private async processMatchEndEvents(events: GameEvent[]): Promise<void> {
    this.logger.info(`Processing ${events.length} match end events`);
  }

  private async processPlayerDeathEvents(events: GameEvent[]): Promise<void> {
    this.logger.info(`Processing ${events.length} player death events`);
  }

  private async processPerformanceEvents(events: GameEvent[]): Promise<void> {
    this.logger.info(`Processing ${events.length} performance events`);
  }

  private async processSecurityEvents(events: GameEvent[]): Promise<void> {
    this.logger.info(`Processing ${events.length} security events`);
  }

  private updateSystemMetrics(events: GameEvent[]): void {
    const now = Date.now();
    const currentMetric = this.systemMetrics[this.systemMetrics.length - 1];

    if (!currentMetric || now - currentMetric.timestamp > 60000) {
      this.collectSystemMetrics();
    }
  }

  private cleanupOldAlerts(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.alerts = this.alerts.filter(a => a.timestamp > oneHourAgo || !a.resolved);
  }

  private startDataRetentionCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Every hour
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);

    // Clean old events from buffer
    this.eventBuffer = this.eventBuffer.filter(e => e.timestamp > cutoff);

    // Clean old player sessions
    for (const [key, metrics] of this.playerMetrics.entries()) {
      if (metrics.startTime < cutoff) {
        this.playerMetrics.delete(key);
      }
    }

    // Clean old matches
    for (const [matchId, metrics] of this.matchMetrics.entries()) {
      if (metrics.startTime < cutoff) {
        this.matchMetrics.delete(matchId);
      }
    }

    this.logger.info('Data retention cleanup completed');
  }

  private async handleCreateAlert(message: AgentMessage): Promise<AgentMessage> {
    const alert: Alert = {
      ...message.data.alert,
      id: this.generateAlertId(),
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.push(alert);
    await this.notifyAlert(alert);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true, alertId: alert.id },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handlePlayerSessionEnd(message: AgentMessage): Promise<AgentMessage> {
    const { playerId, sessionId, reason } = message.data;

    const sessionKey = `${playerId}:${sessionId}`;
    const metrics = this.playerMetrics.get(sessionKey);

    if (metrics) {
      metrics.lastActivity = Date.now();

      // Track session end event
      const endEvent: GameEvent = {
        eventId: this.generateEventId(),
        eventType: 'player.session_end',
        gameMode: metrics.gameMode,
        playerId,
        sessionId,
        timestamp: Date.now(),
        properties: {
          duration: Date.now() - metrics.startTime,
          reason,
          finalStats: metrics.performance,
        },
        severity: 'info',
      };

      this.eventBuffer.push(endEvent);
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  // ID generators
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}