#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start HaloBuzz Mobile App with ALL features enabled
.DESCRIPTION
    This script starts the Expo development server from the correct directory
    with tunnel mode for global testing access.
#>

Write-Host "Starting HaloBuzz Mobile - Full Featured App" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to mobile app directory
$mobileDir = Join-Path $PSScriptRoot "apps\halobuzz-mobile"

if (-not (Test-Path $mobileDir)) {
    Write-Host "❌ Error: Mobile app directory not found at: $mobileDir" -ForegroundColor Red
    exit 1
}

Write-Host "📂 Directory: $mobileDir" -ForegroundColor Green
Write-Host "🌐 Mode: Tunnel (for global access)" -ForegroundColor Green
Write-Host "✨ Features: ALL ENABLED" -ForegroundColor Green
Write-Host ""

# Change to mobile directory
Set-Location $mobileDir

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "🎯 Starting Expo development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Once started:" -ForegroundColor Yellow
Write-Host "   • Scan the QR code with Expo Go app" -ForegroundColor White
Write-Host "   • Or press 'a' for Android emulator" -ForegroundColor White
Write-Host "   • Or press 'w' for web browser" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Start Expo with tunnel and clear cache
npx expo start --clear --tunnel

