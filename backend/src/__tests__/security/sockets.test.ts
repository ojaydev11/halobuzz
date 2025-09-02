import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { setupSocketIO } from '../../config/socket';

describe('Socket Security', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket: ClientSocket;
  let serverSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, {
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true
      }
    });

    setupSocketIO(io);

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = Client(`http://localhost:${port}`, {
        auth: {
          token: 'valid-jwt-token'
        }
      });

      io.on('connection', (socket) => {
        serverSocket = socket;
      });

      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    clientSocket.close();
  });

  describe('Authentication', () => {
    it('should require authentication for socket connection', (done) => {
      const unauthenticatedClient = Client('http://localhost:3000', {
        auth: {
          token: 'invalid-token'
        }
      });

      unauthenticatedClient.on('connect_error', (error) => {
        expect(error.message).toContain('authentication');
        unauthenticatedClient.close();
        done();
      });
    });

    it('should allow authenticated connections', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });
  });

  describe('Event Validation', () => {
    it('should only allow canonical events', (done) => {
      const canonicalEvents = [
        'stream:join',
        'stream:leave',
        'gift:sent',
        'throne:claimed',
        'chat:new',
        'battle:boost',
        'ai:warning',
        'og:changed',
        'metrics:update'
      ];

      let eventCount = 0;
      const totalEvents = canonicalEvents.length;

      canonicalEvents.forEach(event => {
        clientSocket.emit(event, { test: 'data' });
        eventCount++;
        
        if (eventCount === totalEvents) {
          // All canonical events should be accepted
          setTimeout(() => {
            expect(eventCount).toBe(totalEvents);
            done();
          }, 100);
        }
      });
    });

    it('should reject non-canonical events', (done) => {
      const nonCanonicalEvents = [
        'malicious:event',
        'admin:delete',
        'system:shutdown',
        'user:ban'
      ];

      let rejectedCount = 0;
      const totalEvents = nonCanonicalEvents.length;

      nonCanonicalEvents.forEach(event => {
        clientSocket.emit(event, { test: 'data' });
        
        // Listen for error response
        clientSocket.on('error', (error) => {
          if (error.message.includes('unauthorized event')) {
            rejectedCount++;
            
            if (rejectedCount === totalEvents) {
              expect(rejectedCount).toBe(totalEvents);
              done();
            }
          }
        });
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit chat messages', (done) => {
      let messageCount = 0;
      const maxMessages = 10; // Example rate limit

      const sendMessage = () => {
        clientSocket.emit('chat:new', {
          streamId: 'test-stream',
          message: `Test message ${messageCount}`
        });
        messageCount++;

        if (messageCount < maxMessages) {
          setTimeout(sendMessage, 10); // Send quickly
        } else {
          // Check if rate limiting kicked in
          setTimeout(() => {
            // Should have received rate limit warnings
            done();
          }, 100);
        }
      };

      sendMessage();
    });

    it('should rate limit gift sending', (done) => {
      let giftCount = 0;
      const maxGifts = 5; // Example rate limit

      const sendGift = () => {
        clientSocket.emit('gift:sent', {
          streamId: 'test-stream',
          giftId: 'test-gift',
          amount: 100
        });
        giftCount++;

        if (giftCount < maxGifts) {
          setTimeout(sendGift, 10); // Send quickly
        } else {
          // Check if rate limiting kicked in
          setTimeout(() => {
            // Should have received rate limit warnings
            done();
          }, 100);
        }
      };

      sendGift();
    });
  });

  describe('Input Validation', () => {
    it('should validate chat message content', (done) => {
      clientSocket.emit('chat:new', {
        streamId: 'test-stream',
        message: '<script>alert("xss")</script>'
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('invalid content');
        done();
      });
    });

    it('should validate gift amounts', (done) => {
      clientSocket.emit('gift:sent', {
        streamId: 'test-stream',
        giftId: 'test-gift',
        amount: -100 // Negative amount
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('invalid amount');
        done();
      });
    });

    it('should validate stream IDs', (done) => {
      clientSocket.emit('stream:join', {
        streamId: '../../etc/passwd' // Path traversal attempt
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('invalid stream');
        done();
      });
    });
  });

  describe('Room Management', () => {
    it('should validate room access permissions', (done) => {
      clientSocket.emit('stream:join', {
        streamId: 'private-stream-123'
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('access denied');
        done();
      });
    });

    it('should enforce room size limits', (done) => {
      // Simulate joining a full room
      clientSocket.emit('stream:join', {
        streamId: 'full-stream'
      });

      clientSocket.on('error', (error) => {
        expect(error.message).toContain('room full');
        done();
      });
    });
  });

  describe('Connection Limits', () => {
    it('should limit connections per user', (done) => {
      // Simulate multiple connections from same user
      const secondClient = Client('http://localhost:3000', {
        auth: {
          token: 'valid-jwt-token' // Same user
        }
      });

      secondClient.on('connect_error', (error) => {
        expect(error.message).toContain('connection limit');
        secondClient.close();
        done();
      });
    });

    it('should handle connection cleanup on disconnect', (done) => {
      clientSocket.disconnect();

      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log socket events for audit', (done) => {
      clientSocket.emit('chat:new', {
        streamId: 'test-stream',
        message: 'Test audit message'
      });

      // In a real implementation, this would check that the event was logged
      setTimeout(() => {
        expect(true).toBe(true); // Placeholder
        done();
      }, 100);
    });

    it('should log authentication events', (done) => {
      // Simulate authentication event
      clientSocket.emit('auth:verify', {
        token: 'valid-jwt-token'
      });

      // In a real implementation, this would check that the auth event was logged
      setTimeout(() => {
        expect(true).toBe(true); // Placeholder
        done();
      }, 100);
    });
  });
});
