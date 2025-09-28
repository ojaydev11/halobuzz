import { Platform } from 'react-native';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static startTimes: Map<string, number> = new Map();
  private static metrics: Array<{ name: string; duration: number; timestamp: number }> = [];

  // Mark performance timing start
  static markStart(name: string): void {
    const now = Date.now();
    this.startTimes.set(name, now);

    // Use Performance API on web
    if (Platform.OS === 'web' && 'performance' in global) {
      (global as any).performance.mark(`${name}_start`);
    }
  }

  // Mark performance timing end and record duration
  static markEnd(name: string): number {
    const endTime = Date.now();
    const startTime = this.startTimes.get(name);

    if (!startTime) {
      console.warn(`Performance mark "${name}" was never started`);
      return 0;
    }

    const duration = endTime - startTime;
    this.startTimes.delete(name);

    // Store metric
    this.metrics.push({
      name,
      duration,
      timestamp: endTime,
    });

    // Use Performance API on web
    if (Platform.OS === 'web' && 'performance' in global) {
      (global as any).performance.mark(`${name}_end`);
      (global as any).performance.measure(name, `${name}_start`, `${name}_end`);
    }

    // Log critical performance issues
    if (this.isCriticalSlowdown(name, duration)) {
      console.warn(`🐌 Performance Warning: ${name} took ${duration}ms`);
    }

    return duration;
  }

  // Check if duration exceeds performance budgets
  private static isCriticalSlowdown(name: string, duration: number): boolean {
    const budgets: { [key: string]: number } = {
      app_start: 1500, // 1.5s budget for app start
      screen_transition: 200, // 200ms for screen transitions
      list_render: 100, // 100ms for list rendering
      auth_check: 500, // 500ms for auth validation
    };

    const budget = budgets[name];
    return budget ? duration > budget : duration > 1000; // Default 1s budget
  }

  // Get performance metrics summary
  static getMetrics(): {
    totalMetrics: number;
    avgDuration: number;
    slowestOperations: Array<{ name: string; duration: number }>;
    recentMetrics: Array<{ name: string; duration: number }>;
  } {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // Last minute

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = this.metrics.length > 0 ? totalDuration / this.metrics.length : 0;

    const slowestOperations = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(m => ({ name: m.name, duration: m.duration }));

    return {
      totalMetrics: this.metrics.length,
      avgDuration: Math.round(avgDuration),
      slowestOperations,
      recentMetrics: recentMetrics.map(m => ({ name: m.name, duration: m.duration })),
    };
  }

  // Clear metrics (useful for testing)
  static clearMetrics(): void {
    this.metrics = [];
    this.startTimes.clear();
  }

  // Report performance metrics to analytics (non-blocking)
  static reportMetrics(): void {
    const metrics = this.getMetrics();

    // Only report in production and if we have significant data
    if (__DEV__ || metrics.totalMetrics < 5) return;

    // Report asynchronously to avoid blocking
    setTimeout(() => {
      try {
        // Here you would send to your analytics service
        console.log('📊 Performance Metrics:', metrics);
      } catch (error) {
        // Fail silently
      }
    }, 100);
  }
}

import React from 'react';

// React hook for measuring component performance
export const usePerformanceTracker = (componentName: string) => {
  React.useEffect(() => {
    const startTime = Date.now();
    PerformanceMonitor.markStart(`component_${componentName}`);

    return () => {
      PerformanceMonitor.markEnd(`component_${componentName}`);
    };
  }, [componentName]);
};

// HOC for automatic performance tracking
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    usePerformanceTracker(name);

    return React.createElement(Component, { ...props, ref });
  });

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name})`;

  return WrappedComponent as React.ComponentType<P>;
};