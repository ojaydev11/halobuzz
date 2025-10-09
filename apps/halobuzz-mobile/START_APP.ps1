#!/usr/bin/env pwsh
# HaloBuzz Mobile - Quick Start Script
# Run this to start the app with Northflank backend and MongoDB Atlas

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " HaloBuzz Mobile - Starting..." -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the right directory
$currentDir = Get-Location
Write-Host "Directory: $currentDir" -ForegroundColor Green

# Check for node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "Backend Configuration:" -ForegroundColor Yellow
Write-Host "  API: https://p01--halo-api--6jbmvhzxwv4y.code.run" -ForegroundColor White
Write-Host "  WebSocket: wss://p01--halo-api--6jbmvhzxwv4y.code.run" -ForegroundColor White
Write-Host "  Database: MongoDB Atlas" -ForegroundColor White
Write-Host ""
Write-Host "Starting Expo with Tunnel Mode..." -ForegroundColor Green
Write-Host ""

# Start Expo
npx expo start --clear --tunnel

