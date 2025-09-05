# HaloBuzz Live Realtime Layer

This directory contains the realtime WebSocket layer for HaloBuzz live streaming functionality.

## Architecture

The realtime layer is built on Socket.IO and provides room-based realtime communication for live channels.

### Key Components

- **`socket.ts`** - Main Socket.IO server setup with authentication, rate limiting, and event handlers
- **`emitters.ts`** - HTTP to WebSocket bridge for emitting events from REST API endpoints
- **`metrics.ts`** - Prometheus metrics collection for monitoring WebSocket connections and events
- **`__tests__/`** - Unit and integration tests

## Features

### Room-Based Communication
- Each live channel gets its own room: `channel:<channelName>`
- Users join/leave rooms for realtime updates
- Presence tracking with join/leave events

### Event Types

#### Client → Server Events
- `join` - Join a channel room
- `leave` - Leave a channel room
- `chat:send` - Send a chat message
- `gift:announce` - Announce a gift (host tools)
- `mod:decision` - Send moderation decision (admin only)
- `heartbeat` - Send heartbeat for connection health

#### Server → Client Events
- `presence:update` - User joined/left the channel
- `system:event` - System events (join/leave/stream events)
- `chat:new` - New chat message
- `gift:new` - New gift received
- `mod:event` - Moderation action taken
- `heartbeat:ack` - Heartbeat acknowledgment
- `metrics:ping` - Optional metrics ping
- `error` - Error messages

### Security Features

#### Authentication
- JWT token required in handshake
- Token can be provided in `auth.token` or `Authorization` header
- Invalid tokens result in connection rejection

#### Rate Limiting
- Messages: 30 per minute per user
- Gifts: 30 per minute per user
- Rate limits reset every minute
- Exceeding limits results in error responses

#### Input Validation
- Message length: max 500 characters
- HTML sanitization: strips all HTML tags
- Gift quantity: 1-100 range
- Channel name validation

#### Moderation
- Only users with `ogLevel: 5` or `role: "admin"` can send moderation events
- Moderation actions: `warn`, `mute`, `end`

## Usage

### Server Setup

```typescript
import { createRealtime } from './realtime/socket';
import { setIo } from './realtime/emitters';

const httpServer = createServer(app);
const liveIo = createRealtime(httpServer);
setIo(liveIo); // Enable HTTP → WS bridge
```

### Client Connection

```typescript
import { connectLive, joinChannel, onChat, onGift } from './services/ws';

// Connect with JWT token
await connectLive(jwtToken);

// Join a channel
joinChannel('channel123', 'viewer');

// Listen for events
onChat((data) => {
  console.log('New chat:', data.message);
});

onGift((data) => {
  console.log('Gift received:', data.giftId, data.qty);
});
```

### HTTP → WS Bridge

```typescript
import { emitGift, emitPresence, emitSystem } from './realtime/emitters';

// In your REST API controller
emitGift(channelName, {
  from: userId,
  fromUsername: username,
  giftId: gift._id,
  qty: quantity,
  timestamp: Date.now()
});
```

## Configuration

### Environment Variables

```bash
# Required
JWT_SECRET=your-jwt-secret

# Optional
CORS_ALLOW=https://staging.halobuzz.com,http://localhost:3000
```

### Socket.IO Configuration

- **Path**: `/ws`
- **Transports**: `["websocket", "polling"]`
- **CORS**: Configurable via `CORS_ALLOW` environment variable
- **Namespace**: `/live`

## Monitoring

### Prometheus Metrics

The realtime layer exposes comprehensive metrics:

- `ws_connections_total` - Total WebSocket connections
- `ws_disconnects_total` - Total disconnections
- `ws_active_connections` - Current active connections
- `ws_messages_total` - Message counts by type and direction
- `ws_message_duration_seconds` - Message processing duration
- `ws_presence_delta_total` - Join/leave events
- `ws_rate_limit_hits_total` - Rate limit violations
- `ws_errors_total` - Error counts by type
- `ws_rooms_active` - Active room count
- `ws_room_size` - Users per room

### Health Checks

- Connection health via heartbeat mechanism
- Rate limiting status
- Room occupancy tracking
- Error rate monitoring

## Testing

Run the test suite:

```bash
npm test -- --testPathPattern=realtime
```

### Test Coverage

- Connection authentication
- Room join/leave functionality
- Message sending and receiving
- Rate limiting
- Input validation
- Moderation features
- Error handling
- Metrics collection

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check JWT token validity
   - Verify CORS configuration
   - Ensure server is running on correct port

2. **Rate Limit Errors**
   - Check user's message/gift frequency
   - Verify rate limit configuration
   - Monitor rate limit metrics

3. **Authentication Failures**
   - Verify JWT_SECRET matches between client and server
   - Check token expiration
   - Ensure token is provided in correct format

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=socket.io:*
```

## Performance Considerations

### Scaling

- Use Redis adapter for multi-instance deployments
- Monitor connection counts and room sizes
- Implement connection pooling for high-traffic scenarios

### Memory Management

- Rate limiting data is stored in memory (consider Redis for production)
- Regular cleanup of disconnected users
- Monitor memory usage with large room sizes

### Network Optimization

- WebSocket transport preferred over polling
- Compress large messages
- Batch presence updates for high-frequency changes

## Security Best Practices

1. **Always validate JWT tokens**
2. **Implement proper rate limiting**
3. **Sanitize all user input**
4. **Monitor for abuse patterns**
5. **Use HTTPS/WSS in production**
6. **Regular security audits**
7. **Implement connection timeouts**
8. **Log security events**

## Future Enhancements

- [ ] Redis-based rate limiting
- [ ] Message persistence
- [ ] Advanced moderation tools
- [ ] Real-time analytics
- [ ] Connection quality monitoring
- [ ] Auto-scaling support
- [ ] Message queuing for offline users
