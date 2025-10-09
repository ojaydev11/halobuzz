@echo off
cls
echo.
echo ============================================
echo  HaloBuzz Mobile - CORRECT DIRECTORY START
echo ============================================
echo.

REM Navigate to the exact directory
cd /d "%~dp0"

echo Current Directory: %CD%
echo.
echo Checking package.json...
type package.json | findstr "main"
echo.

echo Killing any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting Expo from MOBILE APP DIRECTORY...
echo Backend: Northflank Production
echo Database: MongoDB Atlas
echo.
echo Watch for: "project root: D:\halobuzz by cursor\apps\halobuzz-mobile"
echo            ^^ This should show apps\halobuzz-mobile, NOT just the root!
echo.
echo Press any key to start...
pause >nul

npx expo start --clear --tunnel

