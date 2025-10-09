# Northflank Health Check Fix

**Issue:** Connection refused on health check endpoint
**Error:** `tcp connect error: Connection refused (os error 111)`
**Cause:** Application not starting OR incorrect health check configuration

---

## 🚨 Critical Fix Required

### Issue Analysis

The Northflank deployment is failing with:
```
Error when performing network probe:
"Failed when requesting service on http://127.0.0.1:4000/api/v1/monitoring/health":
"error trying to connect: tcp connect error: Connection refused (os error 111)"
```

**Root Cause:** The application is not starting, which means nothing is listening on port 4000.

### Why This Happens

1. **Missing Required Environment Variables** - Most likely cause
2. **Database Connection Failures** - MongoDB/Redis not configured
3. **Application Crashes During Startup** - Unhandled initialization errors
4. **Health Check Path Mismatch** - Secondary issue

---

## ✅ Solution: Fix in Northflank Dashboard

### Step 1: Update Health Check Path (CRITICAL)

**Current (Incorrect):**
```
Path: /api/v1/monitoring/health
```

**Correct:**
```
Path: /healthz
Port: 4000
Protocol: HTTP
Initial Delay: 60 seconds
Period: 30 seconds
Timeout: 3 seconds
Failure Threshold: 3
Success Threshold: 1
```

**Why `/healthz`?**
- The Dockerfile HEALTHCHECK uses `/healthz` (line 92)
- `/healthz` is a simple endpoint that responds before full app initialization
- `/api/v1/monitoring/health` requires more services to be running

### Step 2: Set Required Environment Variables

**🔴 CRITICAL - These MUST be set or app won't start:**

```bash
# Application Core (REQUIRED)
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
API_VERSION=v1

# Database (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/halobuzz?retryWrites=true&w=majority

# Cache (REQUIRED)
REDIS_URL=redis://username:password@host:port

# Security (REQUIRED)
JWT_SECRET=<generate-random-32+-character-string>
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS (REQUIRED)
CORS_ORIGIN=https://your-frontend.com,https://admin.your-domain.com
```

**⚠️ WARNING:** Without these variables, the application logs warnings but may fail to start properly.

### Step 3: Check Northflank Logs

1. Go to Northflank Dashboard
2. Select your backend service
3. Navigate to **"Logs"** tab
4. Look for these startup messages:

**✅ SUCCESS - Look for:**
```
🚀 HaloBuzz Backend Server running on http://0.0.0.0:4000
Database connected successfully
Redis connected successfully
Security hardening: ENABLED
Feature flags: ENABLED
```

**❌ FAILURE - Look for:**
```
Missing environment variables: MONGODB_URI, REDIS_URL, JWT_SECRET
Database connection failed: [error message]
Redis connection failed: [error message]
Failed to start server: [error message]
```

---

## 🔍 Diagnostic Steps

### Check 1: Verify Build Succeeded

In Northflank **Build Logs**, ensure you see:
```
✅ Building TypeScript...
✅ Build complete!
✅ Dist contents: [files listed]
```

If build fails, the app won't run.

### Check 2: Verify Environment Variables Are Set

In Northflank **Environment** tab:
- ✅ NODE_ENV = production
- ✅ PORT = 4000
- ✅ MONGODB_URI = mongodb+srv://... (Secret)
- ✅ REDIS_URL = redis://... (Secret)
- ✅ JWT_SECRET = [32+ chars] (Secret)
- ✅ CORS_ORIGIN = https://...

### Check 3: Test MongoDB Connection

Use MongoDB Compass or CLI to verify connection string:
```bash
# Test format
mongodb+srv://username:password@cluster.mongodb.net/halobuzz?retryWrites=true&w=majority

# Common issues:
- Wrong username/password
- IP not whitelisted in MongoDB Atlas
- Database name incorrect
- Missing retryWrites parameter
```

### Check 4: Test Redis Connection

Use Redis CLI to verify connection:
```bash
redis-cli -u redis://username:password@host:port ping
# Expected: PONG

# Common issues:
- Wrong password
- Host/port incorrect
- Redis service not running
- Network/firewall blocking connection
```

---

## 🛠️ How to Fix in Northflank

### Fix 1: Update Health Check (DO THIS FIRST)

1. **Login to Northflank Dashboard**
   - URL: https://app.northflank.com

2. **Navigate to Your Service**
   - Project → Backend Service

3. **Go to Settings → Health Check**
   - **Path:** `/healthz` (change from `/api/v1/monitoring/health`)
   - **Port:** `4000`
   - **Protocol:** `HTTP`
   - **Initial Delay:** `60` seconds (important!)
   - **Period:** `30` seconds
   - **Timeout:** `3` seconds
   - **Failure Threshold:** `3`

4. **Save Changes**

5. **Redeploy Service**
   - Deployments → Latest Build → Redeploy

### Fix 2: Set Environment Variables

1. **Go to Environment Tab**

2. **Add Required Variables**
   - Click **"Add Environment Variable"**
   - For sensitive data (passwords, keys), use **"Secret"** type
   - For non-sensitive data, use **"Environment Variable"** type

3. **Critical Variables to Add:**

```bash
# Application (Environment Variables)
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
API_VERSION=v1

# Database (Secrets)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/halobuzz
REDIS_URL=redis://user:pass@host:port

# Security (Secrets)
JWT_SECRET=<generate-with: openssl rand -base64 32>

# CORS (Environment Variables)
CORS_ORIGIN=https://your-domain.com
```

4. **Save and Redeploy**

### Fix 3: Generate Secure JWT Secret

**On your local machine:**
```bash
# Generate 32-character secure random string
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use online generator
# https://www.random.org/passwords/?num=1&len=32&format=plain
```

**Copy the output and add to Northflank as Secret:**
- Name: `JWT_SECRET`
- Type: **Secret**
- Value: [paste generated string]

---

## 📊 Verification After Fix

### 1. Monitor Build Logs

Watch the build process:
```
✅ npm install
✅ pnpm run build
✅ TypeScript compilation successful
✅ Docker image built
✅ Image pushed to registry
```

### 2. Monitor Application Logs

Wait for startup (60+ seconds):
```
✅ HaloBuzz Backend Server running on http://0.0.0.0:4000
✅ Database connected successfully
✅ Redis connected successfully
```

### 3. Test Health Check

Once logs show "Server running":
```bash
# Replace with your Northflank URL
curl https://your-app.northflank.app/healthz

# Expected response:
{"status":"ok"}
```

### 4. Test API Health (Optional)

```bash
curl https://your-app.northflank.app/api/v1/monitoring/health

# Expected response:
{
  "status": "healthy",
  "environment": "production",
  "timestamp": "2025-10-10T...",
  "uptime": 123
}
```

---

## 🚨 If Still Failing After Fix

### Scenario 1: Build Succeeds, App Doesn't Start

**Symptoms:**
- Build logs show success
- Application logs show errors or nothing

**Check:**
1. Environment variables are all set correctly
2. MongoDB URI is valid and accessible
3. Redis URL is valid and accessible
4. No syntax errors in environment variable values

**Fix:**
- Review application logs for specific error messages
- Test database connections manually
- Verify firewall/network settings

### Scenario 2: Health Check Still Fails

**Symptoms:**
- Logs show "Server running"
- Health check still times out

**Check:**
1. Health check path is `/healthz` (not `/api/v1/monitoring/health`)
2. Initial delay is 60+ seconds
3. Port is 4000
4. Protocol is HTTP (not HTTPS for internal check)

**Fix:**
- Update health check configuration
- Increase initial delay to 90 seconds
- Verify port configuration

### Scenario 3: Connection Still Refused

**Symptoms:**
- "Connection refused" persists
- Application logs show nothing

**Check:**
1. Application is actually starting (check logs carefully)
2. Port 4000 is exposed and not blocked
3. Container is running (not crashed)

**Fix:**
- Check Northflank service status
- Review resource allocation (CPU/Memory)
- Check for OOM (Out of Memory) errors

---

## 📝 Quick Checklist

Before marking as resolved, verify:

- [ ] Health check path is `/healthz`
- [ ] Health check port is `4000`
- [ ] Initial delay is `60` seconds or more
- [ ] `NODE_ENV=production` is set
- [ ] `PORT=4000` is set
- [ ] `MONGODB_URI` is set as Secret
- [ ] `REDIS_URL` is set as Secret
- [ ] `JWT_SECRET` is set as Secret (32+ chars)
- [ ] `CORS_ORIGIN` is set with your domain
- [ ] Build logs show success
- [ ] Application logs show "Server running"
- [ ] Health endpoint returns `{"status":"ok"}`

---

## 🎯 Expected Outcome

After implementing these fixes, you should see:

1. **Build Succeeds:** ~5-10 minutes
2. **Application Starts:** ~60 seconds after deployment
3. **Health Check Passes:** Green checkmark in Northflank
4. **Logs Show:**
   ```
   🚀 HaloBuzz Backend Server running on http://0.0.0.0:4000
   Environment: production
   API Version: v1
   Security hardening: ENABLED
   Feature flags: ENABLED
   Database connected successfully
   Redis connected successfully
   ```

5. **Health Endpoint Works:**
   ```bash
   curl https://your-app.northflank.app/healthz
   # Returns: {"status":"ok"}
   ```

---

## 📞 Need Help?

If the issue persists after following this guide:

1. **Check Northflank Status:** https://status.northflank.com
2. **Review Logs:** Share application logs for detailed diagnosis
3. **Verify Configs:** Double-check all environment variables
4. **Test Locally:** Try running with Docker locally to isolate issues

---

**Last Updated:** 2025-10-10
**Status:** 🔴 CRITICAL FIX REQUIRED
**Priority:** IMMEDIATE

---

**🚀 TL;DR:**
1. Change health check path to `/healthz`
2. Set all required environment variables
3. Redeploy and monitor logs
4. Verify health endpoint returns `{"status":"ok"}`
