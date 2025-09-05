# HaloBuzz Backend Debug Deployment

## What was added:
1. ✅ Debug endpoint: GET /api/v1/monitoring/routes
2. ✅ Enhanced logging for route mounting
3. ✅ Environment variable debugging

## Next Steps:

### 1. Deploy to Northflank:
- Upload the `dist` folder to your Northflank service
- Set the start command to: `node index.js`
- Ensure these environment variables are set:
  - NODE_ENV=production
  - API_VERSION=v1
  - MONGODB_URI=your_mongodb_uri
  - REDIS_URL=your_redis_url
  - JWT_SECRET=your_jwt_secret

### 2. Test the debug endpoint:
```bash
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/monitoring/routes
```

This will show you:
- All mounted routes
- Environment variables
- API version being used

### 3. Test auth endpoints:
```bash
# Test registration
curl -X POST https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","country":"US","language":"en"}'

# Test login
curl -X POST https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"password123"}'
```

## Expected Results:
- The routes endpoint should show `/api/v1/auth` with all auth routes
- Auth endpoints should return proper responses instead of 404
- Logs should show "Mounting auth routes at /api/v1/auth"

## If still getting 404s:
1. Check the routes endpoint output
2. Verify environment variables in Northflank
3. Check server logs for the mounting message
4. Ensure the correct service is being deployed (halo-api, not halobuzz-ai)

## Quick Test Commands:

```bash
# 1. Check if server is running
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/healthz

# 2. List all routes
curl https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/monitoring/routes

# 3. Test auth registration
curl -X POST https://p01--halo-api--6jbmvhzxwv4y.code.run/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","country":"US","language":"en"}'
```

## Files to Deploy:
- Upload the entire `dist/` folder contents to your Northflank service
- Make sure `package.json` is in the root of the deployed folder
- Set start command to: `node index.js`
