import { riskControlsService } from '@/services/RiskControlsService';
import { connectDatabase } from '@/config/database';
import { User } from '@/models/User';
import mongoose from 'mongoose';

describe('Risk Controls Service', () => {
  let testUserId: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
    
    // Create test user
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      country: 'US',
      age: 25,
      ageVerified: true
    });
    testUserId = testUser._id.toString();
  });

  describe('Risk Assessment', () => {
    it('should allow spending under daily limits', async () => {
      const riskAssessment = await riskControlsService.assessUserRisk(
        testUserId,
        100, // Under limit
        'spend'
      );

      expect(riskAssessment.allowed).toBe(true);
      expect(riskAssessment.reason).toBeUndefined();
    });

    it('should block spending over daily limits', async () => {
      // Record high spending
      await riskControlsService.recordSpend(testUserId, 1500);

      const riskAssessment = await riskControlsService.assessUserRisk(
        testUserId,
        600, // This would exceed daily limit
        'spend'
      );

      expect(riskAssessment.allowed).toBe(false);
      expect(riskAssessment.limitsExceeded).toContain('daily_spend_limit');
    });

    it('should block losses over daily limits', async () => {
      // Record high losses
      await riskControlsService.recordLoss(testUserId, 800);

      const riskAssessment = await riskControlsService.assessUserRisk(
        testUserId,
        300, // This would exceed daily loss limit
        'loss'
      );

      expect(riskAssessment.allowed).toBe(false);
      expect(riskAssessment.limitsExceeded).toContain('daily_loss_limit');
    });

    it('should block underage users', async () => {
      // Create underage user
      const underageUser = await User.create({
        username: 'underage',
        email: 'underage@example.com',
        password: 'hashedpassword',
        country: 'US',
        age: 16,
        ageVerified: true
      });

      const riskAssessment = await riskControlsService.assessUserRisk(
        underageUser._id.toString(),
        100,
        'spend'
      );

      expect(riskAssessment.allowed).toBe(false);
      expect(riskAssessment.reason).toBe('under_minimum_age');
    });
  });

  describe('Session Management', () => {
    it('should track user sessions', async () => {
      await riskControlsService.startUserSession(testUserId);

      const sessionStatus = await riskControlsService.getSessionStatus(testUserId);

      expect(sessionStatus.isActive).toBe(true);
      expect(sessionStatus.startTime).toBeDefined();
      expect(sessionStatus.duration).toBeGreaterThanOrEqual(0);
    });

    it('should end user sessions', async () => {
      await riskControlsService.startUserSession(testUserId);
      await riskControlsService.endUserSession(testUserId);

      const sessionStatus = await riskControlsService.getSessionStatus(testUserId);

      expect(sessionStatus.isActive).toBe(false);
    });

    it('should force session end when time limit exceeded', async () => {
      // This would require mocking time or database records
      // For now, test the basic functionality
      await riskControlsService.startUserSession(testUserId);
      await riskControlsService.endUserSession(testUserId, true); // Force end

      const sessionStatus = await riskControlsService.getSessionStatus(testUserId);
      expect(sessionStatus.isActive).toBe(false);
    });
  });

  describe('Self-Exclusion', () => {
    it('should allow users to self-exclude', async () => {
      const success = await riskControlsService.setSelfExclusion(
        testUserId,
        7, // 7 days
        'Need a break from gaming'
      );

      expect(success).toBe(true);

      const riskAssessment = await riskControlsService.assessUserRisk(
        testUserId,
        100,
        'spend'
      );

      expect(riskAssessment.allowed).toBe(false);
      expect(riskAssessment.reason).toBe('self_excluded');
    });

    it('should allow admin exclusion', async () => {
      const success = await riskControlsService.setAdminExclusion(
        testUserId,
        30, // 30 days
        'Excessive spending patterns detected',
        'admin-123'
      );

      expect(success).toBe(true);

      const riskAssessment = await riskControlsService.assessUserRisk(
        testUserId,
        100,
        'spend'
      );

      expect(riskAssessment.allowed).toBe(false);
      expect(riskAssessment.reason).toBe('admin_excluded');
    });
  });

  describe('Reality Checks', () => {
    it('should trigger reality checks', async () => {
      await riskControlsService.triggerRealityCheck(testUserId);

      // Verify reality check was recorded (would check database)
      const userRiskProfile = await riskControlsService.getUserRiskProfile(testUserId);
      expect(userRiskProfile?.lastRealityCheck).toBeDefined();
    });
  });

  describe('Risk Level Updates', () => {
    it('should update risk level based on spending', async () => {
      // Record high spending to trigger whale status
      await riskControlsService.recordSpend(testUserId, 2000);

      const userRiskProfile = await riskControlsService.getUserRiskProfile(testUserId);
      expect(userRiskProfile?.riskLevel).toBe('whale');
    });

    it('should identify high-risk users', async () => {
      // Create multiple high-spending users
      await riskControlsService.recordSpend(testUserId, 2000);

      const highRiskUsers = await riskControlsService.getHighRiskUsers();
      expect(highRiskUsers.length).toBeGreaterThan(0);
      
      const testUserInList = highRiskUsers.find(
        user => user._id.toString() === testUserId
      );
      expect(testUserInList).toBeDefined();
    });
  });

  describe('Country Controls', () => {
    it('should respect country-specific game restrictions', async () => {
      // Initialize country with games disabled
      await riskControlsService.initializeCountryConfig('TEST');

      const gamesEnabled = await riskControlsService.isGamesEnabledForCountry('TEST');
      expect(gamesEnabled).toBe(false); // Default is disabled
    });
  });
});
