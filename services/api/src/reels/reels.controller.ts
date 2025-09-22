import { Body, Controller, Get, Post } from '@nestjs/common';
import { ReelsService } from './reels.service';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post('create')
  create(@Body() body: { userId: string; videoUrl: string; caption?: string }) {
    return this.reelsService.create(body.userId, body.videoUrl, body.caption);
  }

  @Get()
  list() {
    return this.reelsService.list();
  }
}

