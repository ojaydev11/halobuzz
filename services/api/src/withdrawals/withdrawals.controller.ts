import { Body, Controller, Post } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';

@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post('request')
  request(@Body() body: { userId: string; region: string; amountCoins: number }) {
    return this.withdrawalsService.requestWithdrawal(body.userId, body.region, body.amountCoins);
  }
}

