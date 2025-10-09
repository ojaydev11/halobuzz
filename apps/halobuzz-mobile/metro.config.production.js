const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Production optimizations
config.transformer.inlineRequires = true;
config.transformer.experimentalImportSupport = true;

// Aggressive minification for production
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: { 
    keep_fnames: false,
    toplevel: true 
  },
  output: { 
    comments: false, 
    ascii_only: true,
    beautify: false 
  },
  compress: {
    drop_console: true,
    drop_debugger: true,
    pure_funcs: ['console.log', 'console.warn', 'console.error']
  }
};

// Bundle splitting optimization
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

// Exclude heavy modules from bundle
config.resolver.blockList = [
  /react-native-agora/,
  /react-native-worklets/,
  /react-native-reanimated/,
  /socket\.io-client/,
  /expo-notifications/,
  /expo-camera/,
  /expo-audio/,
  /expo-video/,
  /@react-native-community\/netinfo/
];

// Platform-specific optimizations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Enable tree shaking
config.resolver.unstable_enablePackageExports = true;

// Development server configuration
config.server = {
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
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

// Source extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;

