import { PricingService } from '@/services/PricingService';

describe('PricingService.validateNepalBaseline', () => {
  it('accepts valid NPR to coins mapping', () => {
    // NPR 10 => 500 coins; NPR 199 => 9950 coins; NPR 1 => 50 coins
    expect(() => PricingService.validateNepalBaseline(10, 500)).not.toThrow();
    expect(() => PricingService.validateNepalBaseline(199, 199 * 50)).not.toThrow();
    expect(() => PricingService.validateNepalBaseline(1, 50)).not.toThrow();
  });

  it('rejects invalid mapping', () => {
    expect(() => PricingService.validateNepalBaseline(10, 400)).toThrow('Invalid NP pricing');
    expect(() => PricingService.validateNepalBaseline(0, 0)).toThrow('Amount and coins must be positive');
    expect(() => PricingService.validateNepalBaseline(-10, 500)).toThrow('Amount and coins must be positive');
  });
});


