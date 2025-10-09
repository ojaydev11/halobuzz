# HaloBuzz Error Inventory & Execution Plan
**Generated:** 2025-10-10
**Status:** Pre-Production Assessment

---

## 📊 ERROR SUMMARY

| Package | TypeScript Errors | ESLint Errors/Warnings | TODO/FIXME Comments |
|---------|-------------------|------------------------|---------------------|
| **backend** | **201** | TBD | **49** |
| **ai-engine** | **0** | 0 | **0** |
| **admin** | **37** | TBD | TBD |
| **mobile** | TBD | TBD | TBD |
| **TOTAL** | **238+** | TBD | **49+** |

---

## 🔴 CRITICAL TYPESCRIPT ERRORS (Backend - 201)

### Category 1: Type System Issues (80 errors)
**Files:** `analytics/services/simulations.ts`, `analytics/queries/kpis.ts`
**Pattern:** Arithmetic operations on `string | number` types
```typescript
// ERROR: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint'
scenario.growth.userGrowth * (1 + assumptions.baseGrowthRate) // string | number issue
```
**Fix Strategy:** Add explicit type guards and number conversions

### Category 2: Missing Method Implementations (45 errors)
**Files:** `routes/advanced-analytics.ts`, `routes/advanced-fraud-detection.ts`, `routes/advanced-gifts.ts`
**Pattern:** Routes calling non-existent service methods
```typescript
// ERROR: Property 'getDashboardData' does not exist on type 'AdvancedAnalyticsService'
const data = await advancedAnalyticsService.getDashboardData(userId, filters);
```
**Fix Strategy:** Implement missing service methods or update route signatures

### Category 3: Middleware Auth Type Issues (35 errors)
**Files:** `middleware/auth.ts`, `middleware/enhancedSecurity.ts`, `routes/*.ts`
**Pattern:** Request object missing custom properties
```typescript
// ERROR: Property 'user' does not exist on type 'Request'
req.user.id // needs custom Request interface
```
**Fix Strategy:** Create and use custom Express Request type with user property

### Category 4: Crypto/Security API Issues (12 errors)
**Files:** `middleware/enhancedSecurity.ts`
**Pattern:** Using non-existent crypto methods or wrong encoding
```typescript
// ERROR: Property 'createCipherGCM' does not exist
crypto.createCipherGCM() // should be createCipheriv
// ERROR: 'base32' is not assignable to parameter of type 'BufferEncoding'
Buffer.from(secret, 'base32') // base32 not native Node encoding
```
**Fix Strategy:** Use correct crypto APIs and third-party base32 library

### Category 5: Model/Schema Type Conflicts (29 errors)
**Files:** `models/*.ts`
**Pattern:** Mongoose interface/model type mismatches
```typescript
// ERROR: Interface 'IAnalyticsForecast' incorrectly extends 'Document'
model: { type: string; parameters: any; } // conflicts with Document.model()
```
**Fix Strategy:** Rename conflicting properties or restructure interfaces

---

## 🟡 ADMIN DASHBOARD ERRORS (37)

### Category 1: Missing UI Component Library (12 errors)
**Files:** `pages/ai-moderation.tsx`, `pages/dashboard/*.tsx`
**Pattern:** Imports for non-existent shadcn/ui components
```typescript
// ERROR: Cannot find module '@/components/ui/card'
import { Card } from '@/components/ui/card';
```
**Fix Strategy:** Install shadcn/ui CLI and initialize components OR use existing UI library

### Category 2: Missing Dependencies (10 errors)
**Files:** `pages/dashboard/*.tsx`
**Pattern:** Missing npm packages
```typescript
// ERROR: Cannot find module 'swr'
import useSWR from 'swr';
// ERROR: Cannot find module 'chart.js'
import { Chart } from 'chart.js';
```
**Fix Strategy:** `pnpm add swr chart.js react-chartjs-2 lucide-react`

### Category 3: Backend Import Path Issues (8 errors)
**Files:** `pages/api/admin/*.ts`
**Pattern:** Admin trying to import backend models directly
```typescript
// ERROR: Cannot find module '../../../../backend/src/models/ModerationFlag'
import ModerationFlag from '../../../../backend/src/models/ModerationFlag';
```
**Fix Strategy:** Create shared types package OR use API calls instead of direct imports

### Category 4: User Type Mismatches (7 errors)
**Files:** `pages/dashboard/*.tsx`
**Pattern:** Accessing non-existent user properties
```typescript
// ERROR: Property 'role' does not exist on type 'User'. Did you mean 'roles'?
user.role === 'admin' // should be user.roles
```
**Fix Strategy:** Update User type definition and usage

---

## 🔵 CRITICAL TODO ITEMS (49)

### Category 1: Analytics Placeholders (30 items)
**File:** `backend/src/analytics/etl/dailyRollup.ts`, `jobs/scheduler.ts`
**Pattern:** Hardcoded zeros for metrics
```typescript
battleParticipation: 0, // TODO: Implement battle participation tracking
ogConversionRate: 0, // TODO: Calculate OG conversion rate
```
**Impact:** Analytics dashboard shows no data
**Fix Strategy:** Implement actual aggregation queries from source collections

### Category 2: Festival/Event System (3 items)
**File:** `backend/src/cron/festivalActivation.ts`
```typescript
// TODO: Broadcast festival activation event via Socket.IO
// TODO: Implement theme application logic
```
**Impact:** Festival features non-functional
**Fix Strategy:** Implement Socket.IO broadcasts and theme switching

### Category 3: AI Moderation (Implicit - Not in TODOs but CRITICAL)
**Files:** Missing implementations
```typescript
// NEEDED: Real NSFW detection (currently stub)
// NEEDED: Age estimation (currently stub)
// NEEDED: Profanity detection (currently stub)
```
**Impact:** Content moderation not working
**Fix Strategy:** Integrate AWS Rekognition OR implement lightweight ML models

### Category 4: Email/SMS (Implicit)
**Pattern:** Email/SMS services exist but may need real provider integration
**Fix Strategy:** Verify Resend/Twilio integration and test actual sends

---

## 📋 EXECUTION PLAN (Prioritized)

### STEP A: Repo Health & Types (Est: 6-8 hours)
**PR #1: Fix Backend Type System**
- [ ] Create `backend/src/types/express.d.ts` with custom Request interface
- [ ] Fix all arithmetic type issues in `simulations.ts` (add type guards)
- [ ] Fix crypto API usage in `enhancedSecurity.ts`
- [ ] Rename model property conflicts (e.g., `model` → `forecastModel`)
- [ ] Install missing packages: `npm i base32-encode base32-decode`
- [ ] **Deliverable:** `pnpm -w typecheck` passes for backend
- [ ] **Test Command:** `cd backend && npx tsc --noEmit`

**PR #2: Implement Missing Service Methods**
- [ ] Add missing methods to `AdvancedAnalyticsService`
- [ ] Add missing methods to `AdvancedFraudDetectionService`
- [ ] Add missing methods to `AdvancedGiftEconomyService`
- [ ] Fix method signature mismatches
- [ ] **Deliverable:** All route handlers have valid service calls
- [ ] **Test Command:** `cd backend && npx tsc --noEmit && pnpm test:unit`

**PR #3: Fix Admin Dashboard Types**
- [ ] Install: `cd admin && pnpm add swr chart.js react-chartjs-2 lucide-react`
- [ ] Initialize shadcn/ui: `npx shadcn-ui@latest init`
- [ ] Add missing components: `npx shadcn-ui@latest add card badge button input select tabs alert`
- [ ] Create shared types or use API-only approach
- [ ] Fix User type usage (`role` → `roles`)
- [ ] **Deliverable:** `cd admin && npx tsc --noEmit` passes
- [ ] **Test Command:** `cd admin && pnpm build`

---

### STEP B: TODO Crusher (Est: 12-16 hours)
**PR #4: Implement Real AI Moderation**
- [ ] Choose approach: (A) AWS Rekognition SDK or (B) Python ML microservice
- [ ] Create `ai-engine/src/services/nsfw-detection.ts` with real implementation
- [ ] Create `ai-engine/src/services/age-estimation.ts` with real implementation
- [ ] Create `ai-engine/src/services/profanity-detection.ts` (audio transcription + keyword)
- [ ] Add unit tests for each service
- [ ] **Deliverable:** Working moderation pipeline
- [ ] **Test Command:** `cd ai-engine && pnpm test && curl localhost:5020/api/moderate-image -X POST`

**PR #5: Complete Analytics Implementations**
- [ ] Implement all 30 TODO analytics calculations in `dailyRollup.ts`
- [ ] Add MongoDB aggregation pipelines for each metric
- [ ] Add indexes for query performance
- [ ] Update scheduler jobs to use real calculations
- [ ] **Deliverable:** Analytics dashboard shows real data
- [ ] **Test Command:** Seed data → run rollup → verify metrics

**PR #6: Email/SMS & Moderation Actions**
- [ ] Verify Resend/AWS SES integration for emails
- [ ] Verify Twilio integration for SMS
- [ ] Implement templated emails (verify, reset, payout)
- [ ] Implement moderation action queue with admin UI
- [ ] Add S3 cleanup background job
- [ ] **Deliverable:** Working communication system
- [ ] **Test Command:** Trigger email → verify receipt

---

### STEP C: Payments & Economy (Est: 8-10 hours)
**PR #7: Stripe Integration**
- [ ] Create 5 coin package tiers with Stripe Product/Price IDs
- [ ] Implement idempotent webhook handler with HMAC verification
- [ ] Add double-entry ledger transaction creation
- [ ] Add unit tests for webhook idempotency
- [ ] **Deliverable:** Working Stripe checkout flow
- [ ] **Test Command:** Stripe CLI webhook test + unit tests
- [ ] **Proof:** Postman collection + Stripe dashboard screenshot

**PR #8: IAP Receipt Verification**
- [ ] Implement Apple App Store receipt verification endpoint
- [ ] Implement Google Play receipt verification endpoint
- [ ] Add replay attack protection (transaction ID tracking)
- [ ] Add fraud detection for receipt tampering
- [ ] **Deliverable:** Working IAP verification
- [ ] **Test Command:** Sandbox receipt → verify → check coin balance
- [ ] **Proof:** Test receipts from Expo + verification logs

---

### STEP D: Realtime & Games (Est: 6-8 hours)
**PR #9: Socket.IO Redis Adapter**
- [ ] Install `@socket.io/redis-adapter`
- [ ] Configure Redis pub/sub for multi-instance fanout
- [ ] Add room management helpers
- [ ] Add backpressure handling
- [ ] **Deliverable:** Multi-instance Socket.IO working
- [ ] **Test Command:** 2 server instances + 100 concurrent connections
- [ ] **Proof:** Latency measurements (p50/p95)

**PR #10: Advanced Games Optimization**
- [ ] Move CPU-intensive game logic to worker threads if needed
- [ ] Add rate limiting on socket emits
- [ ] Add game state persistence
- [ ] **Deliverable:** Games run smoothly under load
- [ ] **Test Command:** Simulated 50-player game

---

### STEP E: Admin Web (Est: 6-8 hours)
**PR #11: Admin Dashboard Complete**
- [ ] Implement secure auth with httpOnly cookies
- [ ] Add 2FA for admin users (TOTP)
- [ ] Build pages: user search, KYC approval, payout queue, moderation queue
- [ ] Add security dashboard page
- [ ] Add feature toggle management
- [ ] **Deliverable:** Fully functional admin dashboard
- [ ] **Test Command:** `cd admin && npx playwright test`
- [ ] **Proof:** Playwright test screenshots

---

### STEP F: Mobile App (Est: 10-12 hours)
**PR #12: Mobile App Complete**
- [ ] Wire all screens to backend APIs
- [ ] Implement deep linking
- [ ] Implement push notifications
- [ ] Implement IAP purchase flows (iOS/Android)
- [ ] Add legal pages (privacy, terms)
- [ ] Configure EAS build profiles
- [ ] **Deliverable:** Store-ready mobile app
- [ ] **Test Command:** `cd apps/halobuzz-mobile && detox test` OR manual Expo Go testing
- [ ] **Proof:** EAS build artifacts + test videos

---

### STEP G: Security Hardening (Est: 4-6 hours)
**PR #13: Security Hardening**
- [ ] Verify Helmet/CSP configuration
- [ ] Add strict CORS rules
- [ ] Add input validation on all endpoints
- [ ] Add rate limiting on auth/search/payment
- [ ] Verify HMAC webhook signatures
- [ ] Add JWT rotation
- [ ] Run npm audit and patch vulnerabilities
- [ ] Run OWASP ZAP baseline scan
- [ ] **Deliverable:** Security hardening complete
- [ ] **Test Command:** `npm audit` + `zap-baseline.py`
- [ ] **Proof:** `reports/security-scan-results.json`

---

### STEP H: Load & Soak (Est: 4-6 hours)
**PR #14: Load Testing**
- [ ] Write k6 API load test (300 RPS target)
- [ ] Write k6 Socket.IO soak test (2k connections)
- [ ] Add DB profiling and indexes
- [ ] Generate performance reports
- [ ] **Deliverable:** Load test results meeting SLOs
- [ ] **Test Command:** `k6 run tests/load/api-load.js`
- [ ] **Proof:** `reports/load-test-results.html`

---

### STEP I: CI/CD & Deploy (Est: 6-8 hours)
**PR #15: CI/CD Pipeline**
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add stages: install → typecheck → lint → unit → integration → build → e2e → deploy
- [ ] Add deployment to Railway/Vercel
- [ ] Add smoke tests post-deploy
- [ ] Add rollback workflow
- [ ] **Deliverable:** Green CI/CD pipeline
- [ ] **Test Command:** Push to main → monitor GitHub Actions
- [ ] **Proof:** GitHub Actions run URL + logs

---

### STEP J: Docs & Handover (Est: 4-6 hours)
**PR #16: Documentation**
- [ ] Write `QUICK_START.md`
- [ ] Write `DEPLOYMENT_RUNBOOK.md`
- [ ] Write `ENV_SETUP_GUIDE.md`
- [ ] Write `QA_REPORT.md`
- [ ] Write `SECURITY_NOTES.md`
- [ ] Write `ACCEPTANCE_MATRIX.md`
- [ ] **Deliverable:** Complete handover docs
- [ ] **Proof:** All docs in `/docs` directory

---

## 🎯 ACCEPTANCE CRITERIA MAPPING

| Criterion | Target | Test Method | Proof Artifact |
|-----------|--------|-------------|----------------|
| **Zero TS Errors** | 0 across all packages | `pnpm -w typecheck` | Build logs in `/reports` |
| **Zero ESLint Errors** | 0 across all packages | `pnpm -w lint` | Lint logs in `/reports` |
| **All TODOs Resolved** | 49 → 0 | Code review + grep | Git diff + commit messages |
| **AI Moderation Working** | NSFW/Age/Profanity | Unit tests + manual | Test outputs + screenshots |
| **Payments Working** | Stripe + IAP | Test purchases | Transaction IDs + receipts |
| **Realtime Working** | Redis adapter | Load test | Latency metrics |
| **Security Hardened** | No criticals | ZAP + audit | Security reports |
| **Tests Passing** | ≥90% pass rate | Jest + Playwright | Coverage reports |
| **Load SLO Met** | 300 RPS, <500ms p95 | k6 | Performance charts |
| **Mobile Store-Ready** | Builds produced | EAS | Build URLs |
| **Docs Complete** | All runbooks | Manual review | Doc files committed |

---

## 📊 ESTIMATED TIMELINE

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Step A (Types) | 6-8h | 8h |
| Step B (TODOs) | 12-16h | 24h |
| Step C (Payments) | 8-10h | 34h |
| Step D (Realtime) | 6-8h | 42h |
| Step E (Admin) | 6-8h | 50h |
| Step F (Mobile) | 10-12h | 62h |
| Step G (Security) | 4-6h | 68h |
| Step H (Load) | 4-6h | 74h |
| Step I (CI/CD) | 6-8h | 82h |
| Step J (Docs) | 4-6h | 88h |
| **TOTAL** | **66-88 hours** | **~2-3 weeks** |

---

## 🚦 READINESS STATUS

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| Backend Types | ❌ 201 errors | ✅ 0 errors | -201 |
| Admin Types | ❌ 37 errors | ✅ 0 errors | -37 |
| AI Moderation | ⚠️ Stubs | ✅ Real impl | Implementation |
| Payments | ⚠️ Partial | ✅ Complete | Idempotency + IAP |
| Realtime | ⚠️ Single instance | ✅ Multi-instance | Redis adapter |
| Tests | ⚠️ Incomplete | ✅ 90% coverage | Test impl |
| Docs | ⚠️ Partial | ✅ Complete | Runbooks |

---

**Next Action:** Begin STEP A - PR #1 (Fix Backend Type System)
