module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tree shaking optimizations
      ['babel-plugin-transform-imports', {
        'lodash': {
          'transform': 'lodash/${member}',
          'preventFullImport': true
        },
        '@expo/vector-icons': {
          'transform': '@expo/vector-icons/${member}',
          'preventFullImport': true
        }
      }],
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/lib': './src/lib',
            '@/types': './src/types',
            '@/hooks': './src/hooks',
            '@/store': './src/store',
            '@/services': './src/services',
            '@/screens': './src/screens',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
