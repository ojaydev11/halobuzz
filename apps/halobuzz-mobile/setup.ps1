# HaloBuzz Mobile Setup Script for Windows
# Run this script to set up the mobile app for development

Write-Host "🚀 Setting up HaloBuzz Mobile App..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

# Install global dependencies
Write-Host "📦 Installing global dependencies..." -ForegroundColor Yellow
try {
    npm install -g expo-cli eas-cli
    Write-Host "✅ Global dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install global dependencies" -ForegroundColor Red
    exit 1
}

# Install project dependencies
Write-Host "📦 Installing project dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✅ Project dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install project dependencies" -ForegroundColor Red
    exit 1
}

# Create .env file if it doesn't exist
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ .env file created. Please edit it with your configuration." -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Check if Expo CLI is working
Write-Host "🔍 Testing Expo CLI..." -ForegroundColor Yellow
try {
    npx expo --version
    Write-Host "✅ Expo CLI is working" -ForegroundColor Green
} catch {
    Write-Host "❌ Expo CLI not working properly" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env file with your configuration" -ForegroundColor White
Write-Host "2. Get Agora App ID from https://agora.io" -ForegroundColor White
Write-Host "3. Get Expo Project ID from https://expo.dev" -ForegroundColor White
Write-Host "4. Run 'npm run mobile:dev' to start development" -ForegroundColor White
Write-Host "5. Run 'npm run mobile:build:ios' to build for iOS" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see README.md" -ForegroundColor Cyan
