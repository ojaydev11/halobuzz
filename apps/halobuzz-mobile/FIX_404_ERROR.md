# 🔴 Fixing 404 Error on Phone

## ✅ Good News!

The app is **loading successfully** now! The 404 error means the bundle built and the app opened - this is much better than the previous "Unable to resolve App" error.

## 🔍 What's Causing the 404?

Your app is trying to connect to the backend API at:
```
https://p01--halo-api--6jbmvhzxwv4y.code.run
```

The **404 Not Found** error means one of these:

1. **Backend is sleeping** (Northflank free tier goes to sleep after ~1 hour of inactivity)
2. **API endpoint doesn't exist** on the backend
3. **Wrong API path** configured

## ✅ SOLUTION 1: Test Backend First

### Check if Backend is Running:

Open a web browser and visit:
```
https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/monitoring/health
```

**Expected Response** (if working):
```json
{"status": "ok", "timestamp": "..."}
```

**404 Error** = Backend is not running or endpoint doesn't exist

### Wake Up Northflank Backend:

1. Go to Northflank dashboard
2. Find your `halo-api` service
3. Check if it's "Sleeping" or "Running"
4. If sleeping, click to wake it up
5. Wait 1-2 minutes for it to start

## ✅ SOLUTION 2: Use Temporary Fallback

The good news is your app has a **built-in fallback mode**!

Looking at the code, when the backend fails, the app automatically logs you in with a temporary user so you can test the UI.

### To Use Fallback Mode:

1. On the red error screen, tap "Dismiss" or shake phone for dev menu
2. Tap "Reload"
3. The app will detect backend is down and use temporary mode
4. You can now test the UI features!

The fallback creates a temp user:
- Username: Whatever you entered
- Coins: 500
- Followers: 150
- OG Level: 3

## ✅ SOLUTION 3: Configure Local Backend

If you have the backend running locally:

1. Find your laptop's IP address:
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.0.135`)

2. Edit `apps/halobuzz-mobile/app.config.ts`:
   ```typescript
   apiBaseUrl: "http://YOUR_IP:5010"
   ```

3. Restart Expo server:
   ```powershell
   # Press Ctrl+C
   npx expo start --clear --tunnel
   ```

4. Scan new QR code

## 📊 What API Call is Failing?

The app makes these calls on startup:

### 1. Health Check (on app launch)
```
GET /api/v1/monitoring/health
```

### 2. Auth Token Validation
```
GET /api/v1/auth/me
```
(If you have a saved login token)

### 3. Initial Data Fetch
```
GET /api/v1/streams
GET /api/v1/reels
```

Any of these returning 404 will show the red screen.

## 🔍 See Exact Error in Terminal

Your Expo terminal should show logs like:
```
LOG  Login attempt: {identifier: "..."}
LOG  API Base: https://p01--halo-api--6jbmvhzxwv4y.code.run
LOG  API Prefix: /api/v1
ERROR [AxiosError: Request failed with status code 404]
ERROR Response status: 404
```

**Look at your terminal now** - it should show which exact endpoint is failing!

## ✅ SOLUTION 4: Skip Backend for Now

If you just want to test the UI without backend:

### Option A: Use Demo Mode

1. In the login screen, look for "Demo Mode" or "Skip Login"
2. Or just enter any credentials - fallback will activate

### Option B: Mock the API

1. Open `apps/halobuzz-mobile/src/config/development.ts`
2. Set:
   ```typescript
   USE_MOCK_DATA: true
   ```
3. Restart Expo

## 🎯 Quick Diagnosis

Run this in PowerShell to test each endpoint:

```powershell
# Test health endpoint
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/monitoring/health

# Test streams endpoint  
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/streams

# Test root endpoint
curl https://p01--halo-api--6jbmvhzxwv4y.code.run
```

Check which one returns 404.

## 📱 What To Do Right Now:

### Immediate Fix (Test UI Only):

1. **On phone**: Shake device → Tap "Reload"
2. **Try to login** with any credentials
3. App will use **fallback mode** automatically
4. You can now test all UI features!

### Proper Fix (Connect Real Backend):

1. **Check Northflank**: Wake up the backend service
2. **Test endpoint**: Visit health URL in browser
3. **Reload app**: Shake phone → Reload
4. **Try again**: Should connect successfully

## 🌐 Backend Configuration

Your app.config.ts shows:

```typescript
apiBaseUrl: "https://p01--halo-api--6jbmvhzxwv4y.code.run"
apiPrefix: "/api/v1"
```

So all API calls go to:
```
https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/[endpoint]
```

## 💡 Pro Tips

1. **Keep Northflank dashboard open** to see if backend wakes up
2. **Watch Expo terminal** for exact API errors
3. **Use fallback mode** to test UI while backend is being fixed
4. **Check backend logs** in Northflank for 404 reasons

## ✅ Success Indicators

When backend is working, you'll see:
- ✅ App opens to home screen (no red error)
- ✅ Terminal shows: `LOG API call successful`
- ✅ Content loads (streams, reels, etc.)
- ✅ Login works with real account

## 🎉 Summary

**The app is WORKING!** The 404 is just a backend connectivity issue.

**Quick Test**:
1. Shake phone → Reload
2. Try to login
3. App will use temporary fallback
4. Test all UI features!

**Full Fix**:
1. Wake up Northflank backend
2. Verify health endpoint responds
3. Reload app
4. Connect to real backend!

---

**The hardest part (app loading) is DONE! Now it's just backend connectivity! 🎊**

