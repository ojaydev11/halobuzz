# HaloBuzz Backend Environment Setup Guide

## Quick Start

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Fill in the required values (marked with `REQUIRED` below)
3. Start the backend server

## Environment Variables Reference

### 🔧 Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | development | Environment mode: `development`, `staging`, `production` |
| `PORT` | ✅ | 5010 | Backend server port |
| `API_VERSION` | ✅ | v1 | API version prefix |
| `TZ` | ⚠️ | Australia/Sydney | Server timezone |

### 💾 Database Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string for development |
| `MONGODB_URI_PROD` | ✅ (production) | MongoDB Atlas connection string for production |

**Setup Instructions:**
1. Local development: Install MongoDB locally or use Docker
2. Production: Create MongoDB Atlas cluster at https://cloud.mongodb.com
3. Format: `mongodb+srv://username:password@cluster.mongodb.net/halobuzz`

### 🔐 JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | - | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | ⚠️ | 7d | Access token expiration |
| `JWT_REFRESH_SECRET` | ✅ | - | Secret key for refresh tokens |
| `JWT_REFRESH_EXPIRES_IN` | ⚠️ | 30d | Refresh token expiration |

**Generate Strong Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 🔴 Redis Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | ✅ | Redis connection URL |
| `REDIS_PASSWORD` | ⚠️ | Redis password (if required) |

**Setup Instructions:**
- Local: Install Redis or use Docker: `docker run -p 6379:6379 redis`
- Production: Use Redis Cloud, Upstash, or Railway Redis addon

### ☁️ AWS S3 Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | ✅ | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS IAM secret key |
| `AWS_REGION` | ✅ | AWS region (e.g., us-east-1) |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name for media uploads |
| `AWS_CLOUDFRONT_DOMAIN` | ⚠️ | CloudFront CDN domain for faster delivery |

**Setup Instructions:**
1. Create S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Configure bucket CORS for upload from frontend
4. (Optional) Set up CloudFront distribution for CDN

### 📹 Agora Live Streaming

| Variable | Required | Description |
|----------|----------|-------------|
| `AGORA_APP_ID` | ✅ | Agora App ID from console |
| `AGORA_APP_CERTIFICATE` | ✅ | Agora App Certificate for token generation |
| `AGORA_PRIMARY_KEY` | ✅ | Agora primary key |

**Setup Instructions:**
1. Sign up at https://console.agora.io
2. Create new project
3. Enable "Token-based authentication" for security
4. Copy App ID and Certificate from project settings

### 💳 Stripe Payment Gateway

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (sk_test_... or sk_live_...) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (pk_test_... or pk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret (whsec_...) |
| `FRONTEND_URL` | ✅ | Frontend URL for payment redirects |

**Setup Instructions:**
1. Sign up at https://stripe.com
2. Get API keys from Dashboard > Developers > API keys
3. Set up webhook endpoint: `https://your-api.com/api/v1/webhooks/stripe`
4. Enable events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
5. Copy webhook signing secret

**Testing:**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:5010/api/v1/webhooks/stripe`

### 💰 PayPal Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYPAL_CLIENT_ID` | ⚠️ | PayPal REST API client ID |
| `PAYPAL_CLIENT_SECRET` | ⚠️ | PayPal REST API client secret |
| `PAYPAL_MODE` | ⚠️ | Mode: `sandbox` or `live` |

### 🇳🇵 Nepal Payment Gateways

| Variable | Required | Description |
|----------|----------|-------------|
| `ESEWA_MERCHANT_ID` | ⚠️ | eSewa merchant ID |
| `ESEWA_SECRET_KEY` | ⚠️ | eSewa secret key |
| `ESEWA_ENVIRONMENT` | ⚠️ | Environment: `test` or `live` |
| `KHALTI_SECRET_KEY` | ⚠️ | Khalti secret key |
| `KHALTI_PUBLIC_KEY` | ⚠️ | Khalti public key |

### 🤖 AI Services

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_ENGINE_URL` | ✅ | AI engine service URL |
| `AI_ENGINE_SECRET` | ✅ | Shared secret for AI engine authentication |
| `OPENAI_API_KEY` | ⚠️ | OpenAI API key for AI features |
| `TENSORFLOW_MODEL_PATH` | ⚠️ | Path to TensorFlow NSFW detection model |

**Setup Instructions:**
1. Deploy AI engine service (separate service)
2. Generate shared secret for secure communication
3. Configure AI engine URL (internal service, not public)

### 📧 Email Configuration (SMTP)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | ✅ | SMTP server host |
| `SMTP_PORT` | ✅ | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_USER` | ✅ | SMTP username |
| `SMTP_PASS` | ✅ | SMTP password or app password |
| `FROM_EMAIL` | ✅ | Sender email address |

**Options:**
- Gmail: Use app-specific password, enable 2FA
- SendGrid: Professional email service
- AWS SES: Cost-effective for high volume

### 📱 SMS Configuration (Twilio)

| Variable | Required | Description |
|----------|----------|-------------|
| `TWILIO_ACCOUNT_SID` | ⚠️ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | ⚠️ | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | ⚠️ | Twilio phone number |

### 🔥 Firebase Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | ✅ | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Firebase service account email |

**Setup Instructions:**
1. Create Firebase project at https://console.firebase.google.com
2. Go to Project Settings > Service Accounts
3. Generate new private key (downloads JSON file)
4. Extract values from JSON file

### 🛡️ Security Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BCRYPT_ROUNDS` | 12 | BCrypt hashing rounds (10-14 recommended) |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

### 🪙 Coin System Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `COINS_PER_USD` | 100 | Coins received per 1 USD |
| `COIN_EXCHANGE_RATE` | 50 | Coins per NPR |
| `MIN_PAYOUT_AMOUNT` | 1000 | Minimum coins for payout request |
| `PAYOUT_FEE_PERCENTAGE` | 5 | Platform fee on payouts (%) |

### 👑 OG Levels Configuration

| Variable | Default (Coins) | Description |
|----------|----------------|-------------|
| `OG1_PRICE` | 5000 | OG Level 1 price |
| `OG2_PRICE` | 7000 | OG Level 2 price |
| `OG3_PRICE` | 9000 | OG Level 3 price |
| `OG4_PRICE` | 15000 | OG Level 4 price |
| `OG5_PRICE` | 45000 | OG Level 5 price |

### 🏆 Halo Throne Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HALO_THRONE_PRICE` | 15000 | Price to claim Halo Throne |
| `HALO_THRONE_DURATION_DAYS` | 25 | Duration of Halo Throne reign |

### 🌐 App URLs Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_BASE_URL` | ✅ | Frontend app base URL |
| `ADMIN_DASHBOARD_URL` | ✅ | Admin dashboard URL |
| `FRONTEND_URL` | ✅ | Frontend URL for redirects |

### 📤 File Upload Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_FILE_SIZE` | 100MB | Maximum upload file size |
| `ALLOWED_VIDEO_FORMATS` | mp4,mov,avi | Allowed video formats |
| `ALLOWED_IMAGE_FORMATS` | jpg,jpeg,png,gif | Allowed image formats |

### 📊 Logging Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | info | Log level: debug, info, warn, error |
| `LOG_FILE_PATH` | ./logs/app.log | Log file path |

### 🌍 CORS Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `CORS_ORIGIN` | ✅ | Allowed CORS origins (comma-separated) |
| `CORS_CREDENTIALS` | true | Allow credentials in CORS requests |

### 🔍 KYC & Compliance

| Variable | Default | Description |
|----------|---------|-------------|
| `KYC_ENABLED` | true | Enable KYC verification |
| `MIN_AGE_REQUIREMENT` | 18 | Minimum age for registration |
| `REQUIRE_PHONE_VERIFICATION` | true | Require phone verification |
| `REQUIRE_EMAIL_VERIFICATION` | true | Require email verification |

### 🔑 Social OAuth (Google, Apple, Facebook)

**Google OAuth:**
| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | ⚠️ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | ⚠️ | OAuth callback URL |

**Apple Sign In:**
| Variable | Required | Description |
|----------|----------|-------------|
| `APPLE_CLIENT_ID` | ⚠️ | Apple service ID |
| `APPLE_TEAM_ID` | ⚠️ | Apple Team ID |
| `APPLE_KEY_ID` | ⚠️ | Apple Key ID |
| `APPLE_PRIVATE_KEY` | ⚠️ | Apple private key (.p8 file content) |
| `APPLE_CALLBACK_URL` | ⚠️ | OAuth callback URL |

**Facebook Login:**
| Variable | Required | Description |
|----------|----------|-------------|
| `FACEBOOK_APP_ID` | ⚠️ | Facebook App ID |
| `FACEBOOK_APP_SECRET` | ⚠️ | Facebook App Secret |
| `FACEBOOK_CALLBACK_URL` | ⚠️ | OAuth callback URL |

### 🔌 WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SOCKET_IO_CORS_ORIGIN` | * | Socket.IO CORS origin |
| `SOCKET_IO_PING_TIMEOUT` | 60000 | Ping timeout (ms) |
| `SOCKET_IO_PING_INTERVAL` | 25000 | Ping interval (ms) |

### 🛡️ Content Moderation

| Variable | Default | Description |
|----------|---------|-------------|
| `NSFW_DETECTION_ENABLED` | true | Enable NSFW content detection |
| `NSFW_THRESHOLD` | 0.7 | NSFW detection threshold (0-1) |
| `PROFANITY_FILTER_ENABLED` | true | Enable profanity filtering |
| `AUTO_BAN_THRESHOLD` | 3 | Auto-ban after N violations |

### 🎛️ Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_LIVE_STREAMING` | true | Enable live streaming feature |
| `ENABLE_REELS` | true | Enable reels feature |
| `ENABLE_GAMES` | true | Enable games feature |
| `ENABLE_STORE` | true | Enable store feature |
| `ENABLE_OG_TIERS` | true | Enable OG tier system |
| `ENABLE_HALO_THRONE` | true | Enable Halo Throne feature |
| `ENABLE_TOURNAMENTS` | true | Enable tournaments |
| `ENABLE_LEADERBOARDS` | true | Enable leaderboards |

### 📱 Mobile App Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `MOBILE_API_VERSION` | v1 | Mobile API version |
| `IOS_BUNDLE_ID` | com.blavatsoft.halobuzz | iOS bundle identifier |
| `ANDROID_PACKAGE_NAME` | com.blavatsoft.halobuzz | Android package name |
| `EXPO_PROJECT_ID` | ⚠️ | Expo project ID |

### 📈 Analytics & Monitoring

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | ⚠️ | Sentry error tracking DSN |
| `MIXPANEL_TOKEN` | ⚠️ | Mixpanel analytics token |
| `GOOGLE_ANALYTICS_ID` | ⚠️ | Google Analytics tracking ID |

### 💾 Backup & Maintenance

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_ENABLED` | true | Enable automated backups |
| `BACKUP_SCHEDULE` | 0 2 * * * | Backup cron schedule (daily 2 AM) |
| `MAINTENANCE_MODE` | false | Enable maintenance mode |

## Environment-Specific Configurations

### Development Environment (.env.development)
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/halobuzz
REDIS_URL=redis://localhost:6379
AI_ENGINE_URL=http://localhost:5020
FRONTEND_URL=http://localhost:3000
```

### Staging Environment (.env.staging)
```bash
NODE_ENV=staging
MONGODB_URI=mongodb+srv://user:pass@staging-cluster.mongodb.net/halobuzz
REDIS_URL=redis://staging-redis.example.com:6379
AI_ENGINE_URL=https://ai-staging.halobuzz.com
FRONTEND_URL=https://staging.halobuzz.com
```

### Production Environment (.env.production)
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@prod-cluster.mongodb.net/halobuzz
REDIS_URL=redis://prod-redis.example.com:6379
AI_ENGINE_URL=https://ai.halobuzz.com
FRONTEND_URL=https://halobuzz.com
LOG_LEVEL=warn
MAINTENANCE_MODE=false
```

## Security Best Practices

1. **Never commit `.env` files to version control**
2. **Use strong, randomly generated secrets** (min 32 characters)
3. **Rotate secrets regularly** (quarterly recommended)
4. **Use environment-specific values** (different keys for dev/staging/prod)
5. **Enable Stripe webhook signature verification** in production
6. **Use HTTPS in production** for all external services
7. **Restrict CORS origins** to specific domains in production
8. **Enable rate limiting** to prevent abuse
9. **Use Redis password** in production environments
10. **Enable 2FA for all admin accounts**

## Validation Checklist

Before deploying, verify:

- [ ] All required environment variables are set
- [ ] Database connection is working
- [ ] Redis connection is working
- [ ] AWS S3 uploads are working
- [ ] Agora token generation is working
- [ ] Stripe webhooks are configured and receiving events
- [ ] Email sending is working
- [ ] Firebase push notifications are working
- [ ] All third-party API keys are valid
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Logging is working
- [ ] Error tracking (Sentry) is configured

## Troubleshooting

### MongoDB Connection Issues
```bash
# Test connection
mongosh "mongodb+srv://cluster.mongodb.net" --username <user>

# Common issues:
# - Whitelist IP address in MongoDB Atlas
# - Check username/password encoding
# - Verify network access rules
```

### Redis Connection Issues
```bash
# Test connection
redis-cli -h <host> -p <port> -a <password> ping

# Common issues:
# - Check firewall rules
# - Verify Redis is running
# - Check password authentication
```

### Stripe Webhook Issues
```bash
# Test locally with Stripe CLI
stripe listen --forward-to localhost:5010/api/v1/webhooks/stripe

# Common issues:
# - Webhook secret mismatch
# - Endpoint not accessible publicly
# - Incorrect signature verification
```

### AWS S3 Upload Issues
```bash
# Test AWS credentials
aws s3 ls s3://your-bucket-name

# Common issues:
# - IAM permissions insufficient
# - Bucket CORS not configured
# - Region mismatch
```

## Support

For issues or questions:
- Check logs: `tail -f logs/app.log`
- Enable debug logging: `LOG_LEVEL=debug`
- Contact: tech@halobuzz.com
