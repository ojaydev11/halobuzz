import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { StreamsService } from './streams.service';
import { AiService } from '../ai/ai.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly streamsService: StreamsService, private readonly aiService: AiService) {}
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
    this.streamsService.incrementViewers(payload.channelId).catch(() => {});
    client.emit('joined', { channelId: payload.channelId });
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, payload: { channelId: string }) {
    client.leave(payload.channelId);
    this.streamsService.decrementViewers(payload.channelId).catch(() => {});
    client.emit('left', { channelId: payload.channelId });
  }

  @SubscribeMessage('chat')
  async handleChat(client: Socket, payload: { channelId: string; text: string; userId: string }) {
    const mod = await this.aiService.moderate(payload.text);
    if (mod.action !== 'allow') {
      client.emit('mod_action', { action: mod.action });
      return;
    }
    this.server.to(payload.channelId).emit('chat', { ...payload, at: Date.now() });
  }
}

