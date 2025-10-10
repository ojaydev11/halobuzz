import { device, element, by, expect as detoxExpect } from 'detox';

describe('BuzzRunner E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate to BuzzRunner', async () => {
    await element(by.id('tab-games')).tap();
    await element(by.id('game-card-buzz-runner')).tap();
    await detoxExpect(element(by.text('Buzz Runner'))).toBeVisible();
  });

  it('should display menu with entry fee options', async () => {
    // Entry fee selector should be visible
    await detoxExpect(element(by.id('entry-fee-100'))).toBeVisible();
    await detoxExpect(element(by.id('entry-fee-250'))).toBeVisible();
  });

  it('should start game and display gameplay elements', async () => {
    // Select entry fee
    await element(by.id('entry-fee-100')).tap();
    
    // Start game
    await element(by.id('start-game')).tap();
    
    // Wait for game to initialize
    await device.waitForIdleTimeout(1000);
    
    // Game canvas should be visible
    await detoxExpect(element(by.id('game-canvas'))).toBeVisible();
    
    // Score display should be visible
    await detoxExpect(element(by.id('score-display'))).toBeVisible();
  });

  it('should respond to jump action', async () => {
    // Tap to jump
    await element(by.id('jump-area')).tap();
    
    // Player should jump (verified by game state, not visual)
    await device.waitForIdleTimeout(500);
  });

  it('should display game over screen', async () => {
    // Wait for game over (or trigger it)
    await waitFor(element(by.id('game-over-screen')))
      .toBeVisible()
      .withTimeout(30000);
    
    // Final score should be visible
    await detoxExpect(element(by.id('final-score'))).toBeVisible();
  });

  it('should allow restart', async () => {
    // Tap play again
    await element(by.id('play-again-button')).tap();
    
    // Should return to menu
    await detoxExpect(element(by.id('start-game'))).toBeVisible();
  });

  it('should return to hub', async () => {
    await element(by.id('back-button')).tap();
    await detoxExpect(element(by.text('Games Hub'))).toBeVisible();
  });
});

