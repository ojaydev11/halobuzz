const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Performance: inline requires for faster startup (reduces main thread blocking)
config.transformer.inlineRequires = true;

// Performance: enable experimental import support for better tree-shaking
config.transformer.experimentalImportSupport = true;

// Performance: optimize minification for production builds
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: { keep_fnames: false },
  output: { comments: false, ascii_only: true },
};

// Performance: optimize bundle splitting with stable module IDs
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

// Fix for InternalBytecode.js ENOENT error
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Clear cache on startup
config.resetCache = true;

// Fix for require cycle warnings
config.resolver.unstable_enablePackageExports = true;

// Development server configuration
config.server = {
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
      }
      
      return middleware(req, res, next);
    };
  }
};

// Network configuration for development
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
