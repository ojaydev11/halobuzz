# Fix Plan - HaloBuzz Remediation Strategy

## Executive Summary
- **Current State**: 510 TypeScript errors blocking development
- **Target State**: Green builds with core flows runnable
- **Approach**: Minimal-risk, surgical fixes preserving security
- **Timeline**: 4 weeks to production readiness
- **Priority**: TypeScript health → Runtime contracts → Security → Seeds → Tests

## Fix Strategy Overview

### **Core Principles**
1. **Preserve Security**: No relaxation of security controls
2. **Additive Changes**: Prefer new types/helpers over removing strictness
3. **Surgical Edits**: Small, scoped changes with clear comments
4. **Reversible**: All changes must be easily reversible
5. **Local Only**: No git pushes or remote changes

## Phase 1: TypeScript Health (Week 1)

### **1.1 Logger Unification** 
**Why**: Multiple logger imports causing type mismatches
**What**: Create canonical logger singleton
**How**: 
- Create `src/utils/logger.ts` with singleton pattern
- Update all imports to use canonical logger
- Remove duplicate logger definitions

**Files**: 
- `src/utils/logger.ts` (new)
- All service files with logger imports
- `src/middleware/*.ts`

**Complexity**: Small (S)

### **1.2 AIModelManager Interface**
**Why**: Missing `generateText` method causing interface errors
**What**: Define complete AIModelManager interface
**How**:
- Create `patch/types/ai-models.ts` with complete interface
- Add stub implementations calling existing providers
- Update service imports

**Files**:
- `patch/types/ai-models.ts` (new)
- `src/services/ai/*.ts`
- `ai-engine/src/utils/ai-models.ts`

**Complexity**: Small (S)

### **1.3 Model Shape Mismatches**
**Why**: Duplicate `coins` number vs object causing type conflicts
**What**: Create unified coins type system
**How**:
- Create `patch/types/coins.ts` with proper coin structure
- Update User model to use unified coin type
- Add type guards for optional properties

**Files**:
- `patch/types/coins.ts` (new)
- `src/models/User.ts`
- `src/services/wallet/*.ts`

**Complexity**: Medium (M)

### **1.4 ExactOptionalPropertyTypes**
**Why**: Strict optional property checking causing errors
**What**: Add proper guards and defaults
**How**:
- Add type guards for optional properties
- Provide default values where appropriate
- Never disable strictness

**Files**:
- All model files with optional properties
- Service files accessing optional properties

**Complexity**: Medium (M)

### **1.5 Express Route Handler Types**
**Why**: Explicit `: void` annotations causing type issues
**What**: Let Express infer return types
**How**:
- Remove explicit `: void` annotations
- Let Express infer handler return types
- Update middleware signatures

**Files**:
- `src/routes/*.ts`
- `src/middleware/*.ts`

**Complexity**: Small (S)

## Phase 2: Runtime Contracts (Week 1-2)

### **2.1 Socket.IO Event Alignment**
**Why**: Event payload types not aligned between emitters and listeners
**What**: Create shared event type definitions
**How**:
- Create `patch/types/events.ts` with canonical event types
- Update socket emitters and listeners
- Ensure type safety across client/server

**Files**:
- `patch/types/events.ts` (new)
- `backend/src/config/socket.ts`
- `mobile/src/services/socketService.ts`

**Complexity**: Medium (M)

### **2.2 Cron Job Configuration**
**Why**: TZ and OG bonus logic needs validation
**What**: Ensure Australia/Sydney TZ and correct bonus calculation
**How**:
- Verify cron TZ configuration
- Validate OG bonus formula: `floor(priceCoins * 0.6 / durationDays)`
- Add timezone validation

**Files**:
- `src/cron/ogDailyBonus.ts`
- `src/cron/*.ts`

**Complexity**: Small (S)

### **2.3 Redis/Socket.IO Integration**
**Why**: Undefined `redisClient` and `io` variables
**What**: Properly import and configure Redis and Socket.IO
**How**:
- Import Redis client from config
- Import Socket.IO instance from config
- Add proper error handling

**Files**:
- All services using `redisClient` or `io`
- `src/config/redis.ts`
- `src/config/socket.ts`

**Complexity**: Medium (M)

## Phase 3: Security Preservation (Week 2)

### **3.1 Security Middleware Validation**
**Why**: Ensure security controls remain intact
**What**: Verify all security middleware is working
**How**:
- Test Helmet/CORS/rate-limits/CSRF/2FA
- Validate payment HMAC + idempotency
- Ensure AI `x-ai-secret` requirements

**Files**:
- `src/middleware/security.ts`
- `src/middleware/auth.ts`
- `ai-engine/src/middleware/security.ts`

**Complexity**: Small (S)

### **3.2 Payment Security**
**Why**: Ensure payment security remains enforced
**What**: Validate webhook security and fraud detection
**How**:
- Test HMAC verification
- Validate idempotency keys
- Ensure fraud detection is active

**Files**:
- `src/services/PaymentService.ts`
- `src/services/PaymentFraudService.ts`
- `src/routes/wallet.ts`

**Complexity**: Small (S)

## Phase 4: Seeds & Pricing (Week 2)

### **4.1 OG Bonus Formula Validation**
**Why**: Ensure correct daily bonus calculation
**What**: Validate formula implementation
**How**:
- Test formula: `floor(priceCoins * 0.6 / durationDays)`
- Validate cron job execution
- Ensure proper coin distribution

**Files**:
- `src/cron/ogDailyBonus.ts`
- `scripts/seeds/og-tiers.ts`

**Complexity**: Small (S)

### **4.2 NP Price Guard**
**Why**: Ensure NPR 10 = 500 coins exchange rate
**What**: Validate pricing logic
**How**:
- Test exchange rate calculation
- Validate country-specific pricing
- Ensure proper tax calculation

**Files**:
- `scripts/seeds/pricing.ts`
- `src/services/PricingService.ts`

**Complexity**: Small (S)

## Phase 5: Tests & Smoke (Week 3)

### **5.1 Minimal Test Suite**
**Why**: Add basic tests to validate fixes
**What**: Create essential tests
**How**:
- Test OG bonus formula
- Test NP price guard
- Test sample route type checking

**Files**:
- `src/__tests__/og-bonus.test.ts` (new)
- `src/__tests__/pricing.test.ts` (new)
- `src/__tests__/routes.test.ts` (new)

**Complexity**: Medium (M)

### **5.2 Postman Environment**
**Why**: Ensure API testing is ready
**What**: Validate Postman collection
**How**:
- Verify `{{token}}`, `{{streamId}}`, `{{giftId}}` variables
- Ensure `X-AI-Secret` header usage
- Test critical API endpoints

**Files**:
- `docs/postman/HaloBuzz_Local.postman_environment.json`
- `docs/postman/HaloBuzz_Local_API.postman_collection.json`

**Complexity**: Small (S)

## Implementation Order

### **Day 1-2: TypeScript Foundation**
1. Logger unification
2. AIModelManager interface
3. Express route handler types

### **Day 3-4: Model Fixes**
1. Coins type system
2. ExactOptionalPropertyTypes guards
3. Model method implementations

### **Day 5-7: Runtime Integration**
1. Socket.IO event alignment
2. Redis/Socket.IO integration
3. Cron job validation

### **Week 2: Security & Business Logic**
1. Security middleware validation
2. Payment security verification
3. OG bonus formula validation
4. NP price guard testing

### **Week 3: Testing & Validation**
1. Minimal test suite
2. Postman environment validation
3. Smoke testing

### **Week 4: Production Readiness**
1. Final TypeScript cleanup
2. Performance optimization
3. Documentation updates

## Risk Mitigation

### **High-Risk Changes**
- **Model Schema Changes**: Test thoroughly, backup data
- **Payment Logic**: Validate with test transactions
- **Security Middleware**: Test all security controls

### **Medium-Risk Changes**
- **Type System Changes**: Incremental updates
- **Socket.IO Events**: Test real-time functionality
- **Cron Jobs**: Validate timing and execution

### **Low-Risk Changes**
- **Logger Unification**: Simple import changes
- **Route Handler Types**: Type-only changes
- **Test Additions**: Additive only

## Success Criteria

### **Week 1 Targets**
- [ ] TypeScript errors reduced from 510 to <100
- [ ] Logger unification complete
- [ ] AIModelManager interface defined
- [ ] Basic model fixes applied

### **Week 2 Targets**
- [ ] TypeScript errors reduced to <50
- [ ] Runtime contracts aligned
- [ ] Security validation complete
- [ ] Business logic validated

### **Week 3 Targets**
- [ ] TypeScript errors reduced to <20
- [ ] Test suite operational
- [ ] Postman validation complete
- [ ] Smoke tests passing

### **Week 4 Targets**
- [ ] TypeScript errors: 0
- [ ] All tests passing
- [ ] Production deployment ready
- [ ] Documentation updated

## Rollback Plan

### **If Critical Issues Arise**
1. **Immediate**: Revert to last known good state
2. **Assessment**: Identify root cause
3. **Fix**: Apply targeted fix
4. **Validation**: Test thoroughly before proceeding

### **Backup Strategy**
- All changes in `patch/` directory
- Git commits for each major change
- Database backups before model changes
- Configuration backups before security changes

## Monitoring & Validation

### **Build Health**
- Daily TypeScript error count tracking
- Test pass/fail monitoring
- Performance regression detection

### **Security Validation**
- Security middleware testing
- Payment security verification
- Authentication flow validation

### **Business Logic Validation**
- OG bonus calculation testing
- Pricing formula validation
- Exchange rate verification

---

*Fix plan generated: $(date)*
*Total phases: 5*
*Estimated timeline: 4 weeks*
*Risk level: Minimal (with proper validation)*
