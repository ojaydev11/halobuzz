import { paymentFraudService } from '@/services/PaymentFraudService';
import { connectDatabase } from '@/config/database';
import mongoose from 'mongoose';

describe('Payment Fraud Service', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
  });

  describe('Risk Assessment', () => {
    it('should block transactions when velocity limits exceeded', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const deviceId = 'test-device-123';
      const ip = '192.168.1.100';

      // Simulate multiple rapid transactions
      for (let i = 0; i < 12; i++) {
        await paymentFraudService.recordPaymentEvent(
          userId,
          deviceId,
          ip,
          'payment_attempt',
          100,
          'card'
        );
      }

      const riskAssessment = await paymentFraudService.assessPaymentRisk(
        userId,
        deviceId,
        ip,
        100,
        'card'
      );

      expect(riskAssessment.blocked).toBe(true);
      expect(riskAssessment.factors).toContain('max_hourly_recharges_exceeded');
    });

    it('should allow transactions under velocity limits', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const deviceId = 'test-device-456';
      const ip = '192.168.1.101';

      const riskAssessment = await paymentFraudService.assessPaymentRisk(
        userId,
        deviceId,
        ip,
        50,
        'card'
      );

      expect(riskAssessment.blocked).toBe(false);
      expect(riskAssessment.factors.length).toBe(0);
    });

    it('should increase risk score for high amounts', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const deviceId = 'test-device-789';
      const ip = '192.168.1.102';

      const highAmountAssessment = await paymentFraudService.assessPaymentRisk(
        userId,
        deviceId,
        ip,
        2000, // High amount
        'card'
      );

      const lowAmountAssessment = await paymentFraudService.assessPaymentRisk(
        userId,
        deviceId,
        ip,
        50, // Low amount
        'card'
      );

      expect(highAmountAssessment.score).toBeGreaterThan(lowAmountAssessment.score);
    });

    it('should flag transactions without device ID', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const ip = '192.168.1.103';

      const riskAssessment = await paymentFraudService.assessPaymentRisk(
        userId,
        undefined, // No device ID
        ip,
        100,
        'card'
      );

      expect(riskAssessment.factors).toContain('no_device_id');
      expect(riskAssessment.score).toBeGreaterThan(0);
    });
  });

  describe('Device Fingerprinting', () => {
    it('should track device history', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const deviceId = 'test-device-tracking';
      const ip1 = '192.168.1.104';
      const ip2 = '192.168.1.105';

      await paymentFraudService.updateDeviceFingerprint(
        deviceId,
        userId,
        ip1,
        'Mozilla/5.0...',
        'en-US'
      );

      await paymentFraudService.updateDeviceFingerprint(
        deviceId,
        userId,
        ip2,
        'Mozilla/5.0...',
        'en-US'
      );

      const trustScore = await paymentFraudService.getDeviceTrustScore(deviceId);
      expect(trustScore).toBeDefined();
      expect(typeof trustScore).toBe('number');
    });
  });

  describe('Transaction Review', () => {
    it('should create review transactions for high-risk payments', async () => {
      const transactionId = 'tx-review-test-123';
      const userId = new mongoose.Types.ObjectId().toString();

      await paymentFraudService.createReviewTransaction(
        transactionId,
        userId,
        1500,
        'card',
        85, // High risk score
        ['high_amount', 'new_device']
      );

      const pendingReviews = await paymentFraudService.getPendingReviews();
      const reviewTransaction = pendingReviews.find(
        review => review.transactionId === transactionId
      );

      expect(reviewTransaction).toBeDefined();
      expect(reviewTransaction.status).toBe('pending');
      expect(reviewTransaction.riskScore).toBe(85);
    });

    it('should allow reviewing transactions', async () => {
      const transactionId = 'tx-review-test-456';
      const userId = new mongoose.Types.ObjectId().toString();

      await paymentFraudService.createReviewTransaction(
        transactionId,
        userId,
        500,
        'card',
        60,
        ['medium_risk']
      );

      const success = await paymentFraudService.reviewTransaction(
        transactionId,
        'approved',
        'admin-test',
        'Transaction approved after manual review'
      );

      expect(success).toBe(true);
    });
  });
});
