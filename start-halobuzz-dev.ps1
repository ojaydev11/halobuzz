# 🎮 HaloBuzz Development Startup Script (Windows PowerShell)
# This script starts all services for development and testing

Write-Host "🚀 Starting HaloBuzz Development Environment..." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the HaloBuzz root directory" -ForegroundColor Red
    exit 1
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed. Please install npm" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green

# Install dependencies if needed
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Start backend in background
Write-Host "🔧 Starting Backend API..." -ForegroundColor Yellow
Set-Location backend
npm install
Start-Process powershell -ArgumentList "-Command", "npm run dev" -WindowStyle Hidden
Set-Location ..

# Start AI engine in background
Write-Host "🤖 Starting AI Engine..." -ForegroundColor Yellow
Set-Location ai-engine
npm install
Start-Process powershell -ArgumentList "-Command", "npm run dev" -WindowStyle Hidden
Set-Location ..

# Wait a moment for services to start
Write-Host "⏳ Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start mobile app with QR code
Write-Host "📱 Starting Mobile App..." -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🎯 SCAN THIS QR CODE WITH EXPO GO APP:" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Cyan

Set-Location apps/halobuzz-mobile
npm install
npx expo start --tunnel --clear

Write-Host "✅ HaloBuzz Development Environment Started!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:5010" -ForegroundColor Cyan
Write-Host "AI Engine: http://localhost:5020" -ForegroundColor Cyan
Write-Host "Mobile App: Scan QR code above with Expo Go" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

