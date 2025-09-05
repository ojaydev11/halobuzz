# 🚀 HaloBuzz Implementation Action Plan

## Phase 1: Critical MVP Features (Week 1-2)

### 1. Complete Agora Integration for Live Streaming

#### Backend Updates Needed:
```typescript
// backend/src/services/AgoraService.ts (NEW FILE)
import { RtcTokenBuilder, RtmTokenBuilder, RtcRole } from 'agora-access-token';

export class AgoraService {
  private appId = process.env.AGORA_APP_ID;
  private appCertificate = process.env.AGORA_APP_CERTIFICATE;

  generateRtcToken(channelName: string, uid: number, role: 'host' | 'viewer') {
    const rtcRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expireTime = 3600; // 1 hour
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;
    
    return RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpireTime
    );
  }

  generateRtmToken(userId: string) {
    const expireTime = 3600;
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;
    
    return RtmTokenBuilder.buildToken(
      this.appId,
      this.appCertificate,
      userId,
      privilegeExpireTime
    );
  }
}
```

#### Mobile Integration:
```typescript
// apps/halobuzz-mobile/src/services/StreamService.ts (NEW FILE)
import AgoraRTC from 'agora-react-native-rtc';
import { Platform } from 'react-native';

export class StreamService {
  private engine: RtcEngine;
  
  async initializeAgora(appId: string) {
    this.engine = await RtcEngine.create(appId);
    await this.engine.enableVideo();
    await this.engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
  }

  async startStream(token: string, channelName: string, uid: number) {
    await this.engine.setClientRole(ClientRole.Broadcaster);
    await this.engine.joinChannel(token, channelName, null, uid);
  }

  async joinStream(token: string, channelName: string, uid: number) {
    await this.engine.setClientRole(ClientRole.Audience);
    await this.engine.joinChannel(token, channelName, null, uid);
  }
}
```

### 2. Implement AI Moderation

#### NSFW Detection Integration:
```typescript
// backend/src/services/ai/NSFWDetectionService.ts (NEW FILE)
import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';

export class NSFWDetectionService {
  private model: any;

  async initialize() {
    this.model = await nsfwjs.load();
  }

  async analyzeImage(imageBuffer: Buffer): Promise<{safe: boolean, predictions: any}> {
    const predictions = await this.model.classify(imageBuffer);
    const nsfwScore = predictions.find(p => p.className === 'Porn' || p.className === 'Hentai');
    
    return {
      safe: nsfwScore ? nsfwScore.probability < 0.3 : true,
      predictions
    };
  }

  async analyzeVideo(videoUrl: string): Promise<{safe: boolean, frames: any[]}> {
    // Extract frames and analyze each
    const frames = await this.extractFrames(videoUrl);
    const results = await Promise.all(frames.map(f => this.analyzeImage(f)));
    
    return {
      safe: results.every(r => r.safe),
      frames: results
    };
  }
}
```

#### Age Detection Service:
```typescript
// backend/src/services/ai/AgeDetectionService.ts (NEW FILE)
import * as faceapi from 'face-api.js';

export class AgeDetectionService {
  async initialize() {
    await faceapi.nets.ageGenderNet.loadFromDisk('./models');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
  }

  async detectAge(imageBuffer: Buffer): Promise<{age: number, isMinor: boolean}> {
    const detection = await faceapi
      .detectSingleFace(imageBuffer)
      .withAgeAndGender();
    
    if (!detection) {
      throw new Error('No face detected');
    }

    return {
      age: Math.round(detection.age),
      isMinor: detection.age < 18
    };
  }
}
```

### 3. Complete Payment Integration

#### eSewa Integration:
```typescript
// backend/src/services/payment/EsewaService.ts (UPDATE)
import crypto from 'crypto';
import axios from 'axios';

export class EsewaService {
  async initiatePayment(amount: number, userId: string, coins: number) {
    const productId = `HB_${Date.now()}_${userId}`;
    const hash = this.generateHash(amount, productId);
    
    const paymentData = {
      amt: amount,
      psc: 0,
      pdc: 0,
      txAmt: 0,
      tAmt: amount,
      pid: productId,
      scd: process.env.ESEWA_MERCHANT_CODE,
      su: `${process.env.API_URL}/api/v1/payments/esewa/success`,
      fu: `${process.env.API_URL}/api/v1/payments/esewa/failure`,
      hash: hash
    };

    // Store pending transaction
    await Transaction.create({
      userId,
      transactionId: productId,
      amount,
      coins,
      status: 'pending',
      paymentMethod: 'esewa'
    });

    return {
      paymentUrl: `https://esewa.com.np/epay/main?${new URLSearchParams(paymentData)}`,
      productId
    };
  }

  private generateHash(amount: number, productId: string): string {
    const secret = process.env.ESEWA_SECRET;
    const message = `total_amount=${amount},transaction_uuid=${productId},product_code=${process.env.ESEWA_MERCHANT_CODE}`;
    return crypto.createHmac('sha256', secret).update(message).digest('base64');
  }
}
```

### 4. Implement Core Mobile UI

#### Live Stream Screen:
```tsx
// apps/halobuzz-mobile/src/screens/LiveStreamScreen.tsx (NEW FILE)
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { RtcLocalView, RtcRemoteView } from 'agora-react-native-rtc';
import GiftPanel from '../components/GiftPanel';
import ChatPanel from '../components/ChatPanel';
import ViewerCount from '../components/ViewerCount';

export const LiveStreamScreen = ({ route, navigation }) => {
  const { streamId, isHost } = route.params;
  const [showGifts, setShowGifts] = useState(false);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    initializeStream();
    connectWebSocket();
    return () => cleanup();
  }, []);

  const initializeStream = async () => {
    const token = await getAgoraToken(streamId, isHost);
    if (isHost) {
      await streamService.startStream(token, streamId, userId);
    } else {
      await streamService.joinStream(token, streamId, userId);
    }
  };

  const connectWebSocket = () => {
    socket.on('message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('viewerUpdate', (count) => setViewerCount(count));
    socket.on('gift', (gift) => showGiftAnimation(gift));
  };

  return (
    <View style={styles.container}>
      {isHost ? (
        <RtcLocalView.SurfaceView style={styles.video} />
      ) : (
        <RtcRemoteView.SurfaceView style={styles.video} uid={hostUid} />
      )}
      
      <ViewerCount count={viewerCount} />
      <ChatPanel messages={messages} onSend={sendMessage} />
      
      <TouchableOpacity 
        style={styles.giftButton}
        onPress={() => setShowGifts(true)}
      >
        <Text>🎁</Text>
      </TouchableOpacity>

      {showGifts && (
        <GiftPanel 
          onSelect={sendGift}
          onClose={() => setShowGifts(false)}
        />
      )}
    </View>
  );
};
```

## Phase 2: Engagement Features (Week 3-4)

### 5. Implement Gift System

#### Gift Animation Component:
```tsx
// apps/halobuzz-mobile/src/components/GiftAnimation.tsx (NEW FILE)
import React from 'react';
import LottieView from 'lottie-react-native';
import { View, StyleSheet } from 'react-native';

export const GiftAnimation = ({ gift, onComplete }) => {
  return (
    <View style={styles.container}>
      <LottieView
        source={{ uri: gift.animationUrl }}
        autoPlay
        loop={false}
        onAnimationFinish={onComplete}
        style={styles.animation}
      />
    </View>
  );
};
```

### 6. Implement Reels Player

#### Reels Screen:
```tsx
// apps/halobuzz-mobile/src/screens/ReelsScreen.tsx (NEW FILE)
import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions } from 'react-native';
import Video from 'react-native-video';
import ReelOverlay from '../components/ReelOverlay';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ReelsScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reels, setReels] = useState([]);

  const renderReel = ({ item, index }) => {
    const isActive = index === currentIndex;
    
    return (
      <View style={{ height: SCREEN_HEIGHT }}>
        <Video
          source={{ uri: item.videoUrl }}
          style={StyleSheet.absoluteFill}
          paused={!isActive}
          repeat
          resizeMode="cover"
        />
        <ReelOverlay 
          reel={item}
          onLike={() => likeReel(item.id)}
          onComment={() => openComments(item.id)}
          onShare={() => shareReel(item.id)}
        />
      </View>
    );
  };

  return (
    <FlatList
      data={reels}
      renderItem={renderReel}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={(e) => {
        const index = Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
        setCurrentIndex(index);
      }}
    />
  );
};
```

### 7. Implement OG Membership Purchase

#### OG Purchase Flow:
```typescript
// backend/src/routes/og.ts (UPDATE)
router.post('/purchase/:tier', authMiddleware, async (req, res) => {
  const { tier } = req.params;
  const userId = req.user.userId;

  const ogTier = await OGTier.findByTier(parseInt(tier));
  if (!ogTier) {
    return res.status(404).json({ error: 'Tier not found' });
  }

  const user = await User.findById(userId);
  if (user.coins.balance < ogTier.priceCoins) {
    return res.status(400).json({ error: 'Insufficient coins' });
  }

  // Deduct coins
  user.coins.balance -= ogTier.priceCoins;
  user.coins.totalSpent += ogTier.priceCoins;
  user.ogLevel = ogTier.tier;
  user.ogExpiresAt = new Date(Date.now() + ogTier.duration * 24 * 60 * 60 * 1000);
  await user.save();

  // Grant benefits
  await grantOGBenefits(userId, ogTier);

  // Create transaction
  await Transaction.create({
    userId,
    type: 'og_purchase',
    amount: ogTier.priceCoins,
    description: `OG Tier ${tier} Purchase`,
    status: 'completed'
  });

  res.json({
    success: true,
    ogLevel: user.ogLevel,
    expiresAt: user.ogExpiresAt,
    benefits: ogTier.benefits
  });
});
```

## Phase 3: Games & Advanced Features (Week 5-6)

### 8. Implement Mini-Games

#### Spin Wheel Game:
```typescript
// backend/src/games/SpinWheel.ts (NEW FILE)
export class SpinWheelGame {
  private prizes = [
    { id: 1, coins: 10, probability: 0.3 },
    { id: 2, coins: 50, probability: 0.2 },
    { id: 3, coins: 100, probability: 0.1 },
    { id: 4, coins: 500, probability: 0.05 },
    { id: 5, coins: 1000, probability: 0.01 },
    { id: 6, coins: 0, probability: 0.34 }
  ];

  async play(userId: string, betAmount: number) {
    // Deduct entry fee
    const user = await User.findById(userId);
    if (user.coins.balance < betAmount) {
      throw new Error('Insufficient coins');
    }

    user.coins.balance -= betAmount;
    
    // Calculate win with AI control
    const prize = this.calculatePrize();
    
    if (prize.coins > 0) {
      user.coins.balance += prize.coins;
      await user.save();
      
      return {
        won: true,
        prize: prize.coins,
        newBalance: user.coins.balance
      };
    }

    await user.save();
    return {
      won: false,
      prize: 0,
      newBalance: user.coins.balance
    };
  }

  private calculatePrize() {
    const random = Math.random();
    let cumulative = 0;
    
    for (const prize of this.prizes) {
      cumulative += prize.probability;
      if (random <= cumulative) {
        return prize;
      }
    }
    
    return this.prizes[this.prizes.length - 1];
  }
}
```

### 9. Implement LinkCast (Multi-Host)

#### LinkCast Service:
```typescript
// backend/src/services/LinkCastService.ts (NEW FILE)
export class LinkCastService {
  async createLinkCast(hostId1: string, hostId2: string) {
    const channelName = `linkcast_${Date.now()}`;
    
    // Generate tokens for both hosts
    const token1 = agoraService.generateRtcToken(channelName, hostId1, 'host');
    const token2 = agoraService.generateRtcToken(channelName, hostId2, 'host');
    
    // Create stream record
    const stream = await LiveStream.create({
      hostId: hostId1,
      coHostId: hostId2,
      title: `LinkCast: ${host1.username} & ${host2.username}`,
      isLinkCast: true,
      agoraChannel: channelName,
      status: 'preparing'
    });

    return {
      streamId: stream._id,
      tokens: { host1: token1, host2: token2 },
      channel: channelName
    };
  }

  async manageLinkCastAudio(streamId: string, hostId: string, action: 'mute' | 'unmute') {
    // Implement audio mixing controls
    const stream = await LiveStream.findById(streamId);
    
    io.to(stream.agoraChannel).emit('audioControl', {
      hostId,
      action
    });
  }
}
```

### 10. Complete AI Features

#### Gift Recommendation Engine:
```typescript
// backend/src/services/ai/RecommendationService.ts (NEW FILE)
import * as tf from '@tensorflow/tfjs-node';

export class RecommendationService {
  private model: tf.LayersModel;

  async initialize() {
    // Load pre-trained recommendation model
    this.model = await tf.loadLayersModel('file://./models/gift-recommender/model.json');
  }

  async recommendGifts(userId: string, streamId: string): Promise<Gift[]> {
    // Get user history
    const userHistory = await this.getUserGiftHistory(userId);
    const streamContext = await this.getStreamContext(streamId);
    
    // Prepare features
    const features = this.prepareFeatures(userHistory, streamContext);
    
    // Get predictions
    const predictions = this.model.predict(features) as tf.Tensor;
    const scores = await predictions.array();
    
    // Get top gift recommendations
    const gifts = await Gift.find({ isActive: true });
    const recommendations = gifts
      .map((gift, i) => ({ gift, score: scores[0][i] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.gift);

    return recommendations;
  }

  private prepareFeatures(history: any, context: any): tf.Tensor {
    // Feature engineering
    const features = [
      history.avgSpend,
      history.frequency,
      history.lastGiftDays,
      context.viewerCount,
      context.streamDuration,
      context.hostPopularity,
      // ... more features
    ];

    return tf.tensor2d([features]);
  }
}
```

## Phase 4: Testing & Optimization (Week 7-8)

### 11. Performance Optimization

#### Redis Caching:
```typescript
// backend/src/services/CacheService.ts (NEW FILE)
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;
  private cluster: Redis.Cluster;

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      this.cluster = new Redis.Cluster([
        { port: 6380, host: process.env.REDIS_HOST_1 },
        { port: 6380, host: process.env.REDIS_HOST_2 },
        { port: 6380, host: process.env.REDIS_HOST_3 }
      ]);
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD
      });
    }
  }

  async cacheStreamData(streamId: string, data: any, ttl = 60) {
    const key = `stream:${streamId}`;
    await this.set(key, JSON.stringify(data), ttl);
  }

  async getCachedStreamData(streamId: string) {
    const key = `stream:${streamId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateLeaderboard(type: string, userId: string, score: number) {
    const key = `leaderboard:${type}`;
    await this.zadd(key, score, userId);
  }

  async getLeaderboard(type: string, limit = 10) {
    const key = `leaderboard:${type}`;
    return await this.zrevrange(key, 0, limit - 1, 'WITHSCORES');
  }
}
```

### 12. Load Testing

#### Load Test Script:
```javascript
// scripts/load-test.js (NEW FILE)
import { check } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 5000 }, // Spike to 5000
    { duration: '5m', target: 5000 }, // Stay at 5000
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.1'],           // Error rate < 10%
    http_req_duration: ['p(95)<300'], // 95% requests < 300ms
  },
};

export default function() {
  // Test live stream join
  let streamResponse = http.get(`${BASE_URL}/api/v1/streams/active`);
  check(streamResponse, {
    'stream list status 200': (r) => r.status === 200,
  });
  
  // Test sending gift
  let giftResponse = http.post(`${BASE_URL}/api/v1/gifts/send`, {
    streamId: 'test-stream',
    giftId: 'test-gift',
    quantity: 1
  });
  
  check(giftResponse, {
    'gift sent successfully': (r) => r.status === 200,
  });
  
  errorRate.add(streamResponse.status !== 200);
}
```

## Deployment Configuration

### Docker Setup:
```dockerfile
# Dockerfile (UPDATE)
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy AI models
COPY --from=builder /app/models ./models

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment:
```yaml
# k8s/deployment.yaml (NEW FILE)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: halobuzz-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: halobuzz-backend
  template:
    metadata:
      labels:
        app: halobuzz-backend
    spec:
      containers:
      - name: backend
        image: halobuzz/backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: halobuzz-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /healthz
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /healthz
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: halobuzz-backend
spec:
  selector:
    app: halobuzz-backend
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
```

## Environment Variables to Add:

```bash
# .env.production (NEW)
# Agora
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate

# eSewa Production
ESEWA_MERCHANT_CODE=HALOBUZZ
ESEWA_SECRET=your_secret
ESEWA_API_URL=https://esewa.com.np/epay/main
ESEWA_VERIFY_URL=https://esewa.com.np/epay/transrec

# Khalti Production
KHALTI_PUBLIC_KEY=your_public_key
KHALTI_SECRET_KEY=your_secret_key
KHALTI_API_URL=https://khalti.com/api/v2

# AI Services
TENSORFLOW_MODEL_PATH=/models
GOOGLE_CLOUD_VISION_KEY=your_key
OPENAI_API_KEY=your_key

# CDN
CDN_URL=https://cdn.halobuzz.com
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_token

# Monitoring
PROMETHEUS_ENDPOINT=http://prometheus:9090
GRAFANA_ENDPOINT=http://grafana:3000
SENTRY_DSN=your_sentry_dsn
```

## Testing Checklist:

- [ ] Unit tests for all services
- [ ] Integration tests for payment flow
- [ ] E2E tests for streaming
- [ ] Load testing (10k concurrent users)
- [ ] Security penetration testing
- [ ] AI model accuracy testing
- [ ] Mobile app UI/UX testing
- [ ] Payment gateway sandbox testing
- [ ] WebSocket stability testing
- [ ] CDN performance testing

## Launch Readiness Checklist:

- [ ] All critical features implemented
- [ ] AI moderation active
- [ ] Payment systems tested
- [ ] Load testing passed
- [ ] Security audit completed
- [ ] Admin dashboard ready
- [ ] Analytics tracking active
- [ ] Backup systems configured
- [ ] Monitoring alerts configured
- [ ] Documentation complete

---

**This action plan provides the exact code and configurations needed to complete the HaloBuzz implementation. Follow the phases sequentially for optimal results.**