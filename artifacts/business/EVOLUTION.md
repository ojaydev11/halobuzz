# HaloBuzz Business AI Evolution

## 🚀 What Changed

This document outlines the Business AI evolution implemented on top of the existing HaloBuzz analytics stack. The evolution adds advanced business intelligence capabilities including narrative generation, simulation engine, root cause analysis, empire mode, and offline exports.

## 📊 New Features

### 1. Narrative Generator
- **Purpose**: Automatically generates executive summaries from KPI snapshots
- **Location**: `backend/src/analytics/services/narratives.ts`
- **Integration**: Automatically included in daily/weekly PDF/XLSX reports
- **Features**:
  - Short (2-3 sentences) and long (4-8 bullet points) summaries
  - Detects deltas (e.g., revenue −12% WoW in Nepal; OG3 +9%)
  - Provides insights with confidence levels
  - Compares current period with previous period

### 2. Simulation Engine
- **Purpose**: Performs "what-if" analysis for business scenarios
- **Location**: `backend/src/analytics/services/simulations.ts`
- **API Endpoint**: `POST /api/v1/ai/business/simulate`
- **Scenarios**:
  - `double_gift_multiplier`: Simulates 20% increase in gift-related revenue
  - `price_change_coin_pack`: Simulates 10% increase in coin pack revenue
  - `og_tier_promo`: Simulates 15% increase in OG tier subscription revenue
  - `festival_skin_push`: Simulates 5% increase in revenue from festival skins
- **Features**:
  - Projects KPIs over 7-60 day horizon
  - Compares against baseline
  - Stores simulation snapshots
  - Provides insights and recommendations

### 3. Root-Cause Analyzer for Alerts
- **Purpose**: Attaches root cause analysis and suggestions to alerts
- **Location**: `backend/src/analytics/services/rootCause.ts`
- **Integration**: Automatically attached to all new alerts
- **Features**:
  - Segment contribution analysis (country, OG tier, platform)
  - Compares against 7/28-day baselines
  - Provides actionable suggestions
  - Identifies primary drivers of issues

### 4. Empire Mode (Multi-App Aggregation)
- **Purpose**: Supports multiple applications under HaloBuzz umbrella
- **Location**: `backend/src/routes/empire.ts`
- **API Endpoints**:
  - `GET /api/v1/ai/business/empire-dashboard`: Aggregated KPIs by app
  - `GET /api/v1/ai/business/empire-dashboard/apps`: List of all apps
- **Features**:
  - APP_ID field added to all analytics collections
  - App mapper service for automatic app ID assignment
  - Aggregated KPIs across all apps
  - Individual app performance tracking
  - Future-ready for SewaGo, SolSnipePro, Nepvest

### 5. Offline Export + Drive/Local Sync
- **Purpose**: Generates weekly/monthly reports and syncs to external locations
- **Location**: `backend/src/services/OfflineExportService.ts`
- **Features**:
  - Weekly exports every Sunday 6:00 AM Sydney time
  - Monthly exports 1st of every month 7:00 AM Sydney time
  - Generates PDF + XLSX for HaloBuzz and Empire
  - Syncs to configured directories (Drive, ShivX, Local)
  - Automatic directory creation and file management

## 🔧 How to Run

### 1. Environment Setup

Add these environment variables to your `.env` file:

```bash
# Reports and Exports
REPORTS_TZ=Australia/Sydney
REPORTS_STORAGE_DIR=./storage/reports
OFFLINE_EXPORTS_DIR=./storage/exports

# Sync Directories (optional)
DRIVE_SYNC_DIR=/path/to/drive/sync
SHIVX_SYNC_DIR=/path/to/shivx/sync
LOCAL_SYNC_DIR=/path/to/local/sync

# Simulation Limits
SIM_MAX_HORIZON_DAYS=60

# Business AI Rate Limiting
BUSINESS_AI_RATE_LIMIT_PER_MIN=30
```

### 2. Database Migration

The evolution adds `appId` field to existing analytics collections:

```javascript
// Run this migration script to add appId to existing documents
db.analyticsdailykpis.updateMany(
  { appId: { $exists: false } },
  { $set: { appId: "halobuzz" } }
);

db.analyticsalerts.updateMany(
  { appId: { $exists: false } },
  { $set: { appId: "halobuzz" } }
);

db.analyticsforecasts.updateMany(
  { appId: { $exists: false } },
  { $set: { appId: "halobuzz" } }
);
```

### 3. Start Services

The services are automatically initialized when the server starts. To manually start offline exports:

```javascript
import OfflineExportService from './services/OfflineExportService';

const offlineExportService = new OfflineExportService();
offlineExportService.startWeeklyExportCron();
offlineExportService.startMonthlyExportCron();
```

### 4. API Usage

#### Generate Narratives
```bash
# Narratives are automatically included in reports
curl -X GET "http://localhost:4000/api/v1/ai/business/report?period=weekly&format=pdf" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Run Simulations
```bash
curl -X POST "http://localhost:4000/api/v1/ai/business/simulate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "double_gift_multiplier",
    "params": { "multiplier": 2.0 },
    "horizonDays": 30
  }'
```

#### Get Empire Dashboard
```bash
curl -X GET "http://localhost:4000/api/v1/ai/business/empire-dashboard?from=2024-01-01&to=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Alerts with Root Cause
```bash
curl -X GET "http://localhost:4000/api/v1/ai/business/alerts?since=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📁 File Structure

```
backend/src/
├── analytics/
│   ├── services/
│   │   ├── narratives.ts          # Narrative generation
│   │   ├── simulations.ts         # Simulation engine
│   │   ├── rootCause.ts           # Root cause analysis
│   │   └── appMapper.ts           # App ID mapping
│   ├── models/
│   │   └── AnalyticsSimulation.ts # Simulation storage
│   └── etl/
│       └── dailyRollup.ts         # Updated with appId
├── routes/
│   └── empire.ts                  # Empire dashboard & simulation APIs
├── services/
│   ├── ReportGeneratorService.ts  # Updated with narratives
│   └── OfflineExportService.ts    # Offline exports & sync
└── services/
    └── AlertService.ts            # Updated with root cause
```

## 🧪 Testing

### Unit Tests
```bash
# Test narrative generation
npm test backend/src/analytics/services/__tests__/narratives.spec.ts

# Test simulation engine
npm test backend/src/analytics/services/__tests__/simulations.spec.ts

# Test route endpoints
npm test backend/src/routes/__tests__/simulate.route.spec.ts
```

### Manual Testing
1. Generate a report and verify narratives are included
2. Run a simulation and check the results
3. Trigger an alert and verify root cause analysis
4. Check empire dashboard for multi-app aggregation
5. Verify offline exports are generated and synced

## 📊 Sample Outputs

### Narratives
- **File**: `artifacts/sample_api/narratives.json`
- **Content**: Short/long summaries with insights

### Simulations
- **File**: `artifacts/sample_api/simulate_double_gift_multiplier.json`
- **Content**: Projected KPIs, baseline comparison, insights

### Alerts with Root Cause
- **File**: `artifacts/sample_api/alerts_with_root_cause.json`
- **Content**: Alerts with cause analysis and suggestions

### Empire Dashboard
- **File**: `artifacts/sample_api/empire_dashboard.json`
- **Content**: Aggregated KPIs across all apps

## 🔒 Security & Compliance

- All new APIs are admin-only (JWT + role=admin)
- Rate limiting applied to all endpoints
- No PII exposure in analytics data
- Secure file handling for exports
- Environment-based configuration

## 🚨 Rollback Instructions

### Disable Cron Jobs
```javascript
// Stop offline export cron jobs
cron.destroy(); // This will stop all cron jobs
```

### Remove App ID Fields
```javascript
// Remove appId from existing documents (if needed)
db.analyticsdailykpis.updateMany(
  { appId: { $exists: true } },
  { $unset: { appId: "" } }
);
```

### Disable Features
Set environment variables to disable features:
```bash
SIM_MAX_HORIZON_DAYS=0  # Disable simulations
DRIVE_SYNC_DIR=        # Disable sync
SHIVX_SYNC_DIR=        # Disable sync
```

## 📈 Performance Expectations

- **Narrative Generation**: < 1 second
- **Simulation Engine**: < 5 seconds for 30-day horizon
- **Empire Dashboard**: < 3 seconds for multi-app aggregation
- **Offline Exports**: < 30 seconds for weekly reports
- **Root Cause Analysis**: < 2 seconds per alert

## 🔮 Future Enhancements

1. **Advanced Simulations**: Machine learning-based scenario modeling
2. **Real-time Narratives**: Live narrative updates as KPIs change
3. **Predictive Root Cause**: AI-powered root cause prediction
4. **Multi-tenant Empire**: Support for external app integrations
5. **Advanced Sync**: Cloud storage integration (AWS S3, Google Drive)

---

**Evolution Version**: 1.0  
**Last Updated**: 2024-01-31  
**Compatibility**: HaloBuzz Business AI v1.0+
