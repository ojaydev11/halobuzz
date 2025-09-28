import { EventEmitter } from 'events';
import crypto from 'crypto';
import { logger } from '@/config/logger';
import { CoinTransaction, ICoinTransaction } from '@/models/CoinTransaction';
import { CoinWallet, ICoinWallet } from '@/models/CoinWallet';
import { CoinEconomyConfig } from '@/models/CoinEconomyConfig';

export interface TransactionRequest {
  userId: string;
  targetUserId?: string;
  type: ICoinTransaction['type'];
  amount: number;
  source: ICoinTransaction['source'];
  destination: ICoinTransaction['destination'];
  context?: any;
  geoLocation?: ICoinTransaction['geoLocation'];
  deviceInfo?: ICoinTransaction['deviceInfo'];
  bypassFraud?: boolean; // For admin transactions
}

export interface FraudAnalysis {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  reasons: string[];
  recommendations: string[];
  autoAction?: 'allow' | 'review' | 'block';
}

export interface BatchTransactionResult {
  successful: string[]; // Transaction IDs
  failed: { txId: string; error: string; }[];
  totalAmount: number;
  fraudAlerts: number;
}

/**
 * Coin Ledger Service - Blockchain-like transaction system with fraud detection
 * Handles all coin transactions with complete traceability and anti-fraud measures
 */
export class CoinLedgerService extends EventEmitter {
  private static instance: CoinLedgerService;
  private transactionQueue: Map<string, TransactionRequest> = new Map();
  private processingLocks: Set<string> = new Set();
  private fraudPatterns: Map<string, any> = new Map();
  private suspiciousUsers: Set<string> = new Set();

  // Fraud detection thresholds
  private readonly FRAUD_THRESHOLDS = {
    HIGH_VELOCITY: { transactions: 20, timeWindow: 3600000 }, // 20 tx/hour
    LARGE_AMOUNT: 25000, // 25k coins
    SUSPICIOUS_PATTERN: 0.8, // Pattern similarity threshold
    GEOGRAPHIC_MISMATCH: 5000, // km from usual location
    DEVICE_CHANGE_FREQUENCY: 5 // Max device changes per day
  };

  private constructor() {
    super();
    this.initializeFraudPatterns();
    this.startTransactionProcessor();
    this.startFraudMonitoring();
  }

  static getInstance(): CoinLedgerService {
    if (!CoinLedgerService.instance) {
      CoinLedgerService.instance = new CoinLedgerService();
    }
    return CoinLedgerService.instance;
  }

  /**
   * Process a single coin transaction with fraud detection
   */
  async processTransaction(request: TransactionRequest): Promise<ICoinTransaction> {
    const { userId, amount } = request;

    // Validate request
    if (amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }

    // Check for processing locks
    if (this.processingLocks.has(userId)) {
      throw new Error('User has pending transactions');
    }

    // Lock user for transaction processing
    this.processingLocks.add(userId);

    try {
      // Perform fraud analysis (unless bypassed)
      let fraudAnalysis: FraudAnalysis | null = null;
      if (!request.bypassFraud) {
        fraudAnalysis = await this.analyzeFraud(request);

        // Handle critical fraud risk
        if (fraudAnalysis.level === 'critical') {
          await this.handleCriticalFraud(userId, fraudAnalysis);
          throw new Error('Transaction blocked due to security concerns');
        }

        // Handle high fraud risk
        if (fraudAnalysis.level === 'high' && fraudAnalysis.autoAction === 'block') {
          await this.handleHighRiskTransaction(userId, request, fraudAnalysis);
          throw new Error('Transaction requires manual review');
        }
      }

      // Get user wallet with lock
      const wallet = await this.getWalletWithLock(userId);

      // Validate transaction against wallet
      await this.validateTransaction(request, wallet);

      // Create transaction record
      const transaction = await this.createTransaction(request, wallet, fraudAnalysis);

      // Update wallet balances
      await this.updateWalletBalances(request, wallet, transaction);

      // Process special transaction types
      await this.processSpecialTransactionEffects(request, transaction);

      // Update fraud patterns
      await this.updateFraudLearning(userId, request, transaction);

      // Emit events
      this.emit('transactionProcessed', {
        transaction,
        fraudScore: fraudAnalysis?.score || 0,
        userId,
        amount
      });

      logger.info(`Processed transaction ${transaction.txId}: ${request.type} ${amount} coins for user ${userId}`);

      return transaction;

    } finally {
      // Always release lock
      this.processingLocks.delete(userId);
    }
  }

  /**
   * Process multiple transactions atomically
   */
  async processBatchTransactions(requests: TransactionRequest[]): Promise<BatchTransactionResult> {
    const result: BatchTransactionResult = {
      successful: [],
      failed: [],
      totalAmount: 0,
      fraudAlerts: 0
    };

    // Group by user to avoid conflicts
    const userGroups: { [userId: string]: TransactionRequest[] } = {};
    requests.forEach(req => {
      if (!userGroups[req.userId]) {
        userGroups[req.userId] = [];
      }
      userGroups[req.userId].push(req);
    });

    // Process each user's transactions sequentially
    for (const [userId, userRequests] of Object.entries(userGroups)) {
      for (const request of userRequests) {
        try {
          const transaction = await this.processTransaction(request);
          result.successful.push(transaction.txId);
          result.totalAmount += transaction.amount;

          if (transaction.fraudScore && transaction.fraudScore > 70) {
            result.fraudAlerts++;
          }
        } catch (error) {
          result.failed.push({
            txId: `failed_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    this.emit('batchProcessed', result);

    return result;
  }

  /**
   * Get transaction history with advanced filtering
   */
  async getTransactionHistory(
    userId: string,
    filters: {
      type?: ICoinTransaction['type'][];
      dateRange?: { start: Date; end: Date };
      minAmount?: number;
      maxAmount?: number;
      status?: ICoinTransaction['status'][];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ICoinTransaction[]> {
    const query: any = { userId };

    // Apply filters
    if (filters.type && filters.type.length > 0) {
      query.type = { $in: filters.type };
    }

    if (filters.dateRange) {
      query.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount !== undefined) query.amount.$lte = filters.maxAmount;
    }

    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }

    const transactions = await CoinTransaction
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100)
      .skip(filters.offset || 0);

    return transactions;
  }

  /**
   * Verify transaction chain integrity
   */
  async verifyTransactionChain(userId: string, limit = 1000): Promise<{
    isValid: boolean;
    errors: string[];
    verified: number;
    total: number;
  }> {
    const transactions = await CoinTransaction
      .find({ userId })
      .sort({ createdAt: 1 })
      .limit(limit);

    const result = {
      isValid: true,
      errors: [] as string[],
      verified: 0,
      total: transactions.length
    };

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      // Verify hash
      const expectedHash = this.calculateTransactionHash(tx);
      if (tx.hash !== expectedHash) {
        result.isValid = false;
        result.errors.push(`Invalid hash for transaction ${tx.txId}`);
      }

      // Verify chain linkage (if not first transaction)
      if (i > 0) {
        const prevTx = transactions[i - 1];
        if (tx.previousHash !== prevTx.hash) {
          result.isValid = false;
          result.errors.push(`Broken chain at transaction ${tx.txId}`);
        }
      }

      result.verified++;
    }

    return result;
  }

  /**
   * Get comprehensive fraud report for user
   */
  async getFraudReport(userId: string, days = 30): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    totalScore: number;
    flags: string[];
    recentActivity: any;
    recommendations: string[];
  }> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    // Get recent transactions
    const transactions = await CoinTransaction.find({
      userId,
      createdAt: { $gte: since }
    }).sort({ createdAt: -1 });

    // Analyze patterns
    let totalScore = 0;
    const flags: string[] = [];
    const recommendations: string[] = [];

    // Velocity analysis
    const velocityScore = this.analyzeVelocity(transactions);
    totalScore += velocityScore;
    if (velocityScore > 30) {
      flags.push('high_velocity');
      recommendations.push('Monitor transaction frequency');
    }

    // Amount analysis
    const amountScore = this.analyzeLargeAmounts(transactions);
    totalScore += amountScore;
    if (amountScore > 25) {
      flags.push('large_amounts');
      recommendations.push('Verify large transactions');
    }

    // Pattern analysis
    const patternScore = this.analyzeSuspiciousPatterns(transactions);
    totalScore += patternScore;
    if (patternScore > 20) {
      flags.push('suspicious_patterns');
      recommendations.push('Review transaction patterns');
    }

    // Geographic analysis
    const geoScore = this.analyzeGeographicAnomaly(transactions);
    totalScore += geoScore;
    if (geoScore > 15) {
      flags.push('geographic_anomaly');
      recommendations.push('Verify user location');
    }

    // Device analysis
    const deviceScore = this.analyzeDeviceChanges(transactions);
    totalScore += deviceScore;
    if (deviceScore > 10) {
      flags.push('frequent_device_changes');
      recommendations.push('Verify device security');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalScore > 80) riskLevel = 'critical';
    else if (totalScore > 60) riskLevel = 'high';
    else if (totalScore > 40) riskLevel = 'medium';

    // Recent activity summary
    const recentActivity = {
      transactionCount: transactions.length,
      totalAmount: transactions.reduce((sum, tx) => sum + tx.amount, 0),
      uniqueIPs: [...new Set(transactions.map(tx => tx.geoLocation?.ip).filter(Boolean))].length,
      uniqueDevices: [...new Set(transactions.map(tx => tx.deviceInfo?.fingerprint).filter(Boolean))].length,
      avgFraudScore: transactions.reduce((sum, tx) => sum + (tx.fraudScore || 0), 0) / transactions.length
    };

    return {
      riskLevel,
      totalScore: Math.min(100, totalScore),
      flags,
      recentActivity,
      recommendations
    };
  }

  /**
   * Initialize fraud pattern recognition
   */
  private initializeFraudPatterns(): void {
    // Common fraud patterns (would be loaded from ML model in production)
    this.fraudPatterns.set('rapid_fire', {
      pattern: 'multiple transactions within minutes',
      threshold: 5,
      timeWindow: 300000, // 5 minutes
      weight: 20
    });

    this.fraudPatterns.set('round_number', {
      pattern: 'transactions with round numbers',
      threshold: 0.8, // 80% round numbers
      weight: 15
    });

    this.fraudPatterns.set('time_clustering', {
      pattern: 'transactions clustered at specific times',
      threshold: 0.7,
      weight: 10
    });

    logger.info(`Initialized ${this.fraudPatterns.size} fraud patterns`);
  }

  /**
   * Comprehensive fraud analysis
   */
  private async analyzeFraud(request: TransactionRequest): Promise<FraudAnalysis> {
    const { userId, amount, geoLocation, deviceInfo } = request;

    let score = 0;
    const flags: string[] = [];
    const reasons: string[] = [];
    const recommendations: string[] = [];

    // Get user's recent transaction history
    const recentTx = await CoinTransaction.find({
      userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    // 1. Velocity Analysis
    if (recentTx.length > this.FRAUD_THRESHOLDS.HIGH_VELOCITY.transactions) {
      score += 25;
      flags.push('high_velocity');
      reasons.push('Unusually high transaction frequency');
      recommendations.push('Verify user identity');
    }

    // 2. Amount Analysis
    if (amount > this.FRAUD_THRESHOLDS.LARGE_AMOUNT) {
      score += 20;
      flags.push('large_amount');
      reasons.push('Transaction amount exceeds normal limits');
      recommendations.push('Require additional verification');
    }

    // 3. Time Pattern Analysis
    const timePattern = this.analyzeTimePattern(recentTx);
    if (timePattern.suspicious) {
      score += 15;
      flags.push('time_pattern');
      reasons.push('Unusual transaction timing pattern');
      recommendations.push('Monitor future transactions');
    }

    // 4. Geographic Analysis
    if (geoLocation) {
      const geoRisk = await this.analyzeGeographicRisk(userId, geoLocation);
      score += geoRisk.score;
      if (geoRisk.suspicious) {
        flags.push('geographic_anomaly');
        reasons.push(geoRisk.reason);
        recommendations.push('Verify user location');
      }
    }

    // 5. Device Fingerprinting
    if (deviceInfo) {
      const deviceRisk = await this.analyzeDeviceRisk(userId, deviceInfo);
      score += deviceRisk.score;
      if (deviceRisk.suspicious) {
        flags.push('device_anomaly');
        reasons.push(deviceRisk.reason);
        recommendations.push('Verify device authenticity');
      }
    }

    // 6. Behavioral Analysis
    const behaviorRisk = await this.analyzeBehaviorRisk(userId, request);
    score += behaviorRisk.score;
    if (behaviorRisk.suspicious) {
      flags.push('behavioral_anomaly');
      reasons.push(behaviorRisk.reason);
      recommendations.push('Review user behavior patterns');
    }

    // 7. Known Fraud Patterns
    const patternRisk = this.analyzeKnownPatterns(recentTx);
    score += patternRisk.score;
    if (patternRisk.suspicious) {
      flags.push('known_pattern');
      reasons.push(patternRisk.reason);
      recommendations.push('Apply pattern-specific countermeasures');
    }

    // Determine risk level
    let level: FraudAnalysis['level'] = 'low';
    let autoAction: FraudAnalysis['autoAction'] = 'allow';

    if (score >= 85) {
      level = 'critical';
      autoAction = 'block';
    } else if (score >= 70) {
      level = 'high';
      autoAction = 'review';
    } else if (score >= 50) {
      level = 'medium';
      autoAction = 'allow';
    }

    return {
      score: Math.min(100, score),
      level,
      flags,
      reasons,
      recommendations,
      autoAction
    };
  }

  /**
   * Calculate transaction hash for integrity
   */
  private calculateTransactionHash(tx: ICoinTransaction): string {
    const data = `${tx.txId}${tx.userId}${tx.type}${tx.amount}${tx.createdAt?.getTime()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get wallet with optimistic locking
   */
  private async getWalletWithLock(userId: string): Promise<ICoinWallet> {
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.isLocked) {
      throw new Error('Wallet is currently locked');
    }

    return wallet;
  }

  /**
   * Validate transaction against wallet and rules
   */
  private async validateTransaction(request: TransactionRequest, wallet: ICoinWallet): Promise<void> {
    const { type, amount, userId } = request;

    // Check wallet status
    if (wallet.riskProfile.level === 'critical' || wallet.riskProfile.freezeExpiresAt && wallet.riskProfile.freezeExpiresAt > new Date()) {
      throw new Error('Wallet is frozen due to security concerns');
    }

    // Check balance for outgoing transactions
    if (['game_stake', 'gift_sent', 'og_purchase', 'withdrawal', 'premium_feature', 'throne_purchase'].includes(type)) {
      if (!wallet.canSpend(amount)) {
        throw new Error('Insufficient balance');
      }
    }

    // Check daily limits
    const today = new Date().toDateString();
    const todayUsage = wallet.dailyUsage.find(u => u.date.toDateString() === today);
    const dailySpent = todayUsage?.spent || 0;

    if (type === 'withdrawal' && !wallet.canWithdraw(amount)) {
      throw new Error('Withdrawal limit exceeded');
    }

    if (['game_stake', 'gift_sent', 'premium_feature'].includes(type) &&
        dailySpent + amount > wallet.dailyLimits.spending) {
      throw new Error('Daily spending limit exceeded');
    }

    // Check economy config limits
    const config = await CoinEconomyConfig.getCurrentConfig();
    if (config.emergencyControls.enabled) {
      if (config.emergencyControls.maxTransactionAmount && amount > config.emergencyControls.maxTransactionAmount) {
        throw new Error('Transaction exceeds emergency limits');
      }

      if (config.emergencyControls.freezeGaming && type === 'game_stake') {
        throw new Error('Gaming transactions are temporarily disabled');
      }

      if (config.emergencyControls.freezeGifting && type === 'gift_sent') {
        throw new Error('Gifting is temporarily disabled');
      }
    }
  }

  /**
   * Create transaction record
   */
  private async createTransaction(
    request: TransactionRequest,
    wallet: ICoinWallet,
    fraudAnalysis: FraudAnalysis | null
  ): Promise<ICoinTransaction> {
    const { userId, targetUserId, type, amount, source, destination, context, geoLocation, deviceInfo } = request;

    // Calculate balances
    const balanceBefore = wallet.availableBalance;
    let balanceAfter = balanceBefore;

    if (['game_stake', 'gift_sent', 'og_purchase', 'withdrawal', 'premium_feature', 'throne_purchase'].includes(type)) {
      balanceAfter = balanceBefore - amount;
    } else if (['game_win', 'gift_received', 'reward', 'refund'].includes(type)) {
      balanceAfter = balanceBefore + amount;
    }

    const transaction = new CoinTransaction({
      userId,
      targetUserId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      source,
      destination,
      context,
      geoLocation,
      deviceInfo,
      status: fraudAnalysis?.level === 'high' ? 'pending' : 'completed',
      fraudScore: fraudAnalysis?.score || 0,
      riskLevel: fraudAnalysis?.level || 'low'
    });

    return await transaction.save();
  }

  /**
   * Update wallet balances atomically
   */
  private async updateWalletBalances(
    request: TransactionRequest,
    wallet: ICoinWallet,
    transaction: ICoinTransaction
  ): Promise<void> {
    const { type, amount } = request;

    // Update balances based on transaction type
    if (['game_stake', 'gift_sent', 'og_purchase', 'withdrawal', 'premium_feature', 'throne_purchase'].includes(type)) {
      wallet.availableBalance -= amount;
      wallet.totalBalance -= amount;
      wallet.stats.totalSpent += amount;

      // Update balance by source (FIFO approach)
      this.deductFromBalanceSources(wallet, amount);

    } else if (['game_win', 'gift_received', 'reward', 'refund'].includes(type)) {
      wallet.availableBalance += amount;
      wallet.totalBalance += amount;
      wallet.stats.totalEarned += amount;

      // Add to appropriate source
      if (type === 'gift_received') {
        wallet.balanceBySource.gifted += amount;
      } else if (type === 'reward') {
        wallet.balanceBySource.bonus += amount;
      } else {
        wallet.balanceBySource.earned += amount;
      }
    }

    // Update statistics
    wallet.stats.totalTransactions += 1;
    wallet.lastTransactionAt = new Date();

    // Update daily usage
    wallet.updateDailyUsage(this.getUsageType(type), amount);

    await wallet.save();
  }

  /**
   * Process special transaction effects
   */
  private async processSpecialTransactionEffects(
    request: TransactionRequest,
    transaction: ICoinTransaction
  ): Promise<void> {
    const { type, targetUserId, amount } = request;

    // Handle gift transactions
    if (type === 'gift_sent' && targetUserId) {
      // Create corresponding gift_received transaction for target user
      await this.processTransaction({
        userId: targetUserId,
        type: 'gift_received',
        amount,
        source: 'gift',
        destination: 'wallet',
        context: {
          ...request.context,
          fromUserId: request.userId,
          originalTxId: transaction.txId
        }
      });
    }

    // Handle OG purchases
    if (type === 'og_purchase') {
      const wallet = await CoinWallet.findOne({ userId: request.userId });
      if (wallet && request.context?.ogLevel) {
        wallet.ogLevel = Math.max(wallet.ogLevel, request.context.ogLevel);
        wallet.ogCoinsSpent += amount;
        wallet.ogBonusMultiplier = 1.0 + (wallet.ogLevel * 0.1); // 10% bonus per level
        await wallet.save();
      }
    }

    // Handle premium feature purchases
    if (type === 'premium_feature') {
      await this.activatePremiumFeature(request.userId, request.context, amount);
    }
  }

  /**
   * Update fraud learning patterns
   */
  private async updateFraudLearning(
    userId: string,
    request: TransactionRequest,
    transaction: ICoinTransaction
  ): Promise<void> {
    // This would integrate with ML models in production
    // For now, we'll update simple pattern recognition

    if (transaction.fraudScore && transaction.fraudScore > 70) {
      this.suspiciousUsers.add(userId);

      // Learn from high-risk patterns
      const pattern = {
        amount: request.amount,
        type: request.type,
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        geoLocation: request.geoLocation?.country
      };

      // Store pattern for future detection
      const patternKey = `suspicious_${userId}_${Date.now()}`;
      this.fraudPatterns.set(patternKey, {
        pattern: JSON.stringify(pattern),
        weight: transaction.fraudScore * 0.1,
        userId,
        timestamp: new Date()
      });
    }
  }

  // Helper methods for fraud analysis
  private analyzeVelocity(transactions: ICoinTransaction[]): number {
    if (transactions.length < 5) return 0;

    const timeSpan = transactions[0].createdAt.getTime() - transactions[transactions.length - 1].createdAt.getTime();
    const transactionsPerHour = (transactions.length / timeSpan) * 3600000;

    return Math.min(40, transactionsPerHour * 2);
  }

  private analyzeLargeAmounts(transactions: ICoinTransaction[]): number {
    const largeTransactions = transactions.filter(tx => tx.amount > this.FRAUD_THRESHOLDS.LARGE_AMOUNT);
    return Math.min(30, largeTransactions.length * 10);
  }

  private analyzeSuspiciousPatterns(transactions: ICoinTransaction[]): number {
    let score = 0;

    // Check for round numbers
    const roundNumbers = transactions.filter(tx =>
      tx.amount % 100 === 0 || tx.amount % 1000 === 0
    ).length;

    if (roundNumbers / transactions.length > 0.7) {
      score += 15;
    }

    return Math.min(25, score);
  }

  private analyzeGeographicAnomaly(transactions: ICoinTransaction[]): number {
    const countries = [...new Set(
      transactions.map(tx => tx.geoLocation?.country).filter(Boolean)
    )];

    return countries.length > 3 ? Math.min(20, countries.length * 3) : 0;
  }

  private analyzeDeviceChanges(transactions: ICoinTransaction[]): number {
    const devices = [...new Set(
      transactions.map(tx => tx.deviceInfo?.fingerprint).filter(Boolean)
    )];

    return devices.length > this.FRAUD_THRESHOLDS.DEVICE_CHANGE_FREQUENCY ?
      Math.min(15, devices.length * 2) : 0;
  }

  private analyzeTimePattern(transactions: ICoinTransaction[]): { suspicious: boolean; score: number } {
    const hours = transactions.map(tx => tx.createdAt.getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as { [hour: number]: number });

    const maxHourCount = Math.max(...Object.values(hourCounts));
    const suspicious = maxHourCount / transactions.length > 0.5 && transactions.length > 10;

    return { suspicious, score: suspicious ? 10 : 0 };
  }

  private async analyzeGeographicRisk(userId: string, geoLocation: any): Promise<{ score: number; suspicious: boolean; reason: string }> {
    // This would use a geolocation service in production
    const result = { score: 0, suspicious: false, reason: '' };

    // Mock implementation - would check against user's typical locations
    const riskCountries = ['CN', 'RU', 'KP', 'IR']; // Example high-risk countries
    if (riskCountries.includes(geoLocation.country)) {
      result.score = 25;
      result.suspicious = true;
      result.reason = 'Transaction from high-risk country';
    }

    return result;
  }

  private async analyzeDeviceRisk(userId: string, deviceInfo: any): Promise<{ score: number; suspicious: boolean; reason: string }> {
    const result = { score: 0, suspicious: false, reason: '' };

    // Check for suspicious user agents or devices
    if (deviceInfo.userAgent && deviceInfo.userAgent.includes('bot')) {
      result.score = 30;
      result.suspicious = true;
      result.reason = 'Bot-like user agent detected';
    }

    return result;
  }

  private async analyzeBehaviorRisk(userId: string, request: TransactionRequest): Promise<{ score: number; suspicious: boolean; reason: string }> {
    const result = { score: 0, suspicious: false, reason: '' };

    // Analyze user's typical behavior patterns
    const historicalAvg = await CoinTransaction.aggregate([
      { $match: { userId, type: request.type } },
      { $group: { _id: null, avgAmount: { $avg: '$amount' } } }
    ]);

    if (historicalAvg.length > 0) {
      const avgAmount = historicalAvg[0].avgAmount;
      const deviation = Math.abs(request.amount - avgAmount) / avgAmount;

      if (deviation > 5) { // 500% deviation from normal
        result.score = Math.min(20, deviation * 2);
        result.suspicious = true;
        result.reason = 'Amount significantly deviates from user pattern';
      }
    }

    return result;
  }

  private analyzeKnownPatterns(transactions: ICoinTransaction[]): { score: number; suspicious: boolean; reason: string } {
    const result = { score: 0, suspicious: false, reason: '' };

    // Check against known fraud patterns
    for (const [patternId, pattern] of this.fraudPatterns) {
      if (patternId.startsWith('suspicious_')) {
        // Simple pattern matching - would use ML in production
        const matchingTx = transactions.filter(tx =>
          tx.amount === (pattern as any).amount || tx.type === (pattern as any).type
        );

        if (matchingTx.length >= 3) {
          result.score += (pattern as any).weight || 10;
          result.suspicious = true;
          result.reason = 'Matches known fraud pattern';
          break;
        }
      }
    }

    return result;
  }

  // Additional helper methods
  private deductFromBalanceSources(wallet: ICoinWallet, amount: number): void {
    let remaining = amount;

    // FIFO: Deduct from bonus first, then purchased, gifted, earned
    const sources = ['bonus', 'purchased', 'gifted', 'earned'] as const;

    for (const source of sources) {
      if (remaining <= 0) break;

      const available = wallet.balanceBySource[source];
      const deduction = Math.min(available, remaining);

      wallet.balanceBySource[source] -= deduction;
      remaining -= deduction;
    }
  }

  private getUsageType(transactionType: string): string {
    const mapping: { [key: string]: string } = {
      'game_stake': 'gamed',
      'gift_sent': 'gifted',
      'withdrawal': 'withdrawn',
      'og_purchase': 'spent',
      'premium_feature': 'spent',
      'throne_purchase': 'spent'
    };

    return mapping[transactionType] || 'spent';
  }

  private async activatePremiumFeature(userId: string, context: any, amount: number): Promise<void> {
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet) return;

    const { feature, duration } = context;
    const expiresAt = new Date(Date.now() + (duration || 86400000)); // Default 1 day

    switch (feature) {
      case 'haloThrone':
        wallet.premiumFeatures.haloThrone.active = true;
        wallet.premiumFeatures.haloThrone.expiresAt = expiresAt;
        wallet.premiumFeatures.haloThrone.coinsSpent += amount;
        break;
      case 'stealthMode':
        wallet.premiumFeatures.stealthMode.active = true;
        wallet.premiumFeatures.stealthMode.expiresAt = expiresAt;
        wallet.premiumFeatures.stealthMode.coinsSpent += amount;
        break;
      // Add other premium features as needed
    }

    await wallet.save();
  }

  private async handleCriticalFraud(userId: string, fraudAnalysis: FraudAnalysis): Promise<void> {
    // Freeze user wallet
    const wallet = await CoinWallet.findOne({ userId });
    if (wallet) {
      wallet.riskProfile.level = 'critical';
      wallet.riskProfile.flags = fraudAnalysis.flags;
      wallet.riskProfile.freezeReason = 'Critical fraud risk detected';
      wallet.riskProfile.freezeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await wallet.save();
    }

    // Alert security team
    this.emit('criticalFraud', { userId, fraudAnalysis });

    logger.error(`Critical fraud detected for user ${userId}:`, fraudAnalysis);
  }

  private async handleHighRiskTransaction(
    userId: string,
    request: TransactionRequest,
    fraudAnalysis: FraudAnalysis
  ): Promise<void> {
    // Queue for manual review
    this.transactionQueue.set(`review_${Date.now()}_${userId}`, request);

    // Update user risk profile
    const wallet = await CoinWallet.findOne({ userId });
    if (wallet) {
      wallet.riskProfile.level = 'high';
      wallet.riskProfile.flags = [...new Set([...wallet.riskProfile.flags, ...fraudAnalysis.flags])];
      await wallet.save();
    }

    this.emit('highRiskTransaction', { userId, request, fraudAnalysis });

    logger.warn(`High-risk transaction queued for review - user ${userId}:`, fraudAnalysis);
  }

  private startTransactionProcessor(): void {
    // Process queued transactions every 30 seconds
    setInterval(() => {
      // This would handle queued/pending transactions in production
      logger.debug(`Transaction queue size: ${this.transactionQueue.size}`);
    }, 30000);
  }

  private startFraudMonitoring(): void {
    // Monitor fraud patterns every 5 minutes
    setInterval(async () => {
      try {
        await this.analyzeFraudTrends();
        await this.updateSuspiciousUserList();
        await this.cleanupOldPatterns();
      } catch (error) {
        logger.error('Error in fraud monitoring:', error);
      }
    }, 300000); // 5 minutes
  }

  private async analyzeFraudTrends(): Promise<void> {
    const recentHighRisk = await CoinTransaction.countDocuments({
      fraudScore: { $gte: 70 },
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

    if (recentHighRisk > 10) {
      this.emit('fraudTrendAlert', { count: recentHighRisk, timeWindow: 'hour' });
      logger.warn(`High fraud activity detected: ${recentHighRisk} high-risk transactions in the last hour`);
    }
  }

  private async updateSuspiciousUserList(): Promise<void> {
    const suspiciousUsers = await CoinWallet.find({
      'riskProfile.level': { $in: ['high', 'critical'] }
    }).distinct('userId');

    this.suspiciousUsers = new Set(suspiciousUsers);
  }

  private cleanupOldPatterns(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

    for (const [key, pattern] of this.fraudPatterns) {
      if (key.startsWith('suspicious_') && (pattern as any).timestamp < cutoff) {
        this.fraudPatterns.delete(key);
      }
    }
  }
}

export const coinLedger = CoinLedgerService.getInstance();