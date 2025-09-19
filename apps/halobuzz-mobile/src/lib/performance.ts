import React from 'react';
import { Platform } from 'react-native';

export interface PerformanceMetrics {
  screenLoadTime: number;
  apiResponseTime: number;
  memoryUsage?: number;
  networkLatency: number;
  errorCount: number;
  crashCount: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    screenLoadTime: 0,
    apiResponseTime: 0,
    networkLatency: 0,
    errorCount: 0,
    crashCount: 0,
  };

  private screenStartTimes: Map<string, number> = new Map();
  private apiStartTimes: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Screen performance tracking
  startScreenTimer(screenName: string): void {
    this.screenStartTimes.set(screenName, Date.now());
  }

  endScreenTimer(screenName: string): number {
    const startTime = this.screenStartTimes.get(screenName);
    if (!startTime) {
      console.warn(`No start time found for screen: ${screenName}`);
      return 0;
    }

    const loadTime = Date.now() - startTime;
    this.metrics.screenLoadTime = loadTime;
    this.screenStartTimes.delete(screenName);

    console.log(`Screen ${screenName} loaded in ${loadTime}ms`);
    return loadTime;
  }

  // API performance tracking
  startApiTimer(endpoint: string): void {
    this.apiStartTimes.set(endpoint, Date.now());
  }

  endApiTimer(endpoint: string): number {
    const startTime = this.apiStartTimes.get(endpoint);
    if (!startTime) {
      console.warn(`No start time found for API: ${endpoint}`);
      return 0;
    }

    const responseTime = Date.now() - startTime;
    this.metrics.apiResponseTime = responseTime;
    this.apiStartTimes.delete(endpoint);

    console.log(`API ${endpoint} responded in ${responseTime}ms`);
    return responseTime;
  }

  // Network latency tracking
  measureNetworkLatency(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Simple ping to measure network latency
      fetch('https://halo-api-production.up.railway.app/health/simple', {
        method: 'HEAD',
        cache: 'no-cache',
      })
        .then(() => {
          const latency = Date.now() - startTime;
          this.metrics.networkLatency = latency;
          resolve(latency);
        })
        .catch(() => {
          const latency = Date.now() - startTime;
          this.metrics.networkLatency = latency;
          resolve(latency);
        });
    });
  }

  // Error tracking
  incrementErrorCount(): void {
    this.metrics.errorCount++;
  }

  incrementCrashCount(): void {
    this.metrics.crashCount++;
  }

  // Memory usage (iOS only)
  getMemoryUsage(): number | undefined {
    if (Platform.OS === 'ios') {
      // This would require native module implementation
      // For now, return undefined
      return undefined;
    }
    return undefined;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics(): void {
    this.metrics = {
      screenLoadTime: 0,
      apiResponseTime: 0,
      networkLatency: 0,
      errorCount: 0,
      crashCount: 0,
    };
  }

  // Performance thresholds
  isPerformanceGood(): boolean {
    return (
      this.metrics.screenLoadTime < 2000 && // Less than 2 seconds
      this.metrics.apiResponseTime < 1000 && // Less than 1 second
      this.metrics.networkLatency < 500 && // Less than 500ms
      this.metrics.errorCount < 5 // Less than 5 errors
    );
  }

  // Generate performance report
  generateReport(): string {
    const metrics = this.getMetrics();
    const isGood = this.isPerformanceGood();
    
    return `
Performance Report:
==================
Screen Load Time: ${metrics.screenLoadTime}ms
API Response Time: ${metrics.apiResponseTime}ms
Network Latency: ${metrics.networkLatency}ms
Error Count: ${metrics.errorCount}
Crash Count: ${metrics.crashCount}
Overall Performance: ${isGood ? 'GOOD' : 'NEEDS IMPROVEMENT'}
    `.trim();
  }
}

// HOC for screen performance tracking
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const performance = PerformanceMonitor.getInstance();

    React.useEffect(() => {
      performance.startScreenTimer(screenName);
      
      return () => {
        performance.endScreenTimer(screenName);
      };
    }, []);

    return React.createElement(WrappedComponent, props);
  };
}

// Hook for API performance tracking
export function useApiPerformance() {
  const performance = PerformanceMonitor.getInstance();

  const trackApiCall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    performance.startApiTimer(endpoint);
    
    try {
      const result = await apiCall();
      performance.endApiTimer(endpoint);
      return result;
    } catch (error) {
      performance.endApiTimer(endpoint);
      performance.incrementErrorCount();
      throw error;
    }
  };

  return { trackApiCall };
}

export default PerformanceMonitor;
