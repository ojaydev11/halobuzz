import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe/checkout')
  createStripe(@Body() body: { userId: string; currency: string; amountMinor: number }) {
    return this.paymentsService.createStripeCheckout(body.userId, body.currency, body.amountMinor);
  }

  @Post('stripe/apply')
  apply(@Body() body: { userId: string; coins: number }) {
    return this.paymentsService.applyCoinsAfterStripe(body.userId, body.coins);
  }

  @Post('esewa/init')
  esewa(@Body() body: { userId: string; amount: number }) {
    return this.paymentsService.esewaInitiate(body.userId, body.amount);
  }

  @Post('khalti/init')
  khalti(@Body() body: { userId: string; amount: number }) {
    return this.paymentsService.khaltiInitiate(body.userId, body.amount);
  }
}

