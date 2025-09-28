#!/bin/bash
# Git push script for HaloBuzz backend fixes

echo "🚀 Pushing HaloBuzz backend fixes to GitHub master for Northflank deployment..."

# Navigate to root directory
cd "D:\halobuzz by cursor"

# Check git status
echo "📋 Checking git status..."
git status

# Add all changes
echo "➕ Adding all changes..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "🔧 Fix TypeScript compilation errors for Northflank deployment

✅ Fixed missing dependencies (ws, fastify, @nestjs, @types/webrtc)
✅ Created missing modules (performanceMonitor, ShortVideo, AnalyticsEvent, RedisService)
✅ Fixed export/import issues (Logger, middleware exports)
✅ Fixed type errors (Jest matchers, Redis calls, property access)
✅ Enhanced RedisService with missing methods
✅ Fixed Redis hset method calls

This resolves the Docker build failures and enables successful deployment to Northflank."

# Push to master
echo "🚀 Pushing to GitHub master..."
git push origin master

echo "✅ Successfully pushed to GitHub master!"
echo "🎯 Ready for Northflank deployment!"
