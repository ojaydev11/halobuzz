import { setupLogger } from '@/config/logger';
import { getCacheStats } from '@/config/redis';
import { connectDatabase } from '@/config/database';
import { getApiMetrics } from '@/middleware/metrics';
import mongoose from 'mongoose';

const logger = setupLogger();

export interface SystemMetrics {
  timestamp: Date;
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connections: number;
    operations: number;
    responseTime: number;
  };
  redis: {
    memory: string;
    connectedClients: number;
    keyspace: string;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  socket: {
    connectedUsers: number;
    rooms: number;
    messagesPerMinute: number;
  };
}

export interface AlertConfig {
  memoryThreshold: number; // percentage
  cpuThreshold: number; // percentage
  responseTimeThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage
  connectionThreshold: number; // number of connections
}

export class MonitoringService {
  private static instance: MonitoringService;
  private metrics: SystemMetrics[] = [];
  private alertConfig: AlertConfig = {
    memoryThreshold: 80,
    cpuThreshold: 80,
    responseTimeThreshold: 2000,
    errorRateThreshold: 5,
    connectionThreshold: 1000
  };

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  public async collectMetrics(): Promise<SystemMetrics> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        memory: await this.getMemoryMetrics(),
        cpu: await this.getCpuMetrics(),
        database: await this.getDatabaseMetrics(),
        redis: await this.getRedisMetrics(),
        api: await this.getApiMetrics(),
        socket: await this.getSocketMetrics()
      };

      // Store metrics (keep last 100 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Check for alerts
      await this.checkAlerts(metrics);

      return metrics;
    } catch (error) {
      logger.error('Error collecting metrics:', error);
      throw error;
    }
  }

  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal + memUsage.external;
    const usedMem = memUsage.heapUsed;
    const freeMem = totalMem - usedMem;

    return {
      used: Math.round(usedMem / 1024 / 1024), // MB
      free: Math.round(freeMem / 1024 / 1024), // MB
      total: Math.round(totalMem / 1024 / 1024), // MB
      percentage: Math.round((usedMem / totalMem) * 100)
    };
  }

  private async getCpuMetrics(): Promise<SystemMetrics['cpu']> {
    const startUsage = process.cpuUsage();
    const startTime = Date.now();

    // Wait a bit to measure CPU usage
    await new Promise(resolve => setTimeout(resolve, 100));

    const endUsage = process.cpuUsage(startUsage);
    const endTime = Date.now();
    const duration = (endTime - startTime) * 1000; // microseconds

    const usage = ((endUsage.user + endUsage.system) / duration) * 100;

    return {
      usage: Math.round(usage * 100) / 100,
      loadAverage: process.platform === 'win32' ? [0, 0, 0] : require('os').loadavg()
    };
  }

  private async getDatabaseMetrics(): Promise<SystemMetrics['database']> {
    try {
      const db = mongoose.connection;
      const admin = db.db.admin();
      const serverStatus = await admin.serverStatus();

      return {
        connections: serverStatus.connections?.current || 0,
        operations: serverStatus.opcounters?.total || 0,
        responseTime: 0 // Would need to implement custom timing
      };
    } catch (error) {
      logger.error('Error getting database metrics:', error);
      return {
        connections: 0,
        operations: 0,
        responseTime: 0
      };
    }
  }

  private async getRedisMetrics(): Promise<SystemMetrics['redis']> {
    try {
      const stats = await getCacheStats();
      if (!stats) {
        return {
          memory: '0',
          connectedClients: 0,
          keyspace: '0'
        };
      }

      return {
        memory: stats.memory || '0',
        connectedClients: 0, // Would need Redis client info
        keyspace: stats.keyspace || '0'
      };
    } catch (error) {
      logger.error('Error getting Redis metrics:', error);
      return {
        memory: '0',
        connectedClients: 0,
        keyspace: '0'
      };
    }
  }

  private async getApiMetrics(): Promise<SystemMetrics['api']> {
    try {
      const apiMetrics = getApiMetrics();
      return {
        requestsPerMinute: apiMetrics.requestsPerMinute,
        averageResponseTime: apiMetrics.averageResponseTime,
        errorRate: apiMetrics.errorRate
      };
    } catch (error) {
      logger.error('Error getting API metrics:', error);
      return {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0
      };
    }
  }

  private async getSocketMetrics(): Promise<SystemMetrics['socket']> {
    // This would be implemented with Socket.IO tracking
    return {
      connectedUsers: 0,
      rooms: 0,
      messagesPerMinute: 0
    };
  }

  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: string[] = [];

    if (metrics.memory.percentage > this.alertConfig.memoryThreshold) {
      alerts.push(`High memory usage: ${metrics.memory.percentage}%`);
    }

    if (metrics.cpu.usage > this.alertConfig.cpuThreshold) {
      alerts.push(`High CPU usage: ${metrics.cpu.usage}%`);
    }

    if (metrics.api.averageResponseTime > this.alertConfig.responseTimeThreshold) {
      alerts.push(`High response time: ${metrics.api.averageResponseTime}ms`);
    }

    if (metrics.api.errorRate > this.alertConfig.errorRateThreshold) {
      alerts.push(`High error rate: ${metrics.api.errorRate}%`);
    }

    if (metrics.database.connections > this.alertConfig.connectionThreshold) {
      alerts.push(`High database connections: ${metrics.database.connections}`);
    }

    if (alerts.length > 0) {
      await this.sendAlert(alerts, metrics);
    }
  }

  private async sendAlert(alerts: string[], metrics: SystemMetrics): Promise<void> {
    const alertMessage = {
      timestamp: new Date().toISOString(),
      severity: 'WARNING',
      alerts,
      metrics: {
        memory: metrics.memory.percentage,
        cpu: metrics.cpu.usage,
        responseTime: metrics.api.averageResponseTime,
        errorRate: metrics.api.errorRate
      }
    };

    logger.warn('System Alert:', alertMessage);

    // Here you would integrate with your alerting system:
    // - Send to Slack/Discord
    // - Send email notifications
    // - Send to monitoring service (DataDog, New Relic, etc.)
    // - Send SMS for critical alerts
  }

  public getMetrics(): SystemMetrics[] {
    return [...this.metrics];
  }

  public getLatestMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  public updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  public getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  }> {
    const latestMetrics = this.getLatestMetrics();
    if (!latestMetrics) {
      return {
        status: 'critical',
        checks: [{
          name: 'metrics',
          status: 'fail',
          message: 'No metrics available'
        }]
      };
    }

    const checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }> = [
      {
        name: 'memory',
        status: latestMetrics.memory.percentage > 90 ? 'fail' as const : 
                latestMetrics.memory.percentage > 80 ? 'warn' as const : 'pass' as const,
        message: `Memory usage: ${latestMetrics.memory.percentage}%`
      },
      {
        name: 'cpu',
        status: latestMetrics.cpu.usage > 90 ? 'fail' as const : 
                latestMetrics.cpu.usage > 80 ? 'warn' as const : 'pass' as const,
        message: `CPU usage: ${latestMetrics.cpu.usage}%`
      },
      {
        name: 'database',
        status: latestMetrics.database.connections > 1000 ? 'fail' as const : 
                latestMetrics.database.connections > 500 ? 'warn' as const : 'pass' as const,
        message: `Database connections: ${latestMetrics.database.connections}`
      }
    ];

    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');

    return {
      status: hasFailures ? 'critical' : hasWarnings ? 'warning' : 'healthy',
      checks
    };
  }
}

export const monitoringService = MonitoringService.getInstance();
