import { Body, Controller, Post } from '@nestjs/common';
import { ThroneService } from './throne.service';

@Controller('throne')
export class ThroneController {
  constructor(private readonly throneService: ThroneService) {}

  @Post('purchase')
  purchase(@Body() body: { userId: string; streamId?: string }) {
    return this.throneService.purchase(body.userId, body.streamId);
  }
}

