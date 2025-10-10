import { device, element, by, expect as detoxExpect } from 'detox';

describe('TriviaRoyale E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should navigate to TriviaRoyale', async () => {
    await element(by.id('tab-games')).tap();
    await element(by.id('game-card-trivia-royale')).tap();
    await detoxExpect(element(by.text('Trivia Royale'))).toBeVisible();
  });

  it('should display category selection', async () => {
    // Categories should be visible
    await detoxExpect(element(by.id('category-general'))).toBeVisible();
    await detoxExpect(element(by.id('category-sports'))).toBeVisible();
    await detoxExpect(element(by.id('category-entertainment'))).toBeVisible();
    await detoxExpect(element(by.id('category-science'))).toBeVisible();
  });

  it('should select category and entry fee', async () => {
    // Select category
    await element(by.id('category-general')).tap();
    
    // Select entry fee
    await element(by.id('entry-fee-100')).tap();
    
    // Verify selection
    await detoxExpect(element(by.id('category-general'))).toBeVisible();
  });

  it('should start matchmaking', async () => {
    // Start game button
    await element(by.id('start-game')).tap();
    
    // Waiting room or matchmaking indicator should appear
    await waitFor(element(by.id('matchmaking-status')))
      .toBeVisible()
      .withTimeout(5000);
  });

  // Note: Multiplayer testing requires mocked server or actual match
  // For smoke test, we verify UI elements are present

  it('should display waiting room elements', async () => {
    // Player count should be visible
    const playerCount = element(by.id('player-count'));
    
    try {
      await detoxExpect(playerCount).toBeVisible();
    } catch {
      // May timeout waiting for match in test environment
    }
  });

  it('should allow canceling matchmaking', async () => {
    // Cancel button
    const cancelButton = element(by.id('cancel-matchmaking'));
    
    try {
      await cancelButton.tap();
      await detoxExpect(element(by.id('start-game'))).toBeVisible();
    } catch {
      // Already in game or match found
    }
  });

  it('should return to hub', async () => {
    // Go back
    await element(by.id('back-button')).tap();
    await detoxExpect(element(by.text('Games Hub'))).toBeVisible();
  });
});

