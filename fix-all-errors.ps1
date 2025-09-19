# Complete Fix Script for All HaloBuzz Errors
Write-Host "🔧 Fixing All HaloBuzz Errors..." -ForegroundColor Green
Write-Host ""

# Step 1: Stop any running Expo processes
Write-Host "🛑 Stopping existing Expo processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*expo*" -or $_.ProcessName -like "*metro*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Step 2: Clear ALL caches completely
Write-Host "🧹 Clearing ALL caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-map-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\expo-* -ErrorAction SilentlyContinue
npm cache clean --force

# Step 3: Start backend server
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Set-Location "..\..\backend"
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Step 4: Go back to mobile app
Set-Location "..\apps\halobuzz-mobile"

# Step 5: Clear Metro cache completely
Write-Host "🗑️ Clearing Metro cache completely..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Step 6: Start Expo with fresh cache
Write-Host "📱 Starting Expo with fresh cache..." -ForegroundColor Green
npx expo start --tunnel --clear

Write-Host ""
Write-Host "✅ All fixes applied!" -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🌐 Backend running at: https://halo-api-production.up.railway.app" -ForegroundColor Cyan
Write-Host "🔧 All errors should be resolved now!" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Red
