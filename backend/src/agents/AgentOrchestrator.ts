import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  priority: number;
  dependencies: string[];
  timeout: number;
  retryCount: number;
}

export interface AgentMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'command';
  from: string;
  to: string | string[];
  data: any;
  timestamp: number;
  correlationId?: string;
}

interface AgentMetrics {
  tasksCompleted: number;
  avgResponseTime: number;
  errorRate: number;
  lastActivity: number;
  status: 'idle' | 'busy' | 'error' | 'offline';
}

// Base Agent Interface
export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected metrics: AgentMetrics;
  protected logger: Logger;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.logger = new Logger(`Agent:${config.name}`);
    this.metrics = {
      tasksCompleted: 0,
      avgResponseTime: 0,
      errorRate: 0,
      lastActivity: Date.now(),
      status: 'idle',
    };
  }

  abstract initialize(): Promise<void>;
  abstract processMessage(message: AgentMessage): Promise<AgentMessage | null>;
  abstract shutdown(): Promise<void>;

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  protected updateMetrics(responseTime: number, success: boolean) {
    this.metrics.tasksCompleted++;
    this.metrics.lastActivity = Date.now();

    // Update average response time
    const count = this.metrics.tasksCompleted;
    this.metrics.avgResponseTime = ((this.metrics.avgResponseTime * (count - 1)) + responseTime) / count;

    // Update error rate
    if (!success) {
      this.metrics.errorRate = (this.metrics.errorRate * (count - 1) + 1) / count;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (count - 1)) / count;
    }
  }

  protected setStatus(status: AgentMetrics['status']) {
    this.metrics.status = status;
    this.emit('statusChange', { agentId: this.config.id, status });
  }
}

// Main Agent Orchestrator
export class AgentOrchestrator extends EventEmitter {
  private agents = new Map<string, BaseAgent>();
  private messageQueue: AgentMessage[] = [];
  private isProcessing = false;
  private logger = new Logger('AgentOrchestrator');
  private metrics = {
    totalMessages: 0,
    averageLatency: 0,
    activeAgents: 0,
  };

  constructor() {
    super();
    this.startMessageProcessor();
  }

  // Register an agent
  async registerAgent(agent: BaseAgent): Promise<void> {
    const agentId = agent.getId();

    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} already registered`);
    }

    // Initialize agent
    await agent.initialize();

    // Set up event listeners
    agent.on('message', (message: AgentMessage) => {
      this.enqueueMessage(message);
    });

    agent.on('statusChange', (event) => {
      this.emit('agentStatusChange', event);
    });

    this.agents.set(agentId, agent);
    this.metrics.activeAgents = this.agents.size;

    this.logger.info(`Agent registered: ${agent.getName()}`);
  }

  // Send message to specific agent(s)
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
    };

    this.enqueueMessage(fullMessage);
  }

  // Broadcast message to all agents
  async broadcast(message: Omit<AgentMessage, 'id' | 'timestamp' | 'to'>): Promise<void> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
      to: Array.from(this.agents.keys()),
    };

    this.enqueueMessage(fullMessage);
  }

  // Execute coordinated task across multiple agents
  async executeCoordinatedTask(
    taskId: string,
    agentTasks: Array<{ agentId: string; task: any; timeout?: number }>
  ): Promise<{ [agentId: string]: any }> {
    const results: { [agentId: string]: any } = {};
    const promises: Promise<any>[] = [];

    PerformanceMonitor.markStart(`coordinated_task_${taskId}`);

    for (const { agentId, task, timeout = 30000 } of agentTasks) {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const promise = Promise.race([
        this.executeAgentTask(agent, task),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Task timeout: ${agentId}`)), timeout)
        )
      ]).then(result => {
        results[agentId] = result;
      }).catch(error => {
        results[agentId] = { error: error.message };
      });

      promises.push(promise);
    }

    await Promise.all(promises);
    PerformanceMonitor.markEnd(`coordinated_task_${taskId}`);

    return results;
  }

  // Get orchestrator metrics
  getMetrics() {
    return {
      ...this.metrics,
      agents: Array.from(this.agents.values()).map(agent => ({
        id: agent.getId(),
        name: agent.getName(),
        metrics: agent.getMetrics(),
      })),
      queueLength: this.messageQueue.length,
    };
  }

  // Shutdown orchestrator and all agents
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down orchestrator...');

    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.shutdown().catch(error => {
        this.logger.error(`Error shutting down agent ${agent.getName()}:`, error);
      })
    );

    await Promise.all(shutdownPromises);
    this.agents.clear();
    this.metrics.activeAgents = 0;

    this.logger.info('Orchestrator shutdown complete');
  }

  // Private methods
  private enqueueMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
    this.metrics.totalMessages++;
  }

  private async executeAgentTask(agent: BaseAgent, task: any): Promise<any> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      type: 'command',
      from: 'orchestrator',
      to: agent.getId(),
      data: task,
      timestamp: Date.now(),
    };

    return agent.processMessage(message);
  }

  private startMessageProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.messageQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift()!;
          await this.processMessage(message);
        }
      } catch (error) {
        this.logger.error('Message processing error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 10); // Process every 10ms
  }

  private async processMessage(message: AgentMessage): Promise<void> {
    const startTime = Date.now();

    try {
      const targets = Array.isArray(message.to) ? message.to : [message.to];

      const promises = targets.map(async (targetId) => {
        const agent = this.agents.get(targetId);
        if (!agent) {
          this.logger.warn(`Message target not found: ${targetId}`);
          return;
        }

        try {
          const response = await agent.processMessage(message);
          if (response) {
            this.enqueueMessage(response);
          }
        } catch (error) {
          this.logger.error(`Agent ${targetId} message processing error:`, error);

          // Send error response if original message expects one
          if (message.type === 'request') {
            const errorResponse: AgentMessage = {
              id: this.generateMessageId(),
              type: 'response',
              from: targetId,
              to: message.from,
              data: { error: error.message },
              timestamp: Date.now(),
              correlationId: message.id,
            };
            this.enqueueMessage(errorResponse);
          }
        }
      });

      await Promise.all(promises);

      // Update metrics
      const latency = Date.now() - startTime;
      const count = this.metrics.totalMessages;
      this.metrics.averageLatency = ((this.metrics.averageLatency * (count - 1)) + latency) / count;

    } catch (error) {
      this.logger.error('Critical message processing error:', error);
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Game Director Agent (Lead Orchestrator)
export class GameDirectorAgent extends BaseAgent {
  private gameStates = new Map<string, any>();
  private milestones = new Map<string, any>();

  async initialize(): Promise<void> {
    this.logger.info('Game Director Agent initialized');
    this.setStatus('idle');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const startTime = Date.now();
    let success = true;

    try {
      this.setStatus('busy');

      switch (message.data.action) {
        case 'greenlight_milestone':
          return this.greenlightMilestone(message);

        case 'kill_switch':
          return this.executeKillSwitch(message);

        case 'get_roadmap':
          return this.getRoadmap(message);

        case 'update_kpis':
          return this.updateKPIs(message);

        default:
          throw new Error(`Unknown action: ${message.data.action}`);
      }

    } catch (error) {
      success = false;
      this.logger.error('Game Director processing error:', error);

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
    this.logger.info('Game Director Agent shutting down');
    this.setStatus('offline');
  }

  private greenlightMilestone(message: AgentMessage): AgentMessage {
    const { milestoneId, criteria } = message.data;

    // Evaluate milestone criteria
    const approved = this.evaluateMilestone(milestoneId, criteria);

    this.milestones.set(milestoneId, {
      status: approved ? 'approved' : 'rejected',
      timestamp: Date.now(),
      criteria,
    });

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { approved, milestoneId },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private executeKillSwitch(message: AgentMessage): AgentMessage {
    const { gameId, reason } = message.data;

    this.logger.warn(`Kill switch activated for ${gameId}: ${reason}`);

    // Broadcast kill switch to all agents
    this.emit('message', {
      id: this.generateMessageId(),
      type: 'event',
      from: this.config.id,
      to: Array.from(['netcode', 'matchmaking', 'telemetry']), // Target critical agents
      data: { event: 'kill_switch', gameId, reason },
      timestamp: Date.now(),
    });

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true, gameId },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private getRoadmap(message: AgentMessage): AgentMessage {
    // Return current roadmap with milestones
    const roadmap = {
      sprint1: { status: 'in_progress', completion: 0.75 },
      sprint2: { status: 'planned', completion: 0 },
      sprint3: { status: 'planned', completion: 0 },
      sprint4: { status: 'planned', completion: 0 },
      games: {
        haloArena: { status: 'vertical_slice', priority: 'high' },
        haloRoyale: { status: 'prototype', priority: 'high' },
        haloRally: { status: 'concept', priority: 'medium' },
        haloRaids: { status: 'concept', priority: 'medium' },
        haloTactics: { status: 'concept', priority: 'low' },
      },
    };

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { roadmap },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private updateKPIs(message: AgentMessage): AgentMessage {
    const kpis = message.data.kpis;

    // Store KPI update
    this.gameStates.set('current_kpis', {
      ...kpis,
      timestamp: Date.now(),
    });

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

  private evaluateMilestone(milestoneId: string, criteria: any): boolean {
    // Mock milestone evaluation logic
    const requirements = {
      sprint1: ['netcode_ready', 'matchmaking_prototype', 'telemetry_live'],
      sprint2: ['arena_vertical_slice', 'bots_implemented', 'ui_controller_ready'],
      sprint3: ['rally_prototype', 'physics_sync', 'anticheat_basic'],
      sprint4: ['royale_prealpha', 'server_autoscale', 'liveops_ready'],
    };

    const required = requirements[milestoneId as keyof typeof requirements] || [];
    return required.every(req => criteria[req] === true);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}