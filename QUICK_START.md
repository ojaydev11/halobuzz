# HaloBuzz - Quick Start Guide

**Get HaloBuzz running in production in under 1 hour!**

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub account with access to this repository
- [ ] Credit card for service sign-ups
- [ ] 1 hour of uninterrupted time
- [ ] Computer with Node.js 18+ installed

---

## Step 1: Create Accounts (15 minutes)

### 1.1 MongoDB Atlas (Database)
```bash
1. Go to https://cloud.mongodb.com
2. Sign up with Google/GitHub
3. Create Organization: "HaloBuzz"
4. Create Project: "HaloBuzz Production"
5. Create Cluster:
   - Name: halobuzz-prod
   - Provider: AWS
   - Region: us-east-1
   - Tier: M10 (Recommended) or M0 (Free for testing)
6. Database Access → Add User:
   - Username: halobuzz-api
   - Password: (generate strong password, save it)
   - Role: Read and write to any database
7. Network Access → Add IP:
   - IP: 0.0.0.0/0 (Allow from anywhere - restrict later)
8. Get connection string:
   - Click "Connect" → "Connect your application"
   - Copy: mongodb+srv://halobuzz-api:<password>@...
```

### 1.2 Upstash (Redis)
```bash
1. Go to https://upstash.com
2. Sign up with GitHub
3. Create Redis Database:
   - Name: halobuzz-prod
   - Type: Regional
   - Region: us-east-1
4. Copy connection details:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN
```

### 1.3 Railway (Backend Hosting)
```bash
1. Go to https://railway.app
2. Sign up with GitHub
3. Create New Project
4. Name: "HaloBuzz Backend"
5. Don't deploy yet - we'll do this in Step 3
```

### 1.4 Expo (Mobile Builds)
```bash
1. Go to https://expo.dev
2. Sign up with GitHub
3. Create account
4. Save your credentials for CLI login later
```

### 1.5 Stripe (Payments)
```bash
1. Go to https://stripe.com
2. Sign up
3. Get API keys:
   - Go to Developers → API keys
   - Copy "Publishable key" (pk_test_...)
   - Copy "Secret key" (sk_test_...)
4. Set up webhook:
   - Go to Developers → Webhooks
   - Add endpoint: https://your-backend.railway.app/api/v1/webhooks/stripe
   - (We'll update this URL after deployment)
   - Select events:
     * checkout.session.completed
     * payment_intent.succeeded
     * payment_intent.payment_failed
     * charge.refunded
   - Copy webhook signing secret (whsec_...)
```

### 1.6 Agora (Live Streaming)
```bash
1. Go to https://console.agora.io
2. Sign up
3. Create Project:
   - Name: HaloBuzz
   - Authentication: Secured mode (Token-based)
4. Copy credentials:
   - App ID
   - App Certificate
   - Primary Key
```

### 1.7 AWS (S3 Storage)
```bash
1. Go to https://aws.amazon.com
2. Sign up for AWS account
3. Create IAM user:
   - Go to IAM → Users → Add users
   - Name: halobuzz-backend
   - Access type: Programmatic access
   - Permissions: AmazonS3FullAccess
   - Save Access Key ID and Secret Access Key
4. Create S3 bucket:
   - Go to S3 → Create bucket
   - Name: halobuzz-media-prod
   - Region: us-east-1
   - Uncheck "Block all public access"
   - Enable bucket versioning
```

---

## Step 2: Configure Environment (10 minutes)

### 2.1 Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```bash
# Server
NODE_ENV=production
PORT=5010
API_VERSION=v1

# Database (from Step 1.1)
MONGODB_URI=mongodb+srv://halobuzz-api:<password>@halobuzz-prod.xxxxx.mongodb.net/halobuzz?retryWrites=true&w=majority

# Redis (from Step 1.2)
REDIS_URL=<upstash-connection-string>

# JWT (generate random strings)
JWT_SECRET=<run: openssl rand -hex 64>
JWT_REFRESH_SECRET=<run: openssl rand -hex 64>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AWS (from Step 1.7)
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=halobuzz-media-prod

# Agora (from Step 1.6)
AGORA_APP_ID=<your-app-id>
AGORA_APP_CERTIFICATE=<your-certificate>
AGORA_PRIMARY_KEY=<your-primary-key>

# Stripe (from Step 1.5)
STRIPE_SECRET_KEY=sk_test_<your-key>
STRIPE_PUBLISHABLE_KEY=pk_test_<your-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-secret>

# URLs (update after deployment)
FRONTEND_URL=https://halobuzz.com
ADMIN_DASHBOARD_URL=https://admin.halobuzz.com
CORS_ORIGIN=https://halobuzz.com,https://admin.halobuzz.com

# AI Engine
AI_ENGINE_URL=http://localhost:5020
AI_ENGINE_SECRET=<run: openssl rand -hex 32>

# Email (optional - use Gmail for now)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<app-specific-password>
FROM_EMAIL=noreply@halobuzz.com

# Coins & Payouts
COINS_PER_USD=100
MIN_PAYOUT_AMOUNT=1000
PAYOUT_FEE_PERCENTAGE=5
```

### 2.2 Mobile Environment

```bash
cd apps/halobuzz-mobile
cp .env.example .env
```

Edit `apps/halobuzz-mobile/.env`:

```bash
# API (update after backend deployment)
EXPO_PUBLIC_API_BASE_URL=https://your-backend.railway.app

# Agora
EXPO_PUBLIC_AGORA_APP_ID=<same-as-backend>

# Stripe
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<your-key>

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

---

## Step 3: Deploy Backend (15 minutes)

### 3.1 Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 3.2 Deploy to Railway

```bash
cd backend

# Initialize Railway project
railway init
# Select: "Create new project"
# Name: HaloBuzz Backend

# Link to project
railway link

# Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=5010
# ... (add all variables from .env)

# OR upload .env directly via Railway dashboard:
# 1. Go to railway.app
# 2. Select project
# 3. Variables → Raw Editor
# 4. Paste contents of .env
# 5. Click "Update Variables"

# Deploy
railway up

# Get deployment URL
railway domain
# Copy URL (e.g., halobuzz-backend-production.up.railway.app)
```

### 3.3 Update Stripe Webhook

```bash
# Update webhook endpoint in Stripe dashboard:
# https://halobuzz-backend-production.up.railway.app/api/v1/webhooks/stripe

# Test webhook
curl https://halobuzz-backend-production.up.railway.app/health
# Should return: {"status":"healthy",...}
```

### 3.4 Update Mobile App Environment

```bash
# Update apps/halobuzz-mobile/.env
EXPO_PUBLIC_API_BASE_URL=https://halobuzz-backend-production.up.railway.app
```

---

## Step 4: Build Mobile Apps (20 minutes)

### 4.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 4.2 Configure EAS

```bash
cd apps/halobuzz-mobile

# Initialize EAS
eas init

# Configure iOS bundle ID and Android package
# Edit app.config.ts if needed:
ios: {
  bundleIdentifier: "com.blavatsoft.halobuzz"
}
android: {
  package: "com.blavatsoft.halobuzz"
}
```

### 4.3 Build Preview Builds (for testing)

```bash
# Build Android APK
eas build --profile preview --platform android

# Build iOS (requires Apple Developer account)
eas build --profile preview --platform ios

# Builds take 10-20 minutes
# You'll receive email when complete
# Download from expo.dev/accounts/your-account/projects/halobuzz/builds
```

### 4.4 Test on Device

```bash
# Android: Download APK and install
# iOS: Install via TestFlight or direct install

# Test critical flows:
# 1. Registration and login
# 2. Browse streams
# 3. Start a stream (requires camera permission)
# 4. Play a game
# 5. Purchase coins (use Stripe test card: 4242 4242 4242 4242)
```

---

## Step 5: Verification (10 minutes)

### 5.1 Test Backend APIs

```bash
# Health check
curl https://your-backend.railway.app/health

# Register test user
curl -X POST https://your-backend.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@halobuzz.com",
    "username": "testuser",
    "password": "Test123!",
    "phoneNumber": "+1234567890"
  }'

# Login
curl -X POST https://your-backend.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@halobuzz.com",
    "password": "Test123!"
  }'
# Copy the "accessToken" from response

# Get user profile
curl https://your-backend.railway.app/api/v1/users/me \
  -H "Authorization: Bearer <access-token>"

# Get coins balance
curl https://your-backend.railway.app/api/v1/coins/balance \
  -H "Authorization: Bearer <access-token>"

# Test Stripe checkout
curl -X POST https://your-backend.railway.app/api/v1/stripe/create-checkout-session \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "coins_100",
    "successUrl": "https://halobuzz.com/payment/success",
    "cancelUrl": "https://halobuzz.com/payment/cancel"
  }'
# Returns checkout session URL - open in browser to test
```

### 5.2 Database Verification

```bash
# Connect to MongoDB
mongosh "your-mongodb-connection-string"

# Check database
use halobuzz
show collections
db.users.countDocuments()
db.transactions.countDocuments()

# Verify indexes
db.users.getIndexes()
db.transactions.getIndexes()
```

### 5.3 Mobile App Verification

```bash
# Open app on device
# Test flows:
✓ Registration
✓ Login
✓ Profile editing
✓ Coin purchase (test mode)
✓ Stream browsing
✓ Starting a stream
✓ Playing games
✓ Sending gifts
✓ Push notifications
```

---

## Next Steps

### For Production Launch:

1. **Get Production API Keys**
   - Stripe: Switch to live mode
   - Agora: Enable production settings
   - All other services: production credentials

2. **Custom Domain Setup**
   - Buy domain: halobuzz.com
   - Configure DNS:
     ```
     api.halobuzz.com → CNAME → your-backend.railway.app
     ```
   - Add domain in Railway dashboard
   - SSL auto-configured

3. **App Store Submission**
   - See: `apps/halobuzz-mobile/BUILD_AND_DEPLOY_GUIDE.md`
   - Build production: `eas build --profile production --platform all`
   - Submit: `eas submit --platform all --latest`

4. **Enable Monitoring**
   - Set up Sentry for error tracking
   - Configure uptime monitoring (UptimeRobot)
   - Set up analytics (Google Analytics, Mixpanel)

5. **Security Hardening**
   - Restrict MongoDB IP whitelist to Railway IPs
   - Enable AWS CloudTrail
   - Set up rate limiting alerts
   - Rotate all secrets

6. **Launch Preparation**
   - Load testing
   - Security audit
   - Backup verification
   - Support team training

---

## Troubleshooting

### Backend Won't Start

**Check Railway logs:**
```bash
railway logs
```

**Common issues:**
- Missing environment variable → Check Railway dashboard
- Database connection failed → Verify MongoDB URI and IP whitelist
- Port conflict → Verify PORT=5010 in env

### Mobile Build Fails

**Check EAS build logs:**
```bash
eas build:list
eas build:view <build-id>
```

**Common issues:**
- Invalid bundle ID → Check app.config.ts
- Missing credentials → Run `eas credentials`
- Dependencies error → Delete node_modules and reinstall

### Payment Not Working

**Check Stripe webhook events:**
1. Go to Stripe Dashboard → Webhooks
2. View recent events
3. Check for failed events

**Common issues:**
- Webhook signature mismatch → Verify STRIPE_WEBHOOK_SECRET
- Endpoint not accessible → Check Railway deployment
- Test mode vs live mode mismatch

### Database Connection Issues

**Verify connection:**
```bash
mongosh "your-connection-string"
```

**Common issues:**
- IP not whitelisted → Add 0.0.0.0/0 in MongoDB Atlas
- Wrong password → Regenerate in Database Access
- Network timeout → Check firewall

---

## Cost Summary (First Month)

| Service | Cost |
|---------|------|
| MongoDB Atlas M0 (Free) | $0 |
| Upstash Redis (Free) | $0 |
| Railway (Pro + usage) | ~$40 |
| AWS S3 (minimal usage) | ~$5 |
| Stripe (no fees until sales) | $0 |
| Agora (10k min free) | $0 |
| Expo (Free tier) | $0 |
| **Total First Month** | **~$45** |

**Note:** Upgrade to paid tiers when scaling:
- MongoDB M10: $57/month (recommended for production)
- Expo Production: $29/month (for priority builds)

---

## Support

**Documentation:**
- Full deployment guide: `DEPLOYMENT_RUNBOOK.md`
- Mobile app guide: `apps/halobuzz-mobile/BUILD_AND_DEPLOY_GUIDE.md`
- Environment guide: `backend/ENV_SETUP_GUIDE.md`
- Complete handover: `HANDOVER_PACKAGE.md`

**Need Help?**
- Email: tech@halobuzz.com
- Check documentation in `/docs`
- Review API logs in Railway
- Check Sentry for errors

---

## Success! 🎉

You now have HaloBuzz running in production!

**What you've accomplished:**
✅ Backend API deployed and running
✅ Database configured and indexed
✅ Payment system integrated
✅ Mobile apps built and testable
✅ All critical flows working

**Next milestone: App Store submission!**

See `BUILD_AND_DEPLOY_GUIDE.md` for store submission instructions.

---

**Last Updated**: January 2025
**Version**: 1.0.0
