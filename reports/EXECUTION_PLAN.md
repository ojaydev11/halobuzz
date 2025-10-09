# HaloBuzz Complete Execution Plan
**Generated:** 2025-10-10
**Principal Engineer + SDET + Release Manager**
**Objective:** Ship production-ready HaloBuzz with zero placeholders

---

## 📊 ERROR INVENTORY SUMMARY

| Package | TypeScript Errors | Critical Issues | Status |
|---------|-------------------|----------------|--------|
| **backend** | **112** (active compilation) | Analytics disabled, auth types | 🔴 CRITICAL |
| **admin** | **37** | Missing UI libs, backend imports | 🟡 HIGH |
| **ai-engine** | **0** | N/A | ✅ CLEAN |
| **mobile** | **TBD** | Not yet scanned | ⚪ PENDING |
| **TOTAL** | **149+** | Multiple categories | 🔴 CRITICAL |

---

## 🎯 CRITICAL PATH ANALYSIS

### Category 1: Type System Errors (Backend: ~40 errors)
**Files:** `middleware/auth.ts`, `middleware/admin.ts`, `middleware/EnhancedAuthMiddleware.ts`
**Root Cause:** Multiple conflicting definitions of `AuthenticatedRequest` and `AuthUser`
**Impact:** Authentication middleware fails to compile
**Fix Strategy:** Create single source of truth type definition

**Affected Locations:**
- `backend/src/middleware/auth.ts:73` - 'role' property mismatch
- `backend/src/middleware/admin.ts:11` - AuthUser property mismatch
- `backend/src/middleware/EnhancedAuthMiddleware.ts:8` - Missing userId/isBanned

### Category 2: Analytics Service Errors (Backend: ~30 errors)
**Files:** `analytics/services/simulations.ts`, `analytics/queries/kpis.ts`
**Root Cause:** Arithmetic operations on `string | number` unions
**Impact:** Analytics routes currently DISABLED (see tsconfig excludes)
**Fix Strategy:** Add explicit type conversions and guards

**Pattern:**
```typescript
// ERROR: Cannot perform arithmetic on string | number
scenario.growth.userGrowth * (1 + assumptions.baseGrowthRate)
```

### Category 3: Mongoose Model Conflicts (Backend: ~5 errors)
**Files:** `analytics/models/AnalyticsForecast.ts`
**Root Cause:** Interface property 'model' conflicts with Document.model()
**Fix Strategy:** Rename to 'forecastModel' or 'modelConfig'

### Category 4: Admin UI Dependencies (Admin: ~25 errors)
**Files:** Multiple pages using shadcn/ui components
**Root Cause:** Missing UI library installation
**Impact:** Admin dashboard will not build
**Fix Strategy:** Install shadcn/ui OR switch to existing library

**Missing Packages:**
- `swr` (data fetching)
- `chart.js` + `react-chartjs-2` (visualizations)
- `lucide-react` (icons)
- `@/components/ui/*` (shadcn components)

### Category 5: Cross-Package Imports (Admin: ~5 errors)
**Files:** `pages/api/admin/moderation/*.ts`
**Root Cause:** Admin importing backend models directly
**Impact:** Build fails, tight coupling
**Fix Strategy:** Create API endpoints instead of direct imports

---

## 🔥 EXECUTION PLAN - DETAILED

### **PHASE 1: STABILIZE BUILD (Est: 4-6 hours)**

#### PR #1: Fix Backend Type System ✅ PRIORITY 1
**Files to modify:**
1. `backend/src/types/express.d.ts` (CREATE)
2. `backend/src/middleware/auth.ts`
3. `backend/src/middleware/admin.ts`
4. `backend/src/middleware/EnhancedAuthMiddleware.ts`

**Changes:**
```typescript
// CREATE: backend/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthUser {
  userId: string;
  id: string;
  username: string;
  email: string;
  ogLevel: number;
  isVerified: boolean;
  isBanned: boolean;
  isAdmin?: boolean;
  roles?: string[];
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  deviceFingerprint?: string;
  sessionId?: string;
}
```

**Test Command:**
```bash
cd backend && npx tsc --noEmit
```

**Deliverable:** Backend type errors reduced from 112 → ~70

---

#### PR #2: Fix Crypto & JWT Issues ✅ PRIORITY 1
**Files to modify:**
1. `backend/src/middleware/enhancedSecurity.ts`
2. `backend/src/middleware/auth.ts`
3. `backend/package.json`

**Changes:**
- Replace `crypto.createCipherGCM` → `crypto.createCipheriv('aes-256-gcm', ...)`
- Install base32 library: `pnpm add base32-encode base32-decode`
- Fix JWT sign options typing

**Deliverable:** Crypto/security errors resolved

---

#### PR #3: Fix Admin Dependencies ✅ PRIORITY 1
**Command sequence:**
```bash
cd admin

# Option A: Install shadcn/ui (RECOMMENDED)
npx shadcn-ui@latest init
npx shadcn-ui@latest add card badge button input select tabs alert

# Option B: Use alternative
pnpm add @radix-ui/react-card @radix-ui/react-badge # etc.

# Install missing packages
pnpm add swr chart.js react-chartjs-2 lucide-react
```

**Files to modify:**
1. `admin/package.json`
2. `admin/pages/dashboard/*.tsx` (fix icon imports)
3. `admin/lib/types.ts` (add User interface with 'roles' not 'role')

**Test Command:**
```bash
cd admin && npx tsc --noEmit && pnpm build
```

**Deliverable:** Admin builds successfully

---

### **PHASE 2: RE-ENABLE ANALYTICS (Est: 6-8 hours)**

#### PR #4: Fix Analytics Type Issues
**Files to modify:**
1. `backend/src/analytics/services/simulations.ts` (~30 fixes)
2. `backend/src/analytics/queries/kpis.ts`
3. `backend/src/analytics/models/AnalyticsForecast.ts`

**Pattern to apply:**
```typescript
// BEFORE (error)
const result = scenario.growth.userGrowth * (1 + assumptions.baseGrowthRate);

// AFTER (fixed)
const userGrowth = Number(scenario.growth.userGrowth);
const growthRate = Number(assumptions.baseGrowthRate);
const result = userGrowth * (1 + growthRate);
```

**Changes to AnalyticsForecast:**
```typescript
// Rename 'model' to avoid Document conflict
export interface IAnalyticsForecast extends Document {
  forecastModel: { // was 'model'
    type: 'linear' | 'ewma' | 'arima' | 'prophet';
    parameters: any;
    accuracy: number;
    lastTrained: Date;
  };
  // ...
}
```

**Re-enable analytics:**
```json
// backend/tsconfig.json
{
  "exclude": [
    // "src/analytics",  // REMOVE THIS LINE
    // "src/agents",     // REMOVE THIS LINE
    "node_modules"
  ]
}
```

**Test Command:**
```bash
cd backend && npx tsc --noEmit
# Should show 0 errors
```

**Deliverable:** Analytics compiles clean

---

### **PHASE 3: IMPLEMENT CRITICAL TODOs (Est: 12-16 hours)**

#### PR #5: AI Moderation - Real Implementation
**Approach Decision:** Use AWS Rekognition (production-grade, scalable)

**Files to CREATE:**
```
ai-engine/src/services/
├── nsfw-detection.ts        (AWS Rekognition)
├── age-estimation.ts        (AWS Rekognition)
├── profanity-detection.ts   (Audio → Transcribe → Keywords)
└── moderation-orchestrator.ts
```

**Dependencies:**
```bash
cd ai-engine
pnpm add @aws-sdk/client-rekognition @aws-sdk/client-transcribe
```

**Implementation:**
```typescript
// ai-engine/src/services/nsfw-detection.ts
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';

export class NSFWDetectionService {
  private client: RekognitionClient;

  constructor() {
    this.client = new RekognitionClient({ region: process.env.AWS_REGION });
  }

  async detectNSFW(imageUrl: string): Promise<{
    isNSFW: boolean;
    confidence: number;
    labels: string[];
  }> {
    // Download image to buffer
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();

    const command = new DetectModerationLabelsCommand({
      Image: { Bytes: new Uint8Array(imageBuffer) },
      MinConfidence: 60
    });

    const result = await this.client.send(command);

    const nsfwLabels = ['Explicit Nudity', 'Suggestive', 'Violence', 'Visually Disturbing'];
    const detectedNSFW = result.ModerationLabels?.filter(label =>
      nsfwLabels.some(nsfw => label.Name?.includes(nsfw))
    ) || [];

    return {
      isNSFW: detectedNSFW.length > 0,
      confidence: Math.max(...detectedNSFW.map(l => l.Confidence || 0), 0),
      labels: detectedNSFW.map(l => l.Name || ''),
    };
  }
}
```

**Test Plan:**
```bash
# Unit tests
cd ai-engine && pnpm test

# Integration test
curl -X POST http://localhost:5020/api/moderate-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/test.jpg"}'
```

**Deliverable:** Working AI moderation with real ML models

---

#### PR #6: Email/SMS Integration
**Files to modify:**
1. `backend/src/services/EmailService.ts` (verify Resend integration)
2. `backend/src/services/SMSService.ts` (verify Twilio integration)
3. CREATE: `backend/src/templates/email/*.html`

**Implementation checklist:**
- [ ] Verify Resend API key in .env
- [ ] Create email templates (verify, reset, payout)
- [ ] Add retry logic with exponential backoff
- [ ] Add delivery tracking (webhooks)
- [ ] Test sandbox SMS sends

**Test:**
```bash
# Send test email
curl -X POST http://localhost:5010/api/v1/test/email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "template": "verify"}'
```

---

#### PR #7: Moderation Action Queue
**Files to CREATE:**
```
backend/src/services/
├── ModerationQueueService.ts
└── ModerationActionsService.ts

backend/src/routes/
└── moderation-queue.ts
```

**Implementation:**
- Use Bull queue for async processing
- Actions: blur, hide, ban, escalate, notify
- Admin override workflow
- Audit trail

**Deliverable:** Working moderation pipeline

---

#### PR #8: S3 Cleanup Background Job
**File:** `backend/src/jobs/s3-cleanup.ts` (CREATE)

```typescript
import cron from 'node-cron';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  // Find orphaned uploads (no DB reference after 7 days)
  // Delete from S3
});
```

---

### **PHASE 4: PAYMENTS & ECONOMY (Est: 8-10 hours)**

#### PR #9: Stripe Integration Complete
**Files to modify:**
1. `backend/src/services/StripeService.ts`
2. `backend/src/routes/payment.ts`
3. CREATE: `backend/src/webhooks/stripe.ts`

**Stripe Products (create in dashboard):**
```
Small Pack:   100 coins  → $0.99   (Product ID: prod_xxx)
Medium Pack:  500 coins  → $4.99   (Product ID: prod_xxx)
Large Pack:  1000 coins  → $9.99   (Product ID: prod_xxx)
Mega Pack:   5000 coins  → $44.99  (Product ID: prod_xxx)
Ultra Pack: 10000 coins  → $79.99  (Product ID: prod_xxx)
```

**Idempotent Webhook:**
```typescript
// Verify HMAC signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

// Idempotency check
const existingTx = await CoinTransaction.findOne({
  stripePaymentIntentId: event.data.object.id
});
if (existingTx) return res.sendStatus(200); // Already processed

// Double-entry ledger
await CoinTransaction.create({
  userId,
  type: 'purchase',
  amount: coins,
  stripePaymentIntentId: event.data.object.id,
  idempotencyKey: event.id,
});
```

**Test:**
```bash
# Webhook testing with Stripe CLI
stripe listen --forward-to localhost:5010/webhooks/stripe
stripe trigger payment_intent.succeeded
```

**Deliverable:** Stripe checkout working + idempotent webhooks

---

#### PR #10: IAP Receipt Verification
**Files to CREATE:**
```
backend/src/services/
├── AppleIAPService.ts
└── GoogleIAPService.ts
```

**Apple Implementation:**
```typescript
async verifyAppleReceipt(receiptData: string): Promise<IAPVerification> {
  const response = await axios.post(
    'https://sandbox.itunes.apple.com/verifyReceipt', // Use prod for production
    { 'receipt-data': receiptData, password: process.env.APPLE_SHARED_SECRET }
  );

  // Check for replay (transaction ID already used)
  const txId = response.data.receipt.transaction_id;
  const existing = await CoinTransaction.findOne({ appleTransactionId: txId });
  if (existing) throw new Error('Receipt already used');

  // Credit coins
  // ...
}
```

**Test Plan:**
- Use Expo sandbox receipts
- Verify replay protection
- Test refund handling

---

### **PHASE 5: REALTIME SCALE (Est: 6-8 hours)**

#### PR #11: Socket.IO Redis Adapter
**File:** `backend/src/socket.ts`

**Changes:**
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

**Test multi-instance:**
```bash
# Terminal 1
PORT=5010 node dist/index.js

# Terminal 2
PORT=5011 node dist/index.js

# Both should receive events via Redis pub/sub
```

**Load test:**
```bash
# 2k concurrent connections
artillery run tests/load/socket-soak.yml
```

**Deliverable:** Multi-instance Socket.IO working

---

### **PHASE 6: ADMIN + MOBILE + SECURITY (Est: 16-20 hours)**

#### PR #12: Admin Dashboard Complete
**Pages to build:**
- User search + details
- KYC approval queue
- Payout approval queue
- Moderation queue
- Security dashboard
- Feature flags

**2FA Implementation:**
```typescript
// Admin login flow
1. Username/password → JWT (short-lived)
2. TOTP verification → Full JWT with admin claims
```

#### PR #13: Mobile App Completion
**Screens checklist:**
- [x] Login/Signup (DONE)
- [ ] Home feed
- [ ] Live viewer
- [ ] Go live
- [ ] Gifts/coins
- [ ] Wallet
- [ ] Tournaments
- [ ] Reels
- [ ] Profile
- [ ] Legal pages

**IAP Integration:**
```typescript
// React Native IAP
import * as InAppPurchases from 'expo-in-app-purchases';

const purchaseCoins = async (productId: string) => {
  await InAppPurchases.purchaseItemAsync(productId);
  // Get receipt
  const receipt = await InAppPurchases.getReceiptAsync();
  // Send to backend for verification
  await api.post('/iap/verify', { receipt });
};
```

#### PR #14: Security Hardening
**Checklist:**
- [ ] Helmet configured
- [ ] CSP headers
- [ ] CORS strict
- [ ] Rate limiting (auth: 5/min, search: 100/min, payment: 10/min)
- [ ] Input validation (express-validator)
- [ ] HMAC webhook verification
- [ ] JWT rotation
- [ ] npm audit clean
- [ ] ZAP baseline scan

---

### **PHASE 7: TESTING & CI/CD (Est: 8-12 hours)**

#### PR #15: Comprehensive Test Suite
**Backend tests:**
```bash
# Unit tests (Jest)
npm run test:unit

# Integration tests (Supertest)
npm run test:integration

# Load tests (Artillery)
npm run test:load
```

**Admin tests:**
```bash
# Playwright E2E
npx playwright test
```

**Mobile tests:**
```bash
# Detox (iOS/Android)
detox test --configuration ios.sim.debug

# OR manual Expo Go testing
expo start
```

#### PR #16: CI/CD Pipeline
**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  build-test-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install
        run: cd backend && npm ci && cd ../ai-engine && npm ci && cd ../admin && npm ci

      - name: Typecheck
        run: cd backend && npm run type-check && cd ../ai-engine && npm run type-check

      - name: Lint
        run: cd backend && npm run lint && cd ../ai-engine && npm run lint

      - name: Unit Tests
        run: cd backend && npm run test:unit && cd ../ai-engine && npm run test:unit

      - name: Integration Tests
        run: cd backend && npm run test:integration

      - name: Build
        run: cd backend && npm run build && cd ../ai-engine && npm run build && cd ../admin && npm run build

      - name: E2E Tests (Admin)
        run: cd admin && npx playwright test --project=chromium

      - name: Deploy (on main)
        if: github.ref == 'refs/heads/main'
        run: |
          # Deploy to Railway/Vercel
          # ...

      - name: Smoke Tests
        if: github.ref == 'refs/heads/main'
        run: |
          curl -f https://halobuzzz/api/v1/monitoring/health
```

---

### **PHASE 8: DOCUMENTATION (Est: 4-6 hours)**

#### PR #17: Complete Handover Docs

**Files to CREATE:**
```
docs/
├── QUICK_START.md
├── DEPLOYMENT_RUNBOOK.md
├── ENV_SETUP_GUIDE.md
├── QA_REPORT.md
├── SECURITY_NOTES.md
└── ACCEPTANCE_MATRIX.md
```

**Content example (QUICK_START.md):**
```markdown
# HaloBuzz Quick Start (1 Hour Setup)

## Prerequisites
- Node 20+
- MongoDB Atlas account
- Redis (local or Cloud)
- AWS account (S3, Rekognition)
- Stripe account
- Twilio account

## Step 1: Clone & Install
git clone ...
cd halobuzz
cd backend && npm install
cd ../ai-engine && npm install
cd ../admin && npm install

## Step 2: Environment Setup
cp backend/.env.example backend/.env
# Fill in all values (see ENV_SETUP_GUIDE.md)

## Step 3: Database Seed
cd backend && npm run seed

## Step 4: Start Services
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd ai-engine && npm run dev

# Terminal 3
cd admin && npm run dev

## Step 5: Verify
curl http://localhost:5010/api/v1/monitoring/health
```

---

## 🎯 ACCEPTANCE MATRIX

| Criterion | Target | Test Command | Proof Location | Status |
|-----------|--------|--------------|----------------|--------|
| Zero TS Errors | 0/0/0/0 (backend/admin/ai/mobile) | `npm run typecheck` | `reports/typecheck.log` | ⚪ |
| Zero ESLint Errors | 0 warnings | `npm run lint` | `reports/lint.log` | ⚪ |
| AI Moderation Works | NSFW/Age/Profanity | Unit tests + manual | `reports/ai-test-output.json` | ⚪ |
| Payments Work | Stripe + IAP | Test purchases | `reports/payment-tests.md` | ⚪ |
| Realtime Scales | 2k connections | Artillery | `reports/socket-load.html` | ⚪ |
| Security Hardened | No criticals | ZAP + audit | `reports/security-scan.json` | ⚪ |
| Tests Pass | ≥90% | Jest + Playwright | `reports/coverage/` | ⚪ |
| Load SLO Met | 300 RPS, p95<500ms | k6 | `reports/load-test.html` | ⚪ |
| Mobile Builds | iOS + Android | EAS | `reports/eas-builds.txt` | ⚪ |
| Docs Complete | All 6 docs | Manual review | `docs/` | ⚪ |

---

## 📈 TIMELINE ESTIMATE

| Phase | PRs | Estimated Hours | Cumulative |
|-------|-----|----------------|------------|
| 1. Stabilize Build | #1-3 | 4-6h | 6h |
| 2. Re-enable Analytics | #4 | 6-8h | 14h |
| 3. Critical TODOs | #5-8 | 12-16h | 30h |
| 4. Payments | #9-10 | 8-10h | 40h |
| 5. Realtime | #11 | 6-8h | 48h |
| 6. Admin+Mobile+Security | #12-14 | 16-20h | 68h |
| 7. Testing & CI/CD | #15-16 | 8-12h | 80h |
| 8. Documentation | #17 | 4-6h | 86h |
| **TOTAL** | **17 PRs** | **64-86 hours** | **~2-3 weeks** |

---

## 🚦 CURRENT STATUS

**Build Status:** 🔴 CRITICAL
**Type Errors:** 149+ across packages
**Critical Blockers:** 5 (auth types, admin deps, analytics disabled, missing AI impl, payment incomplete)
**Next Action:** Execute PR #1 (Fix Backend Type System)

---

**End of Execution Plan**
