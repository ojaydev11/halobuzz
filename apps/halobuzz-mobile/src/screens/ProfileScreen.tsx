import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface ProfileStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  totalEarnings: number;
  level: number;
  experience: number;
  ranking: number;
  streak: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  reward: number;
}

const ProfileScreen: React.FC = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalGames: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalEarnings: 0,
    level: 1,
    experience: 0,
    ranking: 0,
    streak: 0
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [statsResponse, achievementsResponse] = await Promise.all([
        apiClient.get('/profile/stats'),
        apiClient.get('/profile/achievements')
      ]);

      if (statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        // Fallback data
        setStats({
          totalGames: 127,
          wins: 89,
          losses: 38,
          winRate: 0.701,
          totalEarnings: 15600,
          level: 15,
          experience: 8750,
          ranking: 234,
          streak: 7
        });
      }

      if (achievementsResponse.data) {
        setAchievements(achievementsResponse.data);
      } else {
        // Fallback achievements
        setAchievements([
          {
            id: '1',
            name: 'First Victory',
            description: 'Win your first game',
            icon: '🏆',
            unlocked: true,
            progress: 1,
            maxProgress: 1,
            reward: 100
          },
          {
            id: '2',
            name: 'Streak Master',
            description: 'Win 5 games in a row',
            icon: '🔥',
            unlocked: true,
            progress: 7,
            maxProgress: 5,
            reward: 500
          },
          {
            id: '3',
            name: 'High Roller',
            description: 'Earn 10,000 coins',
            icon: '💰',
            unlocked: true,
            progress: 15600,
            maxProgress: 10000,
            reward: 1000
          },
          {
            id: '4',
            name: 'Century Club',
            description: 'Play 100 games',
            icon: '💯',
            unlocked: true,
            progress: 127,
            maxProgress: 100,
            reward: 750
          },
          {
            id: '5',
            name: 'Legend',
            description: 'Reach level 20',
            icon: '👑',
            unlocked: false,
            progress: 15,
            maxProgress: 20,
            reward: 2000
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const getLevelProgress = () => {
    const currentLevelExp = stats.level * 1000;
    const nextLevelExp = (stats.level + 1) * 1000;
    const progress = (stats.experience - currentLevelExp) / (nextLevelExp - currentLevelExp);
    return Math.max(0, Math.min(1, progress));
  };

  const renderStatsCard = () => (
    <LinearGradient
      colors={['#667EEA', '#764BA2']}
      style={styles.statsCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.statsHeader}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{stats.level}</Text>
          </View>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user?.username || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          <View style={styles.rankingContainer}>
            <Ionicons name="trophy" size={14} color="#F0D90A" />
            <Text style={styles.rankingText}>#{stats.ranking}</Text>
          </View>
        </View>
      </View>

      <View style={styles.levelProgressContainer}>
        <Text style={styles.levelProgressText}>
          Level {stats.level} → {stats.level + 1}
        </Text>
        <View style={styles.levelProgressBar}>
          <View style={[styles.levelProgressFill, { width: `${getLevelProgress() * 100}%` }]} />
        </View>
        <Text style={styles.experienceText}>
          {stats.experience} / {(stats.level + 1) * 1000} XP
        </Text>
      </View>
    </LinearGradient>
  );

  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalGames}</Text>
        <Text style={styles.statLabel}>Games</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.wins}</Text>
        <Text style={styles.statLabel}>Wins</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{(stats.winRate * 100).toFixed(0)}%</Text>
        <Text style={styles.statLabel}>Win Rate</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.streak}</Text>
        <Text style={styles.statLabel}>Streak</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalEarnings.toLocaleString()}</Text>
        <Text style={styles.statLabel}>Earnings</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>#{stats.ranking}</Text>
        <Text style={styles.statLabel}>Rank</Text>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsSection}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      {achievements.map((achievement) => (
        <TouchableOpacity key={achievement.id} style={styles.achievementItem}>
          <View style={styles.achievementIcon}>
            <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
          </View>
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            {achievement.unlocked ? (
              <Text style={styles.achievementReward}>+{achievement.reward} 🪙</Text>
            ) : (
              <View style={styles.achievementProgress}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(achievement.progress / achievement.maxProgress) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {achievement.progress}/{achievement.maxProgress}
                </Text>
              </View>
            )}
          </View>
          {achievement.unlocked && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMenuItems = () => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>Account</Text>
      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="settings-outline" size={24} color="#8B949E" />
        <Text style={styles.menuText}>Settings</Text>
        <Ionicons name="chevron-forward" size={20} color="#8B949E" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="wallet-outline" size={24} color="#8B949E" />
        <Text style={styles.menuText}>Wallet</Text>
        <Ionicons name="chevron-forward" size={20} color="#8B949E" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="notifications-outline" size={24} color="#8B949E" />
        <Text style={styles.menuText}>Notifications</Text>
        <Ionicons name="chevron-forward" size={20} color="#8B949E" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="help-circle-outline" size={24} color="#8B949E" />
        <Text style={styles.menuText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#8B949E" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#F44336" />
        <Text style={[styles.menuText, { color: '#F44336' }]}>Logout</Text>
        <Ionicons name="chevron-forward" size={20} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProfileData();
            }}
          />
        }
      >
        {renderStatsCard()}
        {renderStatsGrid()}
        {renderAchievements()}
        {renderMenuItems()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  scrollView: {
    flex: 1
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statsCard: {
    margin: 15,
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  levelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0D90A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000'
  },
  userInfo: {
    flex: 1
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8
  },
  rankingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  rankingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F0D90A'
  },
  levelProgressContainer: {
    marginTop: 10
  },
  levelProgressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: '#F0D90A',
    borderRadius: 4
  },
  experienceText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'right'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 15,
    marginBottom: 20
  },
  statItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    marginBottom: 10,
    marginHorizontal: '0.5%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    color: '#8B949E',
    textAlign: 'center'
  },
  achievementsSection: {
    marginHorizontal: 15,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  achievementEmoji: {
    fontSize: 24
  },
  achievementInfo: {
    flex: 1
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  achievementDescription: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 6
  },
  achievementReward: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600'
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#2A3441',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667EEA',
    borderRadius: 2
  },
  progressText: {
    fontSize: 9,
    color: '#8B949E',
    minWidth: 40
  },
  menuSection: {
    marginHorizontal: 15,
    marginBottom: 30
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 15
  }
});

export default ProfileScreen;





