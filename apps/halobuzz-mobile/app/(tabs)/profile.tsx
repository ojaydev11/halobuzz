import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/store/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getOGLevelColor = (level: number) => {
    if (level >= 10) return '#ff6b35'; // Legendary
    if (level >= 7) return '#9d4edd'; // Epic
    if (level >= 4) return '#007AFF'; // Rare
    return '#888'; // Common
  };

  const MenuItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    color = '#007AFF'
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={16} color="#888" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            {user?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.displayName}>
              {user?.displayName || user?.username}
            </Text>
            <Text style={styles.username}>@{user?.username}</Text>
            {user?.bio && (
              <Text style={styles.bio}>{user.bio}</Text>
            )}
            <View style={styles.userMeta}>
              <Text style={styles.country}>🌍 {user?.country}</Text>
              <Text style={styles.language}>🗣️ {user?.language}</Text>
            </View>
          </View>

          {/* OG Level */}
          <View style={styles.ogLevelContainer}>
            <View style={[styles.ogLevelBadge, { backgroundColor: getOGLevelColor(user?.ogLevel || 1) }]}>
              <Text style={styles.ogLevelText}>OG{user?.ogLevel || 1}</Text>
            </View>
            <Text style={styles.ogLevelLabel}>Creator Level</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(user?.followers || 0)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(user?.following || 0)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(user?.coins || 0)}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatNumber(user?.totalLikes || 0)}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/wallet')}
            >
              <Ionicons name="wallet-outline" size={24} color="#00ff00" />
              <Text style={styles.quickActionText}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/creator-studio')}
            >
              <Ionicons name="create-outline" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>Studio</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/nft-marketplace')}
            >
              <Ionicons name="diamond-outline" size={24} color="#ff00ff" />
              <Text style={styles.quickActionText}>NFTs</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/messages')}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => router.push('/new-users')}
            >
              <Ionicons name="people-outline" size={24} color="#ffaa00" />
              <Text style={styles.quickActionText}>Discover</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => router.push('/profile/edit')}
          />
          <MenuItem
            icon="videocam-outline"
            title="My Streams"
            subtitle="Manage your live streams"
            onPress={() => router.push('/my-streams')}
            color="#ff0000"
          />
          <MenuItem
            icon="analytics-outline"
            title="Analytics"
            subtitle="View your performance metrics"
            onPress={() => router.push('/analytics')}
            color="#00ff00"
          />
          <MenuItem
            icon="library-outline"
            title="My Content"
            subtitle="Manage your reels and content"
            onPress={() => router.push('/my-content')}
            color="#ffaa00"
          />
          <MenuItem
            icon="diamond-outline"
            title="My NFTs"
            subtitle="View your NFT collection"
            onPress={() => router.push('/my-nfts')}
            color="#ff00ff"
          />
          <MenuItem
            icon="cash-outline"
            title="Earnings"
            subtitle="Track your creator earnings"
            onPress={() => router.push('/earnings')}
            color="#00ff00"
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="KYC Verification"
            subtitle={user?.kycStatus === 'approved' ? 'Verified' : 'Complete verification'}
            onPress={() => router.push('/kyc')}
            color={user?.kycStatus === 'approved' ? '#00ff00' : '#ffaa00'}
          />
        </View>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => router.push('/help')}
            color="#888"
          />
          <MenuItem
            icon="chatbubble-outline"
            title="Contact Us"
            subtitle="Send us a message"
            onPress={() => router.push('/contact')}
            color="#888"
          />
          <MenuItem
            icon="star-outline"
            title="Rate App"
            subtitle="Rate us on the App Store"
            onPress={() => router.push('/rate-app')}
            color="#888"
          />
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileSection: {
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
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
  bio: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  country: {
    fontSize: 14,
    color: '#888',
  },
  language: {
    fontSize: 14,
    color: '#888',
  },
  ogLevelContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ogLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  ogLevelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ogLevelLabel: {
    fontSize: 12,
    color: '#888',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    marginTop: 8,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  supportSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff0000',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
