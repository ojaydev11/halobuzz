import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { WalletService } from '../wallet/wallet.service';
import { coinsForLocalCurrency } from '@halobuzz/shared/money';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(private readonly walletService: WalletService) {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    }
  }

  async createStripeCheckout(userId: string, currency: string, amountMinor: number) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const amountMajor = amountMinor / 100;
    const coins = coinsForLocalCurrency(amountMajor, currency);
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      currency: currency.toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `HaloBuzz Coins (${coins})` },
            unit_amount: amountMinor,
          },
          quantity: 1,
        },
      ],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: { userId, coins: String(coins) },
    });
    return { id: session.id, url: session.url };
  }

  async applyCoinsAfterStripe(userId: string, coins: number) {
    return this.walletService.credit(userId, coins);
  }

  async esewaInitiate(userId: string, amount: number) {
    const coins = coinsForLocalCurrency(amount, 'NPR');
    return { provider: 'esewa', userId, amount, coins, status: 'initiated' };
  }

  async khaltiInitiate(userId: string, amount: number) {
    const coins = coinsForLocalCurrency(amount, 'NPR');
    return { provider: 'khalti', userId, amount, coins, status: 'initiated' };
  }
}

