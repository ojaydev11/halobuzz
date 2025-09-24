#!/usr/bin/env node

/**
 * Production Monitoring Script for HaloBuzz AI/ML Features
 * Continuous monitoring with alerting
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiBase: process.env.API_BASE || 'http://localhost:4000',
  adminToken: process.env.ADMIN_TOKEN || '',
  monitoringInterval: 60 * 1000, // 1 minute
  alertThresholds: {
    latencyP95: 250, // ms
    latencyP99: 500, // ms
    errorRate: 0.01, // 1%
    fraudFalsePositives: 0.05, // 5%
    cacheHitRate: 0.80, // 80%
    memoryUsage: 0.90, // 90%
    cpuUsage: 0.90 // 90%
  },
  endpoints: [
    { name: 'AI Recommendations', path: '/api/v1/ai-recommendations?limit=20' },
    { name: 'Advanced Analytics', path: '/api/v1/advanced-analytics/dashboard?timeRange=day' },
    { name: 'Real-Time Personalization', path: '/api/v1/personalization/content-feed?limit=10' },
    { name: 'Fraud Detection', path: '/api/v1/fraud-detection/risk-score/test_user' },
    { name: 'ML Optimization', path: '/api/v1/ml-optimization/ab-test/results' }
  ],
  alertChannels: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    webhook: process.env.ALERT_WEBHOOK_URL
  }
};

class ProductionMonitor {
  constructor() {
    this.metrics = [];
    this.alerts = [];
    this.isRunning = false;
  }

  async start() {
    console.log('📊 Starting HaloBuzz Production Monitoring...');
    this.isRunning = true;
    
    // Initial health check
    await this.validateEnvironment();
    
    // Start monitoring loop
    while (this.isRunning) {
      try {
        await this.collectMetrics();
        await this.checkThresholds();
        await this.generateReport();
        
        console.log(`✅ Monitoring cycle completed at ${new Date().toISOString()}`);
        
        // Wait for next cycle
        await this.sleep(CONFIG.monitoringInterval);
        
      } catch (error) {
        console.error('❌ Monitoring cycle failed:', error.message);
        await this.sendAlert('CRITICAL', 'Monitoring cycle failed', error.message);
        await this.sleep(CONFIG.monitoringInterval);
      }
    }
  }

  stop() {
    console.log('🛑 Stopping production monitoring...');
    this.isRunning = false;
  }

  async validateEnvironment() {
    console.log('🔍 Validating monitoring environment...');
    
    // Check API connectivity
    try {
      const response = await axios.get(`${CONFIG.apiBase}/healthz`, { timeout: 5000 });
      if (response.status !== 200) {
        throw new Error('API health check failed');
      }
    } catch (error) {
      throw new Error(`API not accessible: ${error.message}`);
    }
    
    console.log('✅ Environment validation passed');
  }

  async collectMetrics() {
    const cycleStart = Date.now();
    const cycleMetrics = {
      timestamp: new Date().toISOString(),
      endpoints: [],
      system: {},
      ai: {}
    };
    
    // Test each endpoint
    for (const endpoint of CONFIG.endpoints) {
      const start = Date.now();
      try {
        const response = await axios.get(`${CONFIG.apiBase}${endpoint.path}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
          timeout: 10000
        });
        
        const latency = Date.now() - start;
        const success = response.status === 200;
        
        cycleMetrics.endpoints.push({
          name: endpoint.name,
          path: endpoint.path,
          latency,
          success,
          statusCode: response.status,
          responseTime: response.headers['x-response-time'] || latency
        });
        
      } catch (error) {
        const latency = Date.now() - start;
        cycleMetrics.endpoints.push({
          name: endpoint.name,
          path: endpoint.path,
          latency,
          success: false,
          statusCode: error.response?.status || 0,
          error: error.message
        });
      }
    }
    
    // Collect system metrics
    try {
      const healthResponse = await axios.get(`${CONFIG.apiBase}/api/v1/monitoring/health`, {
        headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
        timeout: 5000
      });
      
      cycleMetrics.system = healthResponse.data;
    } catch (error) {
      cycleMetrics.system = { error: error.message };
    }
    
    // Collect AI-specific metrics
    try {
      const aiMetricsResponse = await axios.get(`${CONFIG.apiBase}/api/v1/monitoring/ai-metrics`, {
        headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
        timeout: 5000
      });
      
      cycleMetrics.ai = aiMetricsResponse.data;
    } catch (error) {
      cycleMetrics.ai = { error: error.message };
    }
    
    cycleMetrics.collectionTime = Date.now() - cycleStart;
    this.metrics.push(cycleMetrics);
    
    // Keep only last 100 cycles
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  async checkThresholds() {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return;
    
    // Check latency thresholds
    const avgLatency = latest.endpoints.reduce((sum, ep) => sum + ep.latency, 0) / latest.endpoints.length;
    if (avgLatency > CONFIG.alertThresholds.latencyP95) {
      await this.sendAlert('WARNING', 'High Latency Detected', 
        `Average latency ${avgLatency}ms exceeds threshold ${CONFIG.alertThresholds.latencyP95}ms`);
    }
    
    // Check error rate
    const errorRate = latest.endpoints.filter(ep => !ep.success).length / latest.endpoints.length;
    if (errorRate > CONFIG.alertThresholds.errorRate) {
      await this.sendAlert('CRITICAL', 'High Error Rate Detected', 
        `Error rate ${errorRate} exceeds threshold ${CONFIG.alertThresholds.errorRate}`);
    }
    
    // Check system metrics
    if (latest.system.memoryUsage && latest.system.memoryUsage > CONFIG.alertThresholds.memoryUsage) {
      await this.sendAlert('WARNING', 'High Memory Usage', 
        `Memory usage ${latest.system.memoryUsage} exceeds threshold ${CONFIG.alertThresholds.memoryUsage}`);
    }
    
    if (latest.system.cpuUsage && latest.system.cpuUsage > CONFIG.alertThresholds.cpuUsage) {
      await this.sendAlert('WARNING', 'High CPU Usage', 
        `CPU usage ${latest.system.cpuUsage} exceeds threshold ${CONFIG.alertThresholds.cpuUsage}`);
    }
    
    // Check AI-specific metrics
    if (latest.ai.fraudFalsePositiveRate && latest.ai.fraudFalsePositiveRate > CONFIG.alertThresholds.fraudFalsePositives) {
      await this.sendAlert('WARNING', 'High Fraud False Positives', 
        `Fraud FP rate ${latest.ai.fraudFalsePositiveRate} exceeds threshold ${CONFIG.alertThresholds.fraudFalsePositives}`);
    }
    
    if (latest.ai.cacheHitRate && latest.ai.cacheHitRate < CONFIG.alertThresholds.cacheHitRate) {
      await this.sendAlert('WARNING', 'Low Cache Hit Rate', 
        `Cache hit rate ${latest.ai.cacheHitRate} below threshold ${CONFIG.alertThresholds.cacheHitRate}`);
    }
  }

  async sendAlert(severity, title, message) {
    const alert = {
      timestamp: new Date().toISOString(),
      severity,
      title,
      message,
      id: `alert_${Date.now()}`
    };
    
    this.alerts.push(alert);
    
    console.log(`🚨 ${severity} ALERT: ${title} - ${message}`);
    
    // Send to configured channels
    if (CONFIG.alertChannels.slack) {
      await this.sendSlackAlert(alert);
    }
    
    if (CONFIG.alertChannels.email) {
      await this.sendEmailAlert(alert);
    }
    
    if (CONFIG.alertChannels.webhook) {
      await this.sendWebhookAlert(alert);
    }
  }

  async sendSlackAlert(alert) {
    try {
      await axios.post(CONFIG.alertChannels.slack, {
        text: `🚨 HaloBuzz Alert`,
        attachments: [{
          color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Title', value: alert.title, short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: alert.timestamp, short: true }
          ]
        }]
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  async sendEmailAlert(alert) {
    // Implementation would depend on email service (SendGrid, SES, etc.)
    console.log(`📧 Email alert would be sent to ${CONFIG.alertChannels.email}: ${alert.title}`);
  }

  async sendWebhookAlert(alert) {
    try {
      await axios.post(CONFIG.alertChannels.webhook, alert, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  async generateReport() {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEndpoints: latest.endpoints.length,
        successfulEndpoints: latest.endpoints.filter(ep => ep.success).length,
        averageLatency: latest.endpoints.reduce((sum, ep) => sum + ep.latency, 0) / latest.endpoints.length,
        errorRate: latest.endpoints.filter(ep => !ep.success).length / latest.endpoints.length,
        systemHealth: latest.system,
        aiMetrics: latest.ai
      },
      recentAlerts: this.alerts.slice(-5),
      trends: this.calculateTrends()
    };
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'logs', 'monitoring-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  calculateTrends() {
    if (this.metrics.length < 5) return {};
    
    const recent = this.metrics.slice(-5);
    const trends = {};
    
    // Calculate latency trend
    const latencies = recent.map(m => 
      m.endpoints.reduce((sum, ep) => sum + ep.latency, 0) / m.endpoints.length
    );
    trends.latency = this.calculateTrend(latencies);
    
    // Calculate error rate trend
    const errorRates = recent.map(m => 
      m.endpoints.filter(ep => !ep.success).length / m.endpoints.length
    );
    trends.errorRate = this.calculateTrend(errorRates);
    
    return trends;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  if (global.monitor) {
    global.monitor.stop();
  }
  process.exit(0);
});

// Run the monitor
if (require.main === module) {
  global.monitor = new ProductionMonitor();
  global.monitor.start().catch(console.error);
}

module.exports = ProductionMonitor;

