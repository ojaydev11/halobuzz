# HaloBuzz Northflank QR Code Generator
# Simple PowerShell script to generate QR codes for your live Northflank backend

Write-Host "HALOBUZZ NORTHFLANK QR GENERATOR" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Set Northflank backend URLs
$env:EXPO_PUBLIC_API_BASE_URL = "https://p01--halo-api--6jbmvhzxwv4y.code.run"
$env:EXPO_PUBLIC_WS_URL = "wss://p01--halo-api--6jbmvhzxwv4y.code.run"
$env:NODE_ENV = "production"

Write-Host "Backend: $env:EXPO_PUBLIC_API_BASE_URL" -ForegroundColor Cyan
Write-Host "WebSocket: $env:EXPO_PUBLIC_WS_URL" -ForegroundColor Cyan
Write-Host "Environment: $env:NODE_ENV" -ForegroundColor Cyan
Write-Host ""

# Generate QR code
Write-Host "Generating QR Code..." -ForegroundColor Yellow
node generate-qr-simple.js

Write-Host ""
Write-Host "✅ QR Code generated with NORTHFLANK backend!" -ForegroundColor Green
Write-Host "📱 Scan with Expo Go to test your live app" -ForegroundColor Yellow

