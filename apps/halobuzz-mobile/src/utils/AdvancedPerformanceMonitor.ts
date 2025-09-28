import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MemoryMetrics {
  jsHeapSizeUsed: number;
  jsHeapSizeTotal: number;
  jsHeapSizeLimit: number;
  nativeHeapSize?: number;
  timestamp: number;
}

interface NetworkMetrics {
  requestId: string;
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  responseSize: number;
  statusCode: number;
  success: boolean;
}

interface AppStartMetrics {
  coldStart: number;
  warmStart: number;
  bundleLoadTime: number;
  nativeModuleInitTime: number;
  jsExecutionTime: number;
}

class AdvancedPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private networkMetrics: NetworkMetrics[] = [];
  private memoryMetrics: MemoryMetrics[] = [];
  private renderMetrics = new Map<string, number>();
  private appStartTime: number = Date.now();
  private isMonitoring: boolean = false;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private frameDropCounter = 0;
  private targetFPS = 60;

  constructor() {
    this.initializeMonitoring();
  }

  private async initializeMonitoring() {
    if (__DEV__) {
      console.log('🚀 Advanced Performance Monitor initialized');
    }

    // Start monitoring immediately
    this.startMonitoring();

    // Set up memory monitoring
    this.startMemoryMonitoring();

    // Set up frame rate monitoring
    this.startFrameRateMonitoring();

    // Load previous session metrics
    await this.loadStoredMetrics();
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('Performance monitoring started');

    // Monitor app lifecycle
    this.monitorAppStart();

    // Set up periodic metric collection
    this.scheduleMetricCollection();
  }

  stopMonitoring() {
    this.isMonitoring = false;

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    logger.info('Performance monitoring stopped');
  }

  // App Start Performance
  private monitorAppStart() {
    const now = Date.now();

    // Measure bundle load time
    const bundleLoadEnd = now;
    const bundleLoadTime = bundleLoadEnd - this.appStartTime;

    this.recordMetric('app_start_bundle_load', bundleLoadTime, {
      platform: Platform.OS,
      version: Platform.Version
    });

    // Measure time to interactive
    setTimeout(() => {
      const timeToInteractive = Date.now() - this.appStartTime;
      this.recordMetric('app_start_time_to_interactive', timeToInteractive, {
        platform: Platform.OS
      });
    }, 0);

    // Measure navigation ready time
    this.measureNavigationReady();
  }

  private measureNavigationReady() {
    // This would integrate with your navigation system
    const navigationReadyTime = Date.now() - this.appStartTime;
    this.recordMetric('app_start_navigation_ready', navigationReadyTime);
  }

  // Memory Monitoring
  private startMemoryMonitoring() {
    this.memoryMonitorInterval = setInterval(() => {
      this.collectMemoryMetrics();
    }, 10000); // Every 10 seconds
  }

  private async collectMemoryMetrics() {
    try {
      let memoryMetric: MemoryMetrics = {
        jsHeapSizeUsed: 0,
        jsHeapSizeTotal: 0,
        jsHeapSizeLimit: 0,
        timestamp: Date.now()
      };

      // For web/browser environments
      if (typeof window !== 'undefined' && window.performance && (window.performance as any).memory) {
        const memory = (window.performance as any).memory;
        memoryMetric = {
          jsHeapSizeUsed: memory.usedJSHeapSize,
          jsHeapSizeTotal: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
      }

      // For React Native
      if (Platform.OS !== 'web' && global.gc) {
        // If garbage collection is available, measure before and after
        const beforeGC = Date.now();
        global.gc();
        const gcTime = Date.now() - beforeGC;

        this.recordMetric('memory_gc_time', gcTime);
      }

      this.memoryMetrics.push(memoryMetric);

      // Keep only last 100 memory readings
      if (this.memoryMetrics.length > 100) {
        this.memoryMetrics = this.memoryMetrics.slice(-100);
      }

      // Check for memory leaks
      this.detectMemoryLeaks(memoryMetric);

    } catch (error) {
      logger.error('Memory monitoring error:', error);
    }
  }

  private detectMemoryLeaks(currentMetric: MemoryMetrics) {
    if (this.memoryMetrics.length < 10) return;

    const recentMetrics = this.memoryMetrics.slice(-10);
    const averageGrowth = recentMetrics.reduce((acc, metric, index) => {
      if (index === 0) return 0;
      return acc + (metric.jsHeapSizeUsed - recentMetrics[index - 1].jsHeapSizeUsed);
    }, 0) / (recentMetrics.length - 1);

    // Alert if memory is growing consistently
    if (averageGrowth > 1024 * 1024) { // 1MB average growth
      logger.warn('Potential memory leak detected', {
        averageGrowth,
        currentUsage: currentMetric.jsHeapSizeUsed
      });

      this.recordMetric('memory_leak_warning', averageGrowth, {
        currentUsage: currentMetric.jsHeapSizeUsed,
        trend: 'increasing'
      });
    }
  }

  // Frame Rate Monitoring
  private startFrameRateMonitoring() {
    let lastFrameTime = Date.now();
    let frameCount = 0;

    const measureFrameRate = () => {
      const currentTime = Date.now();
      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime > 1000) { // Every second
        const fps = (frameCount * 1000) / deltaTime;

        this.recordMetric('frame_rate', fps);

        if (fps < this.targetFPS * 0.8) { // Below 80% of target FPS
          this.frameDropCounter++;
          this.recordMetric('frame_drops', this.frameDropCounter);
        }

        frameCount = 0;
        lastFrameTime = currentTime;
      }

      frameCount++;

      if (this.isMonitoring) {
        requestAnimationFrame(measureFrameRate);
      }
    };

    requestAnimationFrame(measureFrameRate);
  }

  // Network Performance Monitoring
  monitorNetworkRequest(
    requestId: string,
    url: string,
    method: string,
    startTime: number
  ) {
    return {
      complete: (responseSize: number, statusCode: number, success: boolean) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const networkMetric: NetworkMetrics = {
          requestId,
          url,
          method,
          startTime,
          endTime,
          responseSize,
          statusCode,
          success
        };

        this.networkMetrics.push(networkMetric);

        // Keep only last 200 network requests
        if (this.networkMetrics.length > 200) {
          this.networkMetrics = this.networkMetrics.slice(-200);
        }

        // Record performance metrics
        this.recordMetric('network_request_duration', duration, {
          url: url.replace(/\/\d+/g, '/:id'), // Anonymize IDs
          method,
          statusCode,
          success
        });

        this.recordMetric('network_response_size', responseSize, {
          url: url.replace(/\/\d+/g, '/:id'),
          method
        });

        // Alert on slow requests
        if (duration > 5000) {
          logger.warn('Slow network request detected', {
            url,
            duration,
            statusCode
          });
        }
      }
    };
  }

  // Component Render Performance
  measureComponentRender(componentName: string) {
    const startTime = Date.now();

    return {
      finish: () => {
        const renderTime = Date.now() - startTime;
        this.renderMetrics.set(componentName, renderTime);

        this.recordMetric('component_render_time', renderTime, {
          component: componentName
        });

        // Alert on slow renders
        if (renderTime > 16.67) { // More than one frame at 60fps
          logger.warn('Slow component render', {
            component: componentName,
            renderTime
          });
        }
      }
    };
  }

  // Screen Transition Performance
  measureScreenTransition(fromScreen: string, toScreen: string) {
    const startTime = Date.now();

    return {
      finish: () => {
        const transitionTime = Date.now() - startTime;

        this.recordMetric('screen_transition_time', transitionTime, {
          from: fromScreen,
          to: toScreen
        });

        // Alert on slow transitions
        if (transitionTime > 300) {
          logger.warn('Slow screen transition', {
            from: fromScreen,
            to: toScreen,
            duration: transitionTime
          });
        }
      }
    };
  }

  // Battery Usage Monitoring
  async monitorBatteryUsage() {
    try {
      if (Platform.OS === 'web' && 'getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();

        this.recordMetric('battery_level', battery.level * 100);
        this.recordMetric('battery_charging', battery.charging ? 1 : 0);

        battery.addEventListener('levelchange', () => {
          this.recordMetric('battery_level', battery.level * 100);
        });

        battery.addEventListener('chargingchange', () => {
          this.recordMetric('battery_charging', battery.charging ? 1 : 0);
        });
      }
    } catch (error) {
      logger.debug('Battery monitoring not available:', error);
    }
  }

  // Bundle Size Analysis
  async analyzeBundleSize() {
    try {
      const bundleMetrics = {
        totalSize: 0,
        jsSize: 0,
        assetSize: 0,
        compressionRatio: 0
      };

      // This would integrate with your bundle analyzer
      this.recordMetric('bundle_total_size', bundleMetrics.totalSize);
      this.recordMetric('bundle_js_size', bundleMetrics.jsSize);
      this.recordMetric('bundle_asset_size', bundleMetrics.assetSize);
      this.recordMetric('bundle_compression_ratio', bundleMetrics.compressionRatio);

    } catch (error) {
      logger.error('Bundle analysis error:', error);
    }
  }

  // Core metric recording
  private recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    if (__DEV__ && value > this.getPerformanceThreshold(name)) {
      console.warn(`⚠️ Performance Warning: ${name} = ${value}ms`, metadata);
    }
  }

  private getPerformanceThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'component_render_time': 16.67, // 60fps
      'screen_transition_time': 300,
      'network_request_duration': 3000,
      'app_start_time_to_interactive': 5000,
      'frame_rate': 50 // Below 50fps is concerning
    };

    return thresholds[metricName] || Infinity;
  }

  // Reporting and Analytics
  async generatePerformanceReport(): Promise<any> {
    const report = {
      timestamp: Date.now(),
      session: {
        duration: Date.now() - this.appStartTime,
        platform: Platform.OS,
        version: Platform.Version
      },
      metrics: {
        total: this.metrics.length,
        byType: this.groupMetricsByType(),
        averages: this.calculateAverages(),
        alerts: this.getPerformanceAlerts()
      },
      memory: {
        current: this.getCurrentMemoryUsage(),
        peak: this.getPeakMemoryUsage(),
        leaks: this.getMemoryLeakWarnings()
      },
      network: {
        totalRequests: this.networkMetrics.length,
        averageResponseTime: this.getAverageNetworkResponseTime(),
        errorRate: this.getNetworkErrorRate(),
        slowRequests: this.getSlowNetworkRequests()
      },
      rendering: {
        averageFPS: this.getAverageFPS(),
        frameDrops: this.frameDropCounter,
        slowComponents: this.getSlowComponents()
      }
    };

    return report;
  }

  private groupMetricsByType() {
    const grouped: Record<string, number> = {};

    this.metrics.forEach(metric => {
      grouped[metric.name] = (grouped[metric.name] || 0) + 1;
    });

    return grouped;
  }

  private calculateAverages() {
    const averages: Record<string, number> = {};
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    this.metrics.forEach(metric => {
      sums[metric.name] = (sums[metric.name] || 0) + metric.value;
      counts[metric.name] = (counts[metric.name] || 0) + 1;
    });

    Object.keys(sums).forEach(name => {
      averages[name] = sums[name] / counts[name];
    });

    return averages;
  }

  private getPerformanceAlerts() {
    return this.metrics.filter(metric =>
      metric.value > this.getPerformanceThreshold(metric.name)
    );
  }

  private getCurrentMemoryUsage(): number {
    return this.memoryMetrics.length > 0
      ? this.memoryMetrics[this.memoryMetrics.length - 1].jsHeapSizeUsed
      : 0;
  }

  private getPeakMemoryUsage(): number {
    return Math.max(...this.memoryMetrics.map(m => m.jsHeapSizeUsed));
  }

  private getMemoryLeakWarnings(): number {
    return this.metrics.filter(m => m.name === 'memory_leak_warning').length;
  }

  private getAverageNetworkResponseTime(): number {
    if (this.networkMetrics.length === 0) return 0;

    const totalTime = this.networkMetrics.reduce((sum, metric) =>
      sum + (metric.endTime - metric.startTime), 0
    );

    return totalTime / this.networkMetrics.length;
  }

  private getNetworkErrorRate(): number {
    if (this.networkMetrics.length === 0) return 0;

    const errors = this.networkMetrics.filter(m => !m.success).length;
    return (errors / this.networkMetrics.length) * 100;
  }

  private getSlowNetworkRequests() {
    return this.networkMetrics.filter(m =>
      (m.endTime - m.startTime) > 3000
    );
  }

  private getAverageFPS(): number {
    const fpsMetrics = this.metrics.filter(m => m.name === 'frame_rate');
    if (fpsMetrics.length === 0) return 0;

    return fpsMetrics.reduce((sum, m) => sum + m.value, 0) / fpsMetrics.length;
  }

  private getSlowComponents() {
    return Array.from(this.renderMetrics.entries())
      .filter(([, time]) => time > 16.67)
      .sort((a, b) => b[1] - a[1]);
  }

  // Storage management
  private async loadStoredMetrics() {
    try {
      const stored = await AsyncStorage.getItem('performance_metrics');
      if (stored) {
        const data = JSON.parse(stored);
        // Load previous session data if needed
        logger.info('Loaded stored performance metrics');
      }
    } catch (error) {
      logger.error('Failed to load stored metrics:', error);
    }
  }

  private async storeMetrics() {
    try {
      const report = await this.generatePerformanceReport();
      await AsyncStorage.setItem('performance_metrics', JSON.stringify(report));
      logger.info('Stored performance metrics');
    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  private scheduleMetricCollection() {
    // Store metrics every 5 minutes
    setInterval(() => {
      this.storeMetrics();
    }, 300000);

    // Generate and send reports every hour
    setInterval(async () => {
      const report = await this.generatePerformanceReport();
      this.sendMetricsToAnalytics(report);
    }, 3600000);
  }

  private async sendMetricsToAnalytics(report: any) {
    try {
      // This would send to your analytics service
      logger.info('Performance report generated:', {
        metricsCount: report.metrics.total,
        sessionDuration: report.session.duration,
        averageFPS: report.rendering.averageFPS
      });
    } catch (error) {
      logger.error('Failed to send metrics to analytics:', error);
    }
  }
}

export const performanceMonitor = new AdvancedPerformanceMonitor();
export default performanceMonitor;