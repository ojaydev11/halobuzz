import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { setIo, emitGift, emitPresence, emitSystem, emitChat, emitModeration } from '../emitters';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';

describe('Realtime Emitters Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: any;
  let testToken: string;

  const testUser = {
    userId: 'testuser',
    username: 'testuser',
    ogLevel: 1,
    role: 'user'
  };

  beforeAll((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      path: '/ws',
      cors: { origin: '*', credentials: true }
    });

    // Set up the IO reference for emitters
    setIo(io);

    // Add authentication middleware
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        (socket.data as any).user = payload;
        next();
      } catch (e) {
        next(new Error('unauthorized'));
      }
    });

    io.on('connection', (socket) => {
      // Mock connection handler
    });

    httpServer.listen(() => {
      testToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');
      clientSocket = Client(`http://localhost:${(httpServer.address() as any).port}/live`, {
        path: '/ws',
        auth: { token: testToken }
      });

      clientSocket.on('connect', () => {
        done();
      });
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    clientSocket.close();
  });

  describe('Gift Emission', () => {
    test('should emit gift events to correct room', (done) => {
      const channelName = 'test-channel';
      const giftPayload = {
        from: 'user123',
        fromUsername: 'testuser',
        giftId: 'gift456',
        qty: 3,
        timestamp: Date.now()
      };

      clientSocket.on('gift:new', (data) => {
        expect(data.from).toBe(giftPayload.from);
        expect(data.fromUsername).toBe(giftPayload.fromUsername);
        expect(data.giftId).toBe(giftPayload.giftId);
        expect(data.qty).toBe(giftPayload.qty);
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      // Join the channel first
      clientSocket.emit('join', { channelName, role: 'viewer' });

      setTimeout(() => {
        emitGift(channelName, giftPayload);
      }, 100);
    });
  });

  describe('Presence Emission', () => {
    test('should emit presence updates to correct room', (done) => {
      const channelName = 'test-channel';
      const delta = 1;
      const userId = 'user123';
      const username = 'testuser';

      clientSocket.on('presence:update', (data) => {
        expect(data.channelName).toBe(channelName);
        expect(data.delta).toBe(delta);
        expect(data.userId).toBe(userId);
        expect(data.username).toBe(username);
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      emitPresence(channelName, delta, userId, username);
    });
  });

  describe('System Event Emission', () => {
    test('should emit system events to correct room', (done) => {
      const channelName = 'test-channel';
      const eventType = 'test_event';
      const extraData = { testKey: 'testValue' };

      clientSocket.on('system:event', (data) => {
        expect(data.type).toBe(eventType);
        expect(data.testKey).toBe(extraData.testKey);
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      emitSystem(channelName, eventType, extraData);
    });
  });

  describe('Chat Emission', () => {
    test('should emit chat messages to correct room', (done) => {
      const channelName = 'test-channel';
      const chatPayload = {
        userId: 'user123',
        username: 'testuser',
        message: 'Hello world!',
        timestamp: Date.now()
      };

      clientSocket.on('chat:new', (data) => {
        expect(data.userId).toBe(chatPayload.userId);
        expect(data.username).toBe(chatPayload.username);
        expect(data.message).toBe(chatPayload.message);
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      emitChat(channelName, chatPayload);
    });
  });

  describe('Moderation Emission', () => {
    test('should emit moderation events to correct room', (done) => {
      const channelName = 'test-channel';
      const modPayload = {
        action: 'warn' as const,
        by: 'moderator123',
        byUsername: 'moderator',
        reason: 'Inappropriate content',
        targetUserId: 'user123'
      };

      clientSocket.on('mod:event', (data) => {
        expect(data.action).toBe(modPayload.action);
        expect(data.by).toBe(modPayload.by);
        expect(data.byUsername).toBe(modPayload.byUsername);
        expect(data.reason).toBe(modPayload.reason);
        expect(data.targetUserId).toBe(modPayload.targetUserId);
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      emitModeration(channelName, modPayload);
    });
  });
});
