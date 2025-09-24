#!/usr/bin/env node

/**
 * Minimal Deployment Script for HaloBuzz Backend
 * Skips TypeScript compilation and deploys basic services
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  environment: process.argv[2] || 'staging',
  skipTests: process.argv.includes('--skip-tests'),
  skipBuild: process.argv.includes('--skip-build'),
  coreServices: [
    'auth', 'users', 'streams', 'coins', 'payments', 'analytics', 'admin'
  ]
};

class MinimalDeployer {
  constructor() {
    this.startTime = Date.now();
    this.logFile = path.join(__dirname, '..', 'logs', `deploy-minimal-${CONFIG.environment}-${Date.now()}.log`);
  }

  async deploy() {
    console.log(`🚀 Starting minimal deployment to ${CONFIG.environment}...`);
    this.log(`Minimal deployment started at ${new Date().toISOString()}`);
    
    try {
      // Step 1: Environment validation
      await this.validateEnvironment();
      
      // Step 2: Install dependencies
      await this.installDependencies();
      
      // Step 3: Deploy basic services
      await this.deployBasicServices();
      
      // Step 4: Health check
      await this.healthCheck();
      
      const duration = Date.now() - this.startTime;
      console.log(`\n✅ Minimal deployment completed successfully in ${duration}ms`);
      this.log(`Minimal deployment completed successfully in ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Minimal deployment failed:', error.message);
      this.log(`Minimal deployment failed: ${error.message}`);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required, found ${nodeVersion}`);
    }
    
    // Check required files
    const requiredFiles = [
      'package.json',
      'src/index.ts',
      'docker-compose.staging.yml',
      'docker-compose.production.yml'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(__dirname, '..', file))) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    console.log('✅ Environment validation passed');
  }

  async installDependencies() {
    console.log('📦 Installing dependencies...');
    
    try {
      // Install production dependencies
      execSync('npm install --production', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log('✅ Dependencies installed');
    } catch (error) {
      throw new Error(`Dependency installation failed: ${error.message}`);
    }
  }

  async deployBasicServices() {
    console.log('🚀 Deploying basic services...');
    
    const composeFile = CONFIG.environment === 'production' 
      ? 'docker-compose.production.yml' 
      : 'docker-compose.staging.yml';
    
    try {
      // Deploy with Docker Compose
      execSync(`docker-compose -f ${composeFile} up -d --build`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log('✅ Basic services deployed');
    } catch (error) {
      throw new Error(`Service deployment failed: ${error.message}`);
    }
  }

  async healthCheck() {
    console.log('🏥 Running health checks...');
    
    const port = CONFIG.environment === 'production' ? 4000 : 4001;
    const maxRetries = 10;
    const retryDelay = 5000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${port}/healthz`);
        if (response.ok) {
          console.log('✅ Health check passed');
          return;
        }
      } catch (error) {
        // Ignore error and retry
      }
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Health check attempt ${i + 1}/${maxRetries} failed, retrying in ${retryDelay}ms...`);
        await this.sleep(retryDelay);
      }
    }
    
    throw new Error('Health check failed after maximum retries');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    // Ensure logs directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the deployment
if (require.main === module) {
  const deployer = new MinimalDeployer();
  deployer.deploy().catch(console.error);
}

module.exports = MinimalDeployer;

