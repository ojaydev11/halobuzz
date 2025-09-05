import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createRealtime } from '../socket';
import jwt from 'jsonwebtoken';

describe('Live Realtime Socket Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let clientSocket2: ClientSocket;
  let serverSocket: any;

  const testUser1 = {
    userId: 'user1',
    username: 'testuser1',
    ogLevel: 1,
    role: 'user'
  };

  const testUser2 = {
    userId: 'user2',
    username: 'testuser2',
    ogLevel: 5,
    role: 'admin'
  };

  const testToken1 = jwt.sign(testUser1, process.env.JWT_SECRET || 'test-secret');
  const testToken2 = jwt.sign(testUser2, process.env.JWT_SECRET || 'test-secret');

  beforeAll((done) => {
    httpServer = createServer();
    io = createRealtime(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      clientSocket = Client(`http://localhost:${port}/live`, {
        path: '/ws',
        auth: { token: testToken1 }
      });
      
      clientSocket2 = Client(`http://localhost:${port}/live`, {
        path: '/ws',
        auth: { token: testToken2 }
      });

      clientSocket.on('connect', () => {
        clientSocket2.on('connect', () => {
          done();
        });
      });
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    clientSocket.close();
    clientSocket2.close();
  });

  describe('Connection and Authentication', () => {
    test('should connect with valid JWT token', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    test('should reject connection without token', (done) => {
      const invalidClient = Client(`http://localhost:${(httpServer.address() as any).port}/live`, {
        path: '/ws'
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toBe('unauthorized');
        invalidClient.close();
        done();
      });
    });
  });

  describe('Channel Join/Leave', () => {
    test('should join channel and emit presence update', (done) => {
      const channelName = 'test-channel';
      let presenceUpdateReceived = false;
      let systemEventReceived = false;

      clientSocket2.on('presence:update', (data) => {
        expect(data.channelName).toBe(channelName);
        expect(data.delta).toBe(1);
        expect(data.userId).toBe(testUser1.userId);
        presenceUpdateReceived = true;
        checkBothEventsReceived();
      });

      clientSocket2.on('system:event', (data) => {
        expect(data.type).toBe('join');
        expect(data.userId).toBe(testUser1.userId);
        expect(data.username).toBe(testUser1.username);
        expect(data.role).toBe('viewer');
        systemEventReceived = true;
        checkBothEventsReceived();
      });

      const checkBothEventsReceived = () => {
        if (presenceUpdateReceived && systemEventReceived) {
          done();
        }
      };

      clientSocket.emit('join', { channelName, role: 'viewer' });
    });

    test('should leave channel and emit presence update', (done) => {
      const channelName = 'test-channel';
      let presenceUpdateReceived = false;
      let systemEventReceived = false;

      clientSocket2.on('presence:update', (data) => {
        if (data.delta === -1) {
          expect(data.channelName).toBe(channelName);
          expect(data.userId).toBe(testUser1.userId);
          presenceUpdateReceived = true;
          checkBothEventsReceived();
        }
      });

      clientSocket2.on('system:event', (data) => {
        if (data.type === 'leave') {
          expect(data.userId).toBe(testUser1.userId);
          systemEventReceived = true;
          checkBothEventsReceived();
        }
      });

      const checkBothEventsReceived = () => {
        if (presenceUpdateReceived && systemEventReceived) {
          done();
        }
      };

      clientSocket.emit('leave', { channelName });
    });
  });

  describe('Chat Messages', () => {
    test('should send and receive chat messages', (done) => {
      const channelName = 'test-channel';
      const testMessage = 'Hello, world!';

      clientSocket2.on('chat:new', (data) => {
        expect(data.userId).toBe(testUser1.userId);
        expect(data.username).toBe(testUser1.username);
        expect(data.message).toBe(testMessage);
        done();
      });

      // Join both clients to the channel first
      clientSocket.emit('join', { channelName, role: 'viewer' });
      clientSocket2.emit('join', { channelName, role: 'viewer' });

      setTimeout(() => {
        clientSocket.emit('chat:send', { channelName, message: testMessage });
      }, 100);
    });

    test('should reject messages that are too long', (done) => {
      const channelName = 'test-channel';
      const longMessage = 'a'.repeat(501);

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Invalid message length');
        done();
      });

      clientSocket.emit('chat:send', { channelName, message: longMessage });
    });

    test('should sanitize HTML in messages', (done) => {
      const channelName = 'test-channel';
      const messageWithHtml = '<script>alert("xss")</script>Hello';

      clientSocket2.on('chat:new', (data) => {
        expect(data.message).toBe('Hello');
        done();
      });

      clientSocket.emit('chat:send', { channelName, message: messageWithHtml });
    });
  });

  describe('Gift Announcements', () => {
    test('should send and receive gift announcements', (done) => {
      const channelName = 'test-channel';
      const giftId = 'gift123';
      const qty = 5;

      clientSocket2.on('gift:new', (data) => {
        expect(data.from).toBe(testUser1.userId);
        expect(data.fromUsername).toBe(testUser1.username);
        expect(data.giftId).toBe(giftId);
        expect(data.qty).toBe(qty);
        done();
      });

      clientSocket.emit('gift:announce', { channelName, giftId, qty });
    });

    test('should reject invalid gift data', (done) => {
      const channelName = 'test-channel';
      const invalidGiftId = '';
      const invalidQty = 0;

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Invalid gift data');
        done();
      });

      clientSocket.emit('gift:announce', { channelName, giftId: invalidGiftId, qty: invalidQty });
    });
  });

  describe('Moderation Events', () => {
    test('should allow admin users to send moderation decisions', (done) => {
      const channelName = 'test-channel';
      const action = 'warn';
      const reason = 'Inappropriate content';

      clientSocket2.on('mod:event', (data) => {
        expect(data.action).toBe(action);
        expect(data.by).toBe(testUser2.userId);
        expect(data.byUsername).toBe(testUser2.username);
        expect(data.reason).toBe(reason);
        done();
      });

      clientSocket2.emit('mod:decision', { channelName, action, reason });
    });

    test('should reject moderation decisions from non-admin users', (done) => {
      const channelName = 'test-channel';
      const action = 'warn';
      const reason = 'Inappropriate content';

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('Insufficient privileges for moderation');
        done();
      });

      clientSocket.emit('mod:decision', { channelName, action, reason });
    });
  });

  describe('Heartbeat', () => {
    test('should respond to heartbeat with acknowledgment', (done) => {
      const channelName = 'test-channel';

      clientSocket.on('heartbeat:ack', (data) => {
        expect(data.userId).toBe(testUser1.userId);
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      clientSocket.emit('heartbeat', { channelName });
    });
  });
});
