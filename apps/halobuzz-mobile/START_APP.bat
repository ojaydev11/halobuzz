@echo off
REM HaloBuzz Mobile - Windows Batch Start Script

echo.
echo ========================================
echo  HaloBuzz Mobile - Starting...
echo ========================================
echo.

cd /d "%~dp0"

echo Backend: Northflank Production
echo Database: MongoDB Atlas
echo Mode: Tunnel (Global Access)
echo.

npx expo start --clear --tunnel

pause

