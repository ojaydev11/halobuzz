import { complianceService } from '@/services/ComplianceService';
import { connectDatabase } from '@/config/database';
import { User } from '@/models/User';
import mongoose from 'mongoose';

describe('Compliance Service', () => {
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

  describe('Age Compliance', () => {
    it('should allow verified adults to access features', async () => {
      const complianceCheck = await complianceService.checkAgeCompliance(
        testUserId,
        'games'
      );

      expect(complianceCheck.allowed).toBe(true);
      expect(complianceCheck.reason).toBeUndefined();
    });

    it('should block unverified users from restricted features', async () => {
      // Create unverified user
      const unverifiedUser = await User.create({
        username: 'unverified',
        email: 'unverified@example.com',
        password: 'hashedpassword',
        country: 'US',
        age: 25,
        ageVerified: false
      });

      const complianceCheck = await complianceService.checkAgeCompliance(
        unverifiedUser._id.toString(),
        'games'
      );

      expect(complianceCheck.allowed).toBe(false);
      expect(complianceCheck.reason).toBe('age_verification_required');
    });

    it('should block minors from restricted features', async () => {
      // Create minor user
      const minorUser = await User.create({
        username: 'minor',
        email: 'minor@example.com',
        password: 'hashedpassword',
        country: 'US',
        age: 16,
        ageVerified: true
      });

      const complianceCheck = await complianceService.checkAgeCompliance(
        minorUser._id.toString(),
        'games'
      );

      expect(complianceCheck.allowed).toBe(false);
      expect(complianceCheck.reason).toBe('under_minimum_age');
    });
  });

  describe('KYC Verification', () => {
    it('should allow KYC submission for eligible users', async () => {
      const kycData = {
        documentType: 'passport',
        documentNumber: 'P123456789',
        documentCountry: 'US',
        fullName: 'Test User',
        dateOfBirth: new Date('1995-01-01'),
        nationality: 'US',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US'
        }
      };

      const result = await complianceService.submitKYCVerification(
        testUserId,
        kycData,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Test Agent',
          deviceId: 'test-device'
        }
      );

      expect(result.success).toBe(true);
      expect(result.kycId).toBeDefined();
    });

    it('should reject KYC for underage users', async () => {
      const kycData = {
        documentType: 'passport',
        documentNumber: 'P123456789',
        documentCountry: 'US',
        fullName: 'Young User',
        dateOfBirth: new Date('2010-01-01'), // Underage
        nationality: 'US',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US'
        }
      };

      const result = await complianceService.submitKYCVerification(
        testUserId,
        kycData,
        {
          ipAddress: '192.168.1.1',
          userAgent: 'Test Agent',
          deviceId: 'test-device'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('18 years old');
    });

    it('should prevent multiple pending KYC submissions', async () => {
      const kycData = {
        documentType: 'passport',
        documentNumber: 'P123456789',
        documentCountry: 'US',
        fullName: 'Test User',
        dateOfBirth: new Date('1995-01-01'),
        nationality: 'US',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US'
        }
      };

      // First submission
      const firstResult = await complianceService.submitKYCVerification(
        testUserId,
        kycData,
        { ipAddress: '192.168.1.1' }
      );

      // Second submission (should be rejected)
      const secondResult = await complianceService.submitKYCVerification(
        testUserId,
        kycData,
        { ipAddress: '192.168.1.1' }
      );

      expect(firstResult.success).toBe(true);
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain('already pending');
    });
  });

  describe('KYC Review Process', () => {
    it('should allow KYC approval', async () => {
      // First submit KYC
      const kycData = {
        documentType: 'passport',
        documentNumber: 'P123456789',
        documentCountry: 'US',
        fullName: 'Test User',
        dateOfBirth: new Date('1995-01-01'),
        nationality: 'US',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US'
        }
      };

      const submitResult = await complianceService.submitKYCVerification(
        testUserId,
        kycData,
        { ipAddress: '192.168.1.1' }
      );

      expect(submitResult.success).toBe(true);

      // Then approve it
      const approveResult = await complianceService.processKYCReview(
        submitResult.kycId!,
        'approved',
        'admin-test',
        'Documents verified successfully'
      );

      expect(approveResult).toBe(true);
    });

    it('should allow KYC rejection', async () => {
      // First submit KYC
      const kycData = {
        documentType: 'passport',
        documentNumber: 'P123456789',
        documentCountry: 'US',
        fullName: 'Test User',
        dateOfBirth: new Date('1995-01-01'),
        nationality: 'US',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          postalCode: '12345',
          country: 'US'
        }
      };

      const submitResult = await complianceService.submitKYCVerification(
        testUserId,
        kycData,
        { ipAddress: '192.168.1.1' }
      );

      expect(submitResult.success).toBe(true);

      // Then reject it
      const rejectResult = await complianceService.processKYCReview(
        submitResult.kycId!,
        'rejected',
        'admin-test',
        'Document quality insufficient',
        'poor_image_quality'
      );

      expect(rejectResult).toBe(true);
    });
  });

  describe('KYC Requirements', () => {
    it('should require KYC for live streaming hosts', async () => {
      const complianceCheck = await complianceService.checkKYCRequirement(
        testUserId,
        'start_live_stream'
      );

      expect(complianceCheck.allowed).toBe(false);
      expect(complianceCheck.reason).toBe('kyc_required_for_hosts');
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance reports', async () => {
      // Record some compliance actions
      await complianceService.recordComplianceAction(
        testUserId,
        'age_gate_block',
        'User attempted to access restricted feature',
        { feature: 'games' }
      );

      const report = await complianceService.getComplianceReport('US');
      expect(Array.isArray(report)).toBe(true);
    });

    it('should track minor users', async () => {
      // Create minor user with age verification
      const minorUser = await User.create({
        username: 'minor',
        email: 'minor@example.com',
        password: 'hashedpassword',
        country: 'US',
        age: 16,
        ageVerified: true
      });

      // This would create age verification record in real implementation
      const minorUsers = await complianceService.getMinorUsers();
      expect(Array.isArray(minorUsers)).toBe(true);
    });

    it('should list pending KYC verifications', async () => {
      const pendingKYCs = await complianceService.getPendingKYCVerifications();
      expect(Array.isArray(pendingKYCs)).toBe(true);
    });
  });
});
