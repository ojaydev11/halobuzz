#!/usr/bin/env node

/**
 * Emergency Rollback Script for HaloBuzz AI/ML Features
 * Immediate rollback of all feature flags and services
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiBase: process.env.API_BASE || 'http://localhost:4000',
  adminToken: process.env.ADMIN_TOKEN || '',
  featureFlags: [
    'FF_RECS',
    'FF_RTP', 
    'FF_ML_OPT',
    'FF_FRAUD_V2'
  ],
  killSwitches: [
    'ai_recommendations',
    'real_time_personalization',
    'ml_optimization',
    'advanced_fraud_detection'
  ],
  rollbackTimeout: 30000, // 30 seconds
  alertChannels: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: process.env.ALERT_EMAIL,
    webhook: process.env.ALERT_WEBHOOK_URL
  }
};

class EmergencyRollback {
  constructor() {
    this.rollbackLog = [];
    this.startTime = Date.now();
  }

  async execute() {
    console.log('🚨 EMERGENCY ROLLBACK INITIATED');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    try {
      // Validate environment
      await this.validateEnvironment();
      
      // Step 1: Activate kill switches
      console.log('\n🔴 Step 1: Activating kill switches...');
      await this.activateKillSwitches();
      
      // Step 2: Rollback feature flags
      console.log('\n🔴 Step 2: Rolling back feature flags...');
      await this.rollbackFeatureFlags();
      
      // Step 3: Verify rollback
      console.log('\n🔴 Step 3: Verifying rollback...');
      await this.verifyRollback();
      
      // Step 4: Send notifications
      console.log('\n🔴 Step 4: Sending notifications...');
      await this.sendRollbackNotifications();
      
      // Step 5: Generate rollback report
      console.log('\n🔴 Step 5: Generating rollback report...');
      await this.generateRollbackReport();
      
      const duration = Date.now() - this.startTime;
      console.log(`\n✅ Emergency rollback completed in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Emergency rollback failed:', error.message);
      await this.sendCriticalAlert('Emergency rollback failed', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating rollback environment...');
    
    // Check API connectivity
    try {
      const response = await axios.get(`${CONFIG.apiBase}/healthz`, { timeout: 5000 });
      if (response.status !== 200) {
        throw new Error('API health check failed');
      }
    } catch (error) {
      throw new Error(`API not accessible: ${error.message}`);
    }
    
    // Check admin token
    if (!CONFIG.adminToken) {
      throw new Error('ADMIN_TOKEN environment variable required');
    }
    
    console.log('✅ Environment validation passed');
  }

  async activateKillSwitches() {
    for (const service of CONFIG.killSwitches) {
      try {
        const response = await axios.post(
          `${CONFIG.apiBase}/api/v1/admin/kill-switch/activate`,
          {
            service,
            reason: 'Emergency rollback initiated',
            timestamp: new Date().toISOString()
          },
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.adminToken}`,
              'Content-Type': 'application/json'
            },
            timeout: CONFIG.rollbackTimeout
          }
        );
        
        if (response.data.success) {
          console.log(`  ✅ ${service}: Kill switch activated`);
          this.rollbackLog.push({
            timestamp: new Date().toISOString(),
            action: 'kill_switch_activated',
            service,
            status: 'success'
          });
        } else {
          throw new Error(`Failed to activate kill switch for ${service}: ${response.data.message}`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${service}: Kill switch activation failed - ${error.message}`);
        this.rollbackLog.push({
          timestamp: new Date().toISOString(),
          action: 'kill_switch_activated',
          service,
          status: 'failed',
          error: error.message
        });
        // Continue with other services even if one fails
      }
    }
  }

  async rollbackFeatureFlags() {
    for (const flag of CONFIG.featureFlags) {
      try {
        const response = await axios.post(
          `${CONFIG.apiBase}/api/v1/admin/feature-flags/rollback`,
          {
            flag,
            rollbackPercentage: 0,
            reason: 'Emergency rollback',
            timestamp: new Date().toISOString()
          },
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.adminToken}`,
              'Content-Type': 'application/json'
            },
            timeout: CONFIG.rollbackTimeout
          }
        );
        
        if (response.data.success) {
          console.log(`  ✅ ${flag}: Rolled back to 0%`);
          this.rollbackLog.push({
            timestamp: new Date().toISOString(),
            action: 'feature_flag_rollback',
            flag,
            percentage: 0,
            status: 'success'
          });
        } else {
          throw new Error(`Failed to rollback ${flag}: ${response.data.message}`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${flag}: Rollback failed - ${error.message}`);
        this.rollbackLog.push({
          timestamp: new Date().toISOString(),
          action: 'feature_flag_rollback',
          flag,
          percentage: 0,
          status: 'failed',
          error: error.message
        });
        // Continue with other flags even if one fails
      }
    }
  }

  async verifyRollback() {
    console.log('🔍 Verifying rollback status...');
    
    // Check kill switches
    for (const service of CONFIG.killSwitches) {
      try {
        const response = await axios.get(
          `${CONFIG.apiBase}/api/v1/admin/kill-switch/status/${service}`,
          {
            headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
            timeout: 5000
          }
        );
        
        if (response.data.active) {
          console.log(`  ✅ ${service}: Kill switch is active`);
        } else {
          console.log(`  ⚠️ ${service}: Kill switch not active`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${service}: Could not verify kill switch status`);
      }
    }
    
    // Check feature flags
    for (const flag of CONFIG.featureFlags) {
      try {
        const response = await axios.get(
          `${CONFIG.apiBase}/api/v1/admin/feature-flags/status/${flag}`,
          {
            headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
            timeout: 5000
          }
        );
        
        if (response.data.rolloutPercentage === 0) {
          console.log(`  ✅ ${flag}: Rolled back to 0%`);
        } else {
          console.log(`  ⚠️ ${flag}: Still at ${response.data.rolloutPercentage}%`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${flag}: Could not verify feature flag status`);
      }
    }
    
    // Test critical endpoints
    console.log('🧪 Testing critical endpoints...');
    const criticalEndpoints = [
      '/api/v1/ai-recommendations',
      '/api/v1/personalization/content-feed',
      '/api/v1/fraud-detection/risk-score/test_user'
    ];
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await axios.get(`${CONFIG.apiBase}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
          timeout: 5000
        });
        
        if (response.data.killSwitchActive) {
          console.log(`  ✅ ${endpoint}: Safe baseline active`);
        } else {
          console.log(`  ⚠️ ${endpoint}: May still be using AI features`);
        }
        
      } catch (error) {
        console.error(`  ❌ ${endpoint}: Could not test endpoint`);
      }
    }
  }

  async sendRollbackNotifications() {
    const rollbackSummary = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      killSwitches: CONFIG.killSwitches.length,
      featureFlags: CONFIG.featureFlags.length,
      successfulActions: this.rollbackLog.filter(log => log.status === 'success').length,
      failedActions: this.rollbackLog.filter(log => log.status === 'failed').length
    };
    
    // Send Slack notification
    if (CONFIG.alertChannels.slack) {
      await this.sendSlackNotification(rollbackSummary);
    }
    
    // Send email notification
    if (CONFIG.alertChannels.email) {
      await this.sendEmailNotification(rollbackSummary);
    }
    
    // Send webhook notification
    if (CONFIG.alertChannels.webhook) {
      await this.sendWebhookNotification(rollbackSummary);
    }
  }

  async sendSlackNotification(summary) {
    try {
      await axios.post(CONFIG.alertChannels.slack, {
        text: `🚨 HaloBuzz Emergency Rollback Completed`,
        attachments: [{
          color: 'warning',
          fields: [
            { title: 'Duration', value: `${summary.duration}ms`, short: true },
            { title: 'Kill Switches', value: `${summary.killSwitches} activated`, short: true },
            { title: 'Feature Flags', value: `${summary.featureFlags} rolled back`, short: true },
            { title: 'Success Rate', value: `${summary.successfulActions}/${summary.successfulActions + summary.failedActions}`, short: true },
            { title: 'Time', value: summary.timestamp, short: true }
          ]
        }]
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error.message);
    }
  }

  async sendEmailNotification(summary) {
    console.log(`📧 Email notification would be sent to ${CONFIG.alertChannels.email}`);
    // Implementation would depend on email service
  }

  async sendWebhookNotification(summary) {
    try {
      await axios.post(CONFIG.alertChannels.webhook, {
        type: 'emergency_rollback_completed',
        ...summary
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
    } catch (error) {
      console.error('Failed to send webhook notification:', error.message);
    }
  }

  async sendCriticalAlert(title, message) {
    const alert = {
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      title,
      message,
      type: 'emergency_rollback_failure'
    };
    
    // Send to all configured channels
    if (CONFIG.alertChannels.slack) {
      await this.sendSlackAlert(alert);
    }
    
    if (CONFIG.alertChannels.webhook) {
      await this.sendWebhookAlert(alert);
    }
  }

  async sendSlackAlert(alert) {
    try {
      await axios.post(CONFIG.alertChannels.slack, {
        text: `🚨 CRITICAL: ${alert.title}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: alert.timestamp, short: true }
          ]
        }]
      });
    } catch (error) {
      console.error('Failed to send critical Slack alert:', error.message);
    }
  }

  async sendWebhookAlert(alert) {
    try {
      await axios.post(CONFIG.alertChannels.webhook, alert, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
    } catch (error) {
      console.error('Failed to send critical webhook alert:', error.message);
    }
  }

  async generateRollbackReport() {
    const report = {
      rollbackId: `rollback_${Date.now()}`,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        killSwitchesActivated: CONFIG.killSwitches.length,
        featureFlagsRolledBack: CONFIG.featureFlags.length,
        successfulActions: this.rollbackLog.filter(log => log.status === 'success').length,
        failedActions: this.rollbackLog.filter(log => log.status === 'failed').length
      },
      actions: this.rollbackLog,
      configuration: {
        apiBase: CONFIG.apiBase,
        rollbackTimeout: CONFIG.rollbackTimeout,
        featureFlags: CONFIG.featureFlags,
        killSwitches: CONFIG.killSwitches
      }
    };
    
    // Save report
    const reportPath = path.join(__dirname, '..', 'logs', 'emergency-rollback.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📝 Rollback report saved to: ${reportPath}`);
  }
}

// Run the emergency rollback
if (require.main === module) {
  const rollback = new EmergencyRollback();
  rollback.execute().catch(console.error);
}

module.exports = EmergencyRollback;

