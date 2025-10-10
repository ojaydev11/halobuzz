# HaloBuzz Telemetry & Analytics Dashboards

## 📊 Overview
Comprehensive analytics setup for tracking game performance, user behavior, and business metrics.

---

## 🛠️ Tech Stack

- **Analytics**: PostHog (product analytics, session replay)
- **APM**: Sentry (errors, performance monitoring)
- **Logs**: Logtail/Papertrail (centralized logging)
- **Metrics**: Prometheus + Grafana (system metrics)

---

## 📈 PostHog Dashboards

### 1. Games Performance Dashboard

**Purpose:** Monitor game health and player engagement

#### Metrics Tracked

**Per-Game Funnel:**
```javascript
// Event sequence
1. game_opened
2. game_started
3. game_completed
4. coins_rewarded

// Conversion rates
- Start Rate: (game_started / game_opened) * 100
- Completion Rate: (game_completed / game_started) * 100
- Monetization Rate: (coins_rewarded / game_completed) * 100
```

**Game-Specific Events:**

**CoinFlipDeluxe:**
- `coinflip_side_selected` (heads/tails)
- `coinflip_animation_complete`
- `coinflip_result` (win/loss)
- `coinflip_stake_changed`

**TapDuel:**
- `tapduel_mode_selected` (solo/multiplayer)
- `tapduel_reaction_time` (ms)
- `tapduel_personal_best`
- `tapduel_multiplayer_matched`

**BuzzRunner:**
- `runner_obstacle_hit`
- `runner_powerup_collected`
- `runner_distance_milestone`
- `runner_high_score`

**TriviaRoyale:**
- `trivia_category_selected`
- `trivia_question_answered` (correct/incorrect)
- `trivia_match_found`
- `trivia_rank_achieved`

**StackStorm:**
- `stack_block_placed`
- `stack_perfect_placement`
- `stack_combo_achieved`
- `stack_tower_collapsed`

**BuzzArena:**
- `arena_matchmaking_started`
- `arena_match_found`
- `arena_mmr_updated`
- `arena_season_reward`

#### PostHog Dashboard Config

```javascript
// dashboards/games-performance.json
{
  "name": "Games Performance",
  "description": "Track game engagement and player behavior",
  "tiles": [
    {
      "name": "Daily Active Games",
      "type": "TRENDS",
      "filters": {
        "events": [
          { "id": "game_started", "name": "Game Started" }
        ],
        "breakdown": ["game_id"],
        "date_from": "-30d"
      }
    },
    {
      "name": "Game Completion Funnel",
      "type": "FUNNEL",
      "filters": {
        "events": [
          { "id": "game_opened", "order": 0 },
          { "id": "game_started", "order": 1 },
          { "id": "game_completed", "order": 2 }
        ],
        "breakdown": ["game_id"]
      }
    },
    {
      "name": "Average Session Duration",
      "type": "TRENDS",
      "filters": {
        "events": [
          { 
            "id": "game_completed",
            "math": "avg",
            "math_property": "session_duration_ms"
          }
        ],
        "breakdown": ["game_id"]
      }
    },
    {
      "name": "Rage Quits",
      "type": "TRENDS",
      "filters": {
        "events": [
          { "id": "game_abandoned" }
        ],
        "properties": [
          {
            "key": "abandonment_reason",
            "value": ["rage_quit", "too_difficult"],
            "operator": "exact"
          }
        ],
        "breakdown": ["game_id"]
      }
    }
  ]
}
```

### 2. Economy Dashboard

**Purpose:** Monitor coin flow, tournament health, and monetization

#### Key Metrics

**Coin Economy:**
- Total coins in circulation
- Coins staked (last 24h)
- Coins rewarded (last 24h)
- Net coin flow (staked - rewarded)
- Average stake per game

**Tournaments:**
- Active tournaments
- Total prize pools
- Players per tournament (avg)
- Tournament completion rate
- Prize distribution accuracy

**Boosts:**
- Active boost users (%)
- Boost revenue (last 7d)
- Boost conversion rate
- Average boost duration

#### Event Tracking

```javascript
// Economy events
posthog.capture('coins_staked', {
  game_id: 'coin-flip-deluxe',
  amount: 100,
  user_balance_before: 500,
  user_balance_after: 400
});

posthog.capture('coins_rewarded', {
  game_id: 'coin-flip-deluxe',
  amount: 200,
  reason: 'game_win',
  multiplier: 2.0
});

posthog.capture('tournament_joined', {
  tournament_id: 'weekend-warrior',
  entry_fee: 100,
  prize_pool: 10000,
  player_count: 50
});

posthog.capture('boost_activated', {
  boost_type: '2x_coins',
  duration_minutes: 60,
  cost: 500
});
```

### 3. Performance Dashboard

**Purpose:** Track technical performance and user experience

#### Metrics

**FPS Distribution:**
```javascript
posthog.capture('fps_bucket', {
  game_id: 'buzz-arena',
  bucket: '55-59', // '60', '55-59', '45-54', '30-44', '<30'
  device_model: 'Pixel 5',
  os_version: 'Android 12'
});

// Weekly aggregation
SELECT 
  game_id,
  bucket,
  COUNT(*) as count,
  (COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY game_id)) * 100 as percentage
FROM fps_events
WHERE timestamp > NOW() - INTERVAL 7 DAY
GROUP BY game_id, bucket
ORDER BY game_id, bucket DESC;
```

**Memory Usage:**
```javascript
posthog.capture('memory_budget_exceeded', {
  game_id: 'stack-storm',
  usage_mb: 280,
  budget_mb: 250,
  device_memory_mb: 4096
});
```

**Load Times:**
```javascript
posthog.capture('game_load_complete', {
  game_id: 'trivia-royale',
  load_time_ms: 2100,
  asset_count: 45,
  bundle_size_mb: 3.2
});
```

**API Latency:**
```javascript
posthog.capture('api_request', {
  endpoint: '/api/v1/games/session/start',
  duration_ms: 85,
  status_code: 200,
  user_location: 'US-West'
});
```

### 4. Anti-Cheat Dashboard

**Purpose:** Monitor suspicious activity and cheat detection

#### Alerts & Metrics

**Suspicion Score Distribution:**
```sql
SELECT 
  user_id,
  AVG(suspicion_score) as avg_suspicion,
  MAX(suspicion_score) as max_suspicion,
  COUNT(*) as flag_count
FROM anti_cheat_events
WHERE timestamp > NOW() - INTERVAL 7 DAY
GROUP BY user_id
HAVING avg_suspicion > 0.7
ORDER BY avg_suspicion DESC;
```

**Cheat Type Breakdown:**
```javascript
posthog.capture('anti_cheat_flag', {
  user_id: 'player123',
  flag_type: 'impossible_apm', // or 'score_tampering', 'impossible_accuracy'
  severity: 0.85,
  game_id: 'tap-duel',
  auto_action: 'shadow_ban'
});
```

**Win Rate Anomalies:**
```sql
SELECT 
  user_id,
  game_id,
  COUNT(*) as games_played,
  SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
  (SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) / COUNT(*)) as win_rate
FROM game_results
WHERE timestamp > NOW() - INTERVAL 7 DAY
GROUP BY user_id, game_id
HAVING win_rate > 0.75 AND games_played > 20
ORDER BY win_rate DESC;
```

### 5. Business Metrics Dashboard

**Purpose:** Track KPIs and revenue

#### Key KPIs

**User Metrics:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- DAU/MAU Ratio (stickiness)
- 7-day retention
- 30-day retention

**Revenue Metrics:**
- Average Revenue Per User (ARPU)
- Lifetime Value (LTV)
- Conversion rate (free → paid)
- Boost purchase rate
- Tournament revenue

**Engagement:**
- Sessions per user (avg)
- Session duration (avg)
- Games per session
- Coins staked per session

---

## 🚨 Sentry Configuration

### Error Tracking

**Setup:**
```javascript
// apps/halobuzz-mobile/App.tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://your-dsn@sentry.io/project-id",
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 1.0,
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  }
});
```

**Custom Error Contexts:**
```javascript
// Game-specific context
Sentry.setContext("game", {
  id: gameId,
  session_id: sessionId,
  entry_fee: entryFee,
  current_score: score
});

// User context
Sentry.setUser({
  id: userId,
  username: username,
  mmr: userMMR,
  coins_balance: balance
});

// Breadcrumbs
Sentry.addBreadcrumb({
  category: "game",
  message: "Player staked 100 coins",
  level: "info",
  data: {
    game_id: "coin-flip-deluxe",
    amount: 100
  }
});
```

### Performance Monitoring

**Backend (Express):**
```javascript
// backend/src/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of requests
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Mongo(),
    new Sentry.Integrations.Redis(),
  ],
});

// Trace middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

**Mobile (React Native):**
```javascript
// Automatic performance tracking
const transaction = Sentry.startTransaction({
  name: "CoinFlipGame",
  op: "game.session"
});

const span = transaction.startChild({
  op: "game.flip",
  description: "Coin flip animation"
});

// ... game logic ...

span.finish();
transaction.finish();
```

---

## 📊 Grafana Dashboards

### System Metrics

**Backend Dashboard:**
```json
{
  "dashboard": {
    "title": "HaloBuzz Backend",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "{{route}}"
          }
        ]
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "socketio_connections_active",
            "legendFormat": "{{namespace}}"
          }
        ]
      },
      {
        "title": "Redis Operations",
        "targets": [
          {
            "expr": "rate(redis_commands_total[5m])",
            "legendFormat": "{{command}}"
          }
        ]
      },
      {
        "title": "MongoDB Queries",
        "targets": [
          {
            "expr": "rate(mongodb_queries_total[5m])",
            "legendFormat": "{{collection}}"
          }
        ]
      }
    ]
  }
}
```

### Alerts

**High Error Rate:**
```yaml
# alerts/backend-errors.yml
groups:
  - name: backend_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} req/s for {{ $labels.route }}"
```

**Slow API Responses:**
```yaml
- alert: SlowAPIResponses
  expr: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m])) > 200
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "API responses are slow"
    description: "P95 latency is {{ $value }}ms for {{ $labels.route }}"
```

**Socket.IO Connection Spike:**
```yaml
- alert: SocketConnectionSpike
  expr: rate(socketio_connections_total[5m]) > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Unusual connection spike"
    description: "Connection rate is {{ $value }} /s"
```

---

## 📝 Event Tracking Guide

### Mobile Implementation

```typescript
// apps/halobuzz-mobile/src/utils/analytics.ts
import posthog from 'posthog-react-native';

export const analytics = {
  // Game events
  gameOpened: (gameId: string) => {
    posthog.capture('game_opened', { game_id: gameId });
  },
  
  gameStarted: (gameId: string, entryFee: number) => {
    posthog.capture('game_started', {
      game_id: gameId,
      entry_fee: entryFee,
      timestamp: Date.now()
    });
  },
  
  gameCompleted: (gameId: string, score: number, sessionDuration: number) => {
    posthog.capture('game_completed', {
      game_id: gameId,
      score,
      session_duration_ms: sessionDuration,
      timestamp: Date.now()
    });
  },
  
  // Economy events
  coinsStaked: (gameId: string, amount: number, balanceBefore: number) => {
    posthog.capture('coins_staked', {
      game_id: gameId,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceBefore - amount
    });
  },
  
  // Performance events
  fpsTracked: (gameId: string, fps: number, deviceModel: string) => {
    const bucket = fps >= 60 ? '60' :
                  fps >= 55 ? '55-59' :
                  fps >= 45 ? '45-54' :
                  fps >= 30 ? '30-44' : '<30';
    
    posthog.capture('fps_bucket', {
      game_id: gameId,
      bucket,
      fps,
      device_model: deviceModel
    });
  }
};
```

### Backend Implementation

```typescript
// backend/src/utils/analytics.ts
import posthog from 'posthog-node';

const client = new posthog.PostHog(
  process.env.POSTHOG_API_KEY!,
  { host: 'https://app.posthog.com' }
);

export const analytics = {
  // Tournament events
  tournamentCreated: (tournamentId: string, prizePool: number) => {
    client.capture({
      distinctId: 'system',
      event: 'tournament_created',
      properties: {
        tournament_id: tournamentId,
        prize_pool: prizePool,
        timestamp: Date.now()
      }
    });
  },
  
  // Anti-cheat events
  suspiciousActivity: (userId: string, flagType: string, severity: number) => {
    client.capture({
      distinctId: userId,
      event: 'anti_cheat_flag',
      properties: {
        flag_type: flagType,
        severity,
        timestamp: Date.now()
      }
    });
  },
  
  // API performance
  apiRequest: (route: string, duration: number, statusCode: number) => {
    client.capture({
      distinctId: 'system',
      event: 'api_request',
      properties: {
        route,
        duration_ms: duration,
        status_code: statusCode,
        timestamp: Date.now()
      }
    });
  }
};
```

---

## 🎯 Key Takeaways

### Critical Dashboards
1. **Games Performance** - Track engagement and completion rates
2. **Economy Dashboard** - Monitor coin flow and tournament health
3. **Performance Dashboard** - Ensure 60 FPS and low latency
4. **Anti-Cheat Dashboard** - Detect and prevent cheating
5. **Business Metrics** - Track KPIs and revenue

### Essential Metrics
- **DAU/MAU Ratio**: >20% (healthy engagement)
- **7-Day Retention**: >40% (strong product-market fit)
- **Game Completion Rate**: >70% (good difficulty balance)
- **Average FPS**: ≥55 (smooth experience)
- **API p95 Latency**: <200ms (fast responses)

### Alert Priorities
- **P0 (Critical)**: Backend down, database offline, high error rate
- **P1 (High)**: Slow API, FPS drops, security breach
- **P2 (Medium)**: High churn, low retention, economy imbalance
- **P3 (Low)**: Minor UI bugs, performance warnings

---

**Status:** Telemetry infrastructure ready for production monitoring.

