const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple configuration to avoid complex bundling issues
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
