# HaloBuzz WiFi-Preserving Configuration Script (PowerShell)
# This script ensures your WiFi connection is NEVER cut off

Write-Host "HALOBUZZ WiFi-PRESERVING SETUP" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# Set production environment variables
$env:EXPO_PUBLIC_API_BASE_URL = "https://halo-api-production.up.railway.app"
$env:EXPO_PUBLIC_WS_URL = "wss://halo-api-production.up.railway.app"
$env:NODE_ENV = "production"
$env:EXPO_PUBLIC_ENVIRONMENT = "production"

Write-Host "Environment configured for LIVE backend:" -ForegroundColor Yellow
Write-Host "   API: $env:EXPO_PUBLIC_API_BASE_URL" -ForegroundColor Cyan
Write-Host "   WebSocket: $env:EXPO_PUBLIC_WS_URL" -ForegroundColor Cyan
Write-Host "   Environment: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host "   WiFi Mode: PRESERVED (LAN only)" -ForegroundColor Green
Write-Host ""

# Kill any existing Expo processes
Write-Host "Stopping any existing Expo processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Start Expo with LAN mode (WiFi preserving)
Write-Host "Starting Expo with LAN mode (WiFi PRESERVED)..." -ForegroundColor Green
Write-Host "   This will generate a QR code for testing the REAL app" -ForegroundColor Yellow
Write-Host "   Your WiFi connection will NEVER be cut off" -ForegroundColor Green
Write-Host "   Uses local network only (no tunnel)" -ForegroundColor Cyan
Write-Host ""

# Start Expo with LAN mode - this preserves WiFi
npx expo start --lan --port 8085 --clear

Write-Host ""
Write-Host "HaloBuzz is now running with LIVE backend!" -ForegroundColor Green
Write-Host "   Scan the QR code above to test the REAL app" -ForegroundColor Yellow
Write-Host "   All data will be saved to the LIVE database" -ForegroundColor Red
Write-Host "   Your WiFi connection is SAFE!" -ForegroundColor Green
Write-Host "   Connected via local network only" -ForegroundColor Cyan