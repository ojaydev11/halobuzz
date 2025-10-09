# 📱 How to See Phone Error Logs

## ⚠️ Issue: Phone Shows Errors But Terminal Doesn't Show Them

This happens when the Expo Metro bundler isn't displaying logs properly.

## ✅ SOLUTION: Start Server in Foreground

### Step 1: Stop All Servers

In your terminal, press **Ctrl+C** multiple times to stop any running servers.

Or run this to force stop:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Step 2: Start Server with Full Logging

Open a **NEW terminal** in Cursor and run:

```powershell
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"
$env:EXPO_DEBUG=1
npx expo start --clear --tunnel
```

### Step 3: Keep Terminal Visible

**IMPORTANT**: Keep the terminal window visible while using the app on your phone!

All errors from your phone will now appear in this terminal.

## 📊 What You'll See

When errors occur on your phone, the terminal will show:

```
ERROR  [Error message here]
ERROR  Stack trace...
LOG    [Network requests]
WARN   [Warnings]
```

## 🔍 Common Errors You Might See

### 1. Network Request Failed
```
ERROR  [AxiosError: Network Error]
```
**Meaning**: Can't connect to backend
**Solution**: Backend might be sleeping on Northflank

### 2. Unable to Resolve Module
```
ERROR  Unable to resolve module X from Y
```
**Meaning**: Missing dependency or wrong import
**Check**: The specific module mentioned

### 3. Undefined is not an object
```
ERROR  TypeError: undefined is not an object
```
**Meaning**: Trying to access property of undefined variable
**Check**: The file and line number shown

### 4. JSON Parse Error
```
ERROR  JSON Parse error: Unexpected token
```
**Meaning**: Backend returned non-JSON response
**Solution**: Check backend API health

## 🌐 Check Backend Status

Your app connects to:
```
https://p01--halo-api--6jbmvhzxwv4y.code.run
```

Test if backend is running:
```powershell
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/monitoring/health
```

Should return:
```json
{"status": "ok"}
```

If you get an error, the backend might be sleeping (Northflank free tier).

## 🐛 Enable Maximum Debugging

For even more detailed logs:

```powershell
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"
$env:EXPO_DEBUG=1
$env:DEBUG="expo:*"
npx expo start --clear --tunnel --verbose
```

## 📱 Test Specific Features

Once server is running, test features one by one and watch terminal:

### Test Authentication
1. Open app
2. Click "Register" or "Login"
3. Watch terminal for:
   ```
   LOG  POST /api/v1/auth/register
   LOG  Response: ...
   ```

### Test Home Feed
1. Navigate to Home tab
2. Watch for:
   ```
   LOG  GET /api/v1/streams
   LOG  GET /api/v1/reels
   ```

### Test Wallet
1. Open wallet section
2. Watch for:
   ```
   LOG  GET /api/v1/wallet/balance
   ```

## ✅ Verify Logs Are Working

After starting the server, you should see:

```
Starting project at D:\halobuzz by cursor\apps\halobuzz-mobile
Starting Metro Bundler
Tunnel connected
[QR CODE]
› Metro waiting on exp://xxxxx.exp.direct
Logs for your project will appear below.
```

Then when you scan QR code:
```
LOG  Bundle loading started...
LOG  Running "halobuzz-mobile" with {"rootTag":11}
```

If you see these startup logs, logging is working! ✅

## 🔄 Reload App to See Fresh Logs

If you make changes or want to test again:

1. In terminal, press **`r`** (reload)
2. Or shake your phone and tap "Reload"
3. Logs will appear in terminal

## 💡 Pro Tips

1. **Split Screen**: Keep terminal visible next to your phone emulator/mirror
2. **Filter Logs**: Terminal logs can be filtered by searching (Ctrl+F) for "ERROR" or "WARN"
3. **Save Logs**: Right-click terminal → Select All → Copy to save logs
4. **Multiple Terminals**: Open one for Expo server, one for backend commands

## 🎯 What to Look For

When testing, watch for:

### ✅ Good Signs:
```
LOG  Bundle loaded successfully
LOG  API call successful
LOG  Connected to WebSocket
```

### ⚠️ Warning Signs:
```
WARN  Slow network detected
WARN  Memory warning
WARN  Large bundle size
```

### ❌ Error Signs:
```
ERROR  Network request failed
ERROR  Uncaught exception
ERROR  Component failed to render
```

## 📋 Troubleshooting Checklist

- [ ] Server started from `apps/halobuzz-mobile` directory (not root)
- [ ] Terminal shows "Logs for your project will appear below"
- [ ] QR code is displayed and scannable
- [ ] Phone is connected to same WiFi as laptop
- [ ] Expo Go app is latest version
- [ ] Terminal window stays open (not minimized)
- [ ] Debug mode enabled (`$env:EXPO_DEBUG=1`)

## 🚀 Quick Start Command (Copy-Paste)

```powershell
cd "D:\halobuzz by cursor\apps\halobuzz-mobile"
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
$env:EXPO_DEBUG=1
npx expo start --clear --tunnel
```

This will:
1. Navigate to correct directory
2. Stop any conflicting servers
3. Enable debug logging
4. Start fresh with tunnel mode
5. Show ALL logs from your phone

---

**Now you'll see exactly what errors are happening! 🔍**

