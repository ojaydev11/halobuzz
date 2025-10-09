import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TIER_WIDTH = 120;

// Battle Pass interfaces
interface BattlePass {
  seasonId: string;
  seasonNumber: number;
  theme: {
    name: string;
    description: string;
    themeColor: string;
  };
  schedule: {
    startDate: Date;
    endDate: Date;
  };
  tiers: Tier[];
  pricing: {
    premiumCost: number;
    premiumPlusCost: number;
  };
  dailyChallenges: Challenge[];
  weeklyChallenges: Challenge[];
}

interface Tier {
  level: number;
  xpRequired: number;
  freeRewards: Reward[];
  premiumRewards: Reward[];
}

interface Reward {
  type: 'coins' | 'skin' | 'emote' | 'spray' | 'title' | 'banner' | 'xp-boost';
  itemId: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  preview?: string;
}

interface Challenge {
  challengeId: string;
  name: string;
  description: string;
  requirement: {
    type: 'wins' | 'kills' | 'damage' | 'healing' | 'objectives' | 'playtime';
    target: number;
  };
  xpReward: number;
  coinReward?: number;
  progress?: number;
  completed?: boolean;
}

interface PlayerProgress {
  currentLevel: number;
  totalXP: number;
  xpToNextLevel: number;
  hasPremium: boolean;
  hasPremiumPlus: boolean;
  claimedRewards: Array<{
    level: number;
    rewardType: 'free' | 'premium';
  }>;
}

// Rarity colors
const rarityColors: Record<string, string[]> = {
  common: ['#95A5A6', '#7F8C8D'],
  rare: ['#3498DB', '#2980B9'],
  epic: ['#9B59B6', '#8E44AD'],
  legendary: ['#F39C12', '#E67E22'],
};

export default function BattlePassScreen() {
  const [battlePass, setBattlePass] = useState<BattlePass | null>(null);
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiers' | 'challenges'>('tiers');

  useEffect(() => {
    fetchBattlePass();
  }, []);

  const fetchBattlePass = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch('/api/battlepass/active');
      // const data = await response.json();

      // Mock data
      const mockBattlePass: BattlePass = {
        seasonId: 'season-1',
        seasonNumber: 1,
        theme: {
          name: 'Spartan Uprising',
          description: 'Join the legendary Spartans in their fight for humanity',
          themeColor: '#3498DB',
        },
        schedule: {
          startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
        },
        tiers: generateMockTiers(100),
        pricing: {
          premiumCost: 10000,
          premiumPlusCost: 25000,
        },
        dailyChallenges: [
          {
            challengeId: 'daily-1',
            name: 'Victory Streak',
            description: 'Win 3 games',
            requirement: { type: 'wins', target: 3 },
            xpReward: 500,
            coinReward: 200,
            progress: 1,
            completed: false,
          },
          {
            challengeId: 'daily-2',
            name: 'Elimination Expert',
            description: 'Get 20 kills',
            requirement: { type: 'kills', target: 20 },
            xpReward: 500,
            coinReward: 200,
            progress: 12,
            completed: false,
          },
          {
            challengeId: 'daily-3',
            name: 'Damage Dealer',
            description: 'Deal 50,000 damage',
            requirement: { type: 'damage', target: 50000 },
            xpReward: 500,
            coinReward: 200,
            progress: 35000,
            completed: false,
          },
        ],
        weeklyChallenges: [
          {
            challengeId: 'weekly-1',
            name: 'Undefeated',
            description: 'Win 15 games',
            requirement: { type: 'wins', target: 15 },
            xpReward: 2000,
            coinReward: 1000,
            progress: 8,
            completed: false,
          },
          {
            challengeId: 'weekly-2',
            name: 'Killing Spree',
            description: 'Get 100 kills',
            requirement: { type: 'kills', target: 100 },
            xpReward: 2000,
            coinReward: 1000,
            progress: 100,
            completed: true,
          },
        ],
      };

      const mockProgress: PlayerProgress = {
        currentLevel: 24,
        totalXP: 48000,
        xpToNextLevel: 2000,
        hasPremium: false,
        hasPremiumPlus: false,
        claimedRewards: [
          { level: 1, rewardType: 'free' },
          { level: 2, rewardType: 'free' },
          // ... more claimed rewards
        ],
      };

      setBattlePass(mockBattlePass);
      setProgress(mockProgress);
    } catch (error) {
      console.error('Failed to fetch battle pass:', error);
      Alert.alert('Error', 'Failed to load battle pass');
    } finally {
      setLoading(false);
    }
  };

  const generateMockTiers = (count: number): Tier[] => {
    const tiers: Tier[] = [];
    for (let i = 1; i <= count; i++) {
      tiers.push({
        level: i,
        xpRequired: 1000 + (i - 1) * 100,
        freeRewards: [
          {
            type: i % 10 === 0 ? 'skin' : 'coins',
            itemId: `free-${i}`,
            name: i % 10 === 0 ? `Tier ${i} Skin` : `${100 * i} Coins`,
            rarity: i % 10 === 0 ? 'epic' : 'common',
            quantity: i % 10 === 0 ? 1 : 100 * i,
          },
        ],
        premiumRewards: [
          {
            type: i % 5 === 0 ? 'skin' : i % 10 === 0 ? 'emote' : 'coins',
            itemId: `premium-${i}`,
            name: i % 5 === 0 ? `Premium Skin ${i}` : i % 10 === 0 ? `Emote ${i}` : `${200 * i} Coins`,
            rarity: i % 20 === 0 ? 'legendary' : i % 10 === 0 ? 'epic' : i % 5 === 0 ? 'rare' : 'common',
            quantity: 1,
          },
        ],
      });
    }
    return tiers;
  };

  const handleClaimReward = async (tier: Tier, rewardType: 'free' | 'premium') => {
    if (!progress) return;

    if (tier.level > progress.currentLevel) {
      Alert.alert('Level Required', `Reach level ${tier.level} to claim this reward`);
      return;
    }

    if (rewardType === 'premium' && !progress.hasPremium) {
      Alert.alert('Premium Required', 'Purchase the Battle Pass to claim premium rewards');
      return;
    }

    // Check if already claimed
    const alreadyClaimed = progress.claimedRewards.some(
      (r) => r.level === tier.level && r.rewardType === rewardType
    );

    if (alreadyClaimed) {
      Alert.alert('Already Claimed', 'You have already claimed this reward');
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/battlepass/claim`, {
      //   method: 'POST',
      //   body: JSON.stringify({ level: tier.level, rewardType }),
      // });

      Alert.alert('Success', 'Reward claimed!');
      fetchBattlePass();
    } catch (error) {
      console.error('Failed to claim reward:', error);
      Alert.alert('Error', 'Failed to claim reward');
    }
  };

  const handlePurchasePremium = async (tier: 'premium' | 'premium-plus') => {
    if (!battlePass) return;

    const cost = tier === 'premium-plus' ? battlePass.pricing.premiumPlusCost : battlePass.pricing.premiumCost;

    Alert.alert(
      'Purchase Battle Pass',
      `Purchase ${tier === 'premium-plus' ? 'Premium+' : 'Premium'} Battle Pass for ${cost.toLocaleString()} coins?${
        tier === 'premium-plus' ? '\n\nIncludes +25 instant levels!' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            try {
              // TODO: Replace with actual API call
              // await fetch('/api/battlepass/purchase', {
              //   method: 'POST',
              //   body: JSON.stringify({ tier }),
              // });

              Alert.alert('Success', 'Battle Pass purchased!');
              setShowPurchaseModal(false);
              fetchBattlePass();
            } catch (error) {
              console.error('Purchase failed:', error);
              Alert.alert('Error', 'Purchase failed');
            }
          },
        },
      ]
    );
  };

  const formatTimeRemaining = (): string => {
    if (!battlePass) return '';

    const now = new Date();
    const end = new Date(battlePass.schedule.endDate);
    const diff = end.getTime() - now.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return `${days}d ${hours}h`;
  };

  const renderRewardIcon = (reward: Reward) => {
    const icons: Record<string, string> = {
      coins: 'cash',
      skin: 'shirt',
      emote: 'happy',
      spray: 'color-palette',
      title: 'ribbon',
      banner: 'flag',
      'xp-boost': 'flash',
    };

    return icons[reward.type] || 'gift';
  };

  const renderTierCard = (tier: Tier) => {
    if (!progress) return null;

    const isLocked = tier.level > progress.currentLevel;
    const isCurrent = tier.level === progress.currentLevel;
    const freeRewardClaimed = progress.claimedRewards.some(
      (r) => r.level === tier.level && r.rewardType === 'free'
    );
    const premiumRewardClaimed = progress.claimedRewards.some(
      (r) => r.level === tier.level && r.rewardType === 'premium'
    );

    return (
      <TouchableOpacity
        key={tier.level}
        style={[
          styles.tierCard,
          isCurrent && styles.tierCardCurrent,
          isLocked && styles.tierCardLocked,
        ]}
        onPress={() => setSelectedTier(tier.level)}
      >
        {/* Tier level */}
        <View style={styles.tierLevel}>
          <Text style={styles.tierLevelText}>{tier.level}</Text>
        </View>

        {/* Premium reward */}
        <View style={styles.rewardSlot}>
          {tier.premiumRewards.map((reward, index) => (
            <LinearGradient
              key={index}
              colors={rarityColors[reward.rarity]}
              style={[
                styles.rewardBox,
                !progress.hasPremium && styles.rewardBoxLocked,
                premiumRewardClaimed && styles.rewardBoxClaimed,
              ]}
            >
              <Ionicons
                name={renderRewardIcon(reward) as any}
                size={24}
                color={isLocked ? '#7F8C8D' : '#FFFFFF'}
              />
              {premiumRewardClaimed && (
                <View style={styles.claimedBadge}>
                  <Ionicons name="checkmark" size={16} color="#2ECC71" />
                </View>
              )}
              {!progress.hasPremium && (
                <View style={styles.lockIcon}>
                  <Ionicons name="lock-closed" size={16} color="#E74C3C" />
                </View>
              )}
            </LinearGradient>
          ))}
        </View>

        {/* Free reward */}
        <View style={styles.rewardSlot}>
          {tier.freeRewards.map((reward, index) => (
            <LinearGradient
              key={index}
              colors={rarityColors[reward.rarity]}
              style={[
                styles.rewardBox,
                freeRewardClaimed && styles.rewardBoxClaimed,
              ]}
            >
              <Ionicons
                name={renderRewardIcon(reward) as any}
                size={24}
                color={isLocked ? '#7F8C8D' : '#FFFFFF'}
              />
              {freeRewardClaimed && (
                <View style={styles.claimedBadge}>
                  <Ionicons name="checkmark" size={16} color="#2ECC71" />
                </View>
              )}
            </LinearGradient>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const renderChallengeCard = (challenge: Challenge, type: 'daily' | 'weekly') => {
    const progressPercent = challenge.progress ? (challenge.progress / challenge.requirement.target) * 100 : 0;

    return (
      <View key={challenge.challengeId} style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeName}>{challenge.name}</Text>
            <Text style={styles.challengeDescription}>{challenge.description}</Text>
          </View>
          <View style={[styles.challengeType, type === 'daily' ? styles.dailyType : styles.weeklyType]}>
            <Text style={styles.challengeTypeText}>{type.toUpperCase()}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.challengeProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {challenge.progress || 0}/{challenge.requirement.target}
          </Text>
        </View>

        {/* Rewards */}
        <View style={styles.challengeRewards}>
          <View style={styles.rewardItem}>
            <Ionicons name="flash" size={16} color="#F39C12" />
            <Text style={styles.rewardText}>{challenge.xpReward} XP</Text>
          </View>
          {challenge.coinReward && (
            <View style={styles.rewardItem}>
              <Ionicons name="cash" size={16} color="#2ECC71" />
              <Text style={styles.rewardText}>{challenge.coinReward} Coins</Text>
            </View>
          )}
          {challenge.completed && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading Battle Pass...</Text>
      </View>
    );
  }

  if (!battlePass || !progress) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorText}>Failed to load Battle Pass</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[battlePass.theme.themeColor, '#1A1A2E']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.seasonTitle}>Season {battlePass.seasonNumber}</Text>
            <Text style={styles.themeName}>{battlePass.theme.name}</Text>
            <Text style={styles.themeDescription}>{battlePass.theme.description}</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statBox}>
              <Ionicons name="time" size={20} color="#F39C12" />
              <Text style={styles.statLabel}>Time Left</Text>
              <Text style={styles.statValue}>{formatTimeRemaining()}</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.levelInfo}>
            <Text style={styles.currentLevel}>Level {progress.currentLevel}</Text>
            <Text style={styles.nextLevel}>Level {progress.currentLevel + 1}</Text>
          </View>
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpFill,
                {
                  width: `${
                    ((progress.totalXP - (battlePass.tiers[progress.currentLevel - 1]?.xpRequired || 0)) /
                      progress.xpToNextLevel) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.xpText}>
            {progress.totalXP.toLocaleString()} / {(progress.totalXP + progress.xpToNextLevel).toLocaleString()} XP
          </Text>
        </View>

        {/* Purchase button */}
        {!progress.hasPremium && (
          <TouchableOpacity
            style={styles.purchaseButton}
            onPress={() => setShowPurchaseModal(true)}
          >
            <Ionicons name="cart" size={20} color="#FFFFFF" />
            <Text style={styles.purchaseButtonText}>Unlock Premium</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tiers' && styles.tabActive]}
          onPress={() => setActiveTab('tiers')}
        >
          <Text style={[styles.tabText, activeTab === 'tiers' && styles.tabTextActive]}>
            Tiers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.tabActive]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.tabTextActive]}>
            Challenges
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'tiers' ? (
        <ScrollView
          horizontal
          style={styles.tiersScrollView}
          contentContainerStyle={styles.tiersContent}
          showsHorizontalScrollIndicator={false}
        >
          {battlePass.tiers.map(renderTierCard)}
        </ScrollView>
      ) : (
        <ScrollView style={styles.challengesScrollView}>
          <View style={styles.challengesSection}>
            <Text style={styles.sectionTitle}>Daily Challenges</Text>
            {battlePass.dailyChallenges.map((challenge) => renderChallengeCard(challenge, 'daily'))}
          </View>

          <View style={styles.challengesSection}>
            <Text style={styles.sectionTitle}>Weekly Challenges</Text>
            {battlePass.weeklyChallenges.map((challenge) => renderChallengeCard(challenge, 'weekly'))}
          </View>
        </ScrollView>
      )}

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Unlock Battle Pass</Text>

            <TouchableOpacity
              style={styles.purchaseOption}
              onPress={() => handlePurchasePremium('premium')}
            >
              <View style={styles.purchaseOptionHeader}>
                <Text style={styles.purchaseOptionTitle}>Premium</Text>
                <Text style={styles.purchaseOptionPrice}>
                  {battlePass.pricing.premiumCost.toLocaleString()} coins
                </Text>
              </View>
              <Text style={styles.purchaseOptionDescription}>
                Unlock all 100 premium rewards including exclusive skins, emotes, and more!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.purchaseOption, styles.purchaseOptionPremiumPlus]}
              onPress={() => handlePurchasePremium('premium-plus')}
            >
              <View style={styles.purchaseOptionHeader}>
                <View style={styles.premiumPlusBadge}>
                  <Text style={styles.premiumPlusText}>BEST VALUE</Text>
                </View>
                <Text style={styles.purchaseOptionTitle}>Premium+</Text>
                <Text style={styles.purchaseOptionPrice}>
                  {battlePass.pricing.premiumPlusCost.toLocaleString()} coins
                </Text>
              </View>
              <Text style={styles.purchaseOptionDescription}>
                Everything from Premium PLUS 25 instant levels!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPurchaseModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  seasonTitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  themeDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 12,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 16,
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  currentLevel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextLevel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  xpBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#F39C12',
  },
  xpText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'right',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E67E22',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498DB',
  },
  tabText: {
    color: '#95A5A6',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#3498DB',
  },
  tiersScrollView: {
    flex: 1,
  },
  tiersContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tierCard: {
    width: TIER_WIDTH,
    marginRight: 16,
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierCardCurrent: {
    borderColor: '#F39C12',
    shadowColor: '#F39C12',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  tierCardLocked: {
    opacity: 0.5,
  },
  tierLevel: {
    alignItems: 'center',
    marginBottom: 12,
  },
  tierLevelText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rewardSlot: {
    marginBottom: 8,
  },
  rewardBox: {
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  rewardBoxLocked: {
    opacity: 0.6,
  },
  rewardBoxClaimed: {
    opacity: 0.4,
  },
  claimedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  lockIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  challengesScrollView: {
    flex: 1,
  },
  challengesSection: {
    padding: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  challengeCard: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  challengeDescription: {
    color: '#95A5A6',
    fontSize: 14,
  },
  challengeType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  dailyType: {
    backgroundColor: '#3498DB',
  },
  weeklyType: {
    backgroundColor: '#9B59B6',
  },
  challengeTypeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  challengeProgress: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2C2C3E',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
  },
  progressText: {
    color: '#95A5A6',
    fontSize: 12,
    textAlign: 'right',
  },
  challengeRewards: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  completedText: {
    color: '#2ECC71',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#16213E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  purchaseOption: {
    backgroundColor: '#2C2C3E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  purchaseOptionPremiumPlus: {
    borderWidth: 2,
    borderColor: '#F39C12',
  },
  purchaseOptionHeader: {
    marginBottom: 12,
  },
  premiumPlusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F39C12',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  premiumPlusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  purchaseOptionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  purchaseOptionPrice: {
    color: '#2ECC71',
    fontSize: 18,
    fontWeight: 'bold',
  },
  purchaseOptionDescription: {
    color: '#95A5A6',
    fontSize: 14,
  },
  modalCloseButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#95A5A6',
    fontSize: 16,
    fontWeight: '600',
  },
});
