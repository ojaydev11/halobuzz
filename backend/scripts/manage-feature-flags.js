#!/usr/bin/env node

/**
 * Feature Flag Management Script for HaloBuzz AI/ML Features
 * Command-line tool for managing feature flags
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiBase: process.env.API_BASE || 'http://localhost:4000',
  adminToken: process.env.ADMIN_TOKEN || '',
  featureFlags: {
    'FF_RECS': {
      name: 'ai_recommendations',
      description: 'AI-powered content recommendations',
      defaultPercentage: 0
    },
    'FF_RTP': {
      name: 'real_time_personalization',
      description: 'Real-time personalization engine',
      defaultPercentage: 0
    },
    'FF_ML_OPT': {
      name: 'ml_optimization',
      description: 'Machine learning optimization',
      defaultPercentage: 0
    },
    'FF_FRAUD_V2': {
      name: 'advanced_fraud_detection',
      description: 'Advanced fraud detection system',
      defaultPercentage: 0
    }
  }
};

class FeatureFlagManager {
  constructor() {
    this.command = process.argv[2];
    this.args = process.argv.slice(3);
  }

  async run() {
    try {
      switch (this.command) {
        case 'list':
          await this.listFlags();
          break;
        case 'status':
          await this.getStatus();
          break;
        case 'update':
          await this.updateFlag();
          break;
        case 'rollback':
          await this.rollbackFlag();
          break;
        case 'enable':
          await this.enableFlag();
          break;
        case 'disable':
          await this.disableFlag();
          break;
        case 'history':
          await this.getHistory();
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          console.log('❌ Unknown command. Use "help" to see available commands.');
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      process.exit(1);
    }
  }

  async listFlags() {
    console.log('🎛️ HaloBuzz Feature Flags:');
    console.log('========================');
    
    for (const [flag, config] of Object.entries(CONFIG.featureFlags)) {
      try {
        const response = await axios.get(
          `${CONFIG.apiBase}/api/v1/admin/feature-flags/status/${flag}`,
          {
            headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
            timeout: 5000
          }
        );
        
        const status = response.data;
        const statusIcon = status.isActive ? '✅' : '❌';
        const rolloutIcon = status.rolloutPercentage > 0 ? '🚀' : '⏸️';
        
        console.log(`${statusIcon} ${flag} (${config.name})`);
        console.log(`   ${rolloutIcon} Rollout: ${status.rolloutPercentage}%`);
        console.log(`   📝 Description: ${config.description}`);
        console.log(`   🌍 Regions: ${status.targetRegions?.join(', ') || 'All'}`);
        console.log(`   ⏰ Last Updated: ${status.lastUpdated || 'Unknown'}`);
        console.log('');
        
      } catch (error) {
        console.log(`❌ ${flag}: Could not fetch status - ${error.message}`);
      }
    }
  }

  async getStatus() {
    const flag = this.args[0];
    if (!flag) {
      console.log('❌ Please specify a flag name');
      return;
    }
    
    if (!CONFIG.featureFlags[flag]) {
      console.log(`❌ Unknown flag: ${flag}`);
      return;
    }
    
    try {
      const response = await axios.get(
        `${CONFIG.apiBase}/api/v1/admin/feature-flags/status/${flag}`,
        {
          headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
          timeout: 5000
        }
      );
      
      const status = response.data;
      console.log(`🎛️ Feature Flag Status: ${flag}`);
      console.log('========================');
      console.log(`Name: ${CONFIG.featureFlags[flag].name}`);
      console.log(`Description: ${CONFIG.featureFlags[flag].description}`);
      console.log(`Active: ${status.isActive ? 'Yes' : 'No'}`);
      console.log(`Rollout Percentage: ${status.rolloutPercentage}%`);
      console.log(`Target Regions: ${status.targetRegions?.join(', ') || 'All'}`);
      console.log(`Last Updated: ${status.lastUpdated || 'Unknown'}`);
      console.log(`Created At: ${status.createdAt || 'Unknown'}`);
      
      if (status.metrics) {
        console.log('\n📊 Metrics:');
        console.log(`   Requests: ${status.metrics.totalRequests || 0}`);
        console.log(`   Success Rate: ${status.metrics.successRate || 0}%`);
        console.log(`   Average Latency: ${status.metrics.avgLatency || 0}ms`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to get status for ${flag}:`, error.message);
    }
  }

  async updateFlag() {
    const flag = this.args[0];
    const percentage = parseInt(this.args[1]);
    const regions = this.args[2] ? this.args[2].split(',') : ['NP', 'IN', 'US'];
    
    if (!flag || isNaN(percentage)) {
      console.log('❌ Usage: update <flag> <percentage> [regions]');
      console.log('   Example: update FF_RECS 25 NP,IN');
      return;
    }
    
    if (!CONFIG.featureFlags[flag]) {
      console.log(`❌ Unknown flag: ${flag}`);
      return;
    }
    
    if (percentage < 0 || percentage > 100) {
      console.log('❌ Percentage must be between 0 and 100');
      return;
    }
    
    try {
      const response = await axios.post(
        `${CONFIG.apiBase}/api/v1/admin/feature-flags/update`,
        {
          flag,
          rolloutPercentage: percentage,
          targetRegions: regions,
          reason: `Manual update via CLI - ${new Date().toISOString()}`
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
        console.log(`✅ ${flag} updated to ${percentage}% rollout`);
        console.log(`   Regions: ${regions.join(', ')}`);
        console.log(`   Updated at: ${new Date().toISOString()}`);
      } else {
        throw new Error(response.data.message);
      }
      
    } catch (error) {
      console.error(`❌ Failed to update ${flag}:`, error.message);
    }
  }

  async rollbackFlag() {
    const flag = this.args[0];
    const percentage = parseInt(this.args[1]) || 0;
    
    if (!flag) {
      console.log('❌ Usage: rollback <flag> [percentage]');
      console.log('   Example: rollback FF_RECS 0');
      return;
    }
    
    if (!CONFIG.featureFlags[flag]) {
      console.log(`❌ Unknown flag: ${flag}`);
      return;
    }
    
    try {
      const response = await axios.post(
        `${CONFIG.apiBase}/api/v1/admin/feature-flags/rollback`,
        {
          flag,
          rollbackPercentage: percentage,
          reason: `Manual rollback via CLI - ${new Date().toISOString()}`
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
        console.log(`✅ ${flag} rolled back to ${percentage}%`);
        console.log(`   Rolled back at: ${new Date().toISOString()}`);
      } else {
        throw new Error(response.data.message);
      }
      
    } catch (error) {
      console.error(`❌ Failed to rollback ${flag}:`, error.message);
    }
  }

  async enableFlag() {
    const flag = this.args[0];
    const percentage = parseInt(this.args[1]) || 100;
    const regions = this.args[2] ? this.args[2].split(',') : ['NP', 'IN', 'US'];
    
    if (!flag) {
      console.log('❌ Usage: enable <flag> [percentage] [regions]');
      console.log('   Example: enable FF_RECS 100 NP,IN,US');
      return;
    }
    
    await this.updateFlag(flag, percentage, regions);
  }

  async disableFlag() {
    const flag = this.args[0];
    
    if (!flag) {
      console.log('❌ Usage: disable <flag>');
      console.log('   Example: disable FF_RECS');
      return;
    }
    
    await this.rollbackFlag(flag, 0);
  }

  async getHistory() {
    const flag = this.args[0];
    
    if (!flag) {
      console.log('❌ Usage: history <flag>');
      console.log('   Example: history FF_RECS');
      return;
    }
    
    if (!CONFIG.featureFlags[flag]) {
      console.log(`❌ Unknown flag: ${flag}`);
      return;
    }
    
    try {
      const response = await axios.get(
        `${CONFIG.apiBase}/api/v1/admin/feature-flags/history/${flag}`,
        {
          headers: { 'Authorization': `Bearer ${CONFIG.adminToken}` },
          timeout: 5000
        }
      );
      
      const history = response.data.history || [];
      
      console.log(`📜 Feature Flag History: ${flag}`);
      console.log('========================');
      
      if (history.length === 0) {
        console.log('No history available');
        return;
      }
      
      history.forEach((entry, index) => {
        const actionIcon = entry.action === 'update' ? '🔄' : '⏪';
        console.log(`${actionIcon} ${index + 1}. ${entry.action.toUpperCase()}`);
        console.log(`   Percentage: ${entry.rolloutPercentage}%`);
        console.log(`   Regions: ${entry.targetRegions?.join(', ') || 'All'}`);
        console.log(`   Reason: ${entry.reason || 'No reason provided'}`);
        console.log(`   Time: ${entry.timestamp}`);
        console.log('');
      });
      
    } catch (error) {
      console.error(`❌ Failed to get history for ${flag}:`, error.message);
    }
  }

  showHelp() {
    console.log('🎛️ HaloBuzz Feature Flag Manager');
    console.log('================================');
    console.log('');
    console.log('Available commands:');
    console.log('');
    console.log('  list                    List all feature flags and their status');
    console.log('  status <flag>          Get detailed status of a specific flag');
    console.log('  update <flag> <%> [regions]  Update flag rollout percentage');
    console.log('  rollback <flag> [%]    Rollback flag to specified percentage');
    console.log('  enable <flag> [%] [regions]  Enable flag (default 100%)');
    console.log('  disable <flag>          Disable flag (set to 0%)');
    console.log('  history <flag>         Show flag change history');
    console.log('  help                   Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node manage-feature-flags.js list');
    console.log('  node manage-feature-flags.js status FF_RECS');
    console.log('  node manage-feature-flags.js update FF_RECS 25 NP,IN');
    console.log('  node manage-feature-flags.js rollback FF_RECS 0');
    console.log('  node manage-feature-flags.js enable FF_RECS 100');
    console.log('  node manage-feature-flags.js disable FF_RECS');
    console.log('  node manage-feature-flags.js history FF_RECS');
    console.log('');
    console.log('Available flags:');
    Object.entries(CONFIG.featureFlags).forEach(([flag, config]) => {
      console.log(`  ${flag} - ${config.description}`);
    });
    console.log('');
    console.log('Environment variables:');
    console.log('  API_BASE - API base URL (default: http://localhost:4000)');
    console.log('  ADMIN_TOKEN - Admin authentication token');
  }
}

// Run the feature flag manager
if (require.main === module) {
  const manager = new FeatureFlagManager();
  manager.run().catch(console.error);
}

module.exports = FeatureFlagManager;

