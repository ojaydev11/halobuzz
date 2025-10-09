# HaloBuzz Live Production Configuration Script (PowerShell)
# This script sets up the app for LIVE backend testing

Write-Host "Setting up HaloBuzz for LIVE PRODUCTION testing..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Set production environment variables
$env:EXPO_PUBLIC_API_BASE_URL = "https://halo-api-production.up.railway.app"
$env:EXPO_PUBLIC_WS_URL = "wss://halo-api-production.up.railway.app"
$env:NODE_ENV = "production"
$env:EXPO_PUBLIC_ENVIRONMENT = "production"

Write-Host "Environment configured for LIVE backend:" -ForegroundColor Yellow
Write-Host "   API: $env:EXPO_PUBLIC_API_BASE_URL" -ForegroundColor Cyan
Write-Host "   WebSocket: $env:EXPO_PUBLIC_WS_URL" -ForegroundColor Cyan
Write-Host "   Environment: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host ""

# Start Expo with production configuration
Write-Host "Starting Expo development server with LIVE backend..." -ForegroundColor Green
Write-Host "   This will generate a QR code for testing the REAL app" -ForegroundColor Yellow
Write-Host ""

# Kill any existing Expo processes
Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Expo with tunnel for live testing
Write-Host "Starting Expo with tunnel for live testing..." -ForegroundColor Green
npx expo start --tunnel --port 8084 --clear

Write-Host ""
Write-Host "HaloBuzz is now running with LIVE backend!" -ForegroundColor Green
Write-Host "   Scan the QR code above to test the REAL app" -ForegroundColor Yellow
Write-Host "   All data will be saved to the LIVE database" -ForegroundColor Red