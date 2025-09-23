# Generate QR Code for HaloBuzz Mobile App Testing
Write-Host "📱 Generating QR Code for HaloBuzz Mobile App Testing..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
$currentPath = Get-Location
Write-Host "Current directory: $currentPath" -ForegroundColor Yellow

# Clear any existing caches
Write-Host "🧹 Clearing caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
npm cache clean --force

# Start Expo with tunnel
Write-Host "🚀 Starting Expo with tunnel..." -ForegroundColor Green
Write-Host "This will generate a QR code for testing!" -ForegroundColor Cyan
Write-Host ""

npx expo start --tunnel --clear

Write-Host ""
Write-Host "✅ QR Code generated!" -ForegroundColor Green
Write-Host "📱 Scan the QR code above with Expo Go app" -ForegroundColor Yellow
Write-Host "🌐 Or visit the URL shown above in your browser" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
