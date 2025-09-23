# 📱 QR Code Testing Guide for HaloBuzz Mobile App

## 🚀 **Quick QR Code Generation**

### **Option 1: Automated Script**
```powershell
# Run the QR code generation script
.\generate-qr-code.ps1
```

### **Option 2: Manual Command**
```powershell
# Navigate to mobile app directory
cd apps\halobuzz-mobile

# Start Expo with tunnel
npx expo start --tunnel --clear
```

## 📋 **Prerequisites**

### **1. Install Expo Go App:**
- **iOS**: Download from App Store
- **Android**: Download from Google Play Store

### **2. Ensure Internet Connection:**
- Both your computer and phone must be connected to the internet
- Tunnel mode creates a public URL accessible from anywhere

## 🔧 **Troubleshooting**

### **If QR Code Doesn't Appear:**

1. **Clear All Caches:**
   ```powershell
   Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
   npm cache clean --force
   ```

2. **Reinstall Dependencies:**
   ```powershell
   npm install
   npx expo install --fix
   ```

3. **Try Alternative Commands:**
   ```powershell
   # Option 1: With LAN mode
   npx expo start --lan --clear
   
   # Option 2: With web mode
   npx expo start --web --clear
   ```

## 📱 **How to Test**

### **Step 1: Generate QR Code**
Run the script or command above to start Expo server.

### **Step 2: Scan QR Code**
- Open Expo Go app on your phone
- Tap "Scan QR Code" or use the camera
- Point camera at the QR code displayed in terminal

### **Step 3: Wait for Loading**
- The app will download and compile
- First load may take 1-2 minutes
- Subsequent loads will be faster

### **Step 4: Test Features**
- **Authentication**: Try login/register
- **Live Streaming**: Test video features
- **Reels**: Test video playback
- **Social Features**: Test interactions

## 🎯 **Expected Results**

### **Terminal Output Should Show:**
```
🚀 Starting HaloBuzz Mobile App with Expo Tunnel...
Metro waiting on exp://192.168.1.100:8081
Tunnel ready. Project is running at https://exp.host/@yourusername/halobuzz-mobile

[QR CODE APPEARS HERE]

› Press a │ open Android
› Press i │ open iOS simulator  
› Press w │ open web

Logs for your project will appear below. Press Ctrl+C to exit.
```

### **App Should Load With:**
- ✅ HaloBuzz splash screen
- ✅ Authentication screen
- ✅ All features working
- ✅ No critical errors

## 🔍 **Testing Checklist**

### **Core Features:**
- [ ] App loads successfully
- [ ] Authentication works (login/register)
- [ ] Live streaming features
- [ ] Reels video playback
- [ ] Social interactions
- [ ] Navigation between screens

### **Error Checks:**
- [ ] No 404 API errors
- [ ] No InternalBytecode.js errors
- [ ] No require cycle warnings
- [ ] No crash on startup

## 🌐 **Alternative Access Methods**

### **Browser Access:**
- The terminal will show a URL like: `https://exp.host/@yourusername/halobuzz-mobile`
- Open this URL in your phone's browser
- It will redirect to Expo Go app

### **Direct URL Sharing:**
- Share the tunnel URL with others for testing
- Works from anywhere in the world
- No need to be on same network

## 🚀 **Ready to Test!**

Once you run the command, you'll see:
- ✅ QR code in terminal
- ✅ Tunnel URL for browser access
- ✅ HaloBuzz mobile app ready for testing

**Scan the QR code with Expo Go and start testing your HaloBuzz mobile app!** 📱✨

## 🆘 **If Issues Persist**

### **Nuclear Option:**
```powershell
# Complete reset
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .expo
Remove-Item -Recurse -Force .metro
npm install
npx expo install --fix
npx expo start --tunnel --clear
```

### **Alternative: Use Development Build**
```powershell
# If Expo Go has issues, use development build
npx expo run:android
# or
npx expo run:ios
```

**Your HaloBuzz mobile app is ready for testing!** 🎉
