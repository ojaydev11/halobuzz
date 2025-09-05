import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { logger } from '../config/logger';

export class MetricsService {
  private registry: Registry;
  private counters: Map<string, Counter<string>>;
  private histograms: Map<string, Histogram<string>>;
  private gauges: Map<string, Gauge<string>>;

  constructor() {
    this.registry = new Registry();
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();

    // Collect default metrics
    collectDefaultMetrics({ register: this.registry });

    // Initialize custom metrics
    this.initializeMetrics();
  }

  /**
   * Initialize all custom metrics
   */
  private initializeMetrics() {
    // Stream metrics
    this.createCounter('stream_start_total', 'Total number of streams started', ['category', 'type']);
    this.createCounter('stream_end_total', 'Total number of streams ended');
    this.createCounter('stream_join_total', 'Total number of stream joins', ['category']);
    this.createHistogram('stream_duration_seconds', 'Stream duration in seconds');
    this.createHistogram('stream_reconnect_ms', 'Stream reconnection time in milliseconds');
    this.createGauge('stream_active_count', 'Number of active streams');
    this.createGauge('stream_viewers_total', 'Total viewers across all streams');

    // Gift metrics
    this.createCounter('gift_send_total', 'Total gifts sent', ['gift_type']);
    this.createHistogram('gift_value_coins', 'Gift value in coins');
    this.createCounter('gift_revenue_total', 'Total gift revenue in coins');

    // Moderation metrics
    this.createCounter('moderation_scan_total', 'Total moderation scans', ['type', 'action']);
    this.createCounter('moderation_block_total', 'Total content blocks', ['type']);
    this.createCounter('moderation_override_total', 'Total admin overrides', ['targetType', 'decision']);
    this.createCounter('moderation_report_total', 'Total user reports', ['type', 'reason']);
    this.createGauge('moderation_queue_size', 'Current moderation queue size');

    // Payment metrics
    this.createCounter('payment_success_total', 'Successful payments', ['provider']);
    this.createCounter('payment_failure_total', 'Failed payments', ['provider']);
    this.createCounter('payment_error_total', 'Payment errors', ['provider']);
    this.createHistogram('payment_amount', 'Payment amount', ['provider']);
    this.createHistogram('wallet_credit_time_ms', 'Time to credit wallet in milliseconds');
    
    // User metrics
    this.createCounter('user_registration_total', 'Total user registrations');
    this.createCounter('user_login_total', 'Total user logins');
    this.createGauge('user_active_daily', 'Daily active users');
    this.createGauge('user_active_monthly', 'Monthly active users');

    // API metrics
    this.createHistogram('http_request_duration_ms', 'HTTP request duration in milliseconds', ['method', 'route', 'status']);
    this.createCounter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status']);
    
    // WebSocket metrics
    this.createGauge('ws_connections_active', 'Active WebSocket connections');
    this.createCounter('ws_messages_sent_total', 'Total WebSocket messages sent');
    this.createCounter('ws_messages_received_total', 'Total WebSocket messages received');

    // System metrics
    this.createGauge('system_memory_usage_bytes', 'System memory usage in bytes');
    this.createGauge('system_cpu_usage_percent', 'System CPU usage percentage');
    this.createGauge('database_connections_active', 'Active database connections');
    this.createGauge('redis_connections_active', 'Active Redis connections');

    logger.info('Metrics initialized successfully');
  }

  /**
   * Create a counter metric
   */
  private createCounter(name: string, help: string, labelNames: string[] = []): Counter<string> {
    const counter = new Counter({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
    this.counters.set(name, counter);
    return counter;
  }

  /**
   * Create a histogram metric
   */
  private createHistogram(name: string, help: string, labelNames: string[] = []): Histogram<string> {
    const histogram = new Histogram({
      name,
      help,
      labelNames,
      buckets: [0.1, 5, 15, 50, 100, 300, 500, 1000, 3000, 5000, 10000],
      registers: [this.registry]
    });
    this.histograms.set(name, histogram);
    return histogram;
  }

  /**
   * Create a gauge metric
   */
  private createGauge(name: string, help: string, labelNames: string[] = []): Gauge<string> {
    const gauge = new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
    this.gauges.set(name, gauge);
    return gauge;
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels?: Record<string, string | number>): void {
    const counter = this.counters.get(name);
    if (counter) {
      if (labels) {
        counter.labels(labels as any).inc();
      } else {
        counter.inc();
      }
    } else {
      logger.warn(`Counter ${name} not found`);
    }
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string | number>): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      if (labels) {
        histogram.labels(labels as any).observe(value);
      } else {
        histogram.observe(value);
      }
    } else {
      logger.warn(`Histogram ${name} not found`);
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number, labels?: Record<string, string | number>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      if (labels) {
        gauge.labels(labels as any).set(value);
      } else {
        gauge.set(value);
      }
    } else {
      logger.warn(`Gauge ${name} not found`);
    }
  }

  /**
   * Increment a gauge
   */
  incrementGauge(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      if (labels) {
        gauge.labels(labels as any).inc(value);
      } else {
        gauge.inc(value);
      }
    } else {
      logger.warn(`Gauge ${name} not found`);
    }
  }

  /**
   * Decrement a gauge
   */
  decrementGauge(name: string, value: number = 1, labels?: Record<string, string | number>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      if (labels) {
        gauge.labels(labels as any).dec(value);
      } else {
        gauge.dec(value);
      }
    } else {
      logger.warn(`Gauge ${name} not found`);
    }
  }

  /**
   * Get metrics for Prometheus scraping
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get content type for Prometheus
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.registry.resetMetrics();
  }

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.incrementCounter('http_requests_total', { method, route, status: status.toString() });
    this.recordHistogram('http_request_duration_ms', duration, { method, route, status: status.toString() });
  }

  /**
   * Track system metrics
   */
  trackSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage();
    this.setGauge('system_memory_usage_bytes', memUsage.heapUsed);

    // CPU usage
    const cpuUsage = process.cpuUsage();
    const totalCpu = cpuUsage.user + cpuUsage.system;
    this.setGauge('system_cpu_usage_percent', totalCpu / 1000000); // Convert to percentage
  }

  /**
   * Start periodic system metrics collection
   */
  startSystemMetricsCollection(intervalMs: number = 10000): void {
    setInterval(() => {
      this.trackSystemMetrics();
    }, intervalMs);
  }
}

// Export singleton instance
export const metricsService = new MetricsService();