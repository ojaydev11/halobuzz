#!/bin/bash

echo "🧹 Clearing Metro cache and node_modules..."

# Clear Metro cache
npx expo start --clear

# Alternative: Clear all caches manually
# rm -rf node_modules/.cache
# rm -rf .expo
# rm -rf .metro
# npx expo install --fix

echo "✅ Cache cleared! Try running 'npm start' or 'expo start' again."
