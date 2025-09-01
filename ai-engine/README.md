# HaloBuzz AI Engine

A comprehensive AI-powered service for HaloBuzz platform providing moderation, engagement, and reputation management capabilities.

## Features

### 🛡️ ModerationService
- **NSFW Frame Scanning**: Detect inappropriate content in video streams
- **Age Estimation**: Verify user age from face frames
- **Profanity Detection**: Real-time audio analysis for inappropriate language
- **Policy Enforcement**: Automated content moderation with configurable actions

### 🎯 EngagementService
- **Boredom Detection**: Analyze viewer behavior patterns and suggest engagement boosts
- **Cohost Suggestions**: Intelligent matching of compatible hosts based on preferences
- **Festival Skinning**: Dynamic theming and gift sets based on cultural events

### 🏆 ReputationShield
- **Reputation Scoring**: Weighted scoring system with time-based decay
- **Permission Management**: Dynamic user restrictions based on reputation level
- **Event Tracking**: Comprehensive logging of user behavior and actions

## Architecture

```
ai-engine/
├── src/
│   ├── models/          # TypeScript interfaces and types
│   ├── services/        # Core business logic services
│   ├── routes/          # Express.js API routes
│   ├── middleware/      # Authentication and validation
│   ├── utils/           # Utilities and helpers
│   └── tests/           # Unit and load tests
├── logs/               # Application logs
└── dist/               # Compiled JavaScript (after build)
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- TypeScript

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp env.example .env

# Edit .env with your configuration
nano .env

# Build the project
npm run build

# Start the server
npm start
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run load tests
npm run test:load
```

## API Endpoints

### Internal API (Authenticated)

All internal endpoints require authentication using the `INTERNAL_API_SECRET_KEY`.

#### Moderation Endpoints
```
POST /internal/moderation/nsfw-scan
POST /internal/moderation/age-estimate
POST /internal/moderation/profanity-check
POST /internal/moderation/policy-enforce
POST /internal/moderation/process
GET  /internal/moderation/thresholds
PUT  /internal/moderation/thresholds
GET  /internal/moderation/health
```

#### Engagement Endpoints
```
POST /internal/engagement/boredom-detector
POST /internal/engagement/cohost-suggester
POST /internal/engagement/festival-skinner
POST /internal/engagement/process
GET  /internal/engagement/thresholds
PUT  /internal/engagement/thresholds
GET  /internal/engagement/health
```

#### Reputation Endpoints
```
POST /internal/reputation/event
POST /internal/reputation/bulk-events
GET  /internal/reputation/score/:userId
GET  /internal/reputation/permissions/:userId
GET  /internal/reputation/events/:userId
GET  /internal/reputation/configuration
PUT  /internal/reputation/configuration
GET  /internal/reputation/statistics
GET  /internal/reputation/health
```

### Public Endpoints
```
GET /health
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Internal API Authentication
INTERNAL_API_SECRET_KEY=your-super-secret-internal-key-here

# Backend URL for Socket.IO connections
BACKEND_URL=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info

# AI Model Configuration
AI_MODEL_PROVIDER=local
OPENAI_API_KEY=your-openai-api-key-here

# Feature Flags
ENABLE_NSFW_DETECTION=true
ENABLE_AGE_ESTIMATION=true
ENABLE_PROFANITY_DETECTION=true
ENABLE_BOREDOM_DETECTION=true
ENABLE_COHOST_SUGGESTION=true
ENABLE_FESTIVAL_SKINNING=true
ENABLE_REPUTATION_SYSTEM=true
```

## Usage Examples

### NSFW Content Detection

```typescript
import { ModerationService } from './services/ModerationService';

const moderationService = ModerationService.getInstance();

// Scan video frames
const frames = [Buffer.from('frame1'), Buffer.from('frame2')];
const results = await moderationService.nsfw_frame_scan(undefined, frames);

// Scan video URL
const videoUrl = 'https://example.com/video.mp4';
const results = await moderationService.nsfw_frame_scan(videoUrl);
```

### Boredom Detection

```typescript
import { EngagementService } from './services/EngagementService';

const engagementService = EngagementService.getInstance();

const viewerEvents = [
  {
    viewerId: 'user1',
    timestamp: Date.now() - 60000,
    eventType: 'view',
    duration: 300
  },
  {
    viewerId: 'user2',
    timestamp: Date.now() - 30000,
    eventType: 'leave'
  }
];

const analysis = await engagementService.boredom_detector(viewerEvents);
console.log(`Boredom score: ${analysis.score}`);
console.log(`Boost multiplier: ${analysis.boostMultiplier}`);
```

### Reputation Management

```typescript
import { ReputationShield } from './services/ReputationShield';

const reputationShield = ReputationShield.getInstance();

// Add reputation event
const event = {
  userId: 'user123',
  eventType: 'positive',
  score: 10,
  reason: 'Helpful community member',
  timestamp: Date.now(),
  source: 'engagement'
};

const score = await reputationShield.addReputationEvent(event);
console.log(`New reputation score: ${score.score}`);
console.log(`User level: ${score.level}`);
```

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- moderation.test.ts

# Run tests with coverage
npm run test:coverage
```

### Load Tests
```bash
# Run comprehensive load test
npm run test:load

# Run specific load test
npm run test:load -- --test=nsfw-scan
```

## AI Model Integration

The AI engine supports pluggable AI model providers:

### Local Models (Default)
- Lightweight models for development and testing
- No external API dependencies
- Suitable for prototyping

### OpenAI Integration
```typescript
import { OpenAIModelProvider, aiModelManager } from './utils/ai-models';

const openaiProvider = new OpenAIModelProvider(process.env.OPENAI_API_KEY);
aiModelManager.registerProvider(openaiProvider);
aiModelManager.setDefaultProvider('openai');
```

### Custom Providers
Implement the `AIModelProvider` interface to add custom AI services:

```typescript
class CustomAIProvider implements AIModelProvider {
  name = 'custom';
  
  async nsfwScan(frames: Buffer[]): Promise<NSFWScanResult[]> {
    // Custom implementation
  }
  
  async ageEstimate(faceFrame: Buffer): Promise<AgeEstimateResult> {
    // Custom implementation
  }
  
  // ... other methods
}
```

## Socket.IO Events

The AI engine emits real-time events via Socket.IO:

### AI Warning Events
```typescript
// Listen for moderation warnings
socket.on('ai:warning', (warningEvent) => {
  console.log(`Warning for user ${warningEvent.userId}: ${warningEvent.action.reason}`);
});
```

## Logging

The application uses Winston for structured logging:

- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Moderation logs**: `logs/moderation.log`
- **Engagement logs**: `logs/engagement.log`

## Performance

### Load Testing Results
Typical performance metrics:

- **NSFW Scan**: ~50ms per frame batch
- **Boredom Detection**: ~20ms per analysis
- **Reputation Events**: ~5ms per event
- **Cohost Suggestions**: ~100ms per request

### Memory Usage
- Base memory: ~50MB
- Under load: ~200MB
- Peak memory: ~500MB

## Security

### Authentication
- Internal API endpoints require secret key authentication
- Rate limiting: 100 requests per minute per IP
- Request validation using Joi schemas

### Data Protection
- No sensitive data logged
- Input sanitization
- CORS configuration
- Helmet.js security headers

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Environment Variables
Ensure all required environment variables are set in production:
- `INTERNAL_API_SECRET_KEY`
- `NODE_ENV=production`
- `LOG_LEVEL=info`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is proprietary and confidential.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation
