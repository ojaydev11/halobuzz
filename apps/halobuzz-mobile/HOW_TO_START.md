# 🚀 How to Start HaloBuzz Mobile App

## ✅ The Issue is FIXED!

The package.json has been updated with the correct entry point: `"main": "expo-router/entry"`

## 📱 START THE APP NOW

### Option 1: Using PowerShell (Recommended)

Open a **NEW PowerShell terminal** in Cursor and run:

```powershell
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"
npx expo start --clear --tunnel
```

### Option 2: Using the Start Script

Double-click this file:
```
apps\halobuzz-mobile\START_APP.bat
```

### Option 3: From VS Code/Cursor Terminal

1. Click the **Terminal** menu
2. Select **New Terminal**
3. Run these commands:

```bash
cd apps/halobuzz-mobile
npx expo start --clear --tunnel
```

## ✅ What You Should See

After running the command, you should see:

```
Starting project at D:\halobuzz by cursor\apps\halobuzz-mobile
Starting Metro Bundler
Tunnel connected
Tunnel ready

[QR CODE APPEARS HERE]

› Metro waiting on exp://xxxxx-ojayshah-8081.exp.direct
› Scan the QR code above with Expo Go
```

## ⚠️ IMPORTANT

Make sure the terminal shows:
```
Starting project at D:\halobuzz by cursor\apps\halobuzz-mobile
```

**NOT**:
```
Starting project at D:\halobuzz by cursor
```

If it shows the root directory, it's starting from the wrong place!

## 🌐 Backend Configuration

Your app will connect to:
- ✅ **API**: `https://p01--halo-api--6jbmvhzxwv4y.code.run`
- ✅ **WebSocket**: `wss://p01--halo-api--6jbmvhzxwv4y.code.run`
- ✅ **Database**: MongoDB Atlas (via Northflank)

## 📱 After Starting

1. **Wait** for the QR code to appear (10-15 seconds)
2. **Open Expo Go** app on your phone
3. **Scan the QR code**
4. **Wait 30-60 seconds** for initial bundle
5. **App loads!** 🎉

## 🐛 If You See the Old Error

If you still see "Unable to resolve ../../App", it means:

1. Server started from wrong directory, OR
2. Old cache wasn't cleared

**Solution**:
```powershell
# Stop the server (Ctrl+C)
# Then run:
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
npx expo start --clear --tunnel
```

## ✅ Verification Checklist

Before scanning QR code, verify:

- [ ] Terminal shows: "Starting project at...\\apps\\halobuzz-mobile"
- [ ] No error about "Unable to resolve App"
- [ ] QR code is displayed
- [ ] Tunnel URL is shown (exp://xxxxx.exp.direct)
- [ ] Status says "Metro waiting on..."

## 🎯 All Features Enabled

Your app has:
- ✅ Live Streaming
- ✅ Video Reels
- ✅ Gaming System
- ✅ Wallet & Payments
- ✅ Real-time Chat
- ✅ Push Notifications
- ✅ NFT Marketplace
- ✅ And 20+ more features!

## 💡 Pro Tip

Keep this PowerShell command handy:

```powershell
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"; npx expo start --clear --tunnel
```

Copy-paste it whenever you want to start the app!

---

**Ready to test your global app! 🚀**

