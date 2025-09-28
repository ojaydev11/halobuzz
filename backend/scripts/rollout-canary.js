#!/usr/bin/env node

/**
 * Canary Rollout Script for HaloBuzz AI/ML Features
 * Gradually enables feature flags with monitoring
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiBase: process.env.API_BASE || 'http://localhost:4000',
  adminToken: process.env.ADMIN_TOKEN || '',
  rolloutSchedule: [
    { percentage: 1, regions: ['NP'], delay: 0 },
    { percentage: 5, regions: ['NP', 'IN'], delay: 6 * 60 * 60 * 1000 }, // 6 hours
    { percentage: 20, regions: ['NP', 'IN', 'US'], delay: 24 * 60 * 60 * 1000 }, // 24 hours
    { percentage: 50, regions: ['NP', 'IN', 'US'], delay: 48 * 60 * 60 * 1000 }, // 48 hours
    { percentage: 100, regions: ['NP', 'IN', 'US'], delay: 72 * 60 * 60 * 1000 } // 72 hours
  ],
  featureFlags: [
    'FF_RECS',
    'FF_RTP', 
    'FF_ML_OPT',
    'FF_FRAUD_V2'
  ],
  monitoringThresholds: {
    latencyP95: 250, // ms
    errorRate: 0.01, // 1%
    fraudFalsePositives: 0.05 // 5%
  }
};

class CanaryRollout {
  constructor() {
    this.currentPhase = 0;
    this.rolloutLog = [];
  }

  async start() {
    console.log('🚀 Starting HaloBuzz AI/ML Canary Rollout...');
    
    try {
      // Validate environment
      await this.validateEnvironment();
      
      // Start rollout phases
      for (let i = 0; i < CONFIG.rolloutSchedule.length; i++) {
        this.currentPhase = i;
        const phase = CONFIG.rolloutSchedule[i];
        
        console.log(`\n📊 Phase ${i + 1}: ${phase.percentage}% rollout to ${phase.regions.join(', ')}`);
        
        // Update feature flags
        await this.updateFeatureFlags(phase);
        
        // Monitor for issues
        if (i > 0) { // Skip monitoring for first phase
          await this.monitorPhase(phase);
        }
        
        // Wait for next phase (except last)
        if (i < CONFIG.rolloutSchedule.length - 1) {
          console.log(`⏳ Waiting ${phase.delay / (60 * 60 * 1000)} hours until next phase...`);
          await this.sleep(phase.delay);
        }
      }
      
      console.log('\n✅ Canary rollout completed successfully!');
      this.saveRolloutLog();
      
    } catch (error) {
      console.error('❌ Rollout failed:', error.message);
      await this.emergencyRollback();
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
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

  async updateFeatureFlags(phase) {
    console.log(`🎛️ Updating feature flags to ${phase.percentage}%...`);
    
    for (const flag of CONFIG.featureFlags) {
      try {
        const response = await axios.post(
          `${CONFIG.apiBase}/api/v1/admin/feature-flags/update`,
          {
            flag,
            rolloutPercentage: phase.percentage,
            targetRegions: phase.regions
          },
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.adminToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        
        if (response.data.success) {
          console.log(`  ✅ ${flag}: ${phase.percentage}% enabled`);
        } else {
          throw new Error(`Failed to update ${flag}: ${response.data.message}`);
        }
        
        // Log the change
        this.rolloutLog.push({
          timestamp: new Date().toISOString(),
          phase: this.currentPhase + 1,
          flag,
          percentage: phase.percentage,
          regions: phase.regions,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`  ❌ ${flag}: ${error.message}`);
        this.rolloutLog.push({
          timestamp: new Date().toISOString(),
          phase: this.currentPhase + 1,
          flag,
          percentage: phase.percentage,
          regions: phase.regions,
          status: 'failed',
          error: error.message
        });
        throw error;
      }
    }
  }

  async monitorPhase(phase) {
    console.log('📊 Monitoring phase for issues...');
    
    const startTime = Date.now();
    const monitoringDuration = Math.min(phase.delay, 30 * 60 * 1000); // Max 30 minutes monitoring
    
    while (Date.now() - startTime < monitoringDuration) {
      try {
        // Check latency
        const latency = await this.checkLatency();
        if (latency > CONFIG.monitoringThresholds.latencyP95) {
          throw new Error(`Latency too high: ${latency}ms > ${CONFIG.monitoringThresholds.latencyP95}ms`);
        }
        
        // Check error rate
        const errorRate = await this.checkErrorRate();
        if (errorRate > CONFIG.monitoringThresholds.errorRate) {
          throw new Error(`Error rate too high: ${errorRate} > ${CONFIG.monitoringThresholds.errorRate}`);
        }
        
        // Check fraud false positives
        const fraudFP = await this.checkFraudFalsePositives();
        if (fraudFP > CONFIG.monitoringThresholds.fraudFalsePositives) {
          throw new Error(`Fraud false positives too high: ${fraudFP} > ${CONFIG.monitoringThresholds.fraudFalsePositives}`);
        }
        
        console.log(`  ✅ Monitoring OK - Latency: ${latency}ms, Error Rate: ${errorRate}, Fraud FP: ${fraudFP}`);
        
        // Wait 5 minutes before next check
        await this.sleep(5 * 60 * 1000);
        
      } catch (error) {
        console.error(`❌ Monitoring detected issue: ${error.message}`);
        throw error;
      }
    }
  }

  async checkLatency() {
    const start = Date.now();
    await axios.get(`${CONFIG.apiBase}/api/v1/ai-recommendations?limit=5`, {
      headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
      timeout: 5000
    });
    return Date.now() - start;
  }

  async checkErrorRate() {
    try {
      const response = await axios.get(`${CONFIG.apiBase}/api/v1/monitoring/health`, {
        headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
        timeout: 5000
      });
      return response.data.errorRate || 0;
    } catch (error) {
      return 1; // 100% error rate if health check fails
    }
  }

  async checkFraudFalsePositives() {
    try {
      const response = await axios.get(`${CONFIG.apiBase}/api/v1/fraud-detection/metrics`, {
        headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
        timeout: 5000
      });
      return response.data.falsePositiveRate || 0;
    } catch (error) {
      return 0;
    }
  }

  async emergencyRollback() {
    console.log('🚨 Initiating emergency rollback...');
    
    for (const flag of CONFIG.featureFlags) {
      try {
        await axios.post(
          `${CONFIG.apiBase}/api/v1/admin/feature-flags/rollback`,
          {
            flag,
            rollbackPercentage: 0
          },
          {
            headers: {
              'Authorization': `Bearer ${CONFIG.adminToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );
        console.log(`  ✅ ${flag}: Rolled back to 0%`);
      } catch (error) {
        console.error(`  ❌ ${flag}: Rollback failed - ${error.message}`);
      }
    }
    
    console.log('🔄 Emergency rollback completed');
  }

  saveRolloutLog() {
    const logPath = path.join(__dirname, '..', 'logs', 'rollout-canary.json');
    const logDir = path.dirname(logPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.writeFileSync(logPath, JSON.stringify({
      rolloutId: `rollout_${Date.now()}`,
      startTime: this.rolloutLog[0]?.timestamp,
      endTime: new Date().toISOString(),
      phases: CONFIG.rolloutSchedule.length,
      logs: this.rolloutLog
    }, null, 2));
    
    console.log(`📝 Rollout log saved to: ${logPath}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the rollout
if (require.main === module) {
  const rollout = new CanaryRollout();
  rollout.start().catch(console.error);
}

module.exports = CanaryRollout;

