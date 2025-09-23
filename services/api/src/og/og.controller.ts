import { Body, Controller, Post } from '@nestjs/common';
import { OgService } from './og.service';

@Controller('og')
export class OgController {
  constructor(private readonly ogService: OgService) {}

  @Post('daily-reward')
  reward(@Body() body: { userId: string; ogLevel: number }) {
    return this.ogService.dailyReward(body.userId, body.ogLevel);
  }
}

