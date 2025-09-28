import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import { apiClient } from '@/lib/api';

interface ProfileStats {
  totalStreams: number;
  totalViews: number;
  totalLikes: number;
  followers: number;
  following: number;
  coins: number;
  ogLevel: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalStreams: 0,
    totalViews: 0,
    totalLikes: 0,
    followers: 0,
    following: 0,
    coins: 0,
    ogLevel: 1,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      // Load user stats
      const statsResponse = await apiClient.get(`/users/${user?.id}/stats`);
      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        // Fallback data
        setStats({
          totalStreams: 45,
          totalViews: 125000,
          totalLikes: 8900,
          followers: 12500,
          following: 890,
          coins: user?.coins || 0,
          ogLevel: user?.ogLevel || 1,
        });
      }

      // Load achievements
      const achievementsResponse = await apiClient.get(`/users/${user?.id}/achievements`);
      if (achievementsResponse.success && achievementsResponse.data?.achievements) {
        setAchievements(achievementsResponse.data.achievements);
      } else {
        // Fallback achievements
        setAchievements([
          {
            id: '1',
            title: 'First Stream',
            description: 'Complete your first live stream',
            icon: 'videocam',
            unlocked: true,
            progress: 1,
            maxProgress: 1,
          },
          {
            id: '2',
            title: 'Social Butterfly',
            description: 'Gain 1000 followers',
            icon: 'people',
            unlocked: true,
            progress: 12500,
            maxProgress: 1000,
          },
          {
            id: '3',
            title: 'Content Creator',
            description: 'Stream for 100 hours total',
            icon: 'time',
            unlocked: false,
            progress: 45,
            maxProgress: 100,
          },
          {
            id: '4',
            title: 'Viral Sensation',
            description: 'Get 1M total views',
            icon: 'trending-up',
            unlocked: false,
            progress: 125000,
            maxProgress: 1000000,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const renderStatItem = (label: string, value: string | number, icon: string) => (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={20} color="#007AFF" />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderAchievement = (achievement: Achievement) => (
    <View key={achievement.id} style={styles.achievementItem}>
      <View style={styles.achievementIcon}>
        <Ionicons
          name={achievement.icon as any}
          size={24}
          color={achievement.unlocked ? '#007AFF' : '#888'}
        />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={[
          styles.achievementTitle,
          { color: achievement.unlocked ? '#fff' : '#888' }
        ]}>
          {achievement.title}
        </Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
        {!achievement.unlocked && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(achievement.progress / achievement.maxProgress) * 100}%` }
              ]}
            />
          </View>
        )}
      </View>
      {achievement.unlocked && (
        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
      )}
    </View>
  );

  const renderSettingsItem = (
    title: string,
    subtitle: string,
    icon: string,
    onPress: () => void,
    iconColor?: string,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsLeft}>
        <View style={styles.settingsIcon}>
          <Ionicons name={icon as any} size={20} color={iconColor || "#007AFF"} />
        </View>
        <View style={styles.settingsText}>
          <Text style={styles.settingsTitle}>{title}</Text>
          <Text style={styles.settingsSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#888" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <Image source={{ uri: user?.avatar }} style={styles.avatar} />
          <Text style={styles.displayName}>{user?.displayName || user?.username}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          <View style={styles.ogLevel}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ogLevelText}>OG Level {stats.ogLevel}</Text>
          </View>
          <View style={styles.coinsContainer}>
            <Ionicons name="diamond" size={16} color="#007AFF" />
            <Text style={styles.coinsText}>{stats.coins.toLocaleString()} Coins</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {renderStatItem('Streams', stats.totalStreams, 'videocam')}
            {renderStatItem('Views', stats.totalViews, 'eye')}
            {renderStatItem('Likes', stats.totalLikes, 'heart')}
            {renderStatItem('Followers', stats.followers, 'people')}
            {renderStatItem('Following', stats.following, 'person-add')}
            {renderStatItem('Coins', stats.coins, 'diamond')}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/creator-studio')}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/wallet')}
          >
            <Ionicons name="wallet-outline" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/analytics')}
          >
            <Ionicons name="analytics-outline" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/nft-collection')}
          >
            <Ionicons name="diamond-outline" size={20} color="#fff" />
            <Text style={styles.quickActionText}>NFTs</Text>
          </TouchableOpacity>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {achievements.map(renderAchievement)}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {renderSettingsItem(
            'Account Settings',
            'Manage your account information',
            'person-outline',
            () => router.push('/settings/account')
          )}

          {/* Admin Access - Only show for admin users */}
          {user?.role === 'admin' && renderSettingsItem(
            'Admin Dashboard',
            'Access platform administration tools',
            'shield-checkmark-outline',
            () => router.push('/admin'),
            '#ff6600'
          )}
          
          {renderSettingsItem(
            'Privacy & Security',
            'Control your privacy settings',
            'shield-outline',
            () => router.push('/settings/privacy')
          )}
          
          {renderSettingsItem(
            'Notifications',
            'Manage notification preferences',
            'notifications-outline',
            () => router.push('/settings/notifications'),
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#333', true: '#007AFF' }}
              thumbColor={notificationsEnabled ? '#fff' : '#888'}
            />
          )}
          
          {renderSettingsItem(
            'Appearance',
            'Customize your app experience',
            'color-palette-outline',
            () => router.push('/settings/appearance'),
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#333', true: '#007AFF' }}
              thumbColor={darkModeEnabled ? '#fff' : '#888'}
            />
          )}
          
          {renderSettingsItem(
            'Payment Methods',
            'Manage your payment options',
            'card-outline',
            () => router.push('/settings/payments')
          )}
          
          {renderSettingsItem(
            'Creator Tools',
            'Advanced creator features',
            'construct-outline',
            () => router.push('/settings/creator-tools')
          )}
          
          {renderSettingsItem(
            'AI Assistant',
            'Configure AI features',
            'sparkles-outline',
            () => router.push('/settings/ai-assistant')
          )}
          
          {renderSettingsItem(
            'Help & Support',
            'Get help and contact support',
            'help-circle-outline',
            () => router.push('/settings/help')
          )}
          
          {renderSettingsItem(
            'About',
            'App version and information',
            'information-circle-outline',
            () => router.push('/settings/about')
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ff0000" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  ogLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  ogLevelText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinsText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  logoutText: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 100,
  },
});