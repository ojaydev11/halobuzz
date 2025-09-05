#!/usr/bin/env node

/**
 * Quick deployment script for debugging auth routes
 * This script builds and prepares the backend for deployment to Northflank
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting HaloBuzz Backend Debug Deployment...\n');

// Step 1: Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('pnpm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully\n');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 2: Build the project
console.log('🔨 Building project...');
try {
  execSync('npx tsc --noEmit --skipLibCheck src/index.ts', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful\n');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Step 3: Create a simple production build
console.log('📝 Creating production build...');
try {
  // Copy essential files to dist
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy package.json
  fs.copyFileSync('package.json', path.join(distDir, 'package.json'));
  
  // Copy src files (simplified for debugging)
  const srcFiles = [
    'src/index.ts',
    'src/routes/auth.ts',
    'src/models/User.ts',
    'src/services/authService.ts',
    'src/middleware/auth.ts',
    'src/middleware/security.ts',
    'src/config/logger.ts',
    'src/config/database.ts',
    'src/config/redis.ts',
    'src/config/secrets.ts',
    'src/config/flags.ts',
    'src/middleware/errorHandler.ts',
    'src/middleware/requestLogger.ts',
    'src/middleware/metrics.ts',
    'src/middleware/securityMonitoring.ts',
    'src/routes/monitoring.ts'
  ];

  for (const file of srcFiles) {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(distDir, file);
    const destDir = path.dirname(destPath);
    
    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }

  console.log('✅ Production build created successfully\n');
} catch (error) {
  console.error('❌ Failed to create production build:', error.message);
  process.exit(1);
}

// Step 4: Create a simple start script
console.log('📝 Creating start script...');
const startScript = `#!/usr/bin/env node

// Simple start script for debugging
require('dotenv').config();

// Set environment variables for production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.API_VERSION = process.env.API_VERSION || 'v1';

console.log('🔧 Starting HaloBuzz Backend in DEBUG mode...');
console.log('Environment:', process.env.NODE_ENV);
console.log('API Version:', process.env.API_VERSION);

// Import and start the server
require('./src/index.ts');
`;

fs.writeFileSync(path.join(__dirname, 'dist', 'start.js'), startScript);
console.log('✅ Start script created\n');

// Step 5: Create deployment instructions
console.log('📋 Creating deployment instructions...');
const instructions = `
# HaloBuzz Backend Debug Deployment

## What was added:
1. ✅ Debug endpoint: GET /api/v1/monitoring/routes
2. ✅ Enhanced logging for route mounting
3. ✅ Environment variable debugging

## Next Steps:

### 1. Deploy to Northflank:
- Upload the \`dist\` folder to your Northflank service
- Set the start command to: \`node start.js\`
- Ensure these environment variables are set:
  - NODE_ENV=production
  - API_VERSION=v1
  - MONGODB_URI=your_mongodb_uri
  - REDIS_URL=your_redis_url
  - JWT_SECRET=your_jwt_secret

### 2. Test the debug endpoint:
\`\`\`bash
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/monitoring/routes
\`\`\`

This will show you:
- All mounted routes
- Environment variables
- API version being used

### 3. Test auth endpoints:
\`\`\`bash
# Test registration
curl -X POST https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"username":"testuser","email":"test@example.com","password":"password123","country":"US","language":"en"}'

# Test login
curl -X POST https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"identifier":"test@example.com","password":"password123"}'
\`\`\`

## Expected Results:
- The routes endpoint should show \`/api/v1/auth\` with all auth routes
- Auth endpoints should return proper responses instead of 404
- Logs should show "Mounting auth routes at /api/v1/auth"

## If still getting 404s:
1. Check the routes endpoint output
2. Verify environment variables in Northflank
3. Check server logs for the mounting message
4. Ensure the correct service is being deployed (halo-api, not halobuzz-ai)
`;

fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT_INSTRUCTIONS.md'), instructions);
console.log('✅ Deployment instructions created\n');

console.log('🎉 Debug deployment ready!');
console.log('📁 Check the \`dist\` folder and \`DEPLOYMENT_INSTRUCTIONS.md\`');
console.log('🚀 Deploy to Northflank and test the debug endpoint!');
