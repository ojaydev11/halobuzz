#!/usr/bin/env node

/**
 * Dead Code Cleanup Script
 * Finds and optionally removes unused files, imports, and exports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MOBILE_ROOT = path.join(__dirname, '../apps/halobuzz-mobile');
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const PATTERNS_TO_CHECK = [
  { pattern: /Alert\.alert/g, name: 'Alert.alert (should be Modal)', severity: 'HIGH' },
  { pattern: /console\.(log|warn|debug)/g, name: 'console.log/warn/debug', severity: 'MEDIUM' },
  { pattern: /TODO:|FIXME:|HACK:/g, name: 'TODO/FIXME comments', severity: 'LOW' },
  { pattern: /debugger;/g, name: 'debugger statements', severity: 'HIGH' },
  { pattern: /\.only\(/g, name: '.only() in tests', severity: 'HIGH' },
];

const DEPRECATED_PATTERNS = [
  { pattern: /componentWillMount/g, name: 'componentWillMount (deprecated)', severity: 'HIGH' },
  { pattern: /componentWillReceiveProps/g, name: 'componentWillReceiveProps (deprecated)', severity: 'HIGH' },
  { pattern: /componentWillUpdate/g, name: 'componentWillUpdate (deprecated)', severity: 'HIGH' },
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  
  [...PATTERNS_TO_CHECK, ...DEPRECATED_PATTERNS].forEach(({ pattern, name, severity }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        file: filePath.replace(MOBILE_ROOT, ''),
        pattern: name,
        count: matches.length,
        severity
      });
    }
  });
  
  return issues;
}

function findTSFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, .expo, build directories
    if (entry.isDirectory() && !['node_modules', '.expo', 'android', 'ios', 'dist', 'build'].includes(entry.name)) {
      findTSFiles(fullPath, files);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function scanCodebase() {
  console.log(`${COLORS.bold}${COLORS.cyan}🔍 Scanning codebase for issues...${COLORS.reset}\n`);
  
  const files = findTSFiles(MOBILE_ROOT);
  const allIssues = [];
  
  files.forEach(file => {
    const issues = scanFile(file);
    allIssues.push(...issues);
  });
  
  return allIssues;
}

function groupByPattern(issues) {
  const grouped = {};
  
  issues.forEach(issue => {
    if (!grouped[issue.pattern]) {
      grouped[issue.pattern] = {
        pattern: issue.pattern,
        severity: issue.severity,
        files: []
      };
    }
    grouped[issue.pattern].files.push({
      file: issue.file,
      count: issue.count
    });
  });
  
  return Object.values(grouped);
}

function displayIssues(issues) {
  if (issues.length === 0) {
    console.log(`${COLORS.green}✓ No issues found!${COLORS.reset}\n`);
    return;
  }
  
  const grouped = groupByPattern(issues);
  
  // Sort by severity: HIGH > MEDIUM > LOW
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  grouped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  grouped.forEach(({ pattern, severity, files }) => {
    const severityColor = severity === 'HIGH' ? COLORS.red : severity === 'MEDIUM' ? COLORS.yellow : COLORS.green;
    const totalCount = files.reduce((sum, f) => sum + f.count, 0);
    
    console.log(`${severityColor}${COLORS.bold}[${severity}]${COLORS.reset} ${pattern}`);
    console.log(`  ${COLORS.cyan}Found ${totalCount} occurrence(s) in ${files.length} file(s)${COLORS.reset}\n`);
    
    // Show up to 5 files
    files.slice(0, 5).forEach(({ file, count }) => {
      console.log(`    ${file} (${count})`);
    });
    
    if (files.length > 5) {
      console.log(`    ${COLORS.yellow}... and ${files.length - 5} more file(s)${COLORS.reset}`);
    }
    
    console.log('');
  });
}

function findUnusedFiles() {
  console.log(`${COLORS.bold}${COLORS.cyan}📁 Finding unused files...${COLORS.reset}\n`);
  
  try {
    // This requires 'unimported' package: npm install -g unimported
    const result = execSync('npx unimported', {
      cwd: MOBILE_ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(result);
  } catch (error) {
    console.log(`${COLORS.yellow}ℹ Install 'unimported' to find unused files:${COLORS.reset}`);
    console.log(`  ${COLORS.cyan}npm install -g unimported${COLORS.reset}\n`);
  }
}

function analyzeImports() {
  console.log(`${COLORS.bold}${COLORS.cyan}📥 Analyzing imports...${COLORS.reset}\n`);
  
  const files = findTSFiles(MOBILE_ROOT);
  const imports = new Map();
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const importMatches = content.match(/import .+ from ['"](.+)['"]/g);
    
    if (importMatches) {
      importMatches.forEach(imp => {
        const module = imp.match(/from ['"](.+)['"]/)[1];
        if (!module.startsWith('.')) { // External imports only
          imports.set(module, (imports.get(module) || 0) + 1);
        }
      });
    }
  });
  
  const sortedImports = [...imports.entries()].sort((a, b) => b[1] - a[1]);
  
  console.log('  Top 10 imported modules:\n');
  sortedImports.slice(0, 10).forEach(([module, count], i) => {
    console.log(`    ${i + 1}. ${module.padEnd(40)} ${count} times`);
  });
  console.log('');
}

function getSummary(issues) {
  const highSeverity = issues.filter(i => i.severity === 'HIGH').length;
  const mediumSeverity = issues.filter(i => i.severity === 'MEDIUM').length;
  const lowSeverity = issues.filter(i => i.severity === 'LOW').length;
  
  console.log(`${COLORS.bold}${COLORS.cyan}📊 Summary${COLORS.reset}`);
  console.log('━'.repeat(50));
  console.log(`  ${COLORS.red}High severity:${COLORS.reset}   ${highSeverity}`);
  console.log(`  ${COLORS.yellow}Medium severity:${COLORS.reset} ${mediumSeverity}`);
  console.log(`  ${COLORS.green}Low severity:${COLORS.reset}    ${lowSeverity}`);
  console.log(`  ${COLORS.bold}Total issues:${COLORS.reset}    ${issues.length}\n`);
}

function main() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}🧹 HaloBuzz Dead Code Cleanup${COLORS.reset}\n`);
  
  const issues = scanCodebase();
  displayIssues(issues);
  
  analyzeImports();
  findUnusedFiles();
  
  getSummary(issues);
  
  if (issues.some(i => i.severity === 'HIGH')) {
    console.log(`${COLORS.red}⚠ High severity issues found. Please address before release.${COLORS.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${COLORS.green}✓ No blocking issues found.${COLORS.reset}\n`);
  }
}

main();

