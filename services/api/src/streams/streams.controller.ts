import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { StreamsService } from './streams.service';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post('start')
  start(@Body() body: { hostId: string; title?: string; tags?: string[]; countryCode?: string }) {
    return this.streamsService.startStream(body.hostId, body.title, body.tags, body.countryCode);
  }

  @Post('end')
  end(@Body() body: { channelId: string }) {
    return this.streamsService.endStream(body.channelId);
  }

  @Get('live')
  live() {
    return this.streamsService.listLive();
  }

  @Get(':channelId')
  byChannel(@Param('channelId') channelId: string) {
    return this.streamsService.byChannel(channelId);
  }

  @Post('token')
  token(
    @Body()
    body: { channelId: string; uid?: string; role?: 'publisher' | 'subscriber'; expireSeconds?: number },
  ) {
    const appId = process.env.AGORA_APP_ID || '';
    const appCert = process.env.AGORA_APP_CERTIFICATE || '';
    if (!appId || !appCert) {
      throw new Error('Agora not configured');
    }
    const channel = body.channelId;
    const uid = body.uid || '0';
    const role = body.role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expire = Math.max(60, body.expireSeconds || 3600);
    const now = Math.floor(Date.now() / 1000);
    const privilegeExpireTs = now + expire;
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCert, channel, Number(uid), role, privilegeExpireTs);
    return { token, appId, channelId: channel, uid };
  }
}

