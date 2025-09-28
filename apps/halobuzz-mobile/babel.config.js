module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', {
        // Performance: Enable inline requires for faster startup
        native: {
          inlineRequires: true,
        },
        // Enable React compiler optimizations
        unstable_transformProfile: 'default',
      }]
    ],
    plugins: [
      // Performance: Transform imports for better tree-shaking
      ['transform-inline-environment-variables'],
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
          },
        },
      ],
      // Performance: Remove console.log in production
      ['transform-remove-console', { exclude: ['error', 'warn'] }],
    ],
    env: {
      production: {
        plugins: [
          // Additional production optimizations
          ['transform-remove-console'],
          ['transform-react-remove-prop-types'],
        ],
      },
    },
  };
};
