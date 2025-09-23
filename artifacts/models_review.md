# HaloBuzz Data Models & Database Review

## Model-by-Model Analysis

### ✅ User Model (`backend/src/models/User.ts`)
**Production Readiness**: 8/10

**Proper Implementation**:
- ✅ Comprehensive user schema with authentication fields
- ✅ Social login support (Google, Facebook, Apple)
- ✅ KYC and age verification fields
- ✅ OG tier integration with proper references
- ✅ Coins wallet structure (balance, bonusBalance, totalEarned, totalSpent)
- ✅ Trust scoring and reputation system
- ✅ Ban/suspension capabilities with audit fields

**Missing Indexes**:
- ❌ **Critical**: No compound index for login queries (`email + status + banned`)
- ❌ **Performance**: Missing index on `phoneNumber` field
- ❌ **Security**: No index on `lastLoginAt` for session management
- ❌ **Moderation**: No index on `bannedUntil` for temporary bans

**Recommended Indexes**:
```javascript
// High Priority - Authentication Performance
userSchema.index({ email: 1, status: 1, banned: 1 });
userSchema.index({ username: 1, status: 1, banned: 1 });
userSchema.index({ phoneNumber: 1 }, { sparse: true });

// Medium Priority - Analytics & Moderation
userSchema.index({ lastLoginAt: 1 });
userSchema.index({ bannedUntil: 1 }, { sparse: true });
userSchema.index({ "location.country": 1, status: 1 });
```

### ❌ Transaction Model (`backend/src/models/Transaction.ts`)
**Production Readiness**: 5/10 - **CRITICAL ISSUES**

**Critical Problems**:
- ❌ **No atomic transaction support** - Risk of data corruption
- ❌ **Missing compound indexes** for financial queries
- ❌ **No TTL for failed transactions** - Database bloat
- ❌ **Insufficient validation** on amount fields

**Missing Indexes**:
```javascript
// CRITICAL - Financial integrity
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });
transactionSchema.index({ "metadata.orderId": 1 }, { sparse: true, unique: true });

// Performance - Balance calculations
transactionSchema.index({ userId: 1, type: 1, status: 1 });
transactionSchema.index({ status: 1, createdAt: 1 }); // For cleanup jobs
```

**Required TTL**:
```javascript
// Failed transactions cleanup after 30 days
transactionSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { status: 'failed' }
  }
);
```

### ✅ LiveStream Model (`backend/src/models/LiveStream.ts`)
**Production Readiness**: 7/10

**Good Implementation**:
- ✅ Comprehensive streaming metadata
- ✅ Analytics fields (viewerRetention, engagementRate)
- ✅ Proper status management
- ✅ Anonymous entry support

**Missing Performance Indexes**:
```javascript
// Discovery & Ranking - CRITICAL for performance
liveStreamSchema.index({
  status: 1,
  category: 1,
  "location.country": 1,
  currentViewers: -1
});

// Trending streams
liveStreamSchema.index({
  status: 1,
  totalGiftsValue: -1,
  currentViewers: -1
});

// User's streams
liveStreamSchema.index({ hostId: 1, status: 1, createdAt: -1 });
```

### ⚠️ Message Model (`backend/src/models/Message.ts`)
**Production Readiness**: 6/10

**Good TTL Implementation**:
- ✅ **Proper TTL**: 30-day expiration for regular messages
- ✅ **Conditional TTL**: Pinned messages don't expire

**Missing Indexes**:
```javascript
// Chat performance - CRITICAL
messageSchema.index({
  conversationId: 1,
  createdAt: -1
});

// Moderation queries
messageSchema.index({
  senderId: 1,
  createdAt: -1
});

// Pinned messages
messageSchema.index({
  conversationId: 1,
  pinned: 1
}, { sparse: true });
```

### ✅ Gift Model (`backend/src/models/Gift.ts`)
**Production Readiness**: 8/10

**Well Structured**:
- ✅ Proper categorization and rarity system
- ✅ Pricing and effects configuration
- ✅ Battle boost multipliers

**Performance Optimization Needed**:
```javascript
// Gift catalog queries
giftSchema.index({ category: 1, rarity: 1, active: 1 });
giftSchema.index({ priceInCoins: 1, active: 1 });

// Battle boosts
giftSchema.index({ "battleEffects.multiplier": 1 }, { sparse: true });
```

### ✅ Game Model (`backend/src/models/Game.ts`)
**Production Readiness**: 9/10

**Excellent Implementation**:
- ✅ Comprehensive game configuration
- ✅ Fraud controls (house edge, RTP targeting)
- ✅ Proper validation and constraints

**Minor Index Optimization**:
```javascript
// Game listing performance
gameSchema.index({ category: 1, active: 1, difficulty: 1 });
gameSchema.index({ minCoins: 1, maxCoins: 1, active: 1 });
```

### ❌ GameRound Model (`backend/src/models/GameRound.ts`)
**Production Readiness**: 4/10 - **NEEDS WORK**

**Critical Issues**:
- ❌ **No TTL for completed rounds** - Will cause database bloat
- ❌ **Missing fraud detection indexes**
- ❌ **No compound indexes for leaderboards**

**Required Fixes**:
```javascript
// TTL for old game rounds (90 days)
gameRoundSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

// Performance indexes
gameRoundSchema.index({ playerId: 1, status: 1, createdAt: -1 });
gameRoundSchema.index({ gameId: 1, status: 1, score: -1 });

// Fraud detection
gameRoundSchema.index({
  playerId: 1,
  createdAt: -1
}); // For velocity checks
```

### ✅ OGTier Model (`backend/src/models/OGTier.ts`)
**Production Readiness**: 8/10

**Good Structure**:
- ✅ Proper tier levels and benefits
- ✅ Pricing configuration
- ✅ Duration management

**Minor Optimization**:
```javascript
// Subscription queries
ogTierSchema.index({ level: 1, active: 1 });
ogTierSchema.index({ priceInCoins: 1, active: 1 });
```

### ⚠️ ModerationFlag Model (`backend/src/models/ModerationFlag.ts`)
**Production Readiness**: 6/10

**Missing Critical Features**:
- ❌ **No TTL for resolved flags** - Administrative overhead
- ❌ **Missing indexes for moderation workflow**

**Required Indexes**:
```javascript
// Moderation workflow
moderationFlagSchema.index({ status: 1, priority: 1, createdAt: 1 });
moderationFlagSchema.index({ moderatorId: 1, status: 1 });
moderationFlagSchema.index({ reportedUserId: 1, status: 1 });

// TTL for resolved flags (6 months retention)
moderationFlagSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 15552000, // 6 months
    partialFilterExpression: { status: 'resolved' }
  }
);
```

### ✅ WebhookEvent Model (`backend/src/models/WebhookEvent.ts`)
**Production Readiness**: 9/10

**Excellent Implementation**:
- ✅ **Perfect TTL**: 7-day retention for webhook events
- ✅ **Proper idempotency**: Unique constraint on webhook_id
- ✅ **Good validation**: Provider and event type constraints

**Minor Addition**:
```javascript
// Performance index for webhook processing
webhookEventSchema.index({ provider: 1, processed: 1, createdAt: -1 });
```

## Critical Missing Indexes Summary

### High Priority (Performance Impact)
1. **User authentication compound index**: `{ email: 1, status: 1, banned: 1 }`
2. **LiveStream discovery index**: `{ status: 1, category: 1, "location.country": 1, currentViewers: -1 }`
3. **Transaction financial queries**: `{ userId: 1, status: 1, createdAt: -1 }`
4. **Message chat performance**: `{ conversationId: 1, createdAt: -1 }`

### Critical Priority (Data Integrity)
1. **Transaction order idempotency**: `{ "metadata.orderId": 1 }` (unique, sparse)
2. **GameRound fraud detection**: `{ playerId: 1, createdAt: -1 }`

## TTL Requirements Assessment

### ✅ Properly Configured TTL
- **Message**: 30 days (with pinned message exception)
- **WebhookEvent**: 7 days

### ❌ Missing TTL (Critical)
- **Transaction**: Failed transactions should expire after 30 days
- **GameRound**: Completed rounds should expire after 90 days
- **ModerationFlag**: Resolved flags should expire after 6 months
- **ReputationEvent**: Old events should expire after 1 year

### 🔧 Recommended TTL Configuration
```javascript
// Add to respective models:

// Failed transactions (30 days)
{ createdAt: 1 }, {
  expireAfterSeconds: 2592000,
  partialFilterExpression: { status: 'failed' }
}

// Completed game rounds (90 days)
{ createdAt: 1 }, { expireAfterSeconds: 7776000 }

// Resolved moderation flags (6 months)
{ updatedAt: 1 }, {
  expireAfterSeconds: 15552000,
  partialFilterExpression: { status: 'resolved' }
}

// Old reputation events (1 year)
{ createdAt: 1 }, { expireAfterSeconds: 31536000 }
```

## Transaction Integrity Assessment

### ❌ Critical Issues
1. **No database transactions**: Gift purchases not atomic
2. **Race conditions**: Multiple users can send gifts simultaneously without protection
3. **Partial failure risk**: Coin deduction without gift delivery possible

### 🔧 Required Fixes
```javascript
// Example: Atomic gift transaction
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Deduct coins from sender
  await User.findByIdAndUpdate(
    senderId,
    { $inc: { "coins.balance": -giftPrice } },
    { session }
  );

  // 2. Create gift transaction
  await Transaction.create([{
    userId: senderId,
    type: 'gift_purchase',
    amount: -giftPrice,
    // ... other fields
  }], { session });

  // 3. Add coins to receiver
  await User.findByIdAndUpdate(
    receiverId,
    { $inc: { "coins.balance": giftValue } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

## Production Readiness Scores

| Model | Score | Critical Issues | Status |
|-------|-------|----------------|--------|
| **User** | 8/10 | Missing auth indexes | 🟡 Good |
| **Transaction** | 5/10 | No atomicity, missing indexes | 🔴 Critical |
| **LiveStream** | 7/10 | Missing discovery indexes | 🟡 Good |
| **Message** | 6/10 | Missing performance indexes | 🟡 Good |
| **Gift** | 8/10 | Minor optimization needed | 🟢 Ready |
| **Game** | 9/10 | Minor indexes missing | 🟢 Ready |
| **GameRound** | 4/10 | No TTL, missing indexes | 🔴 Critical |
| **OGTier** | 8/10 | Minor optimization | 🟢 Ready |
| **ModerationFlag** | 6/10 | No TTL, missing indexes | 🟡 Moderate |
| **WebhookEvent** | 9/10 | Excellent implementation | 🟢 Ready |

## Overall Database Readiness: 6.5/10

**Blockers for Production**:
1. Transaction atomicity implementation
2. Critical performance indexes
3. TTL configuration for data cleanup
4. Race condition protection

**Estimated Fix Time**: 3-5 days for critical issues, 1-2 weeks for full optimization.