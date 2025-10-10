import { device, element, by, expect as detoxExpect } from 'detox';

describe('CoinFlipDeluxe E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate to CoinFlipDeluxe from games hub', async () => {
    // Navigate to games tab
    await element(by.id('tab-games')).tap();
    
    // Tap on CoinFlipDeluxe game card
    await element(by.id('game-card-coin-flip-deluxe')).tap();
    
    // Verify game screen is displayed
    await detoxExpect(element(by.text('3D Coin Flip Deluxe'))).toBeVisible();
  });

  it('should select a side and initiate flip', async () => {
    // Select heads
    await element(by.id('select-heads')).tap();
    
    // Verify selection is highlighted
    await detoxExpect(element(by.id('select-heads'))).toBeVisible();
    
    // Tap flip button
    await element(by.id('flip-button')).tap();
    
    // Wait for flip animation (2.5 seconds)
    await device.waitForIdleTimeout(3000);
  });

  it('should display result after flip', async () => {
    // Result overlay should be visible after flip
    await detoxExpect(element(by.id('flip-result'))).toBeVisible();
    
    // Score should be updated
    await detoxExpect(element(by.id('score-display'))).toBeVisible();
  });

  it('should handle stake modal', async () => {
    // Open stake modal
    await element(by.id('wallet-button')).tap();
    
    // Modal should be visible
    await detoxExpect(element(by.text('Set Your Stake'))).toBeVisible();
    
    // Select quick stake
    await element(by.id('quick-stake-100')).tap();
    
    // Confirm selection
    await element(by.id('confirm-stake')).tap();
  });

  it('should return to games hub', async () => {
    // Tap back button
    await element(by.id('back-button')).tap();
    
    // Should be back at games hub
    await detoxExpect(element(by.text('Games Hub'))).toBeVisible();
  });
});

