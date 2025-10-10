# Backend Unit Tests

## Overview
Comprehensive unit tests for core HaloBuzz backend services focusing on economy, anti-cheat, tournaments, and matchmaking.

## Test Suites

### 1. Ledger Tests (`ledger.test.ts`)
**Purpose:** Verify double-entry ledger invariants and transaction integrity

**Coverage:**
- ✅ Zero-sum invariant (all debits = all credits)
- ✅ Matching debit/credit entries for stakes and rewards
- ✅ Negative balance prevention
- ✅ Concurrent transaction handling
- ✅ Transaction history tracking
- ✅ Game pool balance calculations
- ✅ Tournament prize distribution
- ✅ Boost multiplier application
- ✅ Audit trail metadata
- ✅ Transaction rollback on error

**Key Assertions:**
```typescript
// Double-entry invariant
expect(totalDebits).toBe(totalCredits);

// No negative balances
await expect(stakeCoins(userId, tooMuch)).rejects.toThrow('Insufficient balance');

// Concurrent safety
expect(finalBalance).toBe(initialBalance - (amount * concurrentOps));
```

### 2. Anti-Cheat Tests (`anti-cheat.test.ts`)
**Purpose:** Validate anti-cheat detection mechanisms

**Coverage:**
- ✅ APM (actions per minute) detection
  - Impossible rates (>6000 APM)
  - Human rates (300-3600 APM)
- ✅ Spam protection (60 actions/sec limit)
- ✅ Accuracy anomaly detection
  - Impossible reaction times (<100ms)
  - Perfect accuracy patterns
- ✅ Win streak analysis
  - Statistical probability calculation
  - Pattern detection
- ✅ Score validation
  - HMAC signature verification
  - Tampering detection
  - Replay prevention
- ✅ Anomaly scoring
  - Composite suspicion calculation
  - Shadow ban triggers
  - Audit trail logging
- ✅ Rate limiting
  - Session creation throttling

**Key Thresholds:**
```typescript
// APM Detection
IMPOSSIBLE_APM = 6000;
HIGH_APM = 3600;
NORMAL_APM = 300;

// Reaction Time
IMPOSSIBLE_REACTION = 100ms;
FAST_REACTION = 200ms;
NORMAL_REACTION = 500-1500ms;

// Spam Protection
MAX_ACTIONS_PER_SECOND = 60;

// Suspicion Scoring
SHADOW_BAN_THRESHOLD = 0.8;
```

### 3. Tournament Tests (`tournaments.test.ts`)
**Purpose:** Ensure tournament integrity and fair play

**Coverage:**
- ✅ Score submission idempotency
  - Duplicate prevention via Redis
  - SessionId-based deduplication
  - Multiple submission handling
- ✅ Prize distribution
  - Top 3 payout (50%, 30%, 20%)
  - Tie-breaking (earlier submission wins)
  - Prize pool limits
  - Single player tournaments
- ✅ Leaderboard caching
  - Redis cache implementation
  - Cache invalidation on new scores
  - TTL management (max 5 min)
- ✅ State management
  - Join restrictions after start
  - Score submission after end
  - Capacity limits
  - Tournament lifecycle

**Redis Keys:**
```
tournament:{id}:submission:{sessionId} -> idempotency check
tournament:{id}:leaderboard -> cached leaderboard
tournament:{id}:entries -> player entries
```

### 4. Matchmaking Tests (`matchmaking.test.ts`)
**Purpose:** Validate fair and efficient player matching

**Coverage:**
- ✅ MMR-based matching
  - Similar MMR pairing (±100 initially)
  - Range expansion over time
  - Priority for closer matches
- ✅ Queue management
  - Separate queues per game/mode
  - Player removal on match
  - Manual queue leave
  - Timeout cleanup (10 min)
  - Queue position tracking
- ✅ Match quality
  - Quality score calculation
  - Minimum quality threshold
  - MMR difference penalties
- ✅ Mode separation
  - Casual vs Ranked isolation
  - MMR ignored in casual
  - Tournament bracket creation
- ✅ Performance
  - 1000 players in <5sec
  - Match queries <100ms

**MMR Ranges:**
```typescript
INITIAL_MMR_RANGE = 100;
MAX_MMR_RANGE = 500;
RANGE_EXPANSION_RATE = 100/minute;
MIN_MATCH_QUALITY = 0.7;
```

## Running Tests

### All Unit Tests
```bash
npm run test:unit
```

### Specific Test Suite
```bash
# Ledger tests
npm test -- ledger.test.ts

# Anti-cheat tests
npm test -- anti-cheat.test.ts

# Tournament tests
npm test -- tournaments.test.ts

# Matchmaking tests
npm test -- matchmaking.test.ts
```

### With Coverage
```bash
npm run test:coverage -- --testPathPattern=unit
```

### Watch Mode
```bash
npm run test:watch -- unit
```

## Test Structure

### Mocking Strategy
```typescript
// Mock Redis
jest.mock('../../lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn()
  }
}));

// Mock Database
jest.mock('../../models', () => ({
  Transaction: {
    create: jest.fn(),
    find: jest.fn()
  }
}));
```

### Common Patterns
```typescript
// Arrange-Act-Assert
it('should do something', async () => {
  // Arrange: Set up test data
  const testData = { ... };
  
  // Act: Execute the operation
  const result = await service.operation(testData);
  
  // Assert: Verify expectations
  expect(result).toBe(expected);
});
```

## Coverage Goals

| Suite | Target | Current |
|-------|--------|---------|
| Ledger | 95% | TBD |
| Anti-Cheat | 90% | TBD |
| Tournaments | 95% | TBD |
| Matchmaking | 90% | TBD |

**Overall Target:** 90%+ coverage for critical business logic

## CI Integration

### GitHub Actions
```yaml
name: Unit Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Key Invariants Tested

### Ledger
1. **Zero-Sum:** `Σ debits = Σ credits`
2. **No Negatives:** `balance ≥ 0` always
3. **Atomicity:** All or nothing for multi-entry transactions

### Anti-Cheat
1. **Human Limits:** APM < 6000, reaction > 100ms
2. **Statistical:** Win streaks within probability bounds
3. **Cryptographic:** Valid HMAC for all scores

### Tournaments
1. **Idempotency:** Same sessionId → same result
2. **Conservation:** `Σ prizes = entry fees × players`
3. **Ordering:** Tie-breaking by timestamp (earlier wins)

### Matchmaking
1. **Fairness:** MMR difference minimized
2. **Isolation:** Modes don't cross-match
3. **Performance:** O(log n) for match queries

## Debugging Failed Tests

### Ledger Failures
```bash
# Check transaction logs
npm test -- ledger.test.ts --verbose

# Common issues:
# - Race conditions in concurrent tests
# - Mock data not reset between tests
# - Floating point precision in currency
```

### Anti-Cheat Failures
```bash
# Check detection thresholds
npm test -- anti-cheat.test.ts --verbose

# Common issues:
# - Timing-sensitive tests (use jest.useFakeTimers)
# - Threshold tuning needed
# - Crypto library mock issues
```

### Tournament Failures
```bash
# Check Redis mock
npm test -- tournaments.test.ts --verbose

# Common issues:
# - Redis key collisions
# - Cache not invalidated
# - Time-based tests (freeze time with jest)
```

### Matchmaking Failures
```bash
# Check queue state
npm test -- matchmaking.test.ts --verbose

# Common issues:
# - Queue not cleared between tests
# - MMR range calculation errors
# - Async race conditions
```

## Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Reset mocks and state in `beforeEach`
3. **Realistic Data:** Use production-like test data
4. **Edge Cases:** Test boundaries and error paths
5. **Performance:** Keep tests fast (<100ms each)

## Future Enhancements

- [ ] Property-based testing (fast-check)
- [ ] Mutation testing (Stryker)
- [ ] Performance regression tests
- [ ] Chaos testing for Redis failures
- [ ] Fuzz testing for input validation

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TDD Guide](https://kentcdodds.com/blog/write-tests)

