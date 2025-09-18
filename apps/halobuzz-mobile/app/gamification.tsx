import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: 'streaming' | 'social' | 'gaming' | 'creator' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  isUnlocked: boolean;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  reward: {
    coins: number;
    xp: number;
    items?: string[];
  };
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  expiresAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar?: string;
  score: number;
  level: number;
  isCurrentUser: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  isEarned: boolean;
  earnedAt?: string;
}

export default function GamificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('achievements');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userStats, setUserStats] = useState({
    level: 15,
    xp: 1250,
    nextLevelXp: 2000,
    totalCoins: 5420,
    streak: 7,
    rank: 42,
  });
  const [loading, setLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadGamificationData();
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadGamificationData = async () => {
    try {
      setLoading(true);
      
      // Mock achievements
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          title: 'First Stream',
          description: 'Complete your first live stream',
          icon: 'videocam',
          color: '#ff0000',
          category: 'streaming',
          rarity: 'common',
          points: 100,
          isUnlocked: true,
          unlockedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          title: 'Social Butterfly',
          description: 'Follow 50 creators',
          icon: 'people',
          color: '#007AFF',
          category: 'social',
          rarity: 'rare',
          points: 250,
          isUnlocked: true,
          progress: 50,
          maxProgress: 50,
          unlockedAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '3',
          title: 'Gaming Legend',
          description: 'Win 100 games',
          icon: 'trophy',
          color: '#ffaa00',
          category: 'gaming',
          rarity: 'epic',
          points: 500,
          isUnlocked: false,
          progress: 67,
          maxProgress: 100,
        },
        {
          id: '4',
          title: 'Creator Master',
          description: 'Reach 10K followers',
          icon: 'star',
          color: '#ff00ff',
          category: 'creator',
          rarity: 'legendary',
          points: 1000,
          isUnlocked: false,
          progress: 1250,
          maxProgress: 10000,
        },
        {
          id: '5',
          title: 'NFT Collector',
          description: 'Own 10 NFTs',
          icon: 'diamond',
          color: '#9d4edd',
          category: 'special',
          rarity: 'epic',
          points: 750,
          isUnlocked: true,
          progress: 10,
          maxProgress: 10,
          unlockedAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];

      // Mock quests
      const mockQuests: Quest[] = [
        {
          id: '1',
          title: 'Daily Streamer',
          description: 'Stream for 1 hour today',
          type: 'daily',
          reward: { coins: 100, xp: 50 },
          progress: 45,
          maxProgress: 60,
          isCompleted: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          id: '2',
          title: 'Social Engagement',
          description: 'Like 20 posts this week',
          type: 'weekly',
          reward: { coins: 250, xp: 100 },
          progress: 15,
          maxProgress: 20,
          isCompleted: false,
          expiresAt: new Date(Date.now() + 604800000).toISOString(),
        },
        {
          id: '3',
          title: 'Gaming Champion',
          description: 'Win 5 games this month',
          type: 'monthly',
          reward: { coins: 500, xp: 200 },
          progress: 3,
          maxProgress: 5,
          isCompleted: false,
          expiresAt: new Date(Date.now() + 2592000000).toISOString(),
        },
      ];

      // Mock leaderboard
      const mockLeaderboard: LeaderboardEntry[] = [
        { rank: 1, username: 'gamingpro', score: 15420, level: 25, isCurrentUser: false },
        { rank: 2, username: 'streamqueen', score: 14200, level: 24, isCurrentUser: false },
        { rank: 3, username: 'contentking', score: 13800, level: 23, isCurrentUser: false },
        { rank: 42, username: user?.username || 'you', score: 5420, level: 15, isCurrentUser: true },
      ];

      // Mock badges
      const mockBadges: Badge[] = [
        {
          id: '1',
          name: 'Early Adopter',
          description: 'Joined in the first month',
          icon: 'rocket',
          color: '#ff6b35',
          rarity: 'diamond',
          isEarned: true,
          earnedAt: new Date(Date.now() - 2592000000).toISOString(),
        },
        {
          id: '2',
          name: 'Stream Master',
          description: '100+ hours streamed',
          icon: 'videocam',
          color: '#ff0000',
          rarity: 'gold',
          isEarned: true,
          earnedAt: new Date(Date.now() - 1728000000).toISOString(),
        },
        {
          id: '3',
          name: 'Social Star',
          description: '10K+ interactions',
          icon: 'heart',
          color: '#ff00ff',
          rarity: 'silver',
          isEarned: false,
        },
      ];

      setAchievements(mockAchievements);
      setQuests(mockQuests);
      setLeaderboard(mockLeaderboard);
      setBadges(mockBadges);
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return '#ff6b35';
      case 'epic': return '#9d4edd';
      case 'rare': return '#007AFF';
      case 'gold': return '#ffaa00';
      case 'silver': return '#c0c0c0';
      case 'bronze': return '#cd7f32';
      case 'diamond': return '#b9f2ff';
      default: return '#888';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streaming': return 'videocam';
      case 'social': return 'people';
      case 'gaming': return 'game-controller';
      case 'creator': return 'star';
      case 'special': return 'diamond';
      default: return 'trophy';
    }
  };

  const TabButton = ({ id, title, isActive, onPress }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const AchievementCard = ({ achievement }: { achievement: Achievement }) => (
    <TouchableOpacity style={styles.achievementCard}>
      <LinearGradient
        colors={achievement.isUnlocked ? 
          [`${getRarityColor(achievement.rarity)}20`, `${getRarityColor(achievement.rarity)}10`] :
          ['#333', '#222']
        }
        style={styles.achievementGradient}
      >
        <View style={styles.achievementHeader}>
          <View style={[
            styles.achievementIcon, 
            { backgroundColor: achievement.isUnlocked ? getRarityColor(achievement.rarity) : '#333' }
          ]}>
            <Ionicons name={achievement.icon as any} size={24} color="#fff" />
          </View>
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            <View style={styles.achievementMeta}>
              <Text style={styles.achievementPoints}>{achievement.points} XP</Text>
              <Text style={styles.achievementCategory}>{achievement.category}</Text>
            </View>
          </View>
        </View>
        
        {achievement.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${(achievement.progress / achievement.maxProgress!) * 100}%`,
                    backgroundColor: getRarityColor(achievement.rarity)
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {achievement.progress}/{achievement.maxProgress}
            </Text>
          </View>
        )}

        {achievement.isUnlocked && (
          <View style={styles.unlockedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#00ff00" />
            <Text style={styles.unlockedText}>Unlocked</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const QuestCard = ({ quest }: { quest: Quest }) => (
    <TouchableOpacity style={styles.questCard}>
      <View style={styles.questHeader}>
        <View style={styles.questIcon}>
          <Ionicons 
            name={quest.type === 'daily' ? 'calendar' : 
                  quest.type === 'weekly' ? 'calendar-outline' : 'trophy'} 
            size={20} 
            color="#007AFF" 
          />
        </View>
        <View style={styles.questInfo}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questDescription}>{quest.description}</Text>
        </View>
        <View style={styles.questReward}>
          <Text style={styles.rewardCoins}>+{quest.reward.coins} coins</Text>
          <Text style={styles.rewardXp}>+{quest.reward.xp} XP</Text>
        </View>
      </View>
      
      <View style={styles.questProgress}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(quest.progress / quest.maxProgress) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {quest.progress}/{quest.maxProgress}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const LeaderboardEntry = ({ entry }: { entry: LeaderboardEntry }) => (
    <View style={[
      styles.leaderboardEntry,
      entry.isCurrentUser && styles.currentUserEntry
    ]}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>#{entry.rank}</Text>
        {entry.rank <= 3 && (
          <Ionicons 
            name={entry.rank === 1 ? 'trophy' : entry.rank === 2 ? 'medal' : 'ribbon'} 
            size={16} 
            color={entry.rank === 1 ? '#ffaa00' : entry.rank === 2 ? '#c0c0c0' : '#cd7f32'} 
          />
        )}
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {entry.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.username}>{entry.username}</Text>
          <Text style={styles.userLevel}>Level {entry.level}</Text>
        </View>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{entry.score.toLocaleString()}</Text>
        <Text style={styles.scoreLabel}>points</Text>
      </View>
    </View>
  );

  const BadgeCard = ({ badge }: { badge: Badge }) => (
    <TouchableOpacity style={styles.badgeCard}>
      <View style={[
        styles.badgeIcon,
        { backgroundColor: badge.isEarned ? getRarityColor(badge.rarity) : '#333' }
      ]}>
        <Ionicons name={badge.icon as any} size={24} color="#fff" />
      </View>
      <Text style={styles.badgeName}>{badge.name}</Text>
      <Text style={styles.badgeDescription}>{badge.description}</Text>
      {badge.isEarned && (
        <View style={styles.earnedBadge}>
          <Text style={styles.earnedText}>Earned</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading gamification...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Gamification Hub</Text>
          <Text style={styles.subtitle}>Level up your experience</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={styles.rewardsButton}
            onPress={() => router.push('/rewards')}
          >
            <Ionicons name="gift" size={16} color="#fff" />
            <Text style={styles.rewardsButtonText}>Rewards</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* User Stats */}
      <View style={styles.userStatsContainer}>
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.userStatsGradient}
        >
          <View style={styles.userLevelInfo}>
            <Text style={styles.userLevel}>Level {userStats.level}</Text>
            <Text style={styles.userXp}>{userStats.xp} / {userStats.nextLevelXp} XP</Text>
          </View>
          
          <View style={styles.xpProgress}>
            <View style={styles.xpProgressBar}>
              <View 
                style={[
                  styles.xpProgressFill, 
                  { width: `${(userStats.xp / userStats.nextLevelXp) * 100}%` }
                ]} 
              />
            </View>
          </View>

          <View style={styles.userStatsRow}>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatValue}>{userStats.totalCoins}</Text>
              <Text style={styles.userStatLabel}>Coins</Text>
            </View>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatValue}>{userStats.streak}</Text>
              <Text style={styles.userStatLabel}>Day Streak</Text>
            </View>
            <View style={styles.userStatItem}>
              <Text style={styles.userStatValue}>#{userStats.rank}</Text>
              <Text style={styles.userStatLabel}>Global Rank</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          id="achievements"
          title="Achievements"
          isActive={activeTab === 'achievements'}
          onPress={() => setActiveTab('achievements')}
        />
        <TabButton
          id="quests"
          title="Quests"
          isActive={activeTab === 'quests'}
          onPress={() => setActiveTab('quests')}
        />
        <TabButton
          id="leaderboard"
          title="Leaderboard"
          isActive={activeTab === 'leaderboard'}
          onPress={() => setActiveTab('leaderboard')}
        />
        <TabButton
          id="badges"
          title="Badges"
          isActive={activeTab === 'badges'}
          onPress={() => setActiveTab('badges')}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'achievements' && (
          <View style={styles.achievementsTab}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </View>
        )}

        {activeTab === 'quests' && (
          <View style={styles.questsTab}>
            <Text style={styles.sectionTitle}>Active Quests</Text>
            {quests.map(quest => (
              <QuestCard key={quest.id} quest={quest} />
            ))}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardTab}>
            <Text style={styles.sectionTitle}>Global Leaderboard</Text>
            {leaderboard.map(entry => (
              <LeaderboardEntry key={entry.rank} entry={entry} />
            ))}
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.badgesTab}>
            <Text style={styles.sectionTitle}>Badges Collection</Text>
            <View style={styles.badgesGrid}>
              {badges.map(badge => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  rewardsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff00ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  rewardsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userStatsContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userStatsGradient: {
    padding: 20,
  },
  userLevelInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userLevel: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userXp: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  xpProgress: {
    marginBottom: 20,
  },
  xpProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  xpProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  userStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  userStatItem: {
    alignItems: 'center',
  },
  userStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userStatLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  achievementsTab: {
    marginBottom: 20,
  },
  achievementCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  achievementGradient: {
    padding: 16,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  achievementMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementPoints: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  achievementCategory: {
    color: '#888',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'right',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  unlockedText: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questsTab: {
    marginBottom: 20,
  },
  questCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  questDescription: {
    color: '#ccc',
    fontSize: 14,
  },
  questReward: {
    alignItems: 'flex-end',
  },
  rewardCoins: {
    color: '#00ff00',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  rewardXp: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderboardTab: {
    marginBottom: 20,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  currentUserEntry: {
    backgroundColor: '#007AFF20',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    gap: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userLevel: {
    color: '#888',
    fontSize: 12,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  scoreLabel: {
    color: '#888',
    fontSize: 10,
  },
  badgesTab: {
    marginBottom: 20,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  badgeDescription: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  earnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#00ff00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  earnedText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
