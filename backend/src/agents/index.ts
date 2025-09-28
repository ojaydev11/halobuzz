// HaloBuzz Big Games Agent Program - Sprint 1 Foundation
// Agent orchestration and initialization

import { AgentOrchestrator, GameDirectorAgent } from './AgentOrchestrator';
import { NetcodeAgent } from './NetcodeAgent';
import { MatchmakingAgent } from './MatchmakingAgent';
import { TelemetryAgent } from './TelemetryAgent';
import { Logger } from '../utils/logger';

class BigGamesProgram {
  private orchestrator: AgentOrchestrator;
  private logger = new Logger('BigGamesProgram');

  // Sprint 1 Foundation Agents
  private gameDirector: GameDirectorAgent;
  private netcodeAgent: NetcodeAgent;
  private matchmakingAgent: MatchmakingAgent;
  private telemetryAgent: TelemetryAgent;

  constructor() {
    this.orchestrator = new AgentOrchestrator();
  }

  async initialize(): Promise<void> {
    this.logger.info('🚀 Initializing HaloBuzz Big Games Program - Sprint 1');

    // Initialize foundation agents
    this.gameDirector = new GameDirectorAgent({
      id: 'game-director',
      name: 'Game Director',
      role: 'Lead orchestrator and milestone gatekeeper',
      priority: 1,
      dependencies: [],
      timeout: 30000,
      retryCount: 3,
    });

    this.netcodeAgent = new NetcodeAgent({
      id: 'netcode',
      name: 'Netcode & Scale',
      role: 'Authoritative multiplayer networking',
      priority: 2,
      dependencies: ['game-director'],
      timeout: 15000,
      retryCount: 2,
    });

    this.matchmakingAgent = new MatchmakingAgent({
      id: 'matchmaking',
      name: 'Matchmaking & Ranking',
      role: 'TrueSkill2 matchmaking and player ranking',
      priority: 2,
      dependencies: ['game-director'],
      timeout: 20000,
      retryCount: 2,
    });

    this.telemetryAgent = new TelemetryAgent({
      id: 'telemetry',
      name: 'Telemetry & Analytics',
      role: 'Real-time event tracking and analytics',
      priority: 3,
      dependencies: ['game-director'],
      timeout: 10000,
      retryCount: 3,
    });

    // Register all agents with orchestrator
    await this.orchestrator.registerAgent(this.gameDirector);
    await this.orchestrator.registerAgent(this.netcodeAgent);
    await this.orchestrator.registerAgent(this.matchmakingAgent);
    await this.orchestrator.registerAgent(this.telemetryAgent);

    this.logger.info('✅ Sprint 1 Foundation agents initialized successfully');

    // Set up inter-agent communication patterns
    await this.setupAgentCommunication();

    // Validate Sprint 1 readiness
    await this.validateSprintReadiness();
  }

  private async setupAgentCommunication(): Promise<void> {
    this.logger.info('🔗 Setting up agent communication patterns...');

    // Game Director -> All agents coordination
    this.gameDirector.on('message', (message) => {
      if (message.data.event === 'kill_switch') {
        this.orchestrator.broadcast({
          type: 'event',
          from: 'game-director',
          data: { event: 'emergency_shutdown', reason: message.data.reason },
        });
      }
    });

    // Matchmaking -> Netcode server allocation requests
    this.matchmakingAgent.on('message', (message) => {
      if (message.data.event === 'match_created') {
        this.orchestrator.sendMessage({
          type: 'command',
          from: 'matchmaking',
          to: 'netcode',
          data: {
            action: 'allocate_server',
            matchResult: message.data.matchResult,
          },
        });
      }
    });

    // Netcode -> Telemetry performance events
    this.netcodeAgent.on('message', (message) => {
      if (message.data.event?.startsWith('performance.')) {
        this.orchestrator.sendMessage({
          type: 'event',
          from: 'netcode',
          to: 'telemetry',
          data: {
            action: 'track_event',
            eventType: message.data.event,
            properties: message.data.properties,
          },
        });
      }
    });

    // Telemetry -> Game Director critical alerts
    this.telemetryAgent.on('message', (message) => {
      if (message.data.event === 'critical_alert') {
        this.orchestrator.sendMessage({
          type: 'event',
          from: 'telemetry',
          to: 'game-director',
          data: {
            event: 'critical_alert',
            alert: message.data.alert,
          },
        });
      }
    });

    this.logger.info('✅ Agent communication patterns established');
  }

  private async validateSprintReadiness(): Promise<void> {
    this.logger.info('🔍 Validating Sprint 1 readiness...');

    const validationTasks = [
      { agentId: 'netcode', task: { action: 'health_check' } },
      { agentId: 'matchmaking', task: { action: 'get_queue_status' } },
      { agentId: 'telemetry', task: { action: 'get_metrics', type: 'system' } },
    ];

    const results = await this.orchestrator.executeCoordinatedTask('sprint1_validation', validationTasks);

    let allHealthy = true;
    for (const [agentId, result] of Object.entries(results)) {
      if (result.error) {
        this.logger.error(`Agent ${agentId} failed validation:`, result.error);
        allHealthy = false;
      } else {
        this.logger.info(`✅ Agent ${agentId} validation passed`);
      }
    }

    if (!allHealthy) {
      throw new Error('Sprint 1 foundation validation failed - some agents are not ready');
    }

    // Request milestone approval from Game Director
    await this.requestMilestoneApproval();

    this.logger.info('🎯 Sprint 1 Foundation validation complete - READY FOR GAMES');
  }

  private async requestMilestoneApproval(): Promise<void> {
    const milestoneId = 'sprint1_foundation';
    const criteria = {
      netcode_ready: true,
      matchmaking_prototype: true,
      telemetry_live: true,
      agents_healthy: true,
      communication_established: true,
    };

    await this.orchestrator.sendMessage({
      type: 'request',
      from: 'big-games-program',
      to: 'game-director',
      data: {
        action: 'greenlight_milestone',
        milestoneId,
        criteria,
      },
    });

    this.logger.info('🚦 Milestone approval requested from Game Director');
  }

  async getSystemStatus(): Promise<any> {
    const metrics = this.orchestrator.getMetrics();

    return {
      program: 'HaloBuzz Big Games',
      sprint: 'Sprint 1: Foundations',
      status: 'ACTIVE',
      uptime: Date.now(),
      agents: metrics.agents,
      totalMessages: metrics.totalMessages,
      averageLatency: metrics.averageLatency,
      queueLength: metrics.queueLength,
      foundation: {
        gameDirector: true,
        netcode: true,
        matchmaking: true,
        telemetry: true,
      },
      readyForGames: true,
    };
  }

  async executeGameCommand(command: string, params: any = {}): Promise<any> {
    this.logger.info(`🎮 Executing game command: ${command}`);

    switch (command) {
      case 'start_match':
        return await this.startMatch(params);
      case 'get_player_stats':
        return await this.getPlayerStats(params);
      case 'emergency_shutdown':
        return await this.emergencyShutdown(params);
      case 'get_live_metrics':
        return await this.getLiveMetrics();
      default:
        throw new Error(`Unknown game command: ${command}`);
    }
  }

  private async startMatch(params: { gameMode: string; players: string[] }): Promise<any> {
    const { gameMode, players } = params;

    // Send to matchmaking for processing
    return await this.orchestrator.sendMessage({
      type: 'request',
      from: 'big-games-program',
      to: 'matchmaking',
      data: {
        action: 'create_custom_match',
        gameMode,
        players,
      },
    });
  }

  private async getPlayerStats(params: { playerId: string }): Promise<any> {
    return await this.orchestrator.sendMessage({
      type: 'request',
      from: 'big-games-program',
      to: 'telemetry',
      data: {
        action: 'get_metrics',
        type: 'player',
        filters: { playerId: params.playerId },
      },
    });
  }

  private async emergencyShutdown(params: { reason: string }): Promise<any> {
    this.logger.warn(`🚨 Emergency shutdown initiated: ${params.reason}`);

    return await this.orchestrator.sendMessage({
      type: 'command',
      from: 'big-games-program',
      to: 'game-director',
      data: {
        action: 'kill_switch',
        reason: params.reason,
      },
    });
  }

  private async getLiveMetrics(): Promise<any> {
    const results = await this.orchestrator.executeCoordinatedTask('live_metrics', [
      { agentId: 'matchmaking', task: { action: 'get_queue_status' } },
      { agentId: 'telemetry', task: { action: 'get_metrics', type: 'system' } },
      { agentId: 'netcode', task: { action: 'get_server_status' } },
    ]);

    return {
      timestamp: Date.now(),
      orchestrator: this.orchestrator.getMetrics(),
      agents: results,
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('🔴 Shutting down HaloBuzz Big Games Program...');

    await this.orchestrator.shutdown();

    this.logger.info('✅ Big Games Program shutdown complete');
  }
}

// Export for use in main application
export { BigGamesProgram };

// Global instance for singleton pattern
let bigGamesInstance: BigGamesProgram | null = null;

export async function initializeBigGames(): Promise<BigGamesProgram> {
  if (bigGamesInstance) {
    throw new Error('Big Games Program already initialized');
  }

  bigGamesInstance = new BigGamesProgram();
  await bigGamesInstance.initialize();

  return bigGamesInstance;
}

export function getBigGamesInstance(): BigGamesProgram {
  if (!bigGamesInstance) {
    throw new Error('Big Games Program not initialized. Call initializeBigGames() first.');
  }

  return bigGamesInstance;
}

export async function shutdownBigGames(): Promise<void> {
  if (bigGamesInstance) {
    await bigGamesInstance.shutdown();
    bigGamesInstance = null;
  }
}