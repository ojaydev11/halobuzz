/**
 * Performance Monitoring Utility
 * Provides performance tracking and monitoring capabilities
 */

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface PerformanceMetrics {
  marks: Map<string, PerformanceMark>;
  measurements: Map<string, number>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;

  constructor() {
    this.metrics = {
      marks: new Map(),
      measurements: new Map()
    };
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public static markStart(name: string): void {
    const instance = PerformanceMonitor.getInstance();
    instance.metrics.marks.set(name, {
      name,
      startTime: Date.now()
    });
  }

  public static markEnd(name: string): number | undefined {
    const instance = PerformanceMonitor.getInstance();
    const mark = instance.metrics.marks.get(name);
    
    if (!mark) {
      console.warn(`Performance mark "${name}" not found`);
      return undefined;
    }

    const endTime = Date.now();
    const duration = endTime - mark.startTime;
    
    mark.endTime = endTime;
    mark.duration = duration;
    
    instance.metrics.measurements.set(name, duration);
    return duration;
  }

  public static getMeasurement(name: string): number | undefined {
    const instance = PerformanceMonitor.getInstance();
    return instance.metrics.measurements.get(name);
  }

  public static getAllMeasurements(): Map<string, number> {
    const instance = PerformanceMonitor.getInstance();
    return new Map(instance.metrics.measurements);
  }

  public static clear(): void {
    const instance = PerformanceMonitor.getInstance();
    instance.metrics.marks.clear();
    instance.metrics.measurements.clear();
  }

  public static getMetrics(): PerformanceMetrics {
    const instance = PerformanceMonitor.getInstance();
    return {
      marks: new Map(instance.metrics.marks),
      measurements: new Map(instance.metrics.measurements)
    };
  }
}

export { PerformanceMonitor };
export default PerformanceMonitor;
