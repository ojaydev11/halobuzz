# Complete Fix and Start Script for HaloBuzz Mobile App
Write-Host "🔧 Fixing All Issues and Starting HaloBuzz Mobile App..." -ForegroundColor Green
Write-Host ""

# Step 1: Stop any running processes
Write-Host "🛑 Stopping existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*expo*" -or $_.ProcessName -like "*metro*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

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
Start-Sleep -Seconds 20

# Step 4: Go back to mobile app
Set-Location "..\apps\halobuzz-mobile"

# Step 5: Start Expo with fresh cache
Write-Host "📱 Starting Expo with fresh cache..." -ForegroundColor Green
Write-Host "This will generate a QR code for testing!" -ForegroundColor Cyan
Write-Host ""

npx expo start --tunnel --clear

Write-Host ""
Write-Host "✅ HaloBuzz Mobile App is running!" -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🌐 Backend running at: https://halo-api-production.up.railway.app" -ForegroundColor Cyan
Write-Host "🔧 All errors should be resolved now!" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Red
