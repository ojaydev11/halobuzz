import { EventEmitter } from 'events';
import { logger } from '@/config/logger';

export interface ProductionMetrics {
  timestamp: Date;
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  applicationMetrics: {
    activeUsers: number;
    requestsPerSecond: number;
    errorRate: number;
    responseTime: number;
  };
  businessMetrics: {
    revenue: number;
    conversions: number;
    userEngagement: number;
    retention: number;
  };
}

export class ProductionMonitoringService extends EventEmitter {
  private static instance: ProductionMonitoringService;
  private metrics: ProductionMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    logger.info('ProductionMonitoringService initialized');
  }

  static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
    }
    return ProductionMonitoringService.instance;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Monitoring already started');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting production monitoring...');

    // Start collecting metrics every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 30000);

    // Collect initial metrics
    await this.collectMetrics();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Production monitoring stopped');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: ProductionMetrics = {
        timestamp: new Date(),
        systemHealth: {
          cpu: await this.getCPUUsage(),
          memory: await this.getMemoryUsage(),
          disk: await this.getDiskUsage(),
          network: await this.getNetworkUsage(),
        },
        applicationMetrics: {
          activeUsers: await this.getActiveUsers(),
          requestsPerSecond: await this.getRequestsPerSecond(),
          errorRate: await this.getErrorRate(),
          responseTime: await this.getAverageResponseTime(),
        },
        businessMetrics: {
          revenue: await this.getRevenue(),
          conversions: await this.getConversions(),
          userEngagement: await this.getUserEngagement(),
          retention: await this.getRetention(),
        },
      };

      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics to prevent memory issues
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      this.emit('metricsCollected', metrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  private async getCPUUsage(): Promise<number> {
    // Mock CPU usage - in production, use actual system monitoring
    return Math.random() * 100;
  }

  private async getMemoryUsage(): Promise<number> {
    // Mock memory usage - in production, use actual system monitoring
    return Math.random() * 100;
  }

  private async getDiskUsage(): Promise<number> {
    // Mock disk usage - in production, use actual system monitoring
    return Math.random() * 100;
  }

  private async getNetworkUsage(): Promise<number> {
    // Mock network usage - in production, use actual system monitoring
    return Math.random() * 100;
  }

  private async getActiveUsers(): Promise<number> {
    // Mock active users - in production, get from actual data
    return Math.floor(Math.random() * 10000);
  }

  private async getRequestsPerSecond(): Promise<number> {
    // Mock RPS - in production, get from actual metrics
    return Math.random() * 1000;
  }

  private async getErrorRate(): Promise<number> {
    // Mock error rate - in production, get from actual metrics
    return Math.random() * 5;
  }

  private async getAverageResponseTime(): Promise<number> {
    // Mock response time - in production, get from actual metrics
    return Math.random() * 500;
  }

  private async getRevenue(): Promise<number> {
    // Mock revenue - in production, get from actual data
    return Math.random() * 100000;
  }

  private async getConversions(): Promise<number> {
    // Mock conversions - in production, get from actual data
    return Math.random() * 1000;
  }

  private async getUserEngagement(): Promise<number> {
    // Mock engagement - in production, get from actual data
    return Math.random() * 100;
  }

  private async getRetention(): Promise<number> {
    // Mock retention - in production, get from actual data
    return Math.random() * 100;
  }

  async getLatestMetrics(): Promise<ProductionMetrics | null> {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  async getMetricsHistory(limit: number = 100): Promise<ProductionMetrics[]> {
    return this.metrics.slice(-limit);
  }

  async getSystemHealth(): Promise<any> {
    const latest = await this.getLatestMetrics();
    if (!latest) {
      return { status: 'unknown', message: 'No metrics available' };
    }

    const { systemHealth, applicationMetrics } = latest;
    
    // Determine overall health based on thresholds
    const isHealthy = 
      systemHealth.cpu < 80 &&
      systemHealth.memory < 80 &&
      systemHealth.disk < 90 &&
      applicationMetrics.errorRate < 5 &&
      applicationMetrics.responseTime < 1000;

    return {
      status: isHealthy ? 'healthy' : 'warning',
      timestamp: latest.timestamp,
      systemHealth,
      applicationMetrics,
      alerts: this.generateAlerts(latest),
    };
  }

  private generateAlerts(metrics: ProductionMetrics): string[] {
    const alerts: string[] = [];

    if (metrics.systemHealth.cpu > 80) {
      alerts.push('High CPU usage detected');
    }
    if (metrics.systemHealth.memory > 80) {
      alerts.push('High memory usage detected');
    }
    if (metrics.systemHealth.disk > 90) {
      alerts.push('High disk usage detected');
    }
    if (metrics.applicationMetrics.errorRate > 5) {
      alerts.push('High error rate detected');
    }
    if (metrics.applicationMetrics.responseTime > 1000) {
      alerts.push('Slow response times detected');
    }

    return alerts;
  }

  async getBusinessMetrics(): Promise<any> {
    const latest = await this.getLatestMetrics();
    if (!latest) {
      return { message: 'No metrics available' };
    }

    return {
      timestamp: latest.timestamp,
      revenue: latest.businessMetrics.revenue,
      conversions: latest.businessMetrics.conversions,
      userEngagement: latest.businessMetrics.userEngagement,
      retention: latest.businessMetrics.retention,
      trends: this.calculateTrends(),
    };
  }

  private calculateTrends(): any {
    if (this.metrics.length < 2) {
      return { revenue: 0, conversions: 0, engagement: 0, retention: 0 };
    }

    const current = this.metrics[this.metrics.length - 1];
    const previous = this.metrics[this.metrics.length - 2];

    return {
      revenue: ((current.businessMetrics.revenue - previous.businessMetrics.revenue) / previous.businessMetrics.revenue) * 100,
      conversions: ((current.businessMetrics.conversions - previous.businessMetrics.conversions) / previous.businessMetrics.conversions) * 100,
      engagement: ((current.businessMetrics.userEngagement - previous.businessMetrics.userEngagement) / previous.businessMetrics.userEngagement) * 100,
      retention: ((current.businessMetrics.retention - previous.businessMetrics.retention) / previous.businessMetrics.retention) * 100,
    };
  }
}

export const productionMonitoringService = ProductionMonitoringService.getInstance();
