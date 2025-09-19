# 📱 Expo Go QR Code Generation Guide

## 🚀 Quick Start - Generate QR Code for HaloBuzz Mobile App

### **Method 1: Using the Scripts (Recommended)**

#### **Windows:**
```bash
# Double-click the file or run in terminal:
start-expo-tunnel.bat
```

#### **macOS/Linux:**
```bash
# Make executable and run:
chmod +x start-expo-tunnel.sh
./start-expo-tunnel.sh
```

#### **PowerShell:**
```powershell
# Run the PowerShell script:
.\start-expo-tunnel.ps1
```

### **Method 2: Manual Commands**

#### **Navigate to Mobile App Directory:**
```bash
cd apps/halobuzz-mobile
```

#### **Start Expo with Tunnel:**
```bash
# Option 1: Using npx
npx expo start --tunnel --clear

# Option 2: Using npm script
npm start -- --tunnel

# Option 3: Using expo CLI directly
expo start --tunnel --clear
```

## 📋 **Prerequisites**

### **1. Install Expo CLI (if not already installed):**
```bash
npm install -g @expo/cli
```

### **2. Install Expo Go App on Your Phone:**
- **iOS**: Download from App Store
- **Android**: Download from Google Play Store

### **3. Ensure Internet Connection:**
- Both your computer and phone must be connected to the internet
- Tunnel mode creates a public URL accessible from anywhere

## 🔧 **Troubleshooting**

### **If QR Code Doesn't Appear:**

1. **Clear Metro Cache:**
   ```bash
   npx expo start --clear --tunnel
   ```

2. **Check Expo CLI Version:**
   ```bash
   expo --version
   ```

3. **Reinstall Expo CLI:**
   ```bash
   npm uninstall -g @expo/cli
   npm install -g @expo/cli
   ```

4. **Alternative: Use LAN Mode:**
   ```bash
   expo start --lan
   ```

### **If Tunnel Connection Fails:**

1. **Try Different Tunnel Service:**
   ```bash
   expo start --tunnel --tunnel-port 8081
   ```

2. **Use ngrok Alternative:**
   ```bash
   npx expo start --tunnel --tunnel-port 8081
   ```

## 📱 **How to Use the QR Code**

### **Step 1: Start Expo Server**
Run one of the commands above to start the development server.

### **Step 2: Scan QR Code**
- Open Expo Go app on your phone
- Tap "Scan QR Code" or use the camera
- Point camera at the QR code displayed in terminal/browser

### **Step 3: Wait for Loading**
- The app will download and compile
- First load may take 1-2 minutes
- Subsequent loads will be faster

## 🌐 **Alternative Access Methods**

### **Browser Access:**
- The terminal will show a URL like: `https://exp.host/@yourusername/halobuzz-mobile`
- Open this URL in your phone's browser
- It will redirect to Expo Go app

### **Direct URL Sharing:**
- Share the tunnel URL with others for testing
- Works from anywhere in the world
- No need to be on same network

## 🎯 **What You'll See**

### **Terminal Output:**
```
🚀 Starting HaloBuzz Mobile App with Expo Tunnel...

Metro waiting on exp://192.168.1.100:8081
Tunnel ready. Project is running at https://exp.host/@yourusername/halobuzz-mobile

› Press a │ open Android
› Press i │ open iOS simulator  
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands

Logs for your project will appear below. Press Ctrl+C to exit.
```

### **QR Code Display:**
The QR code will appear in the terminal and can be scanned with Expo Go app.

## 🔒 **Security Notes**

- Tunnel mode creates a public URL
- Only use for development/testing
- Don't share tunnel URLs publicly
- Use LAN mode for local development when possible

## 🚀 **Ready to Test!**

Once you run the command, you'll see:
- ✅ QR code in terminal
- ✅ Tunnel URL for browser access
- ✅ HaloBuzz mobile app ready for testing

**Scan the QR code with Expo Go and start testing your HaloBuzz mobile app!** 📱✨
