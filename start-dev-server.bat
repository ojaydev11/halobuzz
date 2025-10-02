@echo off
REM HaloBuzz Development Server Startup Script for Windows
REM This script helps start the backend development server

echo 🚀 Starting HaloBuzz Development Server...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the backend directory.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  Warning: .env file not found. Creating a basic development .env...
    (
        echo NODE_ENV=development
        echo PORT=3001
        echo MONGODB_URI=mongodb://localhost:27017/halobuzz-dev
        echo JWT_SECRET=dev-secret-key-change-in-production
        echo API_PREFIX=/api/v1
        echo CORS_ORIGIN=http://localhost:8081
    ) > .env
    echo ✅ Created basic .env file for development
)

REM Start the development server
echo 🌐 Starting development server on port 3001...
echo 📱 Mobile app will connect to: http://localhost:3001/api/v1
echo 🔗 Web interface: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
pause
