/**
 * Enhanced Observability System
 * Provides comprehensive monitoring with Sentry, Prometheus, and Grafana integration
 */

import * as Sentry from '@sentry/node';
import { createPrometheusMetrics, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
  ],
});

// Prometheus metrics
const register = createPrometheusMetrics();
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new register.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new register.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new register.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type']
});

const databaseOperations = new register.Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'collection', 'status']
});

const redisOperations = new register.Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status']
});

const businessMetrics = new register.Counter({
  name: 'business_metrics_total',
  help: 'Business metrics',
  labelNames: ['metric_type', 'category']
});

const errorRate = new register.Counter({
  name: 'error_rate_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'severity']
});

export class EnhancedObservabilityService {
  private static instance: EnhancedObservabilityService;
  private redisClient = getRedisClient();

  private constructor() {
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  static getInstance(): EnhancedObservabilityService {
    if (!EnhancedObservabilityService.instance) {
      EnhancedObservabilityService.instance = new EnhancedObservabilityService();
    }
    return EnhancedObservabilityService.instance;
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    // Database health check
    setInterval(async () => {
      try {
        const mongoose = require('mongoose');
        const state = mongoose.connection.readyState;
        if (state !== 1) {
          errorRate.inc({ error_type: 'database', severity: 'critical' });
        }
      } catch (error) {
        errorRate.inc({ error_type: 'database', severity: 'critical' });
      }
    }, 30000); // Every 30 seconds

    // Redis health check
    setInterval(async () => {
      try {
        await this.redisClient.ping();
      } catch (error) {
        errorRate.inc({ error_type: 'redis', severity: 'critical' });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Update custom metrics
      activeConnections.set({ type: 'http' }, 0); // Placeholder
      activeConnections.set({ type: 'websocket' }, 0); // Placeholder
      
    }, 10000); // Every 10 seconds
  }

  /**
   * HTTP request middleware
   */
  httpRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      
      httpRequestDuration.observe(
        { method: req.method, route, status_code: res.statusCode.toString() },
        duration
      );
      
      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode.toString()
      });

      // Track error rates
      if (res.statusCode >= 400) {
        const severity = res.statusCode >= 500 ? 'critical' : 'warning';
        errorRate.inc({ error_type: 'http', severity });
      }
    });

    next();
  };

  /**
   * Database operation tracking
   */
  trackDatabaseOperation(operation: string, collection: string, status: 'success' | 'error'): void {
    databaseOperations.inc({ operation, collection, status });
  }

  /**
   * Redis operation tracking
   */
  trackRedisOperation(operation: string, status: 'success' | 'error'): void {
    redisOperations.inc({ operation, status });
  }

  /**
   * Business metrics tracking
   */
  trackBusinessMetric(metricType: string, category: string, value: number = 1): void {
    businessMetrics.inc({ metric_type: metricType, category }, value);
  }

  /**
   * Error tracking
   */
  trackError(error: Error, context?: any): void {
    const severity = this.getErrorSeverity(error);
    errorRate.inc({ error_type: error.name, severity });
    
    // Send to Sentry
    Sentry.captureException(error, {
      extra: context,
      tags: {
        severity
      }
    });
  }

  /**
   * Get error severity
   */
  private getErrorSeverity(error: Error): string {
    if (error.name === 'ValidationError') return 'warning';
    if (error.name === 'CastError') return 'warning';
    if (error.name === 'MongoError') return 'critical';
    if (error.name === 'RedisError') return 'critical';
    return 'error';
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const dbHealthy = dbState === 1;
    
    let redisHealthy = false;
    try {
      await this.redisClient.ping();
      redisHealthy = true;
    } catch (error) {
      redisHealthy = false;
    }

    return {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          state: dbState
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy'
        }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || 'unknown'
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const observabilityService = EnhancedObservabilityService.getInstance();

/**
 * Sentry request handler
 */
export const sentryRequestHandler = Sentry.requestHandler();

/**
 * Sentry error handler
 */
export const sentryErrorHandler = Sentry.errorHandler();

/**
 * Sentry tracing handler
 */
export const sentryTracingHandler = Sentry.tracingHandler();

/**
 * Metrics endpoint
 */
export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    const metrics = await observabilityService.getMetrics();
    res.set('Content-Type', register.contentType);
    res.send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint error:', error);
    res.status(500).send('Metrics collection failed');
  }
};

/**
 * Health check endpoint
 */
export const healthCheckEndpoint = async (req: Request, res: Response) => {
  try {
    const health = await observabilityService.getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
};

/**
 * Performance metrics endpoint
 */
export const performanceMetricsEndpoint = async (req: Request, res: Response) => {
  try {
    const metrics = await observabilityService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Performance metrics error:', error);
    res.status(500).json({
      error: 'Performance metrics collection failed'
    });
  }
};
