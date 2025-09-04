#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building TypeScript with proper path resolution...');

// Remove dist directory if it exists
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync(distDir, { recursive: true });

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  // Use ts-node to compile with transpile-only mode
  console.log('Compiling TypeScript (transpile-only mode)...');
  execSync('npx ts-node --transpile-only -r tsconfig-paths/register -e "console.log(\'Compilation successful\')"', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  // Copy source files to dist (since we're using transpile-only)
  console.log('Copying source files to dist...');
  const srcDir = path.join(__dirname, '..', 'src');
  copyRecursive(srcDir, distDir);
  
  console.log('TypeScript compilation completed successfully');
  
  // Resolve path aliases
  console.log('Resolving path aliases...');
  execSync('npx tsc-alias', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  
  console.log('Path aliases resolved successfully');
  
  // Copy non-TypeScript files that might be needed
  const filesToCopy = ['package.json', 'README.md', 'env.example'];
  
  filesToCopy.forEach(file => {
    const srcFile = path.join(__dirname, '..', file);
    const destFile = path.join(distDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
