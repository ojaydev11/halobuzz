import { Request, Response, NextFunction } from 'express';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: RequestMetrics[] = [];
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public recordRequest(metrics: RequestMetrics): void {
    // Store individual request
    this.metrics.push(metrics);
    
    // Keep only last 1000 requests
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Update aggregated metrics
    const key = `${metrics.method}:${metrics.path}`;
    
    // Request counts
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
    
    // Response times
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
    }
    const times = this.responseTimes.get(key)!;
    times.push(metrics.responseTime);
    
    // Keep only last 100 response times per endpoint
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
    
    // Error counts
    if (metrics.statusCode >= 400) {
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    }
  }

  public getMetrics(): {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{
      endpoint: string;
      requests: number;
      avgResponseTime: number;
      errors: number;
    }>;
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    // Filter requests from last minute
    const recentRequests = this.metrics.filter(m => m.timestamp >= oneMinuteAgo);
    
    // Calculate requests per minute
    const requestsPerMinute = recentRequests.length;
    
    // Calculate average response time
    const totalResponseTime = recentRequests.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = recentRequests.length > 0 ? totalResponseTime / recentRequests.length : 0;
    
    // Calculate error rate
    const errorRequests = recentRequests.filter(m => m.statusCode >= 400).length;
    const errorRate = recentRequests.length > 0 ? (errorRequests / recentRequests.length) * 100 : 0;
    
    // Get top endpoints
    const topEndpoints = Array.from(this.requestCounts.entries())
      .map(([endpoint, requests]) => {
        const responseTimes = this.responseTimes.get(endpoint) || [];
        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
          : 0;
        const errors = this.errorCounts.get(endpoint) || 0;
        
        return {
          endpoint,
          requests,
          avgResponseTime: Math.round(avgResponseTime * 100) / 100,
          errors
        };
      })
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      requestsPerMinute,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints
    };
  }

  public getDetailedMetrics(): {
    totalRequests: number;
    requestsByMethod: Record<string, number>;
    requestsByStatus: Record<string, number>;
    responseTimeDistribution: {
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
  } {
    const totalRequests = this.metrics.length;
    
    // Requests by method
    const requestsByMethod: Record<string, number> = {};
    this.metrics.forEach(m => {
      requestsByMethod[m.method] = (requestsByMethod[m.method] || 0) + 1;
    });
    
    // Requests by status
    const requestsByStatus: Record<string, number> = {};
    this.metrics.forEach(m => {
      const statusGroup = Math.floor(m.statusCode / 100) * 100;
      requestsByStatus[statusGroup.toString()] = (requestsByStatus[statusGroup.toString()] || 0) + 1;
    });
    
    // Response time distribution
    const responseTimes = this.metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const responseTimeDistribution = {
      min: responseTimes[0] || 0,
      max: responseTimes[responseTimes.length - 1] || 0,
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0
    };

    return {
      totalRequests,
      requestsByMethod,
      requestsByStatus,
      responseTimeDistribution
    };
  }
}

export const metricsCollector = MetricsCollector.getInstance();

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    
    const metrics: RequestMetrics = {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    metricsCollector.recordRequest(metrics);
    
    // Log slow requests
    if (responseTime > 2000) {
      logger.warn('Slow request detected:', {
        method: req.method,
        path: req.path,
        responseTime,
        statusCode: res.statusCode,
        ip: req.ip
      });
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export const getApiMetrics = () => {
  return metricsCollector.getMetrics();
};

export const getDetailedApiMetrics = () => {
  return metricsCollector.getDetailedMetrics();
};
