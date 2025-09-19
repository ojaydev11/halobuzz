# PowerShell script to fix Expo issues
Write-Host "🔧 Fixing HaloBuzz Mobile App Issues..." -ForegroundColor Green
Write-Host ""

# Stop any running Expo processes
Write-Host "🛑 Stopping existing Expo processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*expo*" -or $_.ProcessName -like "*metro*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear all caches
Write-Host "🧹 Clearing caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:TEMP\haste-map-* -ErrorAction SilentlyContinue

# Clear npm cache
Write-Host "📦 Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Reinstall dependencies
Write-Host "📥 Reinstalling dependencies..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install

# Clear Expo cache
Write-Host "🗑️ Clearing Expo cache..." -ForegroundColor Yellow
npx expo install --fix

# Start backend server (in background)
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Set-Location ..\..\backend
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Go back to mobile app
Set-Location ..\apps\halobuzz-mobile

# Start Expo with tunnel
Write-Host "📱 Starting Expo with tunnel..." -ForegroundColor Green
npx expo start --tunnel --clear

Write-Host "✅ Setup complete! Backend and Expo are running." -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🌐 Backend should be running at: https://halo-api-production.up.railway.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Red
