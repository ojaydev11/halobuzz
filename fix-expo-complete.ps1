# Complete Fix Script for HaloBuzz Expo Issues
Write-Host "🔧 Complete Fix for HaloBuzz Expo Issues" -ForegroundColor Green
Write-Host ""

# Step 1: Navigate to correct directory
Write-Host "📁 Navigating to mobile app directory..." -ForegroundColor Yellow
Set-Location "apps\halobuzz-mobile"

# Step 2: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Fix Expo dependencies
Write-Host "🔧 Fixing Expo dependencies..." -ForegroundColor Yellow
npx expo install --fix

# Step 4: Clear all caches
Write-Host "🧹 Clearing all caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
npm cache clean --force

# Step 5: Start backend server in background
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Set-Location "..\..\backend"
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 6: Go back to mobile app and start Expo
Write-Host "📱 Starting Expo with tunnel..." -ForegroundColor Green
Set-Location "..\apps\halobuzz-mobile"
npx expo start --tunnel --clear

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🌐 Backend running at: https://halo-api-production.up.railway.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Red
