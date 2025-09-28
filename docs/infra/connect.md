# HaloBuzz v0.1.0 - Platform Connection Guide

This guide walks you through connecting HaloBuzz to GitHub, Railway, and Vercel for production deployment.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] GitHub account with repository access
- [ ] Railway account (sign up at railway.app)
- [ ] Vercel account (sign up at vercel.com)
- [ ] MongoDB Atlas cluster (database)
- [ ] Redis instance (Railway addon recommended)
- [ ] Stripe account (payments)
- [ ] AWS S3 bucket (file storage)
- [ ] All production secrets generated (32+ characters each)

## GitHub Actions + Secrets

### Required GitHub Secrets
Add these secrets in GitHub → Settings → Secrets → Actions:

**Railway Deployment:**
- `RAILWAY_TOKEN` - Your Railway API token
- `BACKEND_URL` - https://<backend>.railway.app
- `AI_URL` - https://<ai-engine>.railway.app
- `AI_ENGINE_SECRET` - Shared secret for AI engine authentication

**Optional Vercel Deployment:**
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### GitHub Actions Workflows
The repository includes these automated workflows:
- **Railway Backend Deploy** (`.github/workflows/railway-backend.yml`) - Deploys backend on push to main
- **Railway AI Engine Deploy** (`.github/workflows/railway-ai.yml`) - Deploys AI engine on push to main
- **Hosted Smoke Tests** (`.github/workflows/hosted-smoke.yml`) - Verifies live deployment security
- **Vercel Admin Deploy** (`.github/workflows/vercel-admin.yml`) - Optional admin dashboard deployment

## Step 1: GitHub Setup

### 1.1 Initialize Repository (if needed)
```bash
# If starting fresh
git init
git add .
git commit -m "feat: HaloBuzz v0.1.0 - Production Ready"
```

### 1.2 Push to GitHub
```bash
# Add remote origin
git remote add origin https://github.com/your-username/halobuzz-platform.git

# Push to main branch
git branch -M main
git push -u origin main

# Create and push version tag
git tag v0.1.0
git push --tags
```

### 1.3 Enable Security Features
1. Go to repository Settings → Security & analysis
2. Enable **Dependabot alerts**
3. Enable **Dependabot security updates**
4. Enable **Secret scanning**
5. Enable **Code scanning** (CodeQL will run automatically)

### 1.4 Configure Branch Protection
1. Go to Settings → Branches
2. Add rule for `main` branch:
   - [x] Require a pull request before merging
   - [x] Require status checks to pass
   - [x] Require branches to be up to date
   - [x] Include administrators
   - Required status checks: `Security Scanning`, `build-test`

## Step 2: Railway Backend Deployment

### 2.1 Create Railway Project
1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your HaloBuzz repository
5. Select "Deploy from a folder" → **backend**
6. Name the service: `halobuzz-backend`

### 2.2 Configure Backend Environment Variables
Copy from `env.backend.production.example` and set these variables in Railway:

**Core Configuration:**
```bash
NODE_ENV=production
API_VERSION=v1
PORT=3000
```

**Security Secrets (Generate new 32+ character secrets):**
```bash
JWT_SECRET=your-unique-jwt-secret-32-chars-minimum
JWT_REFRESH_SECRET=your-unique-refresh-secret-32-chars-minimum
ADMIN_JWT_SECRET=your-unique-admin-secret-32-chars-minimum
AI_SERVICE_SECRET=your-unique-ai-service-secret-32-chars-minimum
```

**Database URLs:**
```bash
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/halobuzz_prod
REDIS_URL=redis://default:password@redis-host:6379
```

**Payment Configuration:**
```bash
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
```

**AWS S3 Storage:**
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=halobuzz-prod-uploads
```

**Feature Flags:**
```bash
ADMIN_TOTP_REQUIRED=true
GLOBAL_AGE_GATE=true
NEPAL_COMPLIANCE_MODE=true
KYC_REQUIRED_FOR_HOSTS=true
GAMES_ENABLED_GLOBAL=true
HIGH_SPENDER_CONTROLS=true
FRAUD_DETECTION_ENABLED=true
```

### 2.3 Add Redis Database
1. In Railway project, click "Add Service"
2. Choose "Database" → "Redis"
3. Copy the Redis URL to `REDIS_URL` in backend service

### 2.4 Verify Backend Deployment
1. Wait for deployment to complete
2. Check logs for any errors
3. Visit `https://your-backend.railway.app/healthz`
4. Should return: `{"status": "ok"}`

## Step 3: Railway AI Engine Deployment

### 3.1 Create AI Engine Service
1. In the same Railway project, click "Add Service"
2. Select "Deploy from GitHub repo" → same repository
3. Choose "Deploy from a folder" → **ai-engine**
4. Name the service: `halobuzz-ai-engine`

### 3.2 Configure AI Engine Environment Variables
Copy from `env.ai.production.example`:

```bash
NODE_ENV=production
PORT=4000

# Security (MUST match backend)
AI_SERVICE_SECRET=your-unique-ai-service-secret-32-chars-minimum
ALLOWED_BACKEND_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Backend Communication
BACKEND_URL=https://your-backend.railway.app

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_MODEL=gpt-4

# Feature Flags
AI_MODERATION_STRICT=true
REAL_TIME_MODERATION=true
```

### 3.3 Verify AI Engine Deployment
1. Wait for deployment to complete
2. Visit `https://your-ai-engine.railway.app/health`
3. Should return service status (but protected endpoints should be inaccessible)

## Step 4: Vercel Admin Dashboard Deployment

### 4.1 Create Vercel Project
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Set **Root Directory** to: `admin`
5. Framework preset should auto-detect as Next.js
6. Name: `halobuzz-admin`

### 4.2 Configure Admin Environment Variables
Copy from `env.admin.production.example`:

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=HaloBuzz Admin
NEXT_PUBLIC_VERSION=0.1.0

# API Configuration
NEXT_PUBLIC_API_BASE=https://your-backend.railway.app

# Authentication (MUST match backend ADMIN_JWT_SECRET)
ADMIN_JWT_SECRET=your-unique-admin-secret-32-chars-minimum
NEXTAUTH_SECRET=your-unique-nextauth-secret-32-chars-minimum

# Security
ADMIN_TOTP_REQUIRED=true
NEXT_PUBLIC_ENABLE_2FA=true
```

### 4.3 Update Backend CORS Configuration
Add your Vercel domain to backend `CORS_ORIGIN`:
```bash
CORS_ORIGIN=https://your-admin.vercel.app,https://halobuzz-admin.vercel.app
```

### 4.4 Verify Admin Dashboard
1. Wait for deployment to complete
2. Visit your Vercel admin URL
3. Should show login page with HaloBuzz branding
4. Test login with admin credentials

## Step 5: Mobile App Configuration (EAS)

### 5.1 Install EAS CLI
```bash
npm install -g @expo/cli eas-cli
```

### 5.2 Configure Mobile Environment
Copy from `env.mobile.production.example` to `mobile/.env`:

```bash
NODE_ENV=production
EXPO_PUBLIC_APP_NAME=HaloBuzz
EXPO_PUBLIC_VERSION=0.1.0

# API Configuration
API_BASE_URL=https://your-backend.railway.app
EXPO_PUBLIC_API_BASE_URL=https://your-backend.railway.app

# Services
EXPO_PUBLIC_AGORA_APP_ID=your_agora_app_id
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
```

### 5.3 Build Mobile App
```bash
cd mobile
eas build --platform all --profile production
```

## Step 6: Domain Configuration (Optional)

### 6.1 Custom Domain for Backend (Railway)
1. In Railway backend service → Settings → Domains
2. Add custom domain: `api.halobuzz.com`
3. Update DNS: CNAME `api` → `your-service.railway.app`
4. Update all environment variables with new domain

### 6.2 Custom Domain for Admin (Vercel)
1. In Vercel project → Settings → Domains
2. Add custom domain: `admin.halobuzz.com`
3. Update DNS: CNAME `admin` → `cname.vercel-dns.com`
4. Update backend `CORS_ORIGIN` with new domain

## Step 7: Final Verification & Testing

### 7.1 Health Check All Services
```bash
# Backend health check
curl https://your-backend.railway.app/healthz

# AI Engine health check
curl https://your-ai-engine.railway.app/health

# Admin dashboard
curl -I https://your-admin.vercel.app
```

### 7.2 Run Smoke Tests
```bash
# From project root
npm run smoke
```

### 7.3 Test Critical Flows
1. **User Registration**: Create test account
2. **Authentication**: Login/logout flow
3. **Payment Flow**: Test coin purchase (use test mode first)
4. **Live Streaming**: Test stream creation
5. **Admin Dashboard**: Test admin login and features
6. **Content Moderation**: Test AI moderation
7. **Age Verification**: Test age gate functionality

### 7.4 Security Verification
1. **SSL Certificates**: Verify all domains have valid SSL
2. **Security Headers**: Check security headers are present
3. **Rate Limiting**: Test rate limits are working
4. **CORS**: Verify CORS is properly configured
5. **Authentication**: Test JWT tokens and sessions

## Step 8: Monitoring & Alerts Setup

### 8.1 Railway Monitoring
1. Enable Railway metrics and alerts
2. Set up CPU/Memory alerts
3. Configure error rate alerts

### 8.2 Vercel Monitoring
1. Enable Vercel Analytics
2. Set up Core Web Vitals monitoring
3. Configure error alerts

### 8.3 External Monitoring (Recommended)
1. **UptimeRobot**: Monitor all endpoints
2. **Sentry**: Error tracking and performance monitoring
3. **DataDog**: Comprehensive application monitoring

## Step 9: Backup & Recovery Setup

### 9.1 Database Backups
1. **MongoDB Atlas**: Enable automated backups
2. **Redis**: Configure persistence in Railway

### 9.2 Code & Configuration Backups
1. **GitHub**: Primary code repository
2. **Environment Variables**: Document all production configs
3. **SSL Certificates**: Backup certificate configurations

## Step 10: Security Hardening Verification

### 10.1 Run Security Checklist
Go through `docs/security/hardening-checklist.md` and verify:
- [ ] All security features are enabled
- [ ] All secrets are properly configured
- [ ] All compliance features are working
- [ ] All monitoring is configured

### 10.2 Penetration Testing (Recommended)
1. Run automated security scans
2. Consider third-party penetration testing
3. Review and address any findings

## Troubleshooting Common Issues

### Backend Won't Start
1. Check all required environment variables are set
2. Verify database connection strings
3. Check Railway logs for specific errors
4. Ensure secrets are properly generated

### Admin Dashboard 404/500 Errors
1. Verify `NEXT_PUBLIC_API_BASE` points to Railway backend
2. Check CORS configuration in backend
3. Verify JWT secrets match between backend and admin
4. Check Vercel function logs

### AI Engine Not Accessible
1. Verify AI engine is properly protected (this is expected)
2. Check backend can communicate with AI engine
3. Verify IP allowlisting is configured
4. Check AI service secret matches

### Payment Issues
1. Verify Stripe keys are for correct environment (live vs test)
2. Check webhook endpoints are properly configured
3. Verify SSL certificates for webhook URLs
4. Test with small amounts first

## Support & Resources

### Documentation
- **API Docs**: `https://your-backend.railway.app/docs`
- **Security Policy**: `SECURITY.md`
- **Deployment Guides**: `docs/infra/`

### Support Contacts
- **Technical Issues**: support@halobuzz.com
- **Security Issues**: security@halobuzz.com
- **Deployment Help**: devops@halobuzz.com

### Platform Support
- **Railway**: [railway.app/help](https://railway.app/help)
- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **GitHub**: [support.github.com](https://support.github.com)

---

## 🎉 Deployment Complete!

Once all steps are completed successfully, your HaloBuzz platform is live and ready for users!

**Next Steps:**
1. **User Testing**: Invite beta users to test the platform
2. **Performance Monitoring**: Monitor performance and optimize
3. **Marketing Setup**: Configure analytics and marketing tools
4. **Content Creation**: Create initial content and user guides
5. **Community Building**: Start building your user community

**Congratulations on deploying HaloBuzz v0.1.0!** 🚀
