#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bundle analysis script for measuring code-split impact
async function analyzeBundleSize() {
  console.log('📦 Analyzing bundle size and split effectiveness...\n');

  const outputDir = path.join(__dirname, '..', 'bundle-analysis');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  try {
    // Build Android bundle for analysis
    console.log('🔨 Building Android bundle...');
    execSync(`npx react-native bundle \\
      --platform android \\
      --dev false \\
      --entry-file index.js \\
      --bundle-output bundle-analysis/android-release.bundle \\
      --sourcemap-output bundle-analysis/android-release.map \\
      --assets-dest bundle-analysis/assets`, { stdio: 'inherit' });

    // Get bundle stats
    const bundlePath = path.join(outputDir, 'android-release.bundle');
    const mapPath = path.join(outputDir, 'android-release.map');

    if (fs.existsSync(bundlePath)) {
      const bundleSize = fs.statSync(bundlePath).size;
      const bundleSizeMB = (bundleSize / 1024 / 1024).toFixed(2);

      console.log(`\\n📊 Bundle Analysis Results:`);
      console.log(`   Total Bundle Size: ${bundleSizeMB}MB`);
      console.log(`   Budget: 2.0MB (${bundleSizeMB <= 2.0 ? '✅ PASS' : '❌ FAIL'})`);

      // Analyze sourcemap for module breakdown
      if (fs.existsSync(mapPath)) {
        try {
          const sourcemap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          const modules = new Map();

          if (sourcemap.sources) {
            sourcemap.sources.forEach(source => {
              if (source.includes('node_modules')) {
                const moduleName = source.split('node_modules/')[1]?.split('/')[0];
                if (moduleName) {
                  modules.set(moduleName, (modules.get(moduleName) || 0) + 1);
                }
              } else if (source.includes('src/')) {
                const component = source.split('src/')[1]?.split('/')[0];
                if (component) {
                  modules.set(`src/${component}`, (modules.get(`src/${component}`) || 0) + 1);
                }
              }
            });

            console.log(`\\n📈 Top Module Contributors:`);
            const sortedModules = [...modules.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10);

            sortedModules.forEach(([module, count]) => {
              console.log(`   ${module}: ${count} references`);
            });
          }
        } catch (error) {
          console.log('   Unable to analyze sourcemap details');
        }
      }

      // Calculate estimated code-split savings
      const estimatedSavings = calculateCodeSplitSavings(bundleSizeMB);
      console.log(`\\n🎯 Code-Split Impact Estimate:`);
      console.log(`   Lazy Screens: ~${estimatedSavings.screens}MB saved`);
      console.log(`   Deferred SDKs: ~${estimatedSavings.sdks}MB saved`);
      console.log(`   Tree-shaking: ~${estimatedSavings.treeshaking}MB saved`);
      console.log(`   Total Estimated: ~${estimatedSavings.total}MB (${estimatedSavings.percentage}%)`);

      // Write results to file
      const results = {
        timestamp: new Date().toISOString(),
        bundleSize: bundleSizeMB,
        withinBudget: bundleSizeMB <= 2.0,
        estimatedSavings,
        modules: sortedModules || [],
      };

      fs.writeFileSync(
        path.join(outputDir, 'bundle-stats.json'),
        JSON.stringify(results, null, 2)
      );

      console.log(`\\n✅ Analysis complete. Results saved to bundle-analysis/bundle-stats.json`);

      return results;
    }
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

// Estimate code-split savings based on current bundle size
function calculateCodeSplitSavings(currentSizeMB) {
  const screens = Math.max(0, currentSizeMB * 0.15); // ~15% from lazy screens
  const sdks = Math.max(0, currentSizeMB * 0.08); // ~8% from deferred SDKs
  const treeshaking = Math.max(0, currentSizeMB * 0.12); // ~12% from better tree-shaking
  const total = screens + sdks + treeshaking;
  const percentage = ((total / currentSizeMB) * 100).toFixed(1);

  return {
    screens: screens.toFixed(2),
    sdks: sdks.toFixed(2),
    treeshaking: treeshaking.toFixed(2),
    total: total.toFixed(2),
    percentage,
  };
}

// Run if called directly
if (require.main === module) {
  analyzeBundleSize().catch(console.error);
}

module.exports = { analyzeBundleSize };