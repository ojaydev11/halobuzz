const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for InternalBytecode.js ENOENT error
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Clear cache on startup
config.resetCache = true;

// Fix for require cycle warnings
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
