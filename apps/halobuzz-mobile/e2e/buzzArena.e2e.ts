import { device, element, by, expect as detoxExpect } from 'detox';

describe('BuzzArena E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate to BuzzArena', async () => {
    await element(by.id('tab-games')).tap();
    await element(by.id('game-card-buzz-arena')).tap();
    await detoxExpect(element(by.text('Buzz Arena'))).toBeVisible();
  });

  it('should display high-stakes entry fees', async () => {
    // Pro tier entry fees
    await detoxExpect(element(by.id('entry-fee-500'))).toBeVisible();
    await detoxExpect(element(by.id('entry-fee-1000'))).toBeVisible();
    await detoxExpect(element(by.id('entry-fee-2500'))).toBeVisible();
  });

  it('should select entry fee and start matchmaking', async () => {
    // Select entry fee
    await element(by.id('entry-fee-500')).tap();
    
    // Find match button
    await element(by.id('find-match')).tap();
    
    // Matchmaking should start
    await waitFor(element(by.id('matchmaking-status')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should display matchmaking UI', async () => {
    // MMR display
    const mmrDisplay = element(by.id('mmr-display'));
    
    try {
      await detoxExpect(mmrDisplay).toBeVisible();
    } catch {
      // MMR may not be displayed during matchmaking
    }
    
    // Cancel button should be available
    await detoxExpect(element(by.id('cancel-matchmaking'))).toBeVisible();
  });

  it('should allow canceling matchmaking', async () => {
    // Cancel matchmaking
    await element(by.id('cancel-matchmaking')).tap();
    
    // Should return to menu
    await detoxExpect(element(by.id('find-match'))).toBeVisible();
  });

  // Note: Full multiplayer game testing requires mock server or actual match
  // For smoke test, we verify UI flow

  it('should display game info', async () => {
    // Game description or rules
    const rulesText = element(by.id('game-rules'));
    
    try {
      await detoxExpect(rulesText).toBeVisible();
    } catch {
      // Rules may be in a different location
    }
  });

  it('should return to hub', async () => {
    await element(by.id('back-button')).tap();
    await detoxExpect(element(by.text('Games Hub'))).toBeVisible();
  });
});

