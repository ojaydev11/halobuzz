# HaloBuzz Environment Requirements & Security Audit

## Required Environment Variables by Service

### Backend (Node.js/Express)
**Location**: `backend/.env`

#### Core Infrastructure
```bash
# Server Configuration
NODE_ENV=production|development|test
PORT=5010

# Database Connections
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<password>  # Optional for Redis auth

# Security
JWT_SECRET=<strong-256-bit-secret>  # MUST be 32+ characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### External Services
```bash
# Agora Live Streaming
AGORA_APP_ID=<agora-app-id>
AGORA_APP_CERTIFICATE=<agora-certificate>

# AWS S3 File Storage
AWS_BUCKET_NAME=<s3-bucket-name>
AWS_REGION=<aws-region>
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>

# Payment Gateways - Nepal
ESEWA_MERCHANT_ID=<esewa-merchant-id>
ESEWA_SECRET_KEY=<esewa-secret>
KHALTI_PUBLIC_KEY=<khalti-public-key>
KHALTI_SECRET_KEY=<khalti-secret>

# Payment Gateways - International
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
PAYPAL_CLIENT_ID=<paypal-client-id>
PAYPAL_CLIENT_SECRET=<paypal-secret>

# Communication Services
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
TWILIO_PHONE_NUMBER=<twilio-phone>
SENDGRID_API_KEY=<sendgrid-key>
SENDGRID_FROM_EMAIL=<verified-sender-email>

# AI Engine Integration
AI_ENGINE_URL=http://localhost:5020
AI_ENGINE_SECRET=<shared-secret-key>
```

#### Optional Configuration
```bash
# CORS Configuration
CORS_ORIGIN=http://localhost:19006,http://localhost:3000

# Timezone
TZ=Asia/Kathmandu

# Admin Configuration
ADMIN_EMAILS=admin@halobuzz.com,dev@halobuzz.com
ADMIN_2FA_REQUIRED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info|debug|warn|error
```

### AI Engine (Python/FastAPI)
**Location**: `ai-engine/.env`

```bash
# Server Configuration
PORT=5020
AI_SERVICE_SECRET=<shared-secret-with-backend>
AI_ENGINE_SECRET=<shared-secret-with-backend>  # Alias for compatibility

# Logging
LOG_LEVEL=info

# AI Services
OPENAI_API_KEY=<openai-key>  # For content moderation
TENSORFLOW_MODEL_PATH=/path/to/models

# Database (if needed for AI caching)
REDIS_URL=redis://localhost:6379
```

### Mobile App (React Native/Expo)
**Location**: `apps/halobuzz-mobile/.env`

```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.halobuzz.com
EXPO_PUBLIC_API_PREFIX=/api/v1

# Agora Configuration
AGORA_APP_ID=<agora-app-id>  # Public key, safe to expose

# Payment Configuration (Public Keys Only)
STRIPE_PUBLISHABLE_KEY=<stripe-public-key>

# Feature Flags
PAYMENTS_ENABLED=true
ESEWA_ENABLED=true
KHALTI_ENABLED=true

# Development
DEV_MODE=false
DEMO_MODE=false
```

### Admin Dashboard (Next.js)
**Location**: `admin/.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://api.halobuzz.com
API_SECRET_KEY=<backend-api-secret>

# Database (Direct Access for Admin)
MONGODB_URI=<same-as-backend>

# Security
NEXTAUTH_SECRET=<nextauth-secret>
NEXTAUTH_URL=https://admin.halobuzz.com

# Admin-specific
ADMIN_SESSION_TIMEOUT=3600  # 1 hour
CSRF_SECRET=<csrf-secret>
```

## Environment Files Found

| File | Status | Purpose | Security Level |
|------|--------|---------|----------------|
| `.env.backend.local` | ✅ Present | Backend development | Local only |
| `.env.ai.local` | ✅ Present | AI engine development | Local only |
| `backend/.env` | ✅ Present | Backend runtime | **Protected** |
| `apps/halobuzz-mobile/.env` | ✅ Present | Mobile development | Public vars only |
| `admin/.env.local` | ✅ Present | Admin development | Local only |

## Security Assessment

### ✅ Secrets Management - Good Practices
1. **Environment separation**: Development and production configs separated
2. **No hardcoded secrets**: All sensitive values use environment variables
3. **Example files provided**: `.example` files document required variables
4. **Git exclusion**: `.env` files properly excluded in `.gitignore`

### ❌ Security Issues Found

#### 1. Weak Default Secrets (High Priority)
**Evidence**: `backend/src/config/settings.ts:2-4`
```typescript
if (this.settings.jwtSecret === 'change_me' || this.settings.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters and not default value');
}
```
- Default JWT secret "change_me" detected in examples
- AI engine secret "change_me_too" in examples
- **Fix Required**: Generate strong secrets for production

#### 2. Missing Critical Environment Variables
**Evidence**: Review of `.env.example` files
```bash
# Missing from backend examples:
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_SECRET=
SENDGRID_FROM_EMAIL=
ADMIN_2FA_REQUIRED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 3. Insecure Development Defaults
**Evidence**: `env.mobile.example:1`
```bash
API_BASE_URL=http://10.0.2.2:5010  # Android emulator localhost
```
- Using HTTP instead of HTTPS for API calls
- **Fix Required**: Use HTTPS in production builds

### 🔧 Configuration Issues

#### 1. CORS Configuration Too Permissive
**Evidence**: `env.backend.example:13`
```bash
CORS_ORIGIN=http://localhost:19006,http://localhost:3000
```
- Development CORS settings in example
- **Fix Required**: Restrict to production domains only

#### 2. Missing Production-Specific Variables
```bash
# Missing production environment variables:
NODE_ENV=production
TZ=Asia/Kathmandu  # Nepal timezone
LOG_LEVEL=warn  # Less verbose in production
ADMIN_SESSION_TIMEOUT=3600
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
```

## Services Using Environment Variables

### Backend Services (High Sensitivity)
- **Authentication Service**: JWT_SECRET, JWT_EXPIRES_IN
- **Payment Service**: STRIPE_SECRET_KEY, KHALTI_SECRET_KEY, ESEWA_SECRET
- **Email Service**: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
- **SMS Service**: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
- **File Storage**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- **Database**: MONGODB_URI, REDIS_URL
- **Live Streaming**: AGORA_APP_CERTIFICATE

### AI Engine Services (Medium Sensitivity)
- **Content Moderation**: OPENAI_API_KEY
- **Service Authentication**: AI_ENGINE_SECRET
- **Model Storage**: TENSORFLOW_MODEL_PATH

### Mobile App (Low Sensitivity - Public Keys Only)
- **API Access**: EXPO_PUBLIC_API_BASE_URL
- **Live Streaming**: AGORA_APP_ID (public)
- **Payments**: STRIPE_PUBLISHABLE_KEY (public)

### Admin Dashboard (High Sensitivity)
- **Database Access**: MONGODB_URI (direct access)
- **Session Management**: NEXTAUTH_SECRET
- **CSRF Protection**: CSRF_SECRET

## Production Deployment Checklist

### Critical (Must Fix Before Production)
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Configure production CORS_ORIGIN
- [ ] Set up HTTPS endpoints for mobile API_BASE_URL
- [ ] Configure all payment gateway secrets
- [ ] Set up production MongoDB URI with authentication
- [ ] Configure Agora production credentials

### High Priority
- [ ] Set up Redis with authentication (REDIS_PASSWORD)
- [ ] Configure AWS S3 with proper IAM roles
- [ ] Set up SendGrid with verified sender domain
- [ ] Configure Twilio production phone numbers
- [ ] Enable admin 2FA enforcement
- [ ] Set production log levels

### Monitoring & Observability
- [ ] Configure error tracking service (Sentry)
- [ ] Set up application performance monitoring
- [ ] Configure log aggregation service
- [ ] Set up health check endpoints monitoring

## Environment Variables Security Score: 6/10

**Strengths**:
- Environment separation implemented
- No hardcoded secrets in code
- Proper gitignore configuration
- Good example file documentation

**Critical Issues**:
- Weak default secrets in examples
- Missing production-specific configuration
- Insecure development defaults
- Insufficient documentation for production deployment

**Recommendation**: Update all example files with secure defaults and add production deployment guide before going live.