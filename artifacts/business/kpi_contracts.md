# HaloBuzz Business AI - KPI Contracts

## 📊 KPI Input/Output Specifications

This document defines the contracts for all KPI calculations, including input parameters, output formats, and example responses.

## 🔧 Core KPI Service

### `getKPIs(filter: KPIFilter): Promise<KPIMetrics>`

**Input Contract:**
```typescript
interface KPIFilter {
  from: Date;           // Start date (ISO8601)
  to: Date;             // End date (ISO8601)
  country?: string;     // Country code or 'ALL'
  granularity?: 'daily' | 'weekly' | 'monthly';
  appId?: string;      // App ID for multi-app support (default: 'halobuzz')
}
```

**Output Contract:**
```typescript
interface KPIMetrics {
  revenue: RevenueKPIs;
  engagement: EngagementKPIs;
  monetization: MonetizationKPIs;
  retention: RetentionKPIs;
  creators: CreatorKPIs;
  safety: SafetyKPIs;
  gaming: GamingKPIs;
}
```

## 💰 Revenue KPIs

### Contract
```typescript
interface RevenueKPIs {
  total: number;                    // Total revenue in NPR
  byPaymentMethod: {
    esewa: number;
    khalti: number;
    stripe: number;
    paypal: number;
  };
  byOGTier: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
    tier5: number;
  };
  giftRevenue: number;             // Revenue from gifts
  coinTopups: number;              // Revenue from coin purchases
  platformFees: number;            // Platform fee revenue
  growth: number;                  // Percentage vs previous period
}
```

### Example Response
```json
{
  "revenue": {
    "total": 125000,
    "byPaymentMethod": {
      "esewa": 45000,
      "khalti": 35000,
      "stripe": 25000,
      "paypal": 20000
    },
    "byOGTier": {
      "tier1": 15000,
      "tier2": 25000,
      "tier3": 35000,
      "tier4": 30000,
      "tier5": 20000
    },
    "giftRevenue": 75000,
    "coinTopups": 40000,
    "platformFees": 10000,
    "growth": 12.5
  }
}
```

### Calculation Logic
- **Total**: Sum of all completed transactions
- **By Payment Method**: Grouped by `paymentMethod` field
- **By OG Tier**: Grouped by `metadata.ogTier` field
- **Growth**: `((current - previous) / previous) * 100`

## 📈 Engagement KPIs

### Contract
```typescript
interface EngagementKPIs {
  dau: number;                     // Daily Active Users
  mau: number;                     // Monthly Active Users
  avgSessionDuration: number;      // Average session in minutes
  avgViewersPerStream: number;     // Average viewers per stream
  totalStreams: number;            // Total streams in period
  totalStreamDuration: number;     // Total duration in minutes
  battleParticipation: number;      // Battle participation count
  giftSent: number;                // Total gifts sent
  messagesSent: number;            // Total messages sent
  growth: number;                  // Percentage vs previous period
}
```

### Example Response
```json
{
  "engagement": {
    "dau": 15000,
    "mau": 45000,
    "avgSessionDuration": 25.5,
    "avgViewersPerStream": 12.3,
    "totalStreams": 2500,
    "totalStreamDuration": 63750,
    "battleParticipation": 850,
    "giftSent": 12500,
    "messagesSent": 45000,
    "growth": 8.3
  }
}
```

### Calculation Logic
- **DAU**: Users with `lastActiveAt` in date range
- **MAU**: Users active in last 30 days
- **Session Duration**: Average of `duration` field from streams
- **Viewers Per Stream**: Average of `totalViewers` field

## 💳 Monetization KPIs

### Contract
```typescript
interface MonetizationKPIs {
  arpu: number;                   // Average Revenue Per User
  arppu: number;                  // Average Revenue Per Paying User
  payerRate: number;              // Percentage of users who paid
  avgGiftValue: number;           // Average gift value in coins
  coinTopupVolume: number;        // Total coin topup volume
  ogConversionRate: number;       // OG tier conversion rate
  growth: number;                 // Percentage vs previous period
}
```

### Example Response
```json
{
  "monetization": {
    "arpu": 8.33,
    "arppu": 125.0,
    "payerRate": 6.67,
    "avgGiftValue": 15.5,
    "coinTopupVolume": 40000,
    "ogConversionRate": 2.5,
    "growth": 15.2
  }
}
```

### Calculation Logic
- **ARPU**: `totalRevenue / totalUsers`
- **ARPPU**: `totalRevenue / payingUsers`
- **Payer Rate**: `(payingUsers / totalUsers) * 100`
- **OG Conversion**: `(ogPurchases / totalUsers) * 100`

## 🔄 Retention KPIs

### Contract
```typescript
interface RetentionKPIs {
  d1Retention: number;            // Day 1 retention percentage
  d7Retention: number;            // Day 7 retention percentage
  d30Retention: number;           // Day 30 retention percentage
  churnRate: number;              // Churn rate percentage
  avgLifetimeDays: number;        // Average user lifetime
  churnRiskScore: number;         // Churn risk score (0-100)
}
```

### Example Response
```json
{
  "retention": {
    "d1Retention": 45.2,
    "d7Retention": 28.7,
    "d30Retention": 15.3,
    "churnRate": 12.5,
    "avgLifetimeDays": 18.5,
    "churnRiskScore": 25.0
  }
}
```

### Calculation Logic
- **D1 Retention**: `(users active on day 1 / cohort size) * 100`
- **D7 Retention**: `(users active on day 7 / cohort size) * 100`
- **Churn Rate**: `(churned users / total users) * 100`

## 🎭 Creator KPIs

### Contract
```typescript
interface CreatorKPIs {
  activeHosts: number;            // Number of active hosts
  topHostRevenue: number;         // Revenue of top host
  avgHostRevenue: number;         // Average host revenue
  newHosts: number;              // New hosts in period
  hostRetentionRate: number;      // Host retention percentage
  topCreators: Array<{
    hostId: string;
    username: string;
    revenue: number;
    streams: number;
    viewers: number;
  }>;
}
```

### Example Response
```json
{
  "creators": {
    "activeHosts": 250,
    "topHostRevenue": 5000,
    "avgHostRevenue": 500,
    "newHosts": 45,
    "hostRetentionRate": 78.5,
    "topCreators": [
      {
        "hostId": "507f1f77bcf86cd799439011",
        "username": "topcreator1",
        "revenue": 5000,
        "streams": 25,
        "viewers": 1250
      }
    ]
  }
}
```

### Calculation Logic
- **Active Hosts**: Users who streamed in period
- **Top Host Revenue**: Maximum revenue from single host
- **Host Retention**: `(returning hosts / total hosts) * 100`

## 🛡️ Safety KPIs

### Contract
```typescript
interface SafetyKPIs {
  flaggedContent: number;         // Flagged content count
  bannedUsers: number;            // Banned users count
  appealsProcessed: number;       // Appeals processed count
  moderationActions: number;      // Total moderation actions
  safetyScore: number;            // Safety score (0-100)
  trend: 'improving' | 'stable' | 'declining';
}
```

### Example Response
```json
{
  "safety": {
    "flaggedContent": 25,
    "bannedUsers": 8,
    "appealsProcessed": 12,
    "moderationActions": 33,
    "safetyScore": 87.5,
    "trend": "improving"
  }
}
```

### Calculation Logic
- **Safety Score**: `100 - (flaggedContent * 2) - (bannedUsers * 5)`
- **Trend**: Based on safety score growth over time

## 🎮 Gaming KPIs

### Contract
```typescript
interface GamingKPIs {
  gamesPlayed: number;            // Total games played
  totalStakes: number;            // Total stakes amount
  totalPayouts: number;           // Total payouts amount
  houseEdge: number;              // House edge percentage
  avgGameDuration: number;        // Average game duration
  activePlayers: number;          // Active players count
  revenue: number;                // Gaming revenue
}
```

### Example Response
```json
{
  "gaming": {
    "gamesPlayed": 5000,
    "totalStakes": 75000,
    "totalPayouts": 45000,
    "houseEdge": 40.0,
    "avgGameDuration": 2.5,
    "activePlayers": 1200,
    "revenue": 30000
  }
}
```

### Calculation Logic
- **House Edge**: `((totalStakes - totalPayouts) / totalStakes) * 100`
- **Gaming Revenue**: `totalStakes - totalPayouts`

## 📊 Time Series Data

### Contract
```typescript
interface TimeSeriesData {
  metric: string;                  // Metric name
  filter: KPIFilter;              // Applied filter
  timeSeries: Array<{
    date: Date;                   // Date of measurement
    value: number;                // Metric value
  }>;
  generatedAt: Date;              // Generation timestamp
}
```

### Example Response
```json
{
  "metric": "revenue.total",
  "filter": {
    "from": "2024-01-01T00:00:00.000Z",
    "to": "2024-01-31T23:59:59.999Z",
    "country": "ALL"
  },
  "timeSeries": [
    {
      "date": "2024-01-01T00:00:00.000Z",
      "value": 3500
    },
    {
      "date": "2024-01-02T00:00:00.000Z",
      "value": 4200
    }
  ],
  "generatedAt": "2024-01-31T12:00:00.000Z"
}
```

## 🔮 Forecast Data

### Contract
```typescript
interface ForecastData {
  metric: string;                  // Forecasted metric
  horizonDays: number;             // Forecast horizon
  segments: object;                // Segmentation filters
  prediction: {
    value: number;                 // Predicted value
    confidence: number;             // Confidence (0-100)
    lowerBound: number;            // Lower confidence bound
    upperBound: number;            // Upper confidence bound
    trend: 'up' | 'down' | 'stable';
    seasonality: number;           // Seasonal adjustment
  };
  model: {
    type: string;                  // Model type
    accuracy: number;              // Model accuracy
    lastTrained: Date;             // Last training date
  };
  historical: {
    actualValue: number;           // Actual value (if available)
    previousPeriod: number;        // Previous period value
    growthRate: number;            // Growth rate
    volatility: number;            // Volatility measure
  };
}
```

### Example Response
```json
{
  "metric": "revenue",
  "horizonDays": 30,
  "segments": {"country": "NP"},
  "prediction": {
    "value": 135000,
    "confidence": 85.5,
    "lowerBound": 115000,
    "upperBound": 155000,
    "trend": "up",
    "seasonality": 1.05
  },
  "model": {
    "type": "ewma",
    "accuracy": 78.2,
    "lastTrained": "2024-01-30T02:00:00.000Z"
  },
  "historical": {
    "actualValue": 125000,
    "previousPeriod": 110000,
    "growthRate": 13.6,
    "volatility": 12.3
  }
}
```

## 🚨 Alert Data

### Contract
```typescript
interface AlertData {
  alertId: string;                 // Unique alert identifier
  type: string;                   // Alert type
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;                  // Alert title
  description: string;            // Alert description
  metric: string;                 // Affected metric
  currentValue: number;           // Current metric value
  thresholdValue: number;         // Threshold value
  deviation: number;              // Deviation percentage
  timeWindow: string;             // Time window
  affectedUsers?: number;         // Affected users count
  affectedRevenue?: number;       // Affected revenue amount
  config: {
    threshold: number;            // Alert threshold
    comparisonPeriod: string;      // Comparison period
    notificationChannels: string[]; // Notification channels
    autoResolve: boolean;         // Auto-resolve flag
    escalationLevel: number;      // Escalation level
  };
  notifications: Array<{
    channel: string;              // Notification channel
    sentAt: Date;                 // Sent timestamp
    status: 'sent' | 'failed' | 'delivered';
    response?: string;            // Response data
  }>;
  createdAt: Date;                // Creation timestamp
  updatedAt: Date;                // Last update timestamp
}
```

### Example Response
```json
{
  "alertId": "alert_1234567890",
  "type": "revenue_drop",
  "severity": "high",
  "status": "active",
  "title": "Revenue Drop Detected",
  "description": "Revenue dropped by 18.5% compared to 7-day average",
  "metric": "revenue.total",
  "currentValue": 85000,
  "thresholdValue": 104000,
  "deviation": 18.5,
  "timeWindow": "1day",
  "affectedRevenue": 19000,
  "config": {
    "threshold": 15,
    "comparisonPeriod": "7day_avg",
    "notificationChannels": ["email", "slack"],
    "autoResolve": false,
    "escalationLevel": 1
  },
  "notifications": [
    {
      "channel": "email",
      "sentAt": "2024-01-31T10:15:00.000Z",
      "status": "delivered"
    }
  ],
  "createdAt": "2024-01-31T10:00:00.000Z",
  "updatedAt": "2024-01-31T10:15:00.000Z"
}
```

## 📋 Error Handling

### Error Response Contract
```typescript
interface ErrorResponse {
  success: false;
  error: string;                  // Error message
  code?: string;                  // Error code
  details?: any;                  // Additional error details
  timestamp: Date;                // Error timestamp
}
```

### Example Error Response
```json
{
  "success": false,
  "error": "Invalid date range provided",
  "code": "INVALID_DATE_RANGE",
  "details": {
    "from": "invalid-date",
    "to": "2024-01-31T23:59:59.999Z"
  },
  "timestamp": "2024-01-31T12:00:00.000Z"
}
```

## 🔍 Validation Rules

### Date Range Validation
- `from` must be before `to`
- Maximum range: 365 days
- Minimum range: 1 day
- Dates must be valid ISO8601 format

### Country Validation
- Must be valid ISO country code or 'ALL'
- Supported countries: NP, US, IN, etc.

### Granularity Validation
- Must be one of: 'daily', 'weekly', 'monthly'
- Default: 'daily'

### Metric Validation
- Must be valid metric path (e.g., 'revenue.total', 'engagement.dau')
- Nested metrics must exist in KPI structure

## 🏛️ Empire Dashboard (Multi-App Aggregation)

### Contract
```typescript
interface EmpireDashboardResponse {
  summary: {
    totalApps: number;              // Total number of apps
    totalRevenue: number;            // Aggregated revenue across all apps
    totalDAU: number;               // Aggregated DAU across all apps
    totalMAU: number;               // Aggregated MAU across all apps
    avgARPU: number;                // Average ARPU across all apps
    avgPayerRate: number;          // Average payer rate across all apps
    totalAlerts: number;            // Total alerts across all apps
    activeAlerts: number;           // Active alerts across all apps
    avgSafetyScore: number;         // Average safety score across all apps
    overallGrowthRate: number;      // Overall growth rate
  };
  apps: Array<{
    appId: string;                  // App identifier
    totalRevenue: number;            // App-specific revenue
    totalDAU: number;               // App-specific DAU
    totalMAU: number;               // App-specific MAU
    avgARPU: number;                // App-specific ARPU
    avgPayerRate: number;           // App-specific payer rate
    totalAlerts: number;            // App-specific total alerts
    activeAlerts: number;           // App-specific active alerts
    safetyScore: number;            // App-specific safety score
    growthRate: number;              // App-specific growth rate
  }>;
  period: {
    from: string;                   // Period start date
    to: string;                     // Period end date
  };
  generatedAt: string;              // Generation timestamp
}
```

### Example Response
```json
{
  "summary": {
    "totalApps": 4,
    "totalRevenue": 450000,
    "totalDAU": 25000,
    "totalMAU": 75000,
    "avgARPU": 6.0,
    "avgPayerRate": 8.5,
    "totalAlerts": 12,
    "activeAlerts": 3,
    "avgSafetyScore": 85.2,
    "overallGrowthRate": 15.3
  },
  "apps": [
    {
      "appId": "halobuzz",
      "totalRevenue": 200000,
      "totalDAU": 12000,
      "totalMAU": 35000,
      "avgARPU": 5.7,
      "avgPayerRate": 7.2,
      "totalAlerts": 5,
      "activeAlerts": 1,
      "safetyScore": 88.5,
      "growthRate": 12.5
    },
    {
      "appId": "sewago",
      "totalRevenue": 150000,
      "totalDAU": 8000,
      "totalMAU": 25000,
      "avgARPU": 6.0,
      "avgPayerRate": 9.1,
      "totalAlerts": 4,
      "activeAlerts": 1,
      "safetyScore": 82.0,
      "growthRate": 18.7
    },
    {
      "appId": "solsnipepro",
      "totalRevenue": 75000,
      "totalDAU": 3500,
      "totalMAU": 10000,
      "avgARPU": 6.8,
      "avgPayerRate": 10.2,
      "totalAlerts": 2,
      "activeAlerts": 1,
      "safetyScore": 85.0,
      "growthRate": 22.1
    },
    {
      "appId": "nepvest",
      "totalRevenue": 25000,
      "totalDAU": 1500,
      "totalMAU": 5000,
      "avgARPU": 5.2,
      "avgPayerRate": 7.8,
      "totalAlerts": 1,
      "activeAlerts": 0,
      "safetyScore": 90.0,
      "growthRate": 8.9
    }
  ],
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "generatedAt": "2024-01-31T12:00:00.000Z"
}
```

### Empire Apps List Contract
```typescript
interface EmpireAppsResponse {
  apps: Array<{
    appId: string;                   // App identifier
    name: string;                   // Human-readable app name
    status: 'active' | 'inactive';  // App status based on data freshness
    lastDataUpdate: Date;           // Last data update timestamp
    totalRevenue: number;           // Total revenue for the app
    totalDAU: number;               // Total DAU for the app
    activeAlerts: number;           // Number of active alerts
  }>;
}
```

### Example Apps List Response
```json
{
  "apps": [
    {
      "appId": "halobuzz",
      "name": "HaloBuzz",
      "status": "active",
      "lastDataUpdate": "2024-01-31T11:45:00.000Z",
      "totalRevenue": 200000,
      "totalDAU": 12000,
      "activeAlerts": 1
    },
    {
      "appId": "sewago",
      "name": "SewaGo",
      "status": "active",
      "lastDataUpdate": "2024-01-31T11:30:00.000Z",
      "totalRevenue": 150000,
      "totalDAU": 8000,
      "activeAlerts": 1
    },
    {
      "appId": "solsnipepro",
      "name": "SolSnipePro",
      "status": "active",
      "lastDataUpdate": "2024-01-31T11:15:00.000Z",
      "totalRevenue": 75000,
      "totalDAU": 3500,
      "activeAlerts": 1
    },
    {
      "appId": "nepvest",
      "name": "Nepvest",
      "status": "inactive",
      "lastDataUpdate": "2024-01-30T15:20:00.000Z",
      "totalRevenue": 25000,
      "totalDAU": 1500,
      "activeAlerts": 0
    }
  ]
}
```

## 📊 Performance Expectations

### Response Times
- KPI queries: < 2 seconds for 90th percentile
- Time series data: < 3 seconds for 30-day range
- Forecast generation: < 5 seconds
- Report generation: < 10 seconds
- Empire dashboard: < 3 seconds for multi-app aggregation

### Data Freshness
- Daily KPIs: Updated within 1 hour of day end
- Real-time metrics: Updated every 15 minutes
- Forecasts: Updated daily at 2:00 AM Sydney time
- Empire aggregation: Updated with daily KPI rollups

### Rate Limits
- KPI queries: 100 requests per minute per admin
- Report generation: 10 requests per hour per admin
- Forecast requests: 20 requests per hour per admin
- Empire dashboard: 50 requests per minute per admin

---

**Contract Version**: 1.0  
**Last Updated**: 2024-01-23  
**Compatibility**: HaloBuzz Business AI v1.0+
