#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Quick start script for HaloBuzz Mobile
.DESCRIPTION
    Run this from anywhere - it will start the app correctly
#>

Write-Host "🚀 Starting HaloBuzz Mobile App..." -ForegroundColor Cyan
Write-Host ""
Write-Host "All features enabled:" -ForegroundColor Green
Write-Host "   - Live Streaming (Agora)" -ForegroundColor White
Write-Host "   - Video Reels" -ForegroundColor White
Write-Host "   - Real-time Chat" -ForegroundColor White
Write-Host "   - Gaming System" -ForegroundColor White
Write-Host "   - Wallet and Payments" -ForegroundColor White
Write-Host "   - Push Notifications" -ForegroundColor White
Write-Host "   - Camera and Recording" -ForegroundColor White
Write-Host "   - NFT Marketplace" -ForegroundColor White
Write-Host ""

# Start Expo with tunnel for global access
npx expo start --clear --tunnel

