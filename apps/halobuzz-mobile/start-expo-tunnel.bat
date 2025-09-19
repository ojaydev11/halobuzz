@echo off
echo 🚀 Starting HaloBuzz Mobile App with Expo Tunnel...
echo.
echo This will generate a QR code for Expo Go app
echo.
echo Make sure you have:
echo 1. Expo Go app installed on your phone
echo 2. Both your computer and phone connected to the internet
echo 3. Expo CLI installed globally (npm install -g @expo/cli)
echo.
echo Starting Expo development server with tunnel...
echo.

expo start --tunnel --clear

echo.
echo ✅ Expo server started!
echo 📱 Scan the QR code above with Expo Go app
echo 🌐 Or visit the URL shown above in your browser
echo.
pause
