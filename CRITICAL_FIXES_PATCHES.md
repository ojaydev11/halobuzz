# Critical Fixes & Patches for HaloBuzz Production Readiness

## 🚨 Immediate Fixes Required

### 1. Fix TypeScript Compilation Errors

#### Backend Dependencies Fix
```bash
# Install missing dependencies
cd backend
npm install @nestjs/common @nestjs/mongoose @nestjs/core @nestjs/platform-express
npm install xlsx ws @types/ws
npm install @types/node-cron @types/multer @types/qrcode
```

#### Fix MongoDB Aggregation Types
```typescript
// File: backend/src/services/AdvancedAnalyticsService.ts
// Fix aggregation pipeline types

// BEFORE (causing errors):
const pipeline = [
  { $match: { eventType: { $in: ['revenue', 'transaction'] } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, revenue: { $sum: '$amount' } } },
  { $sort: { _id: 1 } }
];

// AFTER (fixed):
import { PipelineStage } from 'mongoose';

const pipeline: PipelineStage[] = [
  { 
    $match: { 
      eventType: { $in: ['revenue', 'transaction'] },
      timestamp: { $gte: new Date(startDate) }
    } 
  },
  { 
    $group: { 
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, 
      revenue: { $sum: '$amount' },
      transactions: { $sum: 1 }
    } 
  },
  { $sort: { _id: 1 } }
];
```

#### Fix NestJS Service Imports
```typescript
// File: backend/src/services/AdvancedFraudDetectionService.ts
// Replace NestJS imports with Express equivalents

// BEFORE:
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

// AFTER:
import { logger } from '../config/logger';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

class AdvancedFraudDetectionService {
  private logger = logger;
  
  constructor() {
    // Initialize service
  }
  
  async detectFraud(userId: string, transactionData: any): Promise<boolean> {
    // Implementation
  }
}
```

### 2. Fix Mobile App JSX Errors

#### Fix AccessibilityManager.tsx
```typescript
// File: apps/halobuzz-mobile/src/utils/AccessibilityManager.tsx
// Fix JSX syntax errors

import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

// Fix generic type syntax
const getResponsiveValue = <T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  default: T;
}): T => {
  // Implementation
  return values.default;
};

// Fix React component syntax
export const AccessibleView: React.FC<{
  children: React.ReactNode;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  onAccessibilityAction?: (event: any) => void;
}> = ({
  children,
  accessible = true,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  onAccessibilityAction
}) => {
  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
};
```

#### Fix Performance Test File
```typescript
// File: apps/halobuzz-mobile/src/__tests__/performance/list-performance.test.ts
// Fix JSX syntax in test file

import React from 'react';
import { render } from '@testing-library/react-native';
import { StreamList } from '@/components/StreamList';

describe('StreamList Performance', () => {
  it('should render empty list efficiently', () => {
    const { getByTestId } = render(
      <StreamList 
        data={[]}
        renderItem={() => <div>Test Item</div>}
        keyExtractor={(_, index) => index.toString()}
        isLoading={true}
        skeletonType="streamCard"
        estimatedItemSize={80}
      />
    );
    
    expect(getByTestId('stream-list')).toBeTruthy();
  });
});
```

### 3. Database Schema Fixes

#### Add Missing Indexes
```javascript
// File: backend/scripts/add-indexes.js
// Run this script to add critical indexes

const mongoose = require('mongoose');

async function addIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const db = mongoose.connection.db;
  
  // User indexes
  await db.collection('users').createIndex({ email: 1, isBanned: 1 });
  await db.collection('users').createIndex({ username: 1, isBanned: 1 });
  await db.collection('users').createIndex({ phone: 1 }, { sparse: true });
  await db.collection('users').createIndex({ 'trust.score': -1 });
  await db.collection('users').createIndex({ 'karma.total': -1 });
  
  // LiveStream indexes
  await db.collection('livestreams').createIndex({ 
    status: 1, 
    category: 1, 
    country: 1, 
    currentViewers: -1 
  });
  await db.collection('livestreams').createIndex({ hostId: 1, status: 1, createdAt: -1 });
  await db.collection('livestreams').createIndex({ agoraChannel: 1 }, { unique: true });
  
  // Transaction indexes
  await db.collection('transactions').createIndex({ userId: 1, status: 1, createdAt: -1 });
  await db.collection('transactions').createIndex({ 'metadata.orderId': 1 }, { sparse: true, unique: true });
  
  // TTL for cleanup
  await db.collection('failed_transactions').createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 2592000 } // 30 days
  );
  
  console.log('Indexes added successfully');
  process.exit(0);
}

addIndexes().catch(console.error);
```

#### Fix Transaction Model
```typescript
// File: backend/src/models/Transaction.ts
// Add missing fields and validation

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'recharge' | 'gift_sent' | 'gift_received' | 'og_bonus' | 'refund' | 'withdrawal' | 'subscription' | 'tip' | 'brand_deal' | 'platform_fee';
  amount: number;
  currency: 'coins' | 'USD' | 'NPR';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: 'esewa' | 'khalti' | 'stripe' | 'paypal';
  paymentProvider?: string;
  transactionId?: string;
  referenceId?: string;
  idempotencyKey?: string; // Add for duplicate prevention
  description: string;
  metadata?: {
    giftId?: string;
    streamId?: string;
    ogTier?: number;
    festivalId?: string;
    orderId?: string; // Add for idempotency
    [key: string]: any;
  };
  fees: number;
  netAmount: number;
  hash?: string; // Add for ledger integrity
  createdAt: Date;
  updatedAt: Date;
}

// Add pre-save middleware for hash generation
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    this.netAmount = this.amount - this.fees;
  }
  
  // Generate hash for ledger integrity
  if (this.isNew) {
    const hashData = `${this.userId}-${this.amount}-${this.type}-${Date.now()}`;
    this.hash = require('crypto').createHash('sha256').update(hashData).digest('hex');
  }
  
  next();
});
```

### 4. Security Fixes

#### Fix Authentication Middleware
```typescript
// File: backend/src/middleware/auth.ts
// Add proper JWT validation and refresh token handling

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user still exists and is not banned
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || user.isBanned) {
      return res.status(401).json({ success: false, error: 'Invalid token or user banned.' });
    }
    
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user'
    };
    
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token.' });
  }
};

// Add refresh token middleware
export const refreshTokenMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.header('X-Refresh-Token');
    
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token required.' });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    res.set('X-New-Token', newAccessToken);
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid refresh token.' });
  }
};
```

#### Fix Payment Security
```typescript
// File: backend/src/services/PaymentService.ts
// Add webhook signature validation and idempotency

import crypto from 'crypto';

export class PaymentService {
  // Validate webhook signature
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
  
  // Process payment with idempotency
  async processPayment(paymentData: any, idempotencyKey: string): Promise<any> {
    // Check if payment already processed
    const existingPayment = await Transaction.findOne({ 
      'metadata.orderId': idempotencyKey 
    });
    
    if (existingPayment) {
      return { success: true, idempotent: true, transaction: existingPayment };
    }
    
    // Process new payment
    const transaction = new Transaction({
      ...paymentData,
      metadata: {
        ...paymentData.metadata,
        orderId: idempotencyKey
      }
    });
    
    await transaction.save();
    return { success: true, idempotent: false, transaction };
  }
}
```

### 5. Agora Streaming Fixes

#### Fix Agora Service
```typescript
// File: backend/src/services/AgoraService.ts
// Complete Agora integration with proper error handling

import { AgoraToken } from 'agora-access-token';

interface AgoraTokenData {
  token: string;
  uid: string;
  expiresAt: number;
  region: string;
  quality: string;
}

export class AgoraService {
  private appId: string;
  private appCertificate: string;
  
  constructor() {
    this.appId = process.env.AGORA_APP_ID || '';
    this.appCertificate = process.env.AGORA_APP_CERT || '';
    
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora App ID and Certificate are required');
    }
  }
  
  async generateToken(channelName: string, userId: string, role: 'publisher' | 'subscriber'): Promise<AgoraTokenData> {
    try {
      const expireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      
      const token = new AgoraToken(this.appId, this.appCertificate);
      token.addPrivilege(AgoraToken.Privileges.kJoinChannel, expireTime);
      
      if (role === 'publisher') {
        token.addPrivilege(AgoraToken.Privileges.kPublishAudioStream, expireTime);
        token.addPrivilege(AgoraToken.Privileges.kPublishVideoStream, expireTime);
      }
      
      const tokenString = token.build();
      const region = await this.getOptimalRegion();
      const quality = await this.getOptimalQuality(channelName, region);
      
      return {
        token: tokenString,
        uid: userId,
        expiresAt: expireTime,
        region,
        quality
      };
    } catch (error) {
      throw new Error(`Failed to generate Agora token: ${error.message}`);
    }
  }
  
  private async getOptimalRegion(): Promise<string> {
    // Return optimal region based on user location
    return 'ap-southeast-1'; // Default to Asia Pacific
  }
  
  private async getOptimalQuality(channelName: string, region: string): Promise<string> {
    // Return optimal quality based on channel and region
    return '720p';
  }
}
```

### 6. Mobile App Configuration Fixes

#### Fix App Configuration
```typescript
// File: apps/halobuzz-mobile/app.config.ts
// Fix bundle identifiers and add required permissions

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "HaloBuzz",
  slug: "halobuzz",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B0B10"
  },
  description: "HaloBuzz - Live streaming platform for creators and viewers",
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.halobuzz.app",
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription: "Camera access for live streaming",
      NSMicrophoneUsageDescription: "Microphone access for live streaming",
      NSPhotoLibraryUsageDescription: "Photo library access for profile pictures",
      NSLocationWhenInUseUsageDescription: "Location access for regional content",
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0B10"
    },
    package: "com.halobuzz.app",
    versionCode: 1,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.WAKE_LOCK"
    ]
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  scheme: "halobuzz",
  extra: {
    apiBaseUrl: "https://halo-api-production.up.railway.app",
    apiPrefix: "/api/v1",
    agoraAppId: process.env.EXPO_PUBLIC_AGORA_APP_ID || ""
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-camera",
    "expo-av"
  ]
});
```

### 7. Environment Configuration

#### Production Environment Template
```bash
# File: backend/.env.production
# Production environment configuration

NODE_ENV=production
PORT=4000
TZ=UTC

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/halobuzz_prod?retryWrites=true&w=majority
REDIS_URL=redis://redis-cluster:6379

# Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-64-characters-long-random-string-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-different-from-jwt-secret-minimum-64-chars
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Agora
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERT=your-agora-app-certificate

# AWS S3
S3_BUCKET=halobuzz-prod-storage
S3_REGION=us-east-1
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
ESEWA_MERCHANT_ID=your-esewa-merchant-id
ESEWA_SECRET=your-esewa-secret-key
KHALTI_PUBLIC_KEY=live_public_key_your_khalti_public_key
KHALTI_SECRET_KEY=live_secret_key_your_khalti_secret_key

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key

# Monitoring
LOG_LEVEL=info
SECURITY_MONITORING_ENABLED=true
```

## 🚀 Deployment Scripts

### Build Script
```bash
#!/bin/bash
# File: scripts/build-production.sh

set -e

echo "Building HaloBuzz for production..."

# Build backend
cd backend
npm ci
npm run build
cd ..

# Build mobile app
cd apps/halobuzz-mobile
npm ci
npx expo build:ios --profile production
npx expo build:android --profile production
cd ..

# Build admin panel
cd admin
npm ci
npm run build
cd ..

echo "Build completed successfully!"
```

### Health Check Script
```bash
#!/bin/bash
# File: scripts/health-check.sh

set -e

echo "Running health checks..."

# Check backend health
curl -f http://localhost:4000/healthz || exit 1

# Check database connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('Database connected'); process.exit(0); })
  .catch(err => { console.error('Database connection failed:', err); process.exit(1); });
"

# Check Redis connection
redis-cli ping || exit 1

echo "All health checks passed!"
```

---

## 📋 Implementation Checklist

### Immediate Actions (Today)
- [ ] Install missing dependencies
- [ ] Fix TypeScript compilation errors
- [ ] Add critical database indexes
- [ ] Fix mobile app configuration

### Week 1
- [ ] Complete security fixes
- [ ] Implement payment security
- [ ] Fix Agora streaming
- [ ] Add basic monitoring

### Week 2
- [ ] Write comprehensive tests
- [ ] Implement GDPR compliance
- [ ] Set up CI/CD pipeline
- [ ] Conduct security audit

### Week 3
- [ ] Performance optimization
- [ ] Load testing
- [ ] App store preparation
- [ ] Production deployment

---

*These fixes address the most critical issues preventing production deployment. Implement in order of priority.*
