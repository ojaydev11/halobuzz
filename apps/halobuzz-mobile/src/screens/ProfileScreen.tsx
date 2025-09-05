import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  country: string;
  followers: number;
  following: number;
  totalLikes: number;
  totalViews: number;
  ogLevel: number;
  isVerified: boolean;
  coins: {
    balance: number;
    totalEarned: number;
  };
  trust: {
    level: string;
    score: number;
  };
}

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await apiService.get('/api/v1/users/profile');
      
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
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
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.navigate('Login' as never);
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          
          {profile?.ogLevel && profile.ogLevel > 0 && (
            <View style={[styles.ogBadge, { backgroundColor: getOGColor(profile.ogLevel) }]}>
              <Text style={styles.ogText}>OG{profile.ogLevel}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.usernameRow}>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.isVerified && (
            <MaterialIcons name="verified" size={20} color="#4A90E2" />
          )}
        </View>
        
        {profile?.bio && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.location}>{profile?.country}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.followers.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.following.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.totalLikes.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.statItem}>
          <Text style={styles.statValue}>{profile?.totalViews.toLocaleString() || 0}</Text>
          <Text style={styles.statLabel}>Views</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTrustScore = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trust & Reputation</Text>
      <View style={styles.trustCard}>
        <View style={styles.trustHeader}>
          <Text style={styles.trustLevel}>
            {profile?.trust.level.toUpperCase() || 'NEW'}
          </Text>
          <Text style={styles.trustScore}>
            Score: {profile?.trust.score || 0}/100
          </Text>
        </View>
        
        <View style={styles.trustBar}>
          <View 
            style={[
              styles.trustProgress,
              { 
                width: `${profile?.trust.score || 0}%`,
                backgroundColor: getTrustColor(profile?.trust.level || 'low')
              }
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderMenuItems = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('Wallet')}
      >
        <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
        <Text style={styles.menuText}>Wallet</Text>
        <View style={styles.menuRight}>
          <Text style={styles.menuValue}>
            {profile?.coins.balance.toLocaleString() || 0} coins
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('OGMembership')}
      >
        <MaterialIcons name="stars" size={24} color="#FFD700" />
        <Text style={styles.menuText}>OG Membership</Text>
        <View style={styles.menuRight}>
          {profile?.ogLevel ? (
            <Text style={styles.menuValue}>Level {profile.ogLevel}</Text>
          ) : (
            <Text style={styles.menuValue}>Get OG</Text>
          )}
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('MyReels')}
      >
        <Ionicons name="play-circle" size={24} color="#fff" />
        <Text style={styles.menuText}>My Reels</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('StreamHistory')}
      >
        <Ionicons name="videocam" size={24} color="#fff" />
        <Text style={styles.menuText}>Stream History</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('KYC')}
      >
        <MaterialIcons name="verified-user" size={24} color="#fff" />
        <Text style={styles.menuText}>KYC Verification</Text>
        <View style={styles.menuRight}>
          <Text style={[
            styles.menuValue,
            { color: profile?.isVerified ? '#4CAF50' : '#FF6B6B' }
          ]}>
            {profile?.isVerified ? 'Verified' : 'Pending'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>
      
      <View style={styles.menuItem}>
        <Ionicons name="notifications" size={24} color="#fff" />
        <Text style={styles.menuText}>Notifications</Text>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: '#333', true: '#FF6B6B' }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="shield-checkmark" size={24} color="#fff" />
        <Text style={styles.menuText}>Privacy & Security</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="help-circle" size={24} color="#fff" />
        <Text style={styles.menuText}>Help & Support</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Ionicons name="information-circle" size={24} color="#fff" />
        <Text style={styles.menuText}>About</Text>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.menuItem, { marginTop: 20 }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out" size={24} color="#FF6B6B" />
        <Text style={[styles.menuText, { color: '#FF6B6B' }]}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  const getOGColor = (level: number) => {
    const colors = ['#CD7F32', '#C0C0C0', '#FFD700', '#B87333', '#E5E4E2'];
    return colors[level - 1] || '#CD7F32';
  };

  const getTrustColor = (level: string) => {
    switch (level) {
      case 'verified': return '#4CAF50';
      case 'high': return '#2196F3';
      case 'medium': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
      >
        {renderHeader()}
        {renderTrustScore()}
        {renderMenuItems()}
        {renderSettings()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#666'
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  avatarSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40
  },
  avatarPlaceholder: {
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold'
  },
  ogBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  ogText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666'
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  userInfo: {
    marginBottom: 20
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  username: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 5
  },
  bio: {
    color: '#999',
    fontSize: 14,
    marginVertical: 10
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  location: {
    color: '#666',
    fontSize: 14,
    marginLeft: 5
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 2
  },
  section: {
    padding: 20
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15
  },
  trustCard: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 10
  },
  trustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  trustLevel: {
    color: '#fff',
    fontWeight: 'bold'
  },
  trustScore: {
    color: '#999',
    fontSize: 14
  },
  trustBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden'
  },
  trustProgress: {
    height: '100%',
    borderRadius: 4
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginLeft: 15
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuValue: {
    color: '#999',
    fontSize: 14,
    marginRight: 10
  }
});