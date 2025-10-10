const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple configuration to avoid complex bundling issues
config.resolver.platforms = ['ios', 'android', 'native', 'web'];


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

module.exports = config;
