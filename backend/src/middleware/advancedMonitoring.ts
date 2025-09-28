import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { performance } from 'perf_hooks';

interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  requestSize: number;
  responseSize: number;
  errorType?: string;
}

interface SystemHealth {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  api: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    activeConnections: number;
  };
  database: {
    activeConnections: number;
    queryTime: number;
    errorRate: number;
  };
}

class AdvancedAPIMonitor {
  private metrics: APIMetrics[] = [];
  private healthMetrics: SystemHealth[] = [];
  private alertThresholds = {
    errorRate: 5, // 5% error rate
    responseTime: 2000, // 2 seconds
    memoryUsage: 85, // 85% memory usage
    cpuUsage: 80 // 80% CPU usage
  };
  private alerts = new Map<string, { count: number; lastAlert: number }>();

  constructor() {
    this.startHealthMonitoring();
    this.startMetricsCleanup();
  }

  // Request monitoring middleware
  monitorRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const startTimestamp = Date.now();

      // Generate request ID if not present
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = this.generateRequestId();
      }

      // Capture request size
      const requestSize = this.calculateRequestSize(req);

      // Override res.json to capture response
      const originalJson = res.json;
      let responseSize = 0;

      res.json = function(body: any) {
        responseSize = JSON.stringify(body).length;
        return originalJson.call(this, body);
      };

      // Handle response completion
      res.on('finish', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        const metric: APIMetrics = {
          endpoint: this.normalizeEndpoint(req.route?.path || req.path),
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: startTimestamp,
          userId: (req as any).user?.id,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          requestSize,
          responseSize,
          errorType: res.statusCode >= 400 ? this.categorizeError(res.statusCode) : undefined
        };

        this.recordMetric(metric);
        this.checkAlerts(metric);

        // Log slow requests
        if (responseTime > this.alertThresholds.responseTime) {
          logger.warn('Slow API request detected', {
            endpoint: metric.endpoint,
            method: metric.method,
            responseTime,
            userId: metric.userId,
            requestId: req.headers['x-request-id']
          });
        }

        // Log errors
        if (res.statusCode >= 400) {
          logger.error('API error', {
            endpoint: metric.endpoint,
            method: metric.method,
            statusCode: res.statusCode,
            errorType: metric.errorType,
            userId: metric.userId,
            requestId: req.headers['x-request-id']
          });
        }
      });

      next();
    };
  }

  // Real-time analytics middleware
  realTimeAnalytics() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Track concurrent requests
        await this.incrementActiveConnections();

        res.on('finish', async () => {
          await this.decrementActiveConnections();
        });

        // Track endpoint usage
        await this.trackEndpointUsage(req.route?.path || req.path, req.method);

        // Track user activity
        if ((req as any).user?.id) {
          await this.trackUserActivity((req as any).user.id, req.route?.path || req.path);
        }

        next();
      } catch (error) {
        logger.error('Real-time analytics error:', error);
        next();
      }
    };
  }

  // Business metrics tracking
  businessMetricsTracker() {
    return (req: Request, res: Response, next: NextFunction) => {
      const businessEvents: Record<string, string> = {
        '/auth/register': 'user_registration',
        '/auth/login': 'user_login',
        '/streams': 'stream_creation',
        '/reels/{id}/like': 'content_engagement',
        '/users/{id}/follow': 'social_interaction',
        '/wallet/transactions': 'financial_transaction'
      };

      const normalizedPath = this.normalizeEndpoint(req.route?.path || req.path);
      const eventType = businessEvents[normalizedPath];

      if (eventType && req.method === 'POST') {
        res.on('finish', () => {
          if (res.statusCode < 400) {
            this.trackBusinessEvent(eventType, {
              userId: (req as any).user?.id,
              endpoint: normalizedPath,
              timestamp: Date.now(),
              metadata: this.extractBusinessMetadata(req, eventType)
            });
          }
        });
      }

      next();
    };
  }

  // Security monitoring middleware
  securityMonitor() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Track failed authentication attempts
        if (req.path.includes('/auth/login') && req.method === 'POST') {
          res.on('finish', async () => {
            if (res.statusCode === 401) {
              await this.trackFailedLogin(req.ip || 'unknown', req.body?.identifier);
            }
          });
        }

        // Track suspicious activity patterns
        await this.trackSuspiciousActivity(req);

        // Rate limiting monitoring
        const rateLimitKey = `rate_limit_monitor:${req.ip}:${req.path}`;
        const currentRequests = await this.incrementRateLimitCounter(rateLimitKey);

        if (currentRequests > 100) { // Threshold for suspicious activity
          logger.warn('High request rate detected', {
            ip: req.ip,
            path: req.path,
            requests: currentRequests,
            userAgent: req.get('User-Agent')
          });
        }

        next();
      } catch (error) {
        logger.error('Security monitoring error:', error);
        next();
      }
    };
  }

  // Performance optimization suggestions
  performanceOptimizer() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startMemory = process.memoryUsage();

      res.on('finish', () => {
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        // Suggest optimizations for memory-intensive endpoints
        if (memoryDelta > 10 * 1024 * 1024) { // 10MB
          logger.info('Memory-intensive endpoint detected', {
            endpoint: req.path,
            method: req.method,
            memoryDelta: memoryDelta / 1024 / 1024, // Convert to MB
            suggestion: 'Consider implementing pagination or result limiting'
          });
        }
      });

      next();
    };
  }

  private recordMetric(metric: APIMetrics) {
    this.metrics.push(metric);

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }

    // Store in Redis for real-time dashboards
    this.storeMetricInRedis(metric);
  }

  private async storeMetricInRedis(metric: APIMetrics) {
    try {
      const key = `api_metrics:${Date.now()}`;
      await setCache(key, metric, 3600); // 1 hour TTL

      // Update aggregated metrics
      await this.updateAggregatedMetrics(metric);
    } catch (error) {
      logger.error('Failed to store metric in Redis:', error);
    }
  }

  private async updateAggregatedMetrics(metric: APIMetrics) {
    const hour = Math.floor(metric.timestamp / (1000 * 60 * 60));
    const key = `api_metrics_hourly:${hour}`;

    const existing = await getCache(key) || {
      totalRequests: 0,
      totalErrors: 0,
      totalResponseTime: 0,
      endpoints: {}
    };

    existing.totalRequests++;
    if (metric.statusCode >= 400) existing.totalErrors++;
    existing.totalResponseTime += metric.responseTime;

    if (!existing.endpoints[metric.endpoint]) {
      existing.endpoints[metric.endpoint] = {
        requests: 0,
        errors: 0,
        totalResponseTime: 0
      };
    }

    existing.endpoints[metric.endpoint].requests++;
    if (metric.statusCode >= 400) existing.endpoints[metric.endpoint].errors++;
    existing.endpoints[metric.endpoint].totalResponseTime += metric.responseTime;

    await setCache(key, existing, 7 * 24 * 3600); // 7 days
  }

  private checkAlerts(metric: APIMetrics) {
    // Check error rate
    if (metric.statusCode >= 500) {
      this.triggerAlert('high_error_rate', `5xx error on ${metric.endpoint}`, metric);
    }

    // Check response time
    if (metric.responseTime > this.alertThresholds.responseTime) {
      this.triggerAlert('slow_response', `Slow response: ${metric.responseTime}ms`, metric);
    }
  }

  private triggerAlert(type: string, message: string, metric: APIMetrics) {
    const now = Date.now();
    const alertKey = `${type}_${metric.endpoint}`;

    const existingAlert = this.alerts.get(alertKey);

    // Rate limit alerts (max 1 per 5 minutes per type/endpoint)
    if (!existingAlert || now - existingAlert.lastAlert > 300000) {
      logger.warn('Performance Alert', {
        type,
        message,
        endpoint: metric.endpoint,
        method: metric.method,
        responseTime: metric.responseTime,
        statusCode: metric.statusCode,
        userId: metric.userId
      });

      this.alerts.set(alertKey, {
        count: (existingAlert?.count || 0) + 1,
        lastAlert: now
      });

      // Send to external monitoring service
      this.sendAlertToExternalService(type, message, metric);
    }
  }

  private async sendAlertToExternalService(type: string, message: string, metric: APIMetrics) {
    // This would integrate with services like Slack, PagerDuty, etc.
    try {
      // Example webhook call
      logger.info('Alert sent to monitoring service', {
        type,
        message,
        metric
      });
    } catch (error) {
      logger.error('Failed to send alert to external service:', error);
    }
  }

  private startHealthMonitoring() {
    setInterval(() => {
      this.collectSystemHealth();
    }, 30000); // Every 30 seconds
  }

  private async collectSystemHealth() {
    try {
      const health: SystemHealth = {
        timestamp: Date.now(),
        cpu: {
          usage: await this.getCPUUsage(),
          loadAverage: process.platform !== 'win32' ? require('os').loadavg() : [0, 0, 0]
        },
        memory: this.getMemoryUsage(),
        api: await this.getAPIMetrics(),
        database: await this.getDatabaseMetrics()
      };

      this.healthMetrics.push(health);

      // Keep only last 100 health checks
      if (this.healthMetrics.length > 100) {
        this.healthMetrics = this.healthMetrics.slice(-100);
      }

      // Check for system alerts
      this.checkSystemAlerts(health);

      // Store in Redis for dashboards
      await setCache('system_health:latest', health, 300);
    } catch (error) {
      logger.error('Health monitoring error:', error);
    }
  }

  private checkSystemAlerts(health: SystemHealth) {
    if (health.memory.percentage > this.alertThresholds.memoryUsage) {
      this.triggerSystemAlert('high_memory_usage', `Memory usage: ${health.memory.percentage}%`);
    }

    if (health.cpu.usage > this.alertThresholds.cpuUsage) {
      this.triggerSystemAlert('high_cpu_usage', `CPU usage: ${health.cpu.usage}%`);
    }

    if (health.api.errorRate > this.alertThresholds.errorRate) {
      this.triggerSystemAlert('high_api_error_rate', `API error rate: ${health.api.errorRate}%`);
    }
  }

  private triggerSystemAlert(type: string, message: string) {
    const now = Date.now();
    const existingAlert = this.alerts.get(type);

    // Rate limit system alerts (max 1 per 10 minutes)
    if (!existingAlert || now - existingAlert.lastAlert > 600000) {
      logger.error('System Alert', { type, message });

      this.alerts.set(type, {
        count: (existingAlert?.count || 0) + 1,
        lastAlert: now
      });
    }
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    const total = require('os').totalmem();
    const free = require('os').freemem();
    const used = total - free;

    return {
      used: usage.heapUsed,
      free,
      total,
      percentage: (used / total) * 100
    };
  }

  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);

        const totalTime = endTime[0] * 1e6 + endTime[1] / 1e3; // Convert to microseconds
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / totalTime) * 100;

        resolve(cpuPercent);
      }, 100);
    });
  }

  private async getAPIMetrics() {
    const recentMetrics = this.metrics.filter(m =>
      Date.now() - m.timestamp < 300000 // Last 5 minutes
    );

    const totalRequests = recentMetrics.length;
    const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
    const averageResponseTime = totalRequests > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0;

    const activeConnections = await this.getActiveConnections();

    return {
      totalRequests,
      errorRate,
      averageResponseTime,
      activeConnections
    };
  }

  private async getDatabaseMetrics() {
    // This would connect to your database monitoring
    return {
      activeConnections: 10, // Mock data
      queryTime: 50,
      errorRate: 0.1
    };
  }

  private async getActiveConnections(): Promise<number> {
    const count = await getCache('active_connections_count') || 0;
    return typeof count === 'number' ? count : 0;
  }

  private async incrementActiveConnections(): Promise<void> {
    const current = await this.getActiveConnections();
    await setCache('active_connections_count', current + 1, 60);
  }

  private async decrementActiveConnections(): Promise<void> {
    const current = await this.getActiveConnections();
    await setCache('active_connections_count', Math.max(0, current - 1), 60);
  }

  private async trackEndpointUsage(path: string, method: string): Promise<void> {
    const key = `endpoint_usage:${method}:${path}`;
    const current = await getCache(key) || 0;
    await setCache(key, current + 1, 3600); // 1 hour
  }

  private async trackUserActivity(userId: string, path: string): Promise<void> {
    const key = `user_activity:${userId}`;
    const activity = await getCache(key) || { lastSeen: 0, endpoints: {} };

    activity.lastSeen = Date.now();
    activity.endpoints[path] = (activity.endpoints[path] || 0) + 1;

    await setCache(key, activity, 7 * 24 * 3600); // 7 days
  }

  private trackBusinessEvent(eventType: string, data: any): void {
    logger.info('Business Event', {
      eventType,
      ...data
    });

    // This would send to analytics service
  }

  private extractBusinessMetadata(req: Request, eventType: string): any {
    switch (eventType) {
      case 'user_registration':
        return {
          country: req.body?.country,
          registrationSource: req.get('Referer')
        };
      case 'stream_creation':
        return {
          category: req.body?.category,
          isPrivate: req.body?.isPrivate
        };
      default:
        return {};
    }
  }

  private async trackFailedLogin(ip: string, identifier: string): Promise<void> {
    const key = `failed_logins:${ip}`;
    const current = await getCache(key) || 0;
    await setCache(key, current + 1, 900); // 15 minutes

    if (current > 5) {
      logger.warn('Multiple failed login attempts', {
        ip,
        identifier,
        attempts: current + 1
      });
    }
  }

  private async trackSuspiciousActivity(req: Request): Promise<void> {
    // Track unusual patterns
    const userAgent = req.get('User-Agent');

    // Check for bot-like user agents
    if (userAgent && /bot|crawler|spider|scraper/i.test(userAgent)) {
      logger.info('Bot access detected', {
        ip: req.ip,
        userAgent,
        path: req.path
      });
    }

    // Check for unusual request patterns
    const key = `request_pattern:${req.ip}`;
    const pattern = await getCache(key) || { paths: [], timestamps: [] };

    pattern.paths.push(req.path);
    pattern.timestamps.push(Date.now());

    // Keep only last 20 requests
    if (pattern.paths.length > 20) {
      pattern.paths = pattern.paths.slice(-20);
      pattern.timestamps = pattern.timestamps.slice(-20);
    }

    await setCache(key, pattern, 3600);

    // Check for rapid consecutive requests to same endpoint
    const samePathRequests = pattern.paths.filter(p => p === req.path).length;
    if (samePathRequests > 10) {
      logger.warn('Potential abuse detected', {
        ip: req.ip,
        path: req.path,
        consecutiveRequests: samePathRequests
      });
    }
  }

  private async incrementRateLimitCounter(key: string): Promise<number> {
    const current = await getCache(key) || 0;
    const newCount = current + 1;
    await setCache(key, newCount, 900); // 15 minutes
    return newCount;
  }

  private startMetricsCleanup() {
    // Clean up old metrics every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
      this.healthMetrics = this.healthMetrics.filter(h => h.timestamp > cutoff);
    }, 3600000);
  }

  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private normalizeEndpoint(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/\d+/g, '/{id}')
      .replace(/\/[a-f0-9]{24}/g, '/{id}') // MongoDB ObjectIds
      .replace(/\/[a-f0-9-]{36}/g, '/{uuid}'); // UUIDs
  }

  private calculateRequestSize(req: Request): number {
    let size = 0;

    // Headers size
    size += JSON.stringify(req.headers).length;

    // Body size
    if (req.body) {
      size += JSON.stringify(req.body).length;
    }

    // Query parameters size
    if (req.query) {
      size += JSON.stringify(req.query).length;
    }

    return size;
  }

  private categorizeError(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) return 'client_error';
    if (statusCode >= 500) return 'server_error';
    return 'unknown';
  }

  // Public API for accessing metrics
  getMetrics(timeRange?: { start: number; end: number }) {
    if (!timeRange) return this.metrics;

    return this.metrics.filter(m =>
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getHealthMetrics() {
    return this.healthMetrics;
  }

  async generateReport(timeRange?: { start: number; end: number }) {
    const metrics = this.getMetrics(timeRange);
    const health = this.getHealthMetrics();

    return {
      summary: {
        totalRequests: metrics.length,
        errorRate: metrics.length > 0
          ? (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100
          : 0,
        averageResponseTime: metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
          : 0
      },
      topEndpoints: this.getTopEndpoints(metrics),
      errorAnalysis: this.analyzeErrors(metrics),
      performanceTrends: this.analyzePerformanceTrends(metrics),
      healthStatus: health.length > 0 ? health[health.length - 1] : null
    };
  }

  private getTopEndpoints(metrics: APIMetrics[]) {
    const endpointCounts = new Map<string, number>();

    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
    });

    return Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  private analyzeErrors(metrics: APIMetrics[]) {
    const errors = metrics.filter(m => m.statusCode >= 400);
    const errorsByType = new Map<string, number>();

    errors.forEach(e => {
      const type = e.errorType || 'unknown';
      errorsByType.set(type, (errorsByType.get(type) || 0) + 1);
    });

    return {
      total: errors.length,
      byType: Array.from(errorsByType.entries()).map(([type, count]) => ({ type, count })),
      topErrorEndpoints: this.getTopEndpoints(errors)
    };
  }

  private analyzePerformanceTrends(metrics: APIMetrics[]) {
    // Group by hour
    const hourlyData = new Map<number, { count: number; totalTime: number }>();

    metrics.forEach(m => {
      const hour = Math.floor(m.timestamp / (1000 * 60 * 60));
      const existing = hourlyData.get(hour) || { count: 0, totalTime: 0 };
      existing.count++;
      existing.totalTime += m.responseTime;
      hourlyData.set(hour, existing);
    });

    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour: new Date(hour * 1000 * 60 * 60).toISOString(),
        requestCount: data.count,
        averageResponseTime: data.totalTime / data.count
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }
}

export const advancedMonitor = new AdvancedAPIMonitor();
export default advancedMonitor;