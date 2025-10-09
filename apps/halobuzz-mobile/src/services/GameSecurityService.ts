import { Alert } from 'react-native';
import { apiClient } from '@/lib/api';

export interface SecurityValidation {
  isValid: boolean;
  message?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface GameSecurityConfig {
  maxStakePerHour: number;
  maxGamesPerHour: number;
  maxConsecutiveLosses: number;
  suspiciousActivityThreshold: number;
  requireKYC: boolean;
  enableFraudDetection: boolean;
}

export interface PlayerSecurityProfile {
  userId: string;
  totalStakes: number;
  totalWinnings: number;
  gamesPlayed: number;
  consecutiveLosses: number;
  lastGameTime: string;
  riskScore: number;
  isBlocked: boolean;
  blockReason?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
}

class GameSecurityService {
  private static instance: GameSecurityService;
  private securityConfig: GameSecurityConfig;
  private playerProfiles: Map<string, PlayerSecurityProfile> = new Map();
  private suspiciousActivities: Map<string, any[]> = new Map();

  constructor() {
    this.securityConfig = {
      maxStakePerHour: 10000, // Maximum coins that can be staked per hour
      maxGamesPerHour: 100, // Maximum games per hour
      maxConsecutiveLosses: 10, // Block after 10 consecutive losses
      suspiciousActivityThreshold: 0.8, // Risk score threshold
      requireKYC: false, // Set to true for production
      enableFraudDetection: true
    };
  }

  static getInstance(): GameSecurityService {
    if (!GameSecurityService.instance) {
      GameSecurityService.instance = new GameSecurityService();
    }
    return GameSecurityService.instance;
  }

  // Validate stake before allowing game
  async validateStake(userId: string, stake: number, gameId: string): Promise<SecurityValidation> {
    try {
      // Get or create player profile
      let profile = this.playerProfiles.get(userId);
      if (!profile) {
        profile = await this.createPlayerProfile(userId);
      }

      // Check if player is blocked
      if (profile.isBlocked) {
        return {
          isValid: false,
          message: `Account temporarily blocked: ${profile.blockReason}`,
          riskLevel: 'high'
        };
      }

      // Check KYC requirement
      if (this.securityConfig.requireKYC && profile.kycStatus !== 'verified') {
        return {
          isValid: false,
          message: 'KYC verification required to play games',
          riskLevel: 'medium'
        };
      }

      // Check hourly limits
      const hourlyValidation = this.validateHourlyLimits(profile, stake);
      if (!hourlyValidation.isValid) {
        return hourlyValidation;
      }

      // Check consecutive losses
      if (profile.consecutiveLosses >= this.securityConfig.maxConsecutiveLosses) {
        await this.blockPlayer(userId, 'Too many consecutive losses');
        return {
          isValid: false,
          message: 'Account temporarily suspended due to consecutive losses',
          riskLevel: 'high'
        };
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(profile, stake);
      profile.riskScore = riskScore;

      if (riskScore >= this.securityConfig.suspiciousActivityThreshold) {
        await this.flagSuspiciousActivity(userId, 'High risk score detected', { stake, gameId, riskScore });
        return {
          isValid: false,
          message: 'Suspicious activity detected. Please contact support.',
          riskLevel: 'high'
        };
      }

      return {
        isValid: true,
        riskLevel: riskScore > 0.5 ? 'medium' : 'low'
      };

    } catch (error) {
      console.error('Security validation error:', error);
      return {
        isValid: false,
        message: 'Security validation failed',
        riskLevel: 'high'
      };
    }
  }

  // Validate hourly limits
  private validateHourlyLimits(profile: PlayerSecurityProfile, stake: number): SecurityValidation {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const lastGameTime = new Date(profile.lastGameTime);

    // Reset counters if more than an hour has passed
    if (lastGameTime < oneHourAgo) {
      profile.totalStakes = 0;
      profile.gamesPlayed = 0;
    }

    // Check stake limit
    if (profile.totalStakes + stake > this.securityConfig.maxStakePerHour) {
      return {
        isValid: false,
        message: `Hourly stake limit exceeded. You can stake ${this.securityConfig.maxStakePerHour - profile.totalStakes} more coins this hour.`,
        riskLevel: 'medium'
      };
    }

    // Check games limit
    if (profile.gamesPlayed >= this.securityConfig.maxGamesPerHour) {
      return {
        isValid: false,
        message: `Hourly games limit exceeded. You can play ${this.securityConfig.maxGamesPerHour - profile.gamesPlayed} more games this hour.`,
        riskLevel: 'medium'
      };
    }

    return { isValid: true, riskLevel: 'low' };
  }

  // Calculate risk score based on player behavior
  private calculateRiskScore(profile: PlayerSecurityProfile, stake: number): number {
    let riskScore = 0;

    // High stake relative to total winnings
    if (profile.totalWinnings > 0 && stake > profile.totalWinnings * 0.5) {
      riskScore += 0.3;
    }

    // High consecutive losses
    if (profile.consecutiveLosses > 5) {
      riskScore += 0.2;
    }

    // High games frequency
    const gamesPerHour = profile.gamesPlayed;
    if (gamesPerHour > 50) {
      riskScore += 0.2;
    }

    // High stake amount
    if (stake > 1000) {
      riskScore += 0.1;
    }

    // New player with high stakes
    if (profile.gamesPlayed < 10 && stake > 500) {
      riskScore += 0.2;
    }

    return Math.min(riskScore, 1.0);
  }

  // Create player profile
  private async createPlayerProfile(userId: string): Promise<PlayerSecurityProfile> {
    const profile: PlayerSecurityProfile = {
      userId,
      totalStakes: 0,
      totalWinnings: 0,
      gamesPlayed: 0,
      consecutiveLosses: 0,
      lastGameTime: new Date().toISOString(),
      riskScore: 0,
      isBlocked: false,
      kycStatus: 'pending' // Default for testing
    };

    this.playerProfiles.set(userId, profile);
    return profile;
  }

  // Update player profile after game
  async updatePlayerProfile(userId: string, stake: number, won: boolean, winnings: number): Promise<void> {
    const profile = this.playerProfiles.get(userId);
    if (!profile) return;

    profile.totalStakes += stake;
    profile.gamesPlayed += 1;
    profile.lastGameTime = new Date().toISOString();

    if (won) {
      profile.totalWinnings += winnings;
      profile.consecutiveLosses = 0;
    } else {
      profile.consecutiveLosses += 1;
    }

    // Update risk score
    profile.riskScore = this.calculateRiskScore(profile, stake);

    // Check for suspicious patterns
    if (this.securityConfig.enableFraudDetection) {
      await this.detectFraudPatterns(userId, profile);
    }
  }

  // Detect fraud patterns
  private async detectFraudPatterns(userId: string, profile: PlayerSecurityProfile): Promise<void> {
    const suspiciousPatterns = [];

    // Pattern 1: Unusually high win rate
    if (profile.gamesPlayed > 20) {
      const winRate = profile.totalWinnings / profile.totalStakes;
      if (winRate > 0.8) {
        suspiciousPatterns.push('Unusually high win rate');
      }
    }

    // Pattern 2: Rapid stake increases
    const recentStakes = this.getRecentStakes(userId);
    if (recentStakes.length > 5) {
      const stakeIncrease = recentStakes[recentStakes.length - 1] / recentStakes[0];
      if (stakeIncrease > 10) {
        suspiciousPatterns.push('Rapid stake increases');
      }
    }

    // Pattern 3: Consistent timing patterns
    const gameTimes = this.getRecentGameTimes(userId);
    if (gameTimes.length > 10) {
      const timeIntervals = gameTimes.slice(1).map((time, i) => 
        new Date(time).getTime() - new Date(gameTimes[i]).getTime()
      );
      const avgInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
      const variance = timeIntervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / timeIntervals.length;
      
      if (variance < 1000) { // Very consistent timing
        suspiciousPatterns.push('Consistent timing patterns');
      }
    }

    if (suspiciousPatterns.length > 0) {
      await this.flagSuspiciousActivity(userId, 'Fraud patterns detected', { patterns: suspiciousPatterns });
    }
  }

  // Flag suspicious activity
  private async flagSuspiciousActivity(userId: string, reason: string, data: any): Promise<void> {
    const activities = this.suspiciousActivities.get(userId) || [];
    activities.push({
      timestamp: new Date().toISOString(),
      reason,
      data,
      riskScore: this.playerProfiles.get(userId)?.riskScore || 0
    });
    this.suspiciousActivities.set(userId, activities);

    // Log to backend (endpoint not available on current backend)
    // TODO: Add /security/flag-activity endpoint to backend
    console.log('Security activity flagged locally:', { userId, reason, data });

    // Auto-block if too many flags
    if (activities.length > 5) {
      await this.blockPlayer(userId, 'Multiple suspicious activities detected');
    }
  }

  // Block player
  private async blockPlayer(userId: string, reason: string): Promise<void> {
    const profile = this.playerProfiles.get(userId);
    if (profile) {
      profile.isBlocked = true;
      profile.blockReason = reason;
    }

    // Log to backend
    try {
      await apiClient.post('/security/block-player', {
        userId,
        reason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to log player block to backend');
    }

    Alert.alert(
      'Account Suspended',
      `Your account has been temporarily suspended: ${reason}. Please contact support if you believe this is an error.`
    );
  }

  // Get recent stakes for analysis
  private getRecentStakes(userId: string): number[] {
    // This would typically come from a database
    // For now, return mock data
    return [100, 150, 200, 300, 500, 1000];
  }

  // Get recent game times for analysis
  private getRecentGameTimes(userId: string): string[] {
    // This would typically come from a database
    // For now, return mock data
    const now = new Date();
    return Array.from({ length: 15 }, (_, i) => 
      new Date(now.getTime() - i * 60000).toISOString()
    );
  }

  // Get player security profile
  getPlayerProfile(userId: string): PlayerSecurityProfile | undefined {
    return this.playerProfiles.get(userId);
  }

  // Get suspicious activities
  getSuspiciousActivities(userId: string): any[] {
    return this.suspiciousActivities.get(userId) || [];
  }

  // Update security configuration
  updateSecurityConfig(config: Partial<GameSecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
  }

  // Reset player profile (for testing)
  resetPlayerProfile(userId: string): void {
    this.playerProfiles.delete(userId);
    this.suspiciousActivities.delete(userId);
  }

  // Get security statistics
  getSecurityStats(): {
    totalPlayers: number;
    blockedPlayers: number;
    suspiciousActivities: number;
    averageRiskScore: number;
  } {
    const profiles = Array.from(this.playerProfiles.values());
    const blockedCount = profiles.filter(p => p.isBlocked).length;
    const totalSuspicious = Array.from(this.suspiciousActivities.values()).reduce((sum, activities) => sum + activities.length, 0);
    const avgRiskScore = profiles.reduce((sum, p) => sum + p.riskScore, 0) / profiles.length || 0;

    return {
      totalPlayers: profiles.length,
      blockedPlayers: blockedCount,
      suspiciousActivities: totalSuspicious,
      averageRiskScore: avgRiskScore
    };
  }
}

export default GameSecurityService.getInstance();

