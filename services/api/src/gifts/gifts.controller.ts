import { Body, Controller, Get, Post } from '@nestjs/common';
import { GiftsService } from './gifts.service';

@Controller('gifts')
export class GiftsController {
  constructor(private readonly giftsService: GiftsService) {}

  @Get()
  list() {
    return this.giftsService.list();
  }

  @Post('create')
  create(@Body() body: { code: string; name: string; coinCost: number; rarity?: string; animationUrl?: string }) {
    return this.giftsService.create(body);
  }

  @Post('send')
  send(@Body() body: { senderUserId: string; receiverUserId: string; giftCode: string; multiplier?: number }) {
    return this.giftsService.sendGift(body.senderUserId, body.receiverUserId, body.giftCode, body.multiplier);
  }
}

