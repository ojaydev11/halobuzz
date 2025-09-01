import { featureFlags } from '@/config/flags';
import { connectDatabase } from '@/config/database';
import mongoose from 'mongoose';

describe('Feature Flags Service', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
    await featureFlags.initializeFlags();
  });

  describe('Flag Initialization', () => {
    it('should initialize default flags', async () => {
      const gamesEnabled = await featureFlags.isGamesEnabled();
      const maintenanceMode = await featureFlags.isMaintenanceMode();
      const paymentsEnabled = await featureFlags.isPaymentsEnabled();

      expect(typeof gamesEnabled).toBe('boolean');
      expect(typeof maintenanceMode).toBe('boolean');
      expect(typeof paymentsEnabled).toBe('boolean');
    });

    it('should return default values for unknown flags', async () => {
      const unknownFlag = await featureFlags.getFlag('nonexistent_flag');
      expect(unknownFlag).toBe(false);
    });
  });

  describe('Flag Management', () => {
    it('should set and get flags', async () => {
      await featureFlags.setFlag('gamesEnabledGlobal', false, 'test-admin');
      const flagValue = await featureFlags.getFlag('gamesEnabledGlobal');
      expect(flagValue).toBe(false);
    });

    it('should update flag values', async () => {
      // Set initial value
      await featureFlags.setFlag('maintenanceMode', true, 'test-admin');
      expect(await featureFlags.isMaintenanceMode()).toBe(true);

      // Update value
      await featureFlags.setFlag('maintenanceMode', false, 'test-admin');
      expect(await featureFlags.isMaintenanceMode()).toBe(false);
    });

    it('should track flag changes with user attribution', async () => {
      await featureFlags.setFlag('paymentsEnabled', false, 'admin-123');
      
      const allFlags = await featureFlags.getAllFlags();
      const paymentsFlag = allFlags.find(flag => flag.key === 'paymentsEnabled');
      
      expect(paymentsFlag).toBeDefined();
      expect(paymentsFlag?.value).toBe(false);
      expect(paymentsFlag?.modifiedBy).toBe('admin-123');
    });
  });

  describe('Cache Management', () => {
    it('should cache flag values', async () => {
      // Set a flag
      await featureFlags.setFlag('gamesEnabledGlobal', false, 'test-admin');
      
      // Get it twice (second should be from cache)
      const value1 = await featureFlags.getFlag('gamesEnabledGlobal');
      const value2 = await featureFlags.getFlag('gamesEnabledGlobal');
      
      expect(value1).toBe(value2);
      expect(value1).toBe(false);
    });

    it('should refresh cache', async () => {
      await featureFlags.refreshCache();
      
      // Should not throw and should still work
      const gamesEnabled = await featureFlags.isGamesEnabled();
      expect(typeof gamesEnabled).toBe('boolean');
    });
  });

  describe('Convenience Methods', () => {
    it('should provide convenience methods for common flags', async () => {
      // Test all convenience methods
      const gamesEnabled = await featureFlags.isGamesEnabled();
      const maintenanceMode = await featureFlags.isMaintenanceMode();
      const registrationPaused = await featureFlags.isRegistrationPaused();
      const paymentsEnabled = await featureFlags.isPaymentsEnabled();
      const highSpenderControls = await featureFlags.isHighSpenderControlsEnabled();
      const ageVerificationRequired = await featureFlags.isAgeVerificationRequired();
      const kycRequired = await featureFlags.isKycRequiredForHosts();

      expect(typeof gamesEnabled).toBe('boolean');
      expect(typeof maintenanceMode).toBe('boolean');
      expect(typeof registrationPaused).toBe('boolean');
      expect(typeof paymentsEnabled).toBe('boolean');
      expect(typeof highSpenderControls).toBe('boolean');
      expect(typeof ageVerificationRequired).toBe('boolean');
      expect(typeof kycRequired).toBe('boolean');
    });
  });

  describe('Flag Categories', () => {
    it('should organize flags by categories', async () => {
      const allFlags = await featureFlags.getAllFlags();
      
      const categories = [...new Set(allFlags.map(flag => flag.category))];
      expect(categories).toContain('core');
      expect(categories).toContain('safety');
      expect(categories).toContain('payments');
      expect(categories).toContain('compliance');
    });

    it('should have proper flag metadata', async () => {
      const allFlags = await featureFlags.getAllFlags();
      
      for (const flag of allFlags) {
        expect(flag.key).toBeDefined();
        expect(typeof flag.value).toBe('boolean');
        expect(flag.description).toBeDefined();
        expect(flag.category).toBeDefined();
        expect(flag.lastModified).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database connection to simulate error
      await mongoose.connection.close();
      
      // Should return default value instead of throwing
      const flagValue = await featureFlags.getFlag('gamesEnabledGlobal');
      expect(typeof flagValue).toBe('boolean');
      
      // Reconnect for cleanup
      await connectDatabase();
    });

    it('should handle invalid flag updates gracefully', async () => {
      // This should not throw, but might fail silently
      await expect(
        featureFlags.setFlag('nonexistent_flag', true, 'test-admin')
      ).resolves.not.toThrow();
    });
  });

  describe('Security Features', () => {
    it('should have security-related flags', async () => {
      const allFlags = await featureFlags.getAllFlags();
      
      const securityFlags = allFlags.filter(flag => 
        flag.category === 'safety' || 
        flag.category === 'compliance' ||
        flag.key.includes('security') ||
        flag.key.includes('verification')
      );
      
      expect(securityFlags.length).toBeGreaterThan(0);
    });

    it('should default to secure settings', async () => {
      // Security-critical flags should default to secure values
      const ageVerificationRequired = await featureFlags.isAgeVerificationRequired();
      const kycRequired = await featureFlags.isKycRequiredForHosts();
      const highSpenderControls = await featureFlags.isHighSpenderControlsEnabled();
      
      expect(ageVerificationRequired).toBe(true);
      expect(kycRequired).toBe(true);
      expect(highSpenderControls).toBe(true);
    });
  });
});
