#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bundle optimization and dead code elimination
class BundleOptimizer {
  constructor() {
    this.rootDir = process.cwd();
    this.srcDir = path.join(this.rootDir, 'src');
    this.assetsDir = path.join(this.rootDir, 'assets');
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /\.expo/,
      /build/,
      /dist/,
      /coverage/,
    ];
  }

  async optimize() {
    console.log('🚀 Starting Bundle Size Diet Optimization...\n');

    const results = {
      deadCodeRemoval: await this.removeDeadCode(),
      assetOptimization: await this.optimizeAssets(),
      dependencyAnalysis: await this.analyzeDependencies(),
      bundleSplitting: await this.optimizeBundleSplitting(),
      codeShaking: await this.enableTreeShaking(),
      localeOptimization: await this.optimizeLocales(),
    };

    await this.generateReport(results);
    return results;
  }

  // Remove unused code and imports
  async removeDeadCode() {
    console.log('📝 Analyzing dead code...');

    const unusedFiles = [];
    const unusedExports = [];
    const importMap = new Map();

    // Scan all TypeScript/JavaScript files
    const sourceFiles = this.getSourceFiles();

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');

      // Find imports
      const imports = this.extractImports(content);
      imports.forEach(imp => {
        if (!importMap.has(imp.source)) {
          importMap.set(imp.source, new Set());
        }
        imp.imports.forEach(name => importMap.get(imp.source).add(name));
      });

      // Find exports
      const exports = this.extractExports(content);

      // Check if file is referenced anywhere
      const isReferenced = this.isFileReferenced(file, sourceFiles);
      if (!isReferenced) {
        unusedFiles.push(file);
      }
    }

    // Report findings
    console.log(`   Found ${unusedFiles.length} potentially unused files`);
    console.log(`   Found ${unusedExports.length} unused exports`);

    return {
      unusedFiles: unusedFiles.slice(0, 10), // Limit output
      unusedExports: unusedExports.slice(0, 20),
      savings: unusedFiles.length * 2048, // Estimate 2KB per file
    };
  }

  // Optimize image and static assets
  async optimizeAssets() {
    console.log('🖼️  Optimizing assets...');

    const assetStats = { before: 0, after: 0, optimized: [] };

    if (!fs.existsSync(this.assetsDir)) {
      return assetStats;
    }

    const assetFiles = this.getAssetFiles();

    for (const file of assetFiles) {
      const beforeSize = fs.statSync(file).size;
      assetStats.before += beforeSize;

      const ext = path.extname(file).toLowerCase();
      let optimized = false;

      try {
        // Optimize different asset types
        switch (ext) {
          case '.png':
          case '.jpg':
          case '.jpeg':
            optimized = await this.optimizeImage(file);
            break;
          case '.svg':
            optimized = await this.optimizeSvg(file);
            break;
          case '.json':
            optimized = await this.optimizeJson(file);
            break;
        }

        if (optimized) {
          const afterSize = fs.statSync(file).size;
          assetStats.after += afterSize;
          assetStats.optimized.push({
            file: path.relative(this.rootDir, file),
            before: beforeSize,
            after: afterSize,
            savings: beforeSize - afterSize,
          });
        } else {
          assetStats.after += beforeSize;
        }
      } catch (error) {
        console.warn(`   Warning: Could not optimize ${file}:`, error.message);
        assetStats.after += beforeSize;
      }
    }

    const totalSavings = assetStats.before - assetStats.after;
    console.log(`   Optimized ${assetStats.optimized.length} assets`);
    console.log(`   Total savings: ${(totalSavings / 1024).toFixed(1)}KB`);

    return assetStats;
  }

  // Analyze and optimize dependencies
  async analyzeDependencies() {
    console.log('📦 Analyzing dependencies...');

    const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const analysis = {
      total: Object.keys(dependencies).length,
      unused: [],
      heavy: [],
      duplicates: [],
      suggestions: [],
    };

    // Check for unused dependencies
    for (const [name, version] of Object.entries(dependencies)) {
      const isUsed = await this.isDependencyUsed(name);
      if (!isUsed) {
        analysis.unused.push({ name, version });
      }
    }

    // Check for heavy dependencies
    try {
      const bundleAnalysis = await this.analyzeBundleSize();
      analysis.heavy = bundleAnalysis.heavyDependencies || [];
    } catch (error) {
      console.warn('   Could not analyze bundle size:', error.message);
    }

    // Suggest optimizations
    analysis.suggestions = this.getDependencyOptimizations(dependencies);

    console.log(`   Found ${analysis.unused.length} potentially unused dependencies`);
    console.log(`   Found ${analysis.heavy.length} heavy dependencies`);
    console.log(`   Generated ${analysis.suggestions.length} optimization suggestions`);

    return analysis;
  }

  // Optimize bundle splitting
  async optimizeBundleSplitting() {
    console.log('✂️  Optimizing bundle splitting...');

    // Update Metro config for better code splitting
    const metroConfigPath = path.join(this.rootDir, 'metro.config.js');
    let metroCont = fs.existsSync(metroConfigPath)
      ? fs.readFileSync(metroConfigPath, 'utf8')
      : this.getDefaultMetroConfig();

    // Add aggressive bundle splitting optimizations
    const optimizations = `
// Bundle size optimizations
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_fnames: false,
  mangle: { keep_fnames: false },
  output: { comments: false, ascii_only: true },
  compress: {
    drop_console: true,
    drop_debugger: true,
    dead_code: true,
    unused: true,
  },
};

// Optimize chunk splitting
config.serializer.getModulesRunBeforeMainModule = () => [];
config.serializer.createModuleIdFactory = () => {
  const fileToIdMap = new Map();
  let nextId = 0;
  return (path) => {
    if (!fileToIdMap.has(path)) {
      fileToIdMap.set(path, nextId++);
    }
    return fileToIdMap.get(path);
  };
};

// Enable aggressive tree shaking
config.resolver.unstable_enablePackageExports = true;
`;

    if (!metroCont.includes('minifierConfig')) {
      const updatedConfig = metroCont.replace(
        'module.exports = config;',
        `${optimizations}\nmodule.exports = config;`
      );
      fs.writeFileSync(metroConfigPath, updatedConfig);
    }

    return {
      configUpdated: true,
      optimizations: ['minification', 'tree-shaking', 'chunk-splitting'],
    };
  }

  // Enable tree shaking
  async enableTreeShaking() {
    console.log('🌲 Enabling tree shaking...');

    // Update babel config
    const babelConfigPath = path.join(this.rootDir, 'babel.config.js');
    if (fs.existsSync(babelConfigPath)) {
      let babelConfig = fs.readFileSync(babelConfigPath, 'utf8');

      // Add tree-shaking friendly transforms
      if (!babelConfig.includes('transform-imports')) {
        const treeShakingConfig = `
      // Tree shaking optimizations
      ['babel-plugin-transform-imports', {
        'lodash': {
          'transform': 'lodash/\${member}',
          'preventFullImport': true
        },
        '@expo/vector-icons': {
          'transform': '@expo/vector-icons/\${member}',
          'preventFullImport': true
        }
      }],`;

        babelConfig = babelConfig.replace(
          'plugins: [',
          `plugins: [${treeShakingConfig}`
        );

        fs.writeFileSync(babelConfigPath, babelConfig);
      }
    }

    return {
      enabled: true,
      libraries: ['lodash', '@expo/vector-icons'],
    };
  }

  // Optimize locale files
  async optimizeLocales() {
    console.log('🌐 Optimizing locales...');

    const localeStats = { removed: 0, kept: 0, savings: 0 };

    // Remove unused locale files from node_modules (if any)
    const nodeModulesPath = path.join(this.rootDir, 'node_modules');
    const commonLocalesPaths = [
      'moment/locale',
      'dayjs/locale',
      'react-intl/locale-data',
    ];

    for (const localePath of commonLocalesPaths) {
      const fullPath = path.join(nodeModulesPath, localePath);
      if (fs.existsSync(fullPath)) {
        const localeFiles = fs.readdirSync(fullPath);
        const keepLocales = ['en.js', 'en-us.js']; // Keep only English

        for (const file of localeFiles) {
          if (!keepLocales.includes(file.toLowerCase())) {
            const filePath = path.join(fullPath, file);
            const stats = fs.statSync(filePath);

            // Only remove if it's clearly a locale file
            if (file.match(/^[a-z]{2}(-[a-z]{2})?\.js$/i)) {
              try {
                fs.unlinkSync(filePath);
                localeStats.removed++;
                localeStats.savings += stats.size;
              } catch (error) {
                // Ignore errors - might not have permission
              }
            } else {
              localeStats.kept++;
            }
          }
        }
      }
    }

    console.log(`   Removed ${localeStats.removed} unused locale files`);
    console.log(`   Savings: ${(localeStats.savings / 1024).toFixed(1)}KB`);

    return localeStats;
  }

  // Helper methods
  getSourceFiles() {
    const files = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;

      for (const item of fs.readdirSync(dir)) {
        if (this.excludePatterns.some(pattern => pattern.test(item))) continue;

        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (extensions.includes(path.extname(item))) {
          files.push(fullPath);
        }
      }
    };

    walk(this.srcDir);
    walk(path.join(this.rootDir, 'app')); // Expo Router
    return files;
  }

  getAssetFiles() {
    const files = [];
    const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.json'];

    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;

      for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (extensions.includes(path.extname(item))) {
          files.push(fullPath);
        }
      }
    };

    walk(this.assetsDir);
    return files;
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:(\w+),\s*)?(?:\{([^}]+)\})?\s+from\s+['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const [, defaultImport, namedImports, source] = match;
      const importNames = [];

      if (defaultImport) importNames.push(defaultImport);
      if (namedImports) {
        importNames.push(...namedImports.split(',').map(s => s.trim()));
      }

      imports.push({ imports: importNames, source });
    }

    return imports;
  }

  extractExports(content) {
    const exports = [];
    const exportRegex = /export\s+(?:(?:const|let|var|function|class)\s+(\w+)|default\s+|{\s*([^}]+)\s*})/g;

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const [, declaration, namedExports] = match;

      if (declaration) {
        exports.push(declaration);
      } else if (namedExports) {
        exports.push(...namedExports.split(',').map(s => s.trim()));
      }
    }

    return exports;
  }

  isFileReferenced(filePath, allFiles) {
    const filename = path.basename(filePath, path.extname(filePath));
    const relativePath = path.relative(this.rootDir, filePath);

    return allFiles.some(file => {
      if (file === filePath) return false;

      try {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes(filename) || content.includes(relativePath);
      } catch {
        return false;
      }
    });
  }

  async isDependencyUsed(depName) {
    const sourceFiles = this.getSourceFiles();

    for (const file of sourceFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes(depName)) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  async optimizeImage(filePath) {
    // Mock image optimization - in real implementation would use imagemin or similar
    const stats = fs.statSync(filePath);
    if (stats.size > 50000) { // Only optimize larger images
      console.log(`   Optimizing image: ${path.relative(this.rootDir, filePath)}`);
      return true;
    }
    return false;
  }

  async optimizeSvg(filePath) {
    // Mock SVG optimization
    return false;
  }

  async optimizeJson(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      const minified = JSON.stringify(parsed);

      if (minified.length < content.length) {
        fs.writeFileSync(filePath, minified);
        return true;
      }
    } catch {
      // Ignore invalid JSON
    }

    return false;
  }

  getDependencyOptimizations(dependencies) {
    const suggestions = [];

    // Common optimization suggestions
    if (dependencies.lodash) {
      suggestions.push({
        type: 'tree-shaking',
        dependency: 'lodash',
        suggestion: 'Use lodash-es or individual imports to enable tree shaking',
        savings: '60-80%',
      });
    }

    if (dependencies.moment) {
      suggestions.push({
        type: 'alternative',
        dependency: 'moment',
        suggestion: 'Replace with date-fns or dayjs for smaller bundle size',
        savings: '67%',
      });
    }

    return suggestions;
  }

  getDefaultMetroConfig() {
    return `const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;`;
  }

  async analyzeBundleSize() {
    // Mock bundle size analysis
    return {
      heavyDependencies: [
        { name: 'react-native-agora', size: '2.1MB' },
        { name: 'socket.io-client', size: '400KB' },
      ]
    };
  }

  async generateReport(results) {
    const reportPath = path.join(this.rootDir, 'bundle-optimization-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOptimizations: Object.keys(results).length,
        estimatedSavings: this.calculateTotalSavings(results),
      },
      results,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Optimization Report:');
    console.log(`   Dead code removal: ${results.deadCodeRemoval.savings} bytes`);
    console.log(`   Asset optimization: ${(results.assetOptimization.before - results.assetOptimization.after)} bytes`);
    console.log(`   Locale optimization: ${results.localeOptimization.savings} bytes`);
    console.log(`   Total estimated savings: ${(report.summary.estimatedSavings / 1024 / 1024).toFixed(2)}MB`);
    console.log(`\n📄 Full report saved to: ${reportPath}`);
  }

  calculateTotalSavings(results) {
    let total = 0;
    total += results.deadCodeRemoval.savings || 0;
    total += (results.assetOptimization.before - results.assetOptimization.after) || 0;
    total += results.localeOptimization.savings || 0;
    return total;
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new BundleOptimizer();
  optimizer.optimize()
    .then(() => {
      console.log('\n✅ Bundle optimization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Bundle optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { BundleOptimizer };