# HaloBuzz MVP Gap Analysis & Defaults
**Date:** 2025-10-09
**Target:** App Store + Play Store Submission-Ready MVP
**Timeline:** Single Session Delivery

---

## Executive Summary

**Current State:** Feature-rich codebase with 82 backend routes, live streaming, payments, and mobile app infrastructure.
**MVP Goal:** Functional user journey: Register → Go Live → Receive Gifts → Cash Out
**Primary Gaps:** Integration completeness, mobile UI/UX flow, store compliance, testing, and deployment automation.

---

## 1. CORE MVP USER JOURNEY MAPPING

### Target Journey
```
User Onboarding → Auth → Home (Browse Lives) → Go Live OR Join Stream →
Send/Receive Gifts → View Wallet → Request Payout → Admin Reviews
```

### Current Implementation Status

| Component | Exists? | Status | Gap/Action |
|-----------|---------|--------|-----------|
| **Backend Auth** | ✅ | 90% Complete | Add OAuth Apple/Google flows |
| **Backend Live Streaming** | ✅ | 85% Complete | Agora token generation working, add join/leave tracking |
| **Backend Gifts** | ✅ | 95% Complete | Double-entry ledger implemented, working |
| **Backend Coins** | ✅ | 80% Complete | In-memory mock store - **MIGRATE TO MongoDB** |
| **Backend Stripe** | ⚠️ | 50% Complete | Route exists, needs webhook handler |
| **Backend IAP Validation** | ✅ | 90% Complete | Apple + Google validation implemented |
| **Backend Payout** | ❌ | 0% Complete | **CREATE** payout request API |
| **Backend Moderation** | ⚠️ | 30% Complete | Basic flags exist, needs auto-actions |
| **Mobile Auth UI** | ✅ | 70% Complete | Login exists, needs OAuth buttons |
| **Mobile Live UI** | ⚠️ | 40% Complete | Screens exist, needs full Agora integration |
| **Mobile Gifts UI** | ⚠️ | 30% Complete | Component exists, needs send flow |
| **Mobile Wallet UI** | ⚠️ | 50% Complete | Screen exists, needs IAP purchase flow |
| **Mobile Store Assets** | ❌ | 0% Complete | **CREATE** icons, splash, screenshots |
| **E2E Tests** | ❌ | 0% Complete | **CREATE** Playwright + mobile smoke tests |
| **CI/CD** | ✅ | 70% Complete | Workflows exist, needs EAS build automation |
| **Privacy Policy** | ❌ | 0% Complete | **CREATE** legal pages |
| **Terms of Service** | ❌ | 0% Complete | **CREATE** legal pages |

---

## 2. MVP FEATURE SET & DEFAULTS

### 2.1 Authentication & User Management

**Current:**
- Email/password registration & login (JWT + refresh tokens) ✅
- KYC document upload ✅
- Phone verification (structure exists) ⚠️

**MVP Additions:**
- OAuth Google Sign-In (web + mobile)
- OAuth Apple Sign-In (iOS requirement)
- Default country: `US`
- Default language: `en`
- Default starting coins: `100`

**Defaults:**
```javascript
NEW_USER_DEFAULTS = {
  coins: { balance: 100, bonusBalance: 0, totalEarned: 100, totalSpent: 0 },
  ogLevel: 0,
  trust: { score: 10, level: 'low' },
  country: process.env.DEFAULT_COUNTRY || 'US',
  language: process.env.DEFAULT_LANGUAGE || 'en'
}
```

---

### 2.2 Live Streaming

**Current:**
- Agora integration with token generation ✅
- Stream creation/end endpoints ✅
- Socket.IO real-time events ✅

**MVP Additions:**
- Viewer join/leave tracking
- Simple viewer count display
- Basic stream categories: `['entertainment', 'gaming', 'music', 'other']`

**Defaults:**
```javascript
STREAM_DEFAULTS = {
  maxDuration: 4 * 60 * 60 * 1000, // 4 hours
  agoraTokenTTL: 3600, // 1 hour
  minTitleLength: 5,
  maxTitleLength: 100,
  defaultCategory: 'entertainment'
}
```

---

### 2.3 Coins & Virtual Economy

**Current:**
- User coins balance in `User` model ✅
- Transaction model with double-entry ✅
- In-memory coin routes (NOT PERSISTED) ⚠️

**CRITICAL FIX:**
```javascript
// backend/src/routes/coins.ts currently uses Map (in-memory)
// MIGRATE to using User.coins and Transaction models
```

**MVP Coin Packages (IAP):**
| Product ID | Coins | Price (USD) | Bonus |
|------------|-------|-------------|-------|
| `coins_100` | 100 | $0.99 | 0 |
| `coins_500` | 550 | $4.99 | 50 |
| `coins_1000` | 1150 | $9.99 | 150 |
| `coins_5000` | 6000 | $39.99 | 1000 |
| `coins_10000` | 12500 | $79.99 | 2500 |

**Stripe Packages (Web):**
Same as above, processed via Stripe Checkout.

**Defaults:**
```javascript
ECONOMY_DEFAULTS = {
  minGiftPrice: 10, // coins
  maxGiftPrice: 10000,
  platformFee: 0.30, // 30% platform cut
  minWithdrawal: 1000, // coins ($10 equivalent)
  coinsPerUSD: 100
}
```

---

### 2.4 Gifts System

**Current:**
- Gift catalog with rarity/pricing ✅
- Send gift endpoint with ledger ✅
- Socket.IO gift emitter ✅

**MVP Gift Catalog (Seed Data):**
```javascript
DEFAULT_GIFTS = [
  { name: 'Heart', icon: '❤️', priceCoins: 10, rarity: 'common' },
  { name: 'Rose', icon: '🌹', priceCoins: 50, rarity: 'common' },
  { name: 'Fireworks', icon: '🎆', priceCoins: 100, rarity: 'uncommon' },
  { name: 'Diamond', icon: '💎', priceCoins: 500, rarity: 'rare' },
  { name: 'Rocket', icon: '🚀', priceCoins: 1000, rarity: 'epic' }
]
```

---

### 2.5 Payouts (Creator Earnings)

**CURRENT:** Does not exist ❌

**MVP Implementation:**
```javascript
POST /api/v1/wallet/payout/request
{
  amount: 5000, // coins
  method: 'bank_transfer' | 'paypal',
  details: { ... }
}

// Status: 'pending' → Admin reviews → 'approved'/'rejected'
// Admin endpoint: POST /api/v1/admin/payouts/:id/approve
```

**Defaults:**
```javascript
PAYOUT_DEFAULTS = {
  minAmount: 1000, // $10
  processingFeePct: 0.05, // 5%
  kycRequired: true,
  autoApprovalThreshold: 0 // All manual for MVP
}
```

---

### 2.6 Moderation & Safety

**Current:**
- ModerationFlag model ✅
- Manual flag creation ⚠️

**MVP Additions:**
- Rate limits on streams (max 3 concurrent per user)
- Basic profanity filter (client-side warning)
- Admin moderation dashboard (simple list + ban button)

**Defaults:**
```javascript
MODERATION_DEFAULTS = {
  maxConcurrentStreams: 3,
  profanityAction: 'warn', // 'warn' | 'mute' | 'ban'
  reportThreshold: 5, // Auto-review after 5 reports
  banDuration: 24 * 60 * 60 * 1000 // 24 hours
}
```

---

### 2.7 Mobile App Configuration

**Current:**
- Bundle IDs set (`com.halobuzz.app`) ✅
- Basic screens exist ⚠️
- No EAS build config ❌

**MVP Mobile Requirements:**
1. **EAS Build Profile** (`eas.json`)
   - Development, Preview, Production profiles
   - iOS provisioning handled
   - Android keystore configured

2. **Deep Links**
   - Scheme: `halobuzz://`
   - Universal link: `https://halobuzz.com/`

3. **Push Notifications**
   - Firebase Cloud Messaging (Android)
   - APNs (iOS)
   - Expo notifications library ✅

4. **Store Assets**
   - App icon (1024x1024)
   - Splash screen
   - 6 screenshots (iPhone, Android)
   - Preview video script

**Defaults:**
```javascript
APP_CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  wsUrl: process.env.EXPO_PUBLIC_WS_URL,
  agoraAppId: process.env.AGORA_APP_ID,
  stripePK: process.env.STRIPE_PUBLISHABLE_KEY
}
```

---

## 3. CRITICAL GAPS & FIXES

### 3.1 Backend

| Priority | Gap | Action | File(s) |
|----------|-----|--------|---------|
| **P0** | Coins route uses in-memory Map | Migrate to MongoDB Transaction model | `backend/src/routes/coins.ts` |
| **P0** | No payout request API | Create POST /wallet/payout/request + admin approve | `backend/src/routes/wallet.ts` |
| **P0** | Stripe webhook missing | Add POST /webhooks/stripe with HMAC verify | `backend/src/routes/webhooks.ts` |
| **P1** | OAuth Google/Apple missing | Add passport.js strategies | `backend/src/routes/auth.ts` |
| **P1** | Moderation auto-actions | Add ban/mute logic on threshold | `backend/src/services/ModerationService.ts` |
| **P2** | Email verification not wired | Wire EmailService to registration | `backend/src/routes/auth.ts` |

---

### 3.2 Mobile

| Priority | Gap | Action | File(s) |
|----------|-----|--------|---------|
| **P0** | IAP purchase flow incomplete | Wire expo-in-app-purchases to backend | `apps/halobuzz-mobile/src/components/CoinPurchaseModal.tsx` |
| **P0** | Live streaming join missing | Add Agora RtcEngine join/leave | `apps/halobuzz-mobile/src/hooks/useAgora.ts` |
| **P0** | Gift send UI missing | Create GiftPicker + send button | `apps/halobuzz-mobile/src/components/GiftPicker.tsx` (new) |
| **P1** | OAuth buttons missing | Add Google/Apple sign-in buttons | `apps/halobuzz-mobile/app/(auth)/login.tsx` |
| **P1** | Wallet screen incomplete | Add purchase history + payout button | `apps/halobuzz-mobile/app/wallet.tsx` |
| **P2** | Deep links not tested | Test `halobuzz://stream/:id` | EAS build + device test |

---

### 3.3 Store Compliance

| Requirement | Status | Action |
|-------------|--------|--------|
| Privacy Policy | ❌ | Create /privacy route with policy text |
| Terms of Service | ❌ | Create /terms route with TOS text |
| Data Deletion Instructions | ❌ | Add to Privacy Policy |
| Age Rating Documentation | ❌ | Document 17+ rating justification |
| IAP Product Config | ⚠️ | Register in App Store Connect + Play Console |
| App Icons (all sizes) | ❌ | Generate from 1024x1024 master |
| Screenshots (6 per platform) | ❌ | Generate via simulator/device |
| App Description | ❌ | Write 170-char short + 4000-char long |

---

### 3.4 Testing & QA

| Type | Coverage | Action |
|------|----------|--------|
| Unit Tests | ~20% | Add tests for ledger, IAP validation |
| Integration Tests | ~10% | Test auth flow, gift send flow |
| E2E Tests (Web) | 0% | Playwright: register → login → purchase |
| E2E Tests (Mobile) | 0% | Detox/Expo: login → go live → send gift |
| Load Tests | 0% | Artillery: 100 concurrent users |
| Security Audit | 0% | Run npm audit, check OWASP Top 10 |

---

### 3.5 CI/CD & Deployment

| Component | Status | Action |
|-----------|--------|--------|
| Backend Deploy (Railway) | ✅ | Configured |
| AI Engine Deploy | ✅ | Configured |
| Admin Deploy (Vercel) | ✅ | Configured |
| Mobile EAS Build (iOS) | ❌ | Add to GitHub Actions |
| Mobile EAS Build (Android) | ❌ | Add to GitHub Actions |
| Smoke Tests (Hosted) | ✅ | Working |
| Preflight Security | ✅ | Working |
| Database Migrations | ⚠️ | Add migration scripts |

---

## 4. CHOSEN DEFAULTS FOR MVP

### 4.1 Environment Variables

**Required Env Vars (.env.example):**
```bash
# Application
NODE_ENV=production
APP_URL=https://halobuzz.com
API_URL=https://api.halobuzz.com
FRONTEND_URL=https://halobuzz.com

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/halobuzz
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<generate-256-bit-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# OAuth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<secret>
APPLE_CLIENT_ID=<from-apple-developer>
APPLE_TEAM_ID=<team-id>
APPLE_KEY_ID=<key-id>
APPLE_PRIVATE_KEY=<base64-p8-file>

# Live Streaming
AGORA_APP_ID=<from-agora>
AGORA_APP_CERTIFICATE=<cert>

# Payments
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
APPLE_IAP_SHARED_SECRET=<from-app-store-connect>
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<base64-json>

# Telemetry
POSTHOG_KEY=<from-posthog>
SENTRY_DSN=<from-sentry>

# Notifications
FCM_SERVER_KEY=<from-firebase>
APNS_KEY_ID=<from-apple>
APNS_TEAM_ID=<team-id>
APNS_PRIVATE_KEY=<base64-p8>

# Features
ENABLE_EMAIL_VERIFICATION=true
ENABLE_OAUTH=true
ENABLE_PAYOUTS=true
MIN_PAYOUT_AMOUNT=1000
```

---

### 4.2 Database Seed Data

**Seed Script Requirements:**
```javascript
// backend/scripts/seeds/mvp-seed.ts
await seedUsers([
  { username: 'admin', email: 'admin@halobuzz.com', role: 'admin' },
  { username: 'testhost', email: 'host@test.com', coins: 1000 },
  { username: 'testviewer', email: 'viewer@test.com', coins: 500 }
]);

await seedGifts(DEFAULT_GIFTS);

await seedCategories([
  'entertainment', 'gaming', 'music', 'dance', 'education', 'other'
]);
```

---

## 5. MVP SUCCESS CRITERIA

### 5.1 Backend

- [ ] Clean clone → `npm install` → `npm run dev` → server starts
- [ ] Auth flow: Register → email sent → login → JWT returned
- [ ] OAuth: Google/Apple login → user created → JWT returned
- [ ] Stream: Create → Agora token → viewers join → coin stats update
- [ ] Gifts: Send → sender debited → host credited → ledger balanced
- [ ] Payments: Stripe purchase → webhook → coins credited
- [ ] IAP: iOS receipt → validated → coins credited
- [ ] Payout: Request → admin approves → status updated
- [ ] All tests pass: `npm run test`

---

### 5.2 Mobile

- [ ] `npx expo start` → QR code → app loads
- [ ] Login → token stored → home screen
- [ ] Go Live → Agora camera starts → viewers can join
- [ ] Join stream → see live video → send gift → animation shows
- [ ] Wallet → buy coins (IAP) → receipt validated → balance updates
- [ ] Payout request → shows "pending" → admin can approve
- [ ] Deep link `halobuzz://stream/123` → opens stream
- [ ] Push notification → tap → opens app

---

### 5.3 Store Submission

- [ ] iOS build: `eas build -p ios --profile production` → .ipa generated
- [ ] Android build: `eas build -p android --profile production` → .aab generated
- [ ] App icons (all sizes) exported
- [ ] 6 screenshots per platform captured
- [ ] Privacy Policy live at `/privacy`
- [ ] Terms of Service live at `/terms`
- [ ] App Store Connect: metadata filled, build uploaded, submitted
- [ ] Google Play Console: metadata filled, build uploaded, submitted

---

### 5.4 Production Deployment

- [ ] Backend deployed to Railway with MongoDB Atlas
- [ ] CI/CD green on main branch
- [ ] Smoke tests pass on production URLs
- [ ] Monitoring dashboards (PostHog, Sentry) receiving events
- [ ] Day-0 Runbook tested and validated

---

## 6. IMPLEMENTATION PRIORITIES

### Phase 1: Critical Path (Complete First)
1. Fix coins.ts to use MongoDB ✅ P0
2. Create payout request API ✅ P0
3. Add Stripe webhook handler ✅ P0
4. Complete mobile IAP purchase flow ✅ P0
5. Complete mobile live streaming join ✅ P0
6. Create gift send UI ✅ P0

### Phase 2: Store Compliance (Before Submission)
7. Generate app icons + splash ✅ P0
8. Create Privacy Policy + ToS ✅ P0
9. Capture screenshots ✅ P0
10. Configure EAS build ✅ P0

### Phase 3: Quality & Testing (Parallel)
11. Add Playwright smoke tests ✅ P1
12. Add mobile E2E test ✅ P1
13. Security audit (npm audit) ✅ P1

### Phase 4: Nice-to-Have (Time Permitting)
14. OAuth Google/Apple ✅ P1
15. Email verification wiring ✅ P2
16. Moderation auto-actions ✅ P2

---

## 7. RISK MITIGATIONS

| Risk | Mitigation |
|------|------------|
| IAP validation fails in production | Test with Sandbox receipts; add detailed error logging |
| Agora token expires mid-stream | Implement token refresh 5min before expiry |
| Stripe webhook replay attack | Store processed webhook IDs; check idempotency |
| App rejection for privacy | Link Privacy Policy in app.config.ts and on login screen |
| Coins ledger imbalance | Add daily reconciliation job; alert on discrepancy |
| MongoDB connection timeout | Use connection pooling; retry logic with exponential backoff |

---

## 8. OUT OF SCOPE FOR MVP

**Explicitly NOT included to meet submission deadline:**

- Live Link-Cast (two-host split screen)
- OG Tier privileges (5 tiers with 15+ features each)
- Reverse Gift Challenge
- Festival skins + AI-generated gifts
- Advanced game types (Battle Royale, Chess, Poker)
- AI opponent system
- Guild system
- Tournaments
- Advanced analytics dashboards
- Multi-language support (English only for MVP)
- KYC auto-verification (manual review only)
- Advanced fraud detection (basic velocity limits only)

**These features are roadmap items for post-launch iterations.**

---

## 9. NEXT STEPS

**Immediate Actions (This Session):**

1. ✅ Review and approve this gap analysis
2. 🔄 Execute Phase 1 fixes (backend critical path)
3. 🔄 Execute mobile MVP flows (IAP, live, gifts)
4. 🔄 Generate store assets and legal pages
5. 🔄 Configure EAS builds and test
6. 🔄 Run smoke tests end-to-end
7. 🔄 Package handover (runbook, QA report, ZIP)

**Post-Session (Within 48 Hours):**
- Submit to App Store Connect (manual step)
- Submit to Google Play Console (manual step)
- Monitor first user signups
- Address any store review feedback

---

**Document Version:** 1.0
**Last Updated:** 2025-10-09
**Owner:** Claude + HaloBuzz Team
**Status:** ✅ APPROVED FOR EXECUTION
