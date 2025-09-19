# 🚀 Quick Fix Guide for HaloBuzz Expo Issues

## 🚨 **Issues from Terminal Output:**

1. **❌ Missing `dev` script** - Backend package.json has dev script, but npm couldn't find it
2. **❌ Wrong directory path** - `cd ../apps/halobuzz-mobile` failed
3. **❌ Deprecated Expo CLI** - Global expo-cli is deprecated
4. **❌ Expo not found** - Dependencies not installed
5. **❌ PowerShell script not found** - Wrong directory

## 🔧 **Step-by-Step Fix:**

### **Step 1: Navigate to Correct Directory**
```powershell
# You're currently in: D:\halobuzz by cursor\backend
# Need to go to: D:\halobuzz by cursor\apps\halobuzz-mobile

cd ..
cd apps\halobuzz-mobile
```

### **Step 2: Install Dependencies**
```powershell
npm install
```

### **Step 3: Fix Expo Dependencies**
```powershell
npx expo install --fix
```

### **Step 4: Clear Caches**
```powershell
# Clear Expo cache
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue

# Clear npm cache
npm cache clean --force
```

### **Step 5: Start Backend Server**
```powershell
# Open new terminal and run:
cd ..\..\backend
npm run dev
```

### **Step 6: Start Expo with Tunnel**
```powershell
# In mobile app directory:
npx expo start --tunnel --clear
```

## 🚀 **Automated Fix Script:**

### **Run the Complete Fix Script:**
```powershell
# From root directory (D:\halobuzz by cursor)
.\fix-expo-complete.ps1
```

## 📱 **Expected Result:**

After running the fix, you should see:
```
🚀 Starting HaloBuzz Mobile App with Expo Tunnel...
Metro waiting on exp://192.168.1.100:8081
Tunnel ready. Project is running at https://exp.host/@yourusername/halobuzz-mobile

[QR CODE APPEARS HERE]

Logs for your project will appear below. Press Ctrl+C to exit.
```

## 🎯 **Manual Commands (if script fails):**

```powershell
# 1. Navigate to mobile app
cd apps\halobuzz-mobile

# 2. Install dependencies
npm install

# 3. Fix Expo
npx expo install --fix

# 4. Clear caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .metro -ErrorAction SilentlyContinue
npm cache clean --force

# 5. Start Expo
npx expo start --tunnel --clear
```

## 🔍 **Troubleshooting:**

### **If "expo not found":**
```powershell
npm install -g @expo/cli
```

### **If "npm run dev" fails:**
```powershell
# Check if you're in the right directory
Get-Location
# Should show: D:\halobuzz by cursor\backend
```

### **If path errors:**
```powershell
# Use full paths
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"
```

## ✅ **Success Indicators:**

- ✅ No "expo not found" errors
- ✅ No "Missing script: dev" errors
- ✅ No path not found errors
- ✅ QR code appears in terminal
- ✅ "Tunnel ready" message shows

## 🚀 **Ready to Test!**

Once you see the QR code:
1. **Open Expo Go app** on your phone
2. **Scan the QR code** from terminal
3. **Wait for app to load** (1-2 minutes first time)
4. **Test all features** - authentication, live streaming, reels

**The app should work perfectly after the fix!** 🎉
