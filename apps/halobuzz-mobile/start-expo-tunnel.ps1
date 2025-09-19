# PowerShell script to start Expo with tunnel
Write-Host "🚀 Starting HaloBuzz Mobile App with Expo Tunnel..." -ForegroundColor Green
Write-Host ""
Write-Host "This will generate a QR code for Expo Go app" -ForegroundColor Yellow
Write-Host ""
Write-Host "Make sure you have:" -ForegroundColor Cyan
Write-Host "1. Expo Go app installed on your phone" -ForegroundColor White
Write-Host "2. Both your computer and phone connected to the internet" -ForegroundColor White
Write-Host "3. Expo CLI installed globally (npm install -g @expo/cli)" -ForegroundColor White
Write-Host ""
Write-Host "Starting Expo development server with tunnel..." -ForegroundColor Green
Write-Host ""

expo start --tunnel --clear

Write-Host ""
Write-Host "✅ Expo server started!" -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🌐 Or visit the URL shown above in your browser" -ForegroundColor Yellow
Write-Host ""
