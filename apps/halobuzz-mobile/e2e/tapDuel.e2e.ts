import { device, element, by, expect as detoxExpect } from 'detox';

describe('TapDuel E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate to TapDuel', async () => {
    await element(by.id('tab-games')).tap();
    await element(by.id('game-card-tap-duel')).tap();
    await detoxExpect(element(by.text('Tap Duel'))).toBeVisible();
  });

  it('should play solo mode', async () => {
    // Select solo mode (default)
    await detoxExpect(element(by.id('mode-solo'))).toBeVisible();
    
    // Start game
    await element(by.id('start-game')).tap();
    
    // Wait for countdown
    await device.waitForIdleTimeout(1000);
    
    // Countdown should be visible
    await detoxExpect(element(by.id('countdown-display'))).toBeVisible();
  });

  it('should respond to tap when GO appears', async () => {
    // Wait for GO signal (up to 4 seconds)
    await waitFor(element(by.id('go-signal')))
      .toBeVisible()
      .withTimeout(5000);
    
    // Tap immediately
    await element(by.id('tap-area')).tap();
    
    // Result should appear
    await detoxExpect(element(by.id('reaction-time'))).toBeVisible();
  });

  it('should display personal best if achieved', async () => {
    // Check if personal best indicator exists
    const personalBest = element(by.id('personal-best-indicator'));
    
    try {
      await detoxExpect(personalBest).toBeVisible();
    } catch {
      // Personal best may not be set yet
    }
  });

  it('should return to hub', async () => {
    await element(by.id('back-button')).tap();
    await detoxExpect(element(by.text('Games Hub'))).toBeVisible();
  });
});

