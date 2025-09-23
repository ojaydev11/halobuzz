# Correct Start Script for HaloBuzz Mobile App
Write-Host "🚀 Starting HaloBuzz Mobile App Correctly..." -ForegroundColor Green
Write-Host ""

# Step 1: Clear caches
Write-Host "🧹 Clearing caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
npm cache clean --force

# Step 2: Start Expo with tunnel
Write-Host "📱 Starting Expo with tunnel..." -ForegroundColor Green
Write-Host "This will generate a QR code for testing!" -ForegroundColor Cyan
Write-Host ""

npx expo start --tunnel --clear

Write-Host ""
Write-Host "✅ HaloBuzz Mobile App is running!" -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🔧 All errors should be resolved now!" -ForegroundColor Green
