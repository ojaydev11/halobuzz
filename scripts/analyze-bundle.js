#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes mobile bundle size and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MOBILE_ROOT = path.join(__dirname, '../apps/halobuzz-mobile');
const BUNDLE_SIZE_LIMIT_MB = 15;
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getDirectorySize(dir) {
  let size = 0;
  
  function walk(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        walk(filePath);
      } else {
        size += stats.size;
      }
    }
  }
  
  walk(dir);
  return size;
}

function analyzeAssets() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}📊 Asset Analysis${COLORS.reset}`);
  console.log('━'.repeat(50));
  
  const assetsDir = path.join(MOBILE_ROOT, 'assets');
  
  if (!fs.existsSync(assetsDir)) {
    console.log(`${COLORS.yellow}⚠ Assets directory not found${COLORS.reset}`);
    return;
  }
  
  const assetCategories = fs.readdirSync(assetsDir);
  const assetSizes = [];
  
  for (const category of assetCategories) {
    const categoryPath = path.join(assetsDir, category);
    if (fs.statSync(categoryPath).isDirectory()) {
      const size = getDirectorySize(categoryPath);
      assetSizes.push({ category, size });
    }
  }
  
  assetSizes.sort((a, b) => b.size - a.size);
  
  assetSizes.forEach(({ category, size }) => {
    const color = size > 5 * 1024 * 1024 ? COLORS.red : size > 1 * 1024 * 1024 ? COLORS.yellow : COLORS.green;
    console.log(`  ${color}${category.padEnd(20)}${formatBytes(size)}${COLORS.reset}`);
  });
  
  const totalAssetSize = assetSizes.reduce((sum, a) => sum + a.size, 0);
  console.log(`\n  ${COLORS.bold}Total Assets:${COLORS.reset} ${formatBytes(totalAssetSize)}`);
  
  return totalAssetSize;
}

function analyzeDependencies() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}📦 Dependency Analysis${COLORS.reset}`);
  console.log('━'.repeat(50));
  
  const packageJson = require(path.join(MOBILE_ROOT, 'package.json'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const heavyPackages = [
    '@react-three/fiber',
    '@shopify/react-native-skia',
    'matter-js',
    'socket.io-client',
    'react-native-reanimated'
  ];
  
  console.log('\n  Heavy Dependencies:');
  heavyPackages.forEach(pkg => {
    if (deps[pkg]) {
      const installed = deps[pkg].includes('^') || deps[pkg].includes('~') ? '✓' : '✓';
      console.log(`    ${COLORS.green}${installed}${COLORS.reset} ${pkg.padEnd(35)} ${deps[pkg]}`);
    }
  });
  
  const totalDeps = Object.keys(packageJson.dependencies || {}).length;
  const totalDevDeps = Object.keys(packageJson.devDependencies || {}).length;
  
  console.log(`\n  ${COLORS.bold}Total Dependencies:${COLORS.reset} ${totalDeps}`);
  console.log(`  ${COLORS.bold}Dev Dependencies:${COLORS.reset} ${totalDevDeps}`);
}

function analyzeCodeSize() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}💻 Code Analysis${COLORS.reset}`);
  console.log('━'.repeat(50));
  
  const srcDir = path.join(MOBILE_ROOT, 'src');
  const appDir = path.join(MOBILE_ROOT, 'app');
  
  if (fs.existsSync(srcDir)) {
    const srcSize = getDirectorySize(srcDir);
    console.log(`  src/ directory:     ${formatBytes(srcSize)}`);
  }
  
  if (fs.existsSync(appDir)) {
    const appSize = getDirectorySize(appDir);
    console.log(`  app/ directory:     ${formatBytes(appSize)}`);
  }
  
  // Count lines of code
  try {
    const loc = execSync(
      `find ${MOBILE_ROOT} -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l | tail -1`,
      { encoding: 'utf-8' }
    );
    const lines = parseInt(loc.trim().split(' ')[0]);
    console.log(`  Lines of code:      ${lines.toLocaleString()}`);
  } catch (error) {
    console.log(`  ${COLORS.yellow}Could not count lines of code${COLORS.reset}`);
  }
}

function getOptimizationRecommendations(assetSize) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}💡 Optimization Recommendations${COLORS.reset}`);
  console.log('━'.repeat(50));
  
  const recommendations = [];
  
  if (assetSize > 10 * 1024 * 1024) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Compress images',
      command: 'find assets -name "*.png" -exec pngquant --ext .png --force {} \\;'
    });
  }
  
  recommendations.push({
    priority: 'MEDIUM',
    action: 'Enable Hermes engine',
    file: 'android/app/build.gradle',
    change: 'enableHermes: true'
  });
  
  recommendations.push({
    priority: 'MEDIUM',
    action: 'Enable ProGuard (Android)',
    file: 'android/app/build.gradle',
    change: 'enableProguardInReleaseBuilds = true'
  });
  
  recommendations.push({
    priority: 'LOW',
    action: 'Implement code splitting',
    file: 'app/games/[gameId].tsx',
    change: 'Use React.lazy() for game components'
  });
  
  recommendations.push({
    priority: 'LOW',
    action: 'Remove console.log in production',
    file: 'babel.config.js',
    change: 'Add transform-remove-console plugin'
  });
  
  recommendations.forEach(rec => {
    const priorityColor = rec.priority === 'HIGH' ? COLORS.red : rec.priority === 'MEDIUM' ? COLORS.yellow : COLORS.green;
    console.log(`\n  ${priorityColor}[${rec.priority}]${COLORS.reset} ${rec.action}`);
    if (rec.command) {
      console.log(`    ${COLORS.cyan}$${COLORS.reset} ${rec.command}`);
    }
    if (rec.file) {
      console.log(`    File: ${rec.file}`);
      console.log(`    Change: ${rec.change}`);
    }
  });
}

function main() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}🔍 HaloBuzz Mobile Bundle Analysis${COLORS.reset}\n`);
  
  const assetSize = analyzeAssets();
  analyzeDependencies();
  analyzeCodeSize();
  getOptimizationRecommendations(assetSize);
  
  console.log(`\n${COLORS.bold}${COLORS.cyan}📋 Summary${COLORS.reset}`);
  console.log('━'.repeat(50));
  
  const totalSize = assetSize || 0;
  const limitBytes = BUNDLE_SIZE_LIMIT_MB * 1024 * 1024;
  const percentUsed = (totalSize / limitBytes * 100).toFixed(1);
  
  const statusColor = totalSize < limitBytes ? COLORS.green : COLORS.red;
  console.log(`\n  ${COLORS.bold}Asset Size:${COLORS.reset} ${statusColor}${formatBytes(totalSize)}${COLORS.reset} / ${formatBytes(limitBytes)}`);
  console.log(`  ${COLORS.bold}Budget Used:${COLORS.reset} ${statusColor}${percentUsed}%${COLORS.reset}`);
  
  if (totalSize > limitBytes) {
    console.log(`\n  ${COLORS.red}⚠ OVER BUDGET by ${formatBytes(totalSize - limitBytes)}${COLORS.reset}`);
  } else {
    console.log(`\n  ${COLORS.green}✓ Within budget${COLORS.reset}`);
  }
  
  console.log('\n');
}

main();

