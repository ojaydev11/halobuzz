import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Transaction } from '../models/Transaction';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

interface SystemMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  disk: number;
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
  };
  redis: {
    connected: boolean;
    memory: number;
    keys: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: Date;
}

export class MonitoringService {
  private readonly logger = logger;
  private readonly alertRules: AlertRule[] = [
    {
      id: 'high_cpu',
      name: 'High CPU Usage',
      condition: 'cpu > 80',
      threshold: 80,
      severity: 'high',
      enabled: true
    },
    {
      id: 'high_memory',
      name: 'High Memory Usage',
      condition: 'memory > 85',
      threshold: 85,
      severity: 'high',
      enabled: true
    },
    {
      id: 'database_slow',
      name: 'Slow Database Queries',
      condition: 'slowQueries > 10',
      threshold: 10,
      severity: 'medium',
      enabled: true
    },
    {
      id: 'redis_down',
      name: 'Redis Connection Lost',
      condition: 'redis.connected == false',
      threshold: 0,
      severity: 'critical',
      enabled: true
    }
  ];

  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database health check
    try {
      const startTime = Date.now();
      await User.findOne().limit(1);
      const responseTime = Date.now() - startTime;
      
      checks.push({
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      checks.push({
        service: 'database',
        status: 'unhealthy',
        responseTime: 0,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Redis health check
    try {
      const startTime = Date.now();
      await setCache('health_check', 'test', 10);
      const responseTime = Date.now() - startTime;
      
      checks.push({
        service: 'redis',
        status: responseTime < 100 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      checks.push({
        service: 'redis',
        status: 'unhealthy',
        responseTime: 0,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // External services health check
    try {
      const startTime = Date.now();
      // Check Agora service
      const agoraResponse = await this.checkAgoraService();
      const responseTime = Date.now() - startTime;
      
      checks.push({
        service: 'agora',
        status: agoraResponse ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      checks.push({
        service: 'agora',
        status: 'unhealthy',
        responseTime: 0,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return checks;
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: await this.getCPUUsage(),
        memory: await this.getMemoryUsage(),
        disk: await this.getDiskUsage(),
        network: await this.getNetworkStats(),
        database: await this.getDatabaseStats(),
        redis: await this.getRedisStats()
      };

      // Store metrics in cache
      await setCache('system_metrics', metrics, 300); // 5 minutes

      // Check for alerts
      await this.checkAlerts(metrics);

      return metrics;
    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get application metrics
   */
  async getApplicationMetrics(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const metrics = {
        timestamp: now,
        users: {
          total: await User.countDocuments(),
          active: await User.countDocuments({ lastActiveAt: { $gte: oneHourAgo } }),
          newToday: await User.countDocuments({ createdAt: { $gte: oneDayAgo } }),
          verified: await User.countDocuments({ isVerified: true }),
          banned: await User.countDocuments({ isBanned: true })
        },
        streams: {
          total: await LiveStream.countDocuments(),
          active: await LiveStream.countDocuments({ status: 'live' }),
          today: await LiveStream.countDocuments({ createdAt: { $gte: oneDayAgo } })
        },
        transactions: {
          total: await Transaction.countDocuments(),
          today: await Transaction.countDocuments({ createdAt: { $gte: oneDayAgo } }),
          pending: await Transaction.countDocuments({ status: 'pending' }),
          failed: await Transaction.countDocuments({ status: 'failed' })
        },
        performance: {
          avgResponseTime: await this.getAverageResponseTime(),
          errorRate: await this.getErrorRate(),
          throughput: await this.getThroughput()
        }
      };

      return metrics;
    } catch (error) {
      this.logger.error('Error getting application metrics:', error);
      throw error;
    }
  }

  /**
   * Send alert
   */
  async sendAlert(rule: AlertRule, metrics: SystemMetrics): Promise<void> {
    try {
      const alert = {
        id: `${rule.id}_${Date.now()}`,
        rule: rule.name,
        severity: rule.severity,
        message: `Alert: ${rule.name} - Condition: ${rule.condition}`,
        metrics: metrics,
        timestamp: new Date()
      };

      // Store alert
      await setCache(`alert:${alert.id}`, alert, 24 * 60 * 60); // 24 hours

      // Send notification (email, Slack, etc.)
      await this.sendNotification(alert);

      // Update rule last triggered
      rule.lastTriggered = new Date();

      this.logger.warn(`Alert triggered: ${rule.name}`, alert);
    } catch (error) {
      this.logger.error('Error sending alert:', error);
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<any> {
    try {
      const [healthChecks, systemMetrics, appMetrics] = await Promise.all([
        this.performHealthCheck(),
        this.collectSystemMetrics(),
        this.getApplicationMetrics()
      ]);

      return {
        healthChecks,
        systemMetrics,
        appMetrics,
        alerts: await this.getRecentAlerts(),
        uptime: await this.getUptime()
      };
    } catch (error) {
      this.logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Check Agora service
   */
  private async checkAgoraService(): Promise<boolean> {
    try {
      // Simple ping to Agora API
      const response = await fetch('https://api.agora.io/v1/apps', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.AGORA_APP_ID}:${process.env.AGORA_APP_CERT}`).toString('base64')}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get CPU usage
   */
  private async getCPUUsage(): Promise<number> {
    try {
      const os = require('os');
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      return Math.round(100 - (100 * totalIdle / totalTick));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const os = require('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      return Math.round(((totalMem - freeMem) / totalMem) * 100);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get disk usage
   */
  private async getDiskUsage(): Promise<number> {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');
      // Simplified disk usage calculation
      return 50; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get network stats
   */
  private async getNetworkStats(): Promise<{ bytesIn: number; bytesOut: number }> {
    try {
      // Simplified network stats
      return { bytesIn: 0, bytesOut: 0 };
    } catch (error) {
      return { bytesIn: 0, bytesOut: 0 };
    }
  }

  /**
   * Get database stats
   */
  private async getDatabaseStats(): Promise<{ connections: number; queries: number; slowQueries: number }> {
    try {
      // Simplified database stats
      return { connections: 10, queries: 100, slowQueries: 0 };
    } catch (error) {
      return { connections: 0, queries: 0, slowQueries: 0 };
    }
  }

  /**
   * Get Redis stats
   */
  private async getRedisStats(): Promise<{ connected: boolean; memory: number; keys: number }> {
    try {
      // Test Redis connection
      await setCache('test_key', 'test_value', 1);
      return { connected: true, memory: 0, keys: 0 };
    } catch (error) {
      return { connected: false, memory: 0, keys: 0 };
    }
  }

  /**
   * Check alerts
   */
  private async checkAlerts(metrics: SystemMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      let shouldAlert = false;
      
      switch (rule.id) {
        case 'high_cpu':
          shouldAlert = metrics.cpu > rule.threshold;
          break;
        case 'high_memory':
          shouldAlert = metrics.memory > rule.threshold;
          break;
        case 'database_slow':
          shouldAlert = metrics.database.slowQueries > rule.threshold;
          break;
        case 'redis_down':
          shouldAlert = !metrics.redis.connected;
          break;
      }

      if (shouldAlert) {
        await this.sendAlert(rule, metrics);
      }
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(alert: any): Promise<void> {
    try {
      // This would integrate with notification services
      // For now, just log the alert
      this.logger.warn('ALERT:', alert);
    } catch (error) {
      this.logger.error('Error sending notification:', error);
    }
  }

  /**
   * Get recent alerts
   */
  private async getRecentAlerts(): Promise<any[]> {
    try {
      // This would query stored alerts
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get uptime
   */
  private async getUptime(): Promise<number> {
    try {
      const uptime = process.uptime();
      return Math.round(uptime);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get average response time
   */
  private async getAverageResponseTime(): Promise<number> {
    try {
      // This would calculate from stored metrics
      return 100; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get error rate
   */
  private async getErrorRate(): Promise<number> {
    try {
      // This would calculate from stored metrics
      return 0.1; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get throughput
   */
  private async getThroughput(): Promise<number> {
    try {
      // This would calculate from stored metrics
      return 1000; // Placeholder
    } catch (error) {
      return 0;
    }
  }

  // Additional methods needed by routes
  async getHealthStatus(): Promise<{ status: string; services: any[] }> {
    try {
      const healthChecks = await this.performHealthChecks();
      const overallStatus = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';
      
      return {
        status: overallStatus,
        services: healthChecks
      };
    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        status: 'unhealthy',
        services: []
      };
    }
  }

  async collectMetrics(): Promise<void> {
    try {
      await this.collectSystemMetrics();
      await this.collectApplicationMetrics();
      await this.collectBusinessMetrics();
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  async getMetrics(timeRange: string = '1h'): Promise<any> {
    try {
      const metrics = await this.getCachedMetrics(timeRange);
      return metrics;
    } catch (error) {
      logger.error('Error getting metrics:', error);
      return {};
    }
  }

  async getLatestMetrics(): Promise<any> {
    try {
      const latest = await getCache('metrics:latest');
      return latest ? JSON.parse(latest as string) : {};
    } catch (error) {
      logger.error('Error getting latest metrics:', error);
      return {};
    }
  }

  async getAlertConfig(): Promise<any> {
    try {
      const config = await getCache('alert:config');
      return config ? JSON.parse(config as string) : {};
    } catch (error) {
      logger.error('Error getting alert config:', error);
      return {};
    }
  }

  async updateAlertConfig(config: any): Promise<void> {
    try {
      await setCache('alert:config', JSON.stringify(config), 86400); // 24 hours
    } catch (error) {
      logger.error('Error updating alert config:', error);
    }
  }
}

export const monitoringService = new MonitoringService();