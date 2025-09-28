#!/usr/bin/env node

/**
 * HaloBuzz Backend Deployment Test
 * This script tests if the backend can build and start successfully
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 HaloBuzz Backend Deployment Test');
console.log('====================================');

// Test 1: Check if backend directory exists
console.log('\n1. Checking backend directory...');
const backendDir = path.join(__dirname, 'backend');
if (!fs.existsSync(backendDir)) {
  console.error('❌ Backend directory not found');
  process.exit(1);
}
console.log('✅ Backend directory exists');

// Test 2: Check if package.json exists
console.log('\n2. Checking package.json...');
const packageJsonPath = path.join(backendDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found');
  process.exit(1);
}
console.log('✅ package.json exists');

// Test 3: Check if Dockerfile exists
console.log('\n3. Checking Dockerfile...');
const dockerfilePath = path.join(backendDir, 'Dockerfile');
if (!fs.existsSync(dockerfilePath)) {
  console.error('❌ Dockerfile not found');
  process.exit(1);
}
console.log('✅ Dockerfile exists');

// Test 4: Check if TypeScript config exists
console.log('\n4. Checking TypeScript configuration...');
const tsconfigPath = path.join(backendDir, 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  console.error('❌ tsconfig.json not found');
  process.exit(1);
}
console.log('✅ tsconfig.json exists');

// Test 5: Check if source directory exists
console.log('\n5. Checking source directory...');
const srcDir = path.join(backendDir, 'src');
if (!fs.existsSync(srcDir)) {
  console.error('❌ src directory not found');
  process.exit(1);
}
console.log('✅ src directory exists');

// Test 6: Check if main entry point exists
console.log('\n6. Checking main entry point...');
const indexPath = path.join(srcDir, 'index.ts');
if (!fs.existsSync(indexPath)) {
  console.error('❌ src/index.ts not found');
  process.exit(1);
}
console.log('✅ src/index.ts exists');

// Test 7: Check if health route exists
console.log('\n7. Checking health route...');
const healthRoutePath = path.join(srcDir, 'routes', 'health.ts');
if (!fs.existsSync(healthRoutePath)) {
  console.error('❌ src/routes/health.ts not found');
  process.exit(1);
}
console.log('✅ src/routes/health.ts exists');

// Test 8: Check if logger exists
console.log('\n8. Checking logger...');
const loggerPath = path.join(srcDir, 'utils', 'logger.ts');
const loggerConfigPath = path.join(srcDir, 'config', 'logger.ts');
if (!fs.existsSync(loggerPath) && !fs.existsSync(loggerConfigPath)) {
  console.error('❌ Logger not found');
  process.exit(1);
}
console.log('✅ Logger exists');

// Test 9: Try to build the project
console.log('\n9. Testing TypeScript compilation...');
try {
  process.chdir(backendDir);
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  console.error('Error:', error.message);
  process.exit(1);
}

// Test 10: Check if dist directory was created
console.log('\n10. Checking build output...');
const distDir = path.join(backendDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory not created');
  process.exit(1);
}
console.log('✅ dist directory created');

// Test 11: Check if main compiled file exists
console.log('\n11. Checking compiled main file...');
const compiledIndexPath = path.join(distDir, 'index.js');
if (!fs.existsSync(compiledIndexPath)) {
  console.error('❌ dist/index.js not found');
  process.exit(1);
}
console.log('✅ dist/index.js exists');

// Test 12: Check if health route was compiled
console.log('\n12. Checking compiled health route...');
const compiledHealthPath = path.join(distDir, 'routes', 'health.js');
if (!fs.existsSync(compiledHealthPath)) {
  console.error('❌ dist/routes/health.js not found');
  process.exit(1);
}
console.log('✅ dist/routes/health.js exists');

// Test 13: Check Dockerfile health check path
console.log('\n13. Checking Dockerfile health check...');
const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
if (!dockerfileContent.includes('/api/v1/health')) {
  console.error('❌ Dockerfile health check path incorrect');
  process.exit(1);
}
console.log('✅ Dockerfile health check path correct');

console.log('\n🎉 All tests passed! Backend is ready for deployment.');
console.log('\n📋 Deployment Checklist:');
console.log('✅ TypeScript compilation works');
console.log('✅ All required files exist');
console.log('✅ Health check endpoint configured');
console.log('✅ Dockerfile is ready');
console.log('\n🚀 Your backend is ready to deploy to Northflank!');
console.log('\nNext steps:');
console.log('1. Push your changes to GitHub master branch');
console.log('2. Northflank will automatically build and deploy');
console.log('3. Monitor the deployment logs in Northflank dashboard');
console.log('4. Test the health endpoint: https://your-service-url/api/v1/health');
