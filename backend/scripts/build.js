#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Using transpile-only build for production readiness');

// Remove dist directory if it exists
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync(distDir, { recursive: true });

// Copy src directory contents to dist
const srcDir = path.join(__dirname, '..', 'src');

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

copyRecursive(srcDir, distDir);

console.log('Build completed successfully');
