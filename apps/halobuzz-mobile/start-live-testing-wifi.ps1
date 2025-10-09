# HaloBuzz Live Production Configuration Script (PowerShell) - WiFi Friendly
# This script sets up the app for LIVE backend testing WITHOUT cutting WiFi

Write-Host "Setting up HaloBuzz for LIVE PRODUCTION testing (WiFi Friendly)..." -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green

# Set production environment variables
$env:EXPO_PUBLIC_API_BASE_URL = "https://halo-api-production.up.railway.app"
$env:EXPO_PUBLIC_WS_URL = "wss://halo-api-production.up.railway.app"
$env:NODE_ENV = "production"
$env:EXPO_PUBLIC_ENVIRONMENT = "production"

Write-Host "Environment configured for LIVE backend:" -ForegroundColor Yellow
Write-Host "   API: $env:EXPO_PUBLIC_API_BASE_URL" -ForegroundColor Cyan
Write-Host "   WebSocket: $env:EXPO_PUBLIC_WS_URL" -ForegroundColor Cyan
Write-Host "   Environment: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host "   Local IP: 192.168.0.135" -ForegroundColor Cyan
Write-Host ""

# Kill any existing Expo processes
Write-Host "Stopping any existing Expo processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Expo with LOCAL network (no tunnel) to keep WiFi connected
Write-Host "Starting Expo with LOCAL network (WiFi stays connected)..." -ForegroundColor Green
Write-Host "   This will generate a QR code for testing the REAL app" -ForegroundColor Yellow
Write-Host "   Your WiFi connection will remain stable" -ForegroundColor Green
Write-Host ""

# Start Expo with local network instead of tunnel
npx expo start --port 8085 --clear

Write-Host ""
Write-Host "HaloBuzz is now running with LIVE backend!" -ForegroundColor Green
Write-Host "   Scan the QR code above to test the REAL app" -ForegroundColor Yellow
Write-Host "   All data will be saved to the LIVE database" -ForegroundColor Red
Write-Host "   Your WiFi connection is preserved!" -ForegroundColor Green


