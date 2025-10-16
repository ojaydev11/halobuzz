/**
 * Comprehensive E2E User Journey Tests
 * Tests complete user workflows from registration to advanced features
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.E2E_API_BASE_URL || 'http://localhost:3000/api/v1';

// Test data
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: process.env.TEST_PASSWORD || 'TestPassword123!',
  country: 'NP',
  language: 'en'
};

const testAdmin = {
  username: 'admin',
  email: 'admin@halobuzz.com',
  password: 'AdminPassword123!'
};

// Helper functions
async function registerUser(page: any, userData: any) {
  await page.goto(`${BASE_URL}/register`);
  await page.fill('[data-testid="username"]', userData.username);
  await page.fill('[data-testid="email"]', userData.email);
  await page.fill('[data-testid="password"]', userData.password);
  await page.fill('[data-testid="confirmPassword"]', userData.password);
  await page.selectOption('[data-testid="country"]', userData.country);
  await page.selectOption('[data-testid="language"]', userData.language);
  await page.click('[data-testid="registerButton"]');
  
  // Wait for success message
  await expect(page.locator('[data-testid="successMessage"]')).toBeVisible();
}

async function loginUser(page: any, userData: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="identifier"]', userData.email);
  await page.fill('[data-testid="password"]', userData.password);
  await page.click('[data-testid="loginButton"]');
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
}

async function verifyEmail(page: any, token: string) {
  await page.goto(`${BASE_URL}/verify-email?token=${token}`);
  await expect(page.locator('[data-testid="verificationSuccess"]')).toBeVisible();
}

async function uploadFile(page: any, filePath: string) {
  await page.goto(`${BASE_URL}/upload`);
  await page.setInputFiles('[data-testid="fileInput"]', filePath);
  await page.click('[data-testid="uploadButton"]');
  
  // Wait for upload success
  await expect(page.locator('[data-testid="uploadSuccess"]')).toBeVisible();
}

async function startStream(page: any, streamData: any) {
  await page.goto(`${BASE_URL}/stream`);
  await page.fill('[data-testid="streamTitle"]', streamData.title);
  await page.fill('[data-testid="streamDescription"]', streamData.description);
  await page.selectOption('[data-testid="streamCategory"]', streamData.category);
  await page.click('[data-testid="startStreamButton"]');
  
  // Wait for stream to start
  await expect(page.locator('[data-testid="streamLive"]')).toBeVisible();
}

async function joinGame(page: any, gameId: string) {
  await page.goto(`${BASE_URL}/games`);
  await page.click(`[data-testid="game-${gameId}"]`);
  await page.click('[data-testid="joinGameButton"]');
  
  // Wait for game to start
  await expect(page.locator('[data-testid="gameActive"]')).toBeVisible();
}

async function sendGift(page: any, giftData: any) {
  await page.goto(`${BASE_URL}/gifts`);
  await page.click(`[data-testid="gift-${giftData.id}"]`);
  await page.fill('[data-testid="recipient"]', giftData.recipient);
  await page.fill('[data-testid="message"]', giftData.message);
  await page.click('[data-testid="sendGiftButton"]');
  
  // Wait for gift sent confirmation
  await expect(page.locator('[data-testid="giftSent"]')).toBeVisible();
}

async function makePayment(page: any, paymentData: any) {
  await page.goto(`${BASE_URL}/wallet`);
  await page.click('[data-testid="addFundsButton"]');
  await page.fill('[data-testid="amount"]', paymentData.amount);
  await page.selectOption('[data-testid="paymentMethod"]', paymentData.method);
  await page.click('[data-testid="payButton"]');
  
  // Wait for payment success
  await expect(page.locator('[data-testid="paymentSuccess"]')).toBeVisible();
}

// Test suites
test.describe('User Registration and Authentication', () => {
  test('Complete user registration flow', async ({ page }) => {
    await registerUser(page, testUser);
    
    // Verify user is redirected to verification page
    await expect(page).toHaveURL(`${BASE_URL}/verify-email`);
  });

  test('Email verification flow', async ({ page }) => {
    // First register user
    await registerUser(page, testUser);
    
    // Get verification token from API (in real scenario, this would come from email)
    const response = await page.request.get(`${API_BASE_URL}/verify/email/generate`, {
      data: { email: testUser.email, userId: 'test-user-id' }
    });
    const { token } = await response.json();
    
    // Verify email
    await verifyEmail(page, token);
    
    // Verify user can now login
    await loginUser(page, testUser);
  });

  test('User login flow', async ({ page }) => {
    await loginUser(page, testUser);
    
    // Verify user is on dashboard
    await expect(page.locator('[data-testid="userDashboard"]')).toBeVisible();
  });

  test('Password reset flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.fill('[data-testid="email"]', testUser.email);
    await page.click('[data-testid="resetPasswordButton"]');
    
    // Verify reset email sent
    await expect(page.locator('[data-testid="resetEmailSent"]')).toBeVisible();
  });
});

test.describe('User Profile and Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUser);
  });

  test('Update user profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.fill('[data-testid="displayName"]', 'Updated Display Name');
    await page.fill('[data-testid="bio"]', 'Updated bio information');
    await page.selectOption('[data-testid="country"]', 'US');
    await page.click('[data-testid="saveProfileButton"]');
    
    // Verify profile updated
    await expect(page.locator('[data-testid="profileUpdated"]')).toBeVisible();
  });

  test('Upload profile avatar', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await uploadFile(page, 'tests/fixtures/avatar.jpg');
    
    // Verify avatar updated
    await expect(page.locator('[data-testid="avatarUpdated"]')).toBeVisible();
  });

  test('Update privacy settings', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/privacy`);
    await page.check('[data-testid="profilePublic"]');
    await page.check('[data-testid="allowMessages"]');
    await page.uncheck('[data-testid="showOnlineStatus"]');
    await page.click('[data-testid="savePrivacySettings"]');
    
    // Verify settings saved
    await expect(page.locator('[data-testid="settingsSaved"]')).toBeVisible();
  });
});

test.describe('Streaming Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUser);
  });

  test('Start live stream', async ({ page }) => {
    const streamData = {
      title: 'Test Stream',
      description: 'This is a test stream',
      category: 'gaming'
    };
    
    await startStream(page, streamData);
    
    // Verify stream is live
    await expect(page.locator('[data-testid="streamLive"]')).toBeVisible();
  });

  test('Join stream as viewer', async ({ page }) => {
    // First start a stream
    await startStream(page, {
      title: 'Test Stream',
      description: 'This is a test stream',
      category: 'gaming'
    });
    
    // Get stream URL
    const streamUrl = page.url();
    
    // Open new page as viewer
    const viewerPage = await page.context().newPage();
    await viewerPage.goto(streamUrl);
    
    // Verify viewer can see stream
    await expect(viewerPage.locator('[data-testid="streamPlayer"]')).toBeVisible();
  });

  test('Send chat message in stream', async ({ page }) => {
    await startStream(page, {
      title: 'Test Stream',
      description: 'This is a test stream',
      category: 'gaming'
    });
    
    // Send chat message
    await page.fill('[data-testid="chatInput"]', 'Hello from the stream!');
    await page.click('[data-testid="sendChatButton"]');
    
    // Verify message appears in chat
    await expect(page.locator('[data-testid="chatMessage"]')).toContainText('Hello from the stream!');
  });
});

test.describe('Gaming Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUser);
  });

  test('Join multiplayer game', async ({ page }) => {
    await joinGame(page, 'battle-royale-1');
    
    // Verify game started
    await expect(page.locator('[data-testid="gameActive"]')).toBeVisible();
  });

  test('Play single player game', async ({ page }) => {
    await page.goto(`${BASE_URL}/games`);
    await page.click('[data-testid="game-single-player"]');
    await page.click('[data-testid="playButton"]');
    
    // Verify game loaded
    await expect(page.locator('[data-testid="gameCanvas"]')).toBeVisible();
  });

  test('Complete game and earn rewards', async ({ page }) => {
    await joinGame(page, 'battle-royale-1');
    
    // Simulate game completion
    await page.click('[data-testid="completeGameButton"]');
    
    // Verify rewards earned
    await expect(page.locator('[data-testid="rewardsEarned"]')).toBeVisible();
  });
});

test.describe('Social Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUser);
  });

  test('Send gift to another user', async ({ page }) => {
    const giftData = {
      id: 'gift-1',
      recipient: 'another-user',
      message: 'Happy gaming!'
    };
    
    await sendGift(page, giftData);
    
    // Verify gift sent
    await expect(page.locator('[data-testid="giftSent"]')).toBeVisible();
  });

  test('Follow another user', async ({ page }) => {
    await page.goto(`${BASE_URL}/users/another-user`);
    await page.click('[data-testid="followButton"]');
    
    // Verify follow success
    await expect(page.locator('[data-testid="followSuccess"]')).toBeVisible();
  });

  test('Send direct message', async ({ page }) => {
    await page.goto(`${BASE_URL}/messages`);
    await page.click('[data-testid="newMessageButton"]');
    await page.fill('[data-testid="recipient"]', 'another-user');
    await page.fill('[data-testid="message"]', 'Hello!');
    await page.click('[data-testid="sendMessageButton"]');
    
    // Verify message sent
    await expect(page.locator('[data-testid="messageSent"]')).toBeVisible();
  });
});

test.describe('Monetization Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testUser);
  });

  test('Add funds to wallet', async ({ page }) => {
    const paymentData = {
      amount: '10.00',
      method: 'stripe'
    };
    
    await makePayment(page, paymentData);
    
    // Verify funds added
    await expect(page.locator('[data-testid="walletBalance"]')).toContainText('$10.00');
  });

  test('Purchase in-game items', async ({ page }) => {
    await page.goto(`${BASE_URL}/shop`);
    await page.click('[data-testid="item-1"]');
    await page.click('[data-testid="purchaseButton"]');
    
    // Verify purchase success
    await expect(page.locator('[data-testid="purchaseSuccess"]')).toBeVisible();
  });

  test('Claim daily rewards', async ({ page }) => {
    await page.goto(`${BASE_URL}/rewards`);
    await page.click('[data-testid="claimDailyReward"]');
    
    // Verify reward claimed
    await expect(page.locator('[data-testid="rewardClaimed"]')).toBeVisible();
  });
});

test.describe('Admin Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, testAdmin);
  });

  test('Admin dashboard access', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    
    // Verify admin dashboard
    await expect(page.locator('[data-testid="adminDashboard"]')).toBeVisible();
  });

  test('User management', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);
    
    // Verify user list
    await expect(page.locator('[data-testid="userList"]')).toBeVisible();
    
    // Test user actions
    await page.click('[data-testid="user-actions"]');
    await page.click('[data-testid="banUser"]');
    
    // Verify user banned
    await expect(page.locator('[data-testid="userBanned"]')).toBeVisible();
  });

  test('Content moderation', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/moderation`);
    
    // Verify moderation queue
    await expect(page.locator('[data-testid="moderationQueue"]')).toBeVisible();
    
    // Test content approval
    await page.click('[data-testid="content-1"]');
    await page.click('[data-testid="approveContent"]');
    
    // Verify content approved
    await expect(page.locator('[data-testid="contentApproved"]')).toBeVisible();
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('Handle network errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/**', route => route.abort());
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="identifier"]', testUser.email);
    await page.fill('[data-testid="password"]', testUser.password);
    await page.click('[data-testid="loginButton"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="errorMessage"]')).toBeVisible();
  });

  test('Handle invalid input gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await page.fill('[data-testid="username"]', 'a'); // Too short
    await page.fill('[data-testid="email"]', 'invalid-email');
    await page.fill('[data-testid="password"]', '123'); // Too weak
    await page.click('[data-testid="registerButton"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="usernameError"]')).toBeVisible();
    await expect(page.locator('[data-testid="emailError"]')).toBeVisible();
    await expect(page.locator('[data-testid="passwordError"]')).toBeVisible();
  });

  test('Handle session expiry', async ({ page }) => {
    await loginUser(page, testUser);
    
    // Simulate session expiry
    await page.evaluate(() => {
      localStorage.removeItem('token');
      sessionStorage.removeItem('user');
    });
    
    // Try to access protected page
    await page.goto(`${BASE_URL}/profile`);
    
    // Verify redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});

test.describe('Performance and Load Testing', () => {
  test('Page load performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/dashboard`);
    const loadTime = Date.now() - startTime;
    
    // Verify page loads within acceptable time
    expect(loadTime).toBeLessThan(3000); // 3 seconds
  });

  test('API response times', async ({ page }) => {
    await loginUser(page, testUser);
    
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/api/v1/users/me`);
    const responseTime = Date.now() - startTime;
    
    // Verify API responds within acceptable time
    expect(responseTime).toBeLessThan(1000); // 1 second
  });
});

test.describe('Security Tests', () => {
  test('Prevent XSS attacks', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="identifier"]', '<script>alert("xss")</script>');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="loginButton"]');
    
    // Verify no script execution
    await expect(page.locator('script')).toHaveCount(0);
  });

  test('Prevent SQL injection', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="identifier"]', "admin'; DROP TABLE users; --");
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="loginButton"]');
    
    // Verify login fails gracefully
    await expect(page.locator('[data-testid="errorMessage"]')).toBeVisible();
  });

  test('Enforce HTTPS in production', async ({ page }) => {
    // This test would run in production environment
    if (process.env.NODE_ENV === 'production') {
      await page.goto('http://halobuzz.com');
      
      // Verify redirect to HTTPS
      await expect(page).toHaveURL('https://halobuzz.com');
    }
  });
});

// Cleanup after all tests
test.afterAll(async ({ page }) => {
  // Clean up test data
  await page.request.delete(`${API_BASE_URL}/test/cleanup`);
});
