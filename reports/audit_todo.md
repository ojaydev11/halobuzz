# HaloBuzz Audit Todo - Build Fixes & Verifications

## Current Status
- **Node Version**: v22.18.0 (Warning: Project requires Node 20.x)
- **Package Manager**: pnpm (both backend and ai-engine)
- **TypeScript Build Status**: ❌ Both backend and ai-engine have build errors

## Backend TypeScript Errors (398 errors in 59 files)

### Critical Issues
1. **Logger Export Mismatch** - Multiple services importing `{ logger }` from config/logger but it's not exported
2. **Missing Service Dependencies** - authService imports non-existent services (emailService, smsService, aiService)
3. **Model Property Mismatches** - Many properties don't exist on model types (viewers, active vs isActive, etc.)
4. **Type Safety Issues** - exactOptionalPropertyTypes causing undefined assignment errors
5. **JWT Token Generation** - Incorrect parameter types for jwt.sign()

### Files with Most Errors
- `src/services/liveStreamService.ts` (26 errors)
- `src/services/nft/NFTMarketplaceService.ts` (28 errors)
- `src/routes/admin.ts` (41 errors)
- `src/services/authService.ts` (14 errors)

## AI Engine TypeScript Errors (81 errors in 10 files)

### Critical Issues
1. **Logger Export Mismatch** - Same issue as backend
2. **Missing Return Statements** - Multiple middleware functions missing return statements
3. **Missing Type Declarations** - @types/jsonwebtoken missing
4. **AI Model Manager** - generateText method doesn't exist on AIModelManager
5. **Duplicate Function Implementations** - analyzeConversationFlow defined twice

### Files with Most Errors
- `src/services/conversation/ConversationAIService.ts` (29 errors)
- `src/services/enhancement/ContentEnhancementService.ts` (21 errors)

## Planned Fixes

### Phase 1: Backend Logger & Core Services
1. Create `backend/src/utils/logger.ts` singleton
2. Fix authService missing dependencies
3. Fix JWT token generation types
4. Update model property names to match schemas

### Phase 2: AI Engine Core
1. Create `ai-engine/src/utils/logger.ts` singleton
2. Add missing @types/jsonwebtoken
3. Fix middleware return statements
4. Fix AI model manager interface

### Phase 3: Model & Type Fixes
1. Update all model property references
2. Fix exactOptionalPropertyTypes issues
3. Add proper type guards and null checks

### Phase 4: Security & Validation
1. Ensure all security middleware remains intact
2. Verify AI secret authentication
3. Test rate limiting and CORS

## Verification Commands
```bash
# Build verification
pnpm -C backend tsc --noEmit
pnpm -C ai-engine tsc --noEmit

# Test verification
pnpm -C backend test
pnpm -C ai-engine test

# Smoke test
./scripts/smoke_local.sh
```