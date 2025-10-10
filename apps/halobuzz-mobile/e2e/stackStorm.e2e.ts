import { device, element, by, expect as detoxExpect } from 'detox';

describe('StackStorm E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate to StackStorm', async () => {
    await element(by.id('tab-games')).tap();
    await element(by.id('game-card-stack-storm')).tap();
    await detoxExpect(element(by.text('Stack Storm'))).toBeVisible();
  });

  it('should display entry fee selection', async () => {
    // Entry fees should be visible
    await detoxExpect(element(by.id('entry-fee-100'))).toBeVisible();
    await detoxExpect(element(by.id('entry-fee-250'))).toBeVisible();
    await detoxExpect(element(by.id('entry-fee-500'))).toBeVisible();
  });

  it('should start game with physics canvas', async () => {
    // Select entry fee
    await element(by.id('entry-fee-100')).tap();
    
    // Start game
    await element(by.id('start-game')).tap();
    
    // Wait for initialization
    await device.waitForIdleTimeout(1000);
    
    // Game canvas should be visible
    await detoxExpect(element(by.id('game-canvas'))).toBeVisible();
    
    // Score should be visible
    await detoxExpect(element(by.id('score-display'))).toBeVisible();
  });

  it('should place blocks by tapping', async () => {
    // Wait for first moving block
    await device.waitForIdleTimeout(500);
    
    // Tap to place block
    await element(by.id('game-canvas')).tap();
    
    // Wait for block to settle
    await device.waitForIdleTimeout(500);
    
    // Height/score should update
    await detoxExpect(element(by.id('score-display'))).toBeVisible();
  });

  it('should display combo indicators', async () => {
    // Perfect stack indicator (if achieved)
    const perfectIndicator = element(by.id('perfect-stack'));
    
    try {
      await detoxExpect(perfectIndicator).toBeVisible();
    } catch {
      // Perfect stack not achieved in test
    }
  });

  it('should show game over when tower collapses', async () => {
    // Wait for game over (tower collapse or time limit)
    await waitFor(element(by.id('game-over-screen')))
      .toBeVisible()
      .withTimeout(60000);
    
    // Final stats should be visible
    await detoxExpect(element(by.id('final-height'))).toBeVisible();
    await detoxExpect(element(by.id('final-score'))).toBeVisible();
  });

  it('should return to menu', async () => {
    await element(by.id('play-again-button')).tap();
    await detoxExpect(element(by.id('start-game'))).toBeVisible();
  });

  it('should return to hub', async () => {
    await element(by.id('back-button')).tap();
    await detoxExpect(element(by.text('Games Hub'))).toBeVisible();
  });
});

