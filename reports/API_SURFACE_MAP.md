# API Surface Map

## Executive Summary
- **Total Routes**: 26 route files in backend
- **Authentication**: JWT-based with middleware
- **Validation**: express-validator on most endpoints
- **Rate Limiting**: Implemented on sensitive endpoints
- **Status**: Mixed - some routes fully wired, others partial/stub

## Route Inventory & Status

### 🔐 Authentication (`/api/v1/auth`)
**Status**: ✅ **Wired**
- `POST /register` - User registration with validation
- `POST /login` - Multi-identifier login (email/username/phone)
- `POST /kyc` - KYC document submission
- `GET /me` - Get current user profile
- `POST /refresh` - Token refresh
- `POST /logout` - Logout (placeholder)

**Auth**: None (public endpoints)
**Validation**: ✅ Full express-validator
**Rate Limiting**: ⚠️ Not explicitly set

### 📺 Live Streaming (`/api/v1/streams`)
**Status**: ✅ **Wired**
- `POST /` - Create stream with Agora integration
- `GET /` - Get streams with ranking/filtering
- `GET /trending` - Get trending streams
- `GET /:id` - Get stream by ID
- `POST /:id/end` - End stream (host only)
- `GET /user/:userId` - Get user's streams

**Auth**: Required for create/end
**Validation**: ✅ Full validation
**Rate Limiting**: ⚠️ Not explicitly set

### 💰 Wallet & Payments (`/api/v1/wallet`)
**Status**: ✅ **Wired**
- `GET /` - Get wallet info
- `POST /recharge` - Recharge wallet (eSewa/Khalti/Stripe)
- `GET /transactions` - Transaction history
- `POST /webhooks/esewa` - eSewa webhook
- `POST /webhooks/khalti` - Khalti webhook
- `POST /webhooks/stripe` - Stripe webhook
- `POST /dev/credit` - Dev-only credit endpoint

**Auth**: Required for user operations
**Validation**: ✅ Full validation + fraud detection
**Rate Limiting**: ✅ Velocity controls implemented
**Security**: ✅ HMAC verification, idempotency

### 🎁 Gifts (`/api/v1/gifts`)
**Status**: ✅ **Wired**
- `GET /` - Get gifts with festival integration
- `GET /popular` - Get popular gifts
- `GET /:id` - Get gift by ID
- `POST /:streamId/gift` - Send gift to stream
- `GET /category/:category` - Get gifts by category

**Auth**: Required for sending gifts
**Validation**: ✅ Full validation
**Rate Limiting**: ⚠️ Not explicitly set

### 🎮 Games (`/api/v1/games`)
**Status**: ✅ **Wired**
- `GET /` - Get games list
- `GET /popular` - Get popular games
- `GET /:id` - Get game by ID
- `POST /:id/play` - Play game with AI win rate enforcement
- `GET /type/:type` - Get games by type
- `GET /user/:userId/history` - Get user's game history

**Auth**: Required for playing
**Validation**: ✅ Full validation + gaming controls
**Rate Limiting**: ✅ Gaming session controls
**Security**: ✅ AI win rate bounds (35-55%)

### 👑 OG Tiers (`/api/v1/og`)
**Status**: ✅ **Wired**
- `GET /tiers` - Get OG tiers
- `GET /tiers/:id` - Get tier by ID
- `POST /subscribe` - Subscribe to OG tier
- `GET /status` - Get user's OG status
- `GET /benefits` - Get OG benefits
- `GET /leaderboard` - Get OG leaderboard

**Auth**: Required for user operations
**Validation**: ✅ Full validation
**Rate Limiting**: ⚠️ Not explicitly set

### ⚙️ Configuration (`/api/v1/config`)
**Status**: ✅ **Wired**
- `GET /` - Get public app configuration
- `GET /country/:countryCode` - Get country-specific config
- `GET /health` - Health check

**Auth**: Optional (enhanced config for authenticated users)
**Validation**: ✅ Basic validation
**Rate Limiting**: ⚠️ Not explicitly set

### 🛡️ Admin (`/api/v1/admin`)
**Status**: ✅ **Wired**
- `GET /csrf-token` - Get CSRF token
- `GET /stats` - Overview statistics
- `GET /gifts` - List gifts (CRUD)
- `POST /gifts` - Create gift
- `PUT /gifts/:id` - Update gift
- `GET /festivals` - List festivals
- `PATCH /festivals/:id/toggle` - Toggle festival
- `PUT /festivals/:id` - Update festival
- `GET /pricing` - Get pricing config
- `PUT /pricing` - Update pricing config
- `GET /users` - Search users
- `POST /users/:id/ban` - Ban/unban user
- `POST /users/:id/trust` - Adjust user trust
- `GET /transactions` - List transactions
- `GET /kyc/pending` - Get pending KYC
- `GET /kyc/statistics` - Get KYC stats
- `POST /kyc/:userId/approve` - Approve KYC
- `POST /kyc/:userId/reject` - Reject KYC
- `GET /gaming/limits` - Get gaming limits
- `PUT /gaming/limits` - Update gaming limits
- `GET /gaming/sessions` - Get active sessions
- `POST /gaming/sessions/:userId/end` - End gaming session
- `GET /socket/limits` - Get socket limits
- `PUT /socket/limits` - Update socket limits
- `GET /socket/sessions` - Get socket sessions
- `POST /socket/sessions/:userId/disconnect` - Disconnect user
- `POST /socket/sessions/:userId/clear-violations` - Clear violations
- `GET /socket/violations/:userId` - Get violation history
- `GET /cron/configs` - Get cron configurations
- `GET /cron/configs/:jobName` - Get specific cron config
- `PUT /cron/configs/:jobName` - Update cron config
- `GET /cron/executions` - Get active executions
- `GET /cron/executions/:jobName/history` - Get execution history
- `POST /cron/jobs/:jobName/stop` - Stop cron job
- `POST /cron/jobs/:jobName/toggle` - Toggle cron job
- `GET /cron/timezones` - Get supported timezones
- `GET /audit/actions` - Get admin actions
- `GET /audit/sessions` - Get admin sessions
- `GET /audit/report` - Generate audit report

**Auth**: ✅ Admin authentication required
**Validation**: ✅ Full validation + CSRF protection
**Rate Limiting**: ⚠️ Not explicitly set
**Security**: ✅ CSRF, device binding, IP pinning

### 🏷️ Feature Flags (`/api/v1/admin/flags`)
**Status**: ⚠️ **Partial** (referenced but not analyzed)
- Routes exist but need detailed analysis

### 🧠 AI Engine Routes (Referenced)
**Status**: ⚠️ **Partial** (not fully analyzed)
- AI endpoints mentioned but not mapped in detail
- Expected: `/internal/*` routes with x-ai-secret

## Missing/Incomplete Routes

### ❌ **Not Found in Analysis**
- Chat routes (referenced in file structure)
- Collaboration routes
- Commerce routes
- Creator analytics routes
- Cultural routes
- DAO routes
- Karma reputation routes
- KYC routes (separate from auth)
- Monitoring routes
- NFT routes
- Reels routes
- Security routes
- Storytelling routes
- Subscription routes
- Throne routes
- Web3 routes
- Wellbeing routes

## Security Analysis

### ✅ **Well Implemented**
- JWT authentication middleware
- express-validator on most endpoints
- HMAC verification for webhooks
- Idempotency keys for payments
- CSRF protection for admin routes
- Fraud detection for payments
- Gaming controls and session management
- AI win rate enforcement

### ⚠️ **Needs Attention**
- Rate limiting not consistently applied
- Some routes missing explicit rate limits
- Admin routes could use more granular permissions
- Missing API versioning strategy
- No API documentation (OpenAPI/Swagger)

### ❌ **Missing**
- API rate limiting middleware
- Request/response logging
- API key authentication for external services
- Webhook signature verification for all providers
- API usage analytics

## Validation Status

### ✅ **Fully Validated**
- Auth routes (register, login, KYC)
- Stream routes (create, end)
- Wallet routes (recharge, transactions)
- Gift routes (send, list)
- Game routes (play, list)
- OG routes (subscribe, status)
- Admin routes (CRUD operations)

### ⚠️ **Partially Validated**
- Some query parameters not validated
- File upload validation missing
- Complex object validation could be stronger

### ❌ **Not Validated**
- Some admin routes missing validation
- Webhook payloads not fully validated
- Configuration routes minimal validation

## Rate Limiting Status

### ✅ **Implemented**
- Payment velocity controls
- Gaming session limits
- Socket connection limits
- Fraud detection rate limiting

### ⚠️ **Missing**
- General API rate limiting
- Per-endpoint rate limits
- User-based rate limiting
- IP-based rate limiting

## Next Steps

### **High Priority**
1. Implement consistent rate limiting across all routes
2. Add API documentation (OpenAPI/Swagger)
3. Complete analysis of missing route files
4. Add request/response logging middleware

### **Medium Priority**
1. Implement API versioning strategy
2. Add API usage analytics
3. Strengthen validation on remaining routes
4. Add API key authentication for external services

### **Low Priority**
1. Add API health checks
2. Implement API caching strategies
3. Add API performance monitoring
4. Create API testing suite
