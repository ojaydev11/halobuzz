import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // eslint-disable-next-line no-console
    console.log('socket connected', client.id);
  }

  handleDisconnect(client: Socket) {
    // eslint-disable-next-line no-console
    console.log('socket disconnected', client.id);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: { channelId: string }) {
    client.join(payload.channelId);
    client.emit('joined', { channelId: payload.channelId });
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, payload: { channelId: string }) {
    client.leave(payload.channelId);
    client.emit('left', { channelId: payload.channelId });
  }

  @SubscribeMessage('chat')
  handleChat(client: Socket, payload: { channelId: string; text: string; userId: string }) {
    this.server.to(payload.channelId).emit('chat', { ...payload, at: Date.now() });
  }
}

