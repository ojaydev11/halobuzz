import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/lib/api';

interface NewUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  country: string;
  joinedAt: string;
  isVerified: boolean;
  ogLevel: number;
  followers: number;
  bio?: string;
}

export default function NewUsersScreen() {
  const router = useRouter();
  const [newUsers, setNewUsers] = useState<NewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'verified' | 'trending'>('all');

  useEffect(() => {
    loadNewUsers();
  }, [selectedFilter]);

  const loadNewUsers = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockUsers: NewUser[] = [
        {
          id: '1',
          username: 'newcreator1',
          displayName: 'New Creator',
          avatar: 'https://via.placeholder.com/100',
          country: 'US',
          joinedAt: new Date().toISOString(),
          isVerified: false,
          ogLevel: 1,
          followers: 0,
          bio: 'Just joined HaloBuzz! Excited to start streaming.',
        },
        {
          id: '2',
          username: 'verifieduser',
          displayName: 'Verified User',
          avatar: 'https://via.placeholder.com/100',
          country: 'CA',
          joinedAt: new Date(Date.now() - 86400000).toISOString(),
          isVerified: true,
          ogLevel: 2,
          followers: 150,
          bio: 'Content creator and streamer. Love gaming and tech!',
        },
        {
          id: '3',
          username: 'trendinguser',
          displayName: 'Trending User',
          avatar: 'https://via.placeholder.com/100',
          country: 'UK',
          joinedAt: new Date(Date.now() - 172800000).toISOString(),
          isVerified: false,
          ogLevel: 3,
          followers: 500,
          bio: 'Making waves in the community!',
        },
        {
          id: '4',
          username: 'gamerpro',
          displayName: 'Gamer Pro',
          avatar: 'https://via.placeholder.com/100',
          country: 'DE',
          joinedAt: new Date(Date.now() - 259200000).toISOString(),
          isVerified: true,
          ogLevel: 4,
          followers: 1200,
          bio: 'Professional gamer and streamer. Competitive esports player.',
        },
        {
          id: '5',
          username: 'artcreator',
          displayName: 'Art Creator',
          avatar: 'https://via.placeholder.com/100',
          country: 'JP',
          joinedAt: new Date(Date.now() - 345600000).toISOString(),
          isVerified: false,
          ogLevel: 2,
          followers: 300,
          bio: 'Digital artist and creative streamer.',
        },
      ];

      // Filter users based on selected filter
      let filteredUsers = mockUsers;
      switch (selectedFilter) {
        case 'verified':
          filteredUsers = mockUsers.filter(user => user.isVerified);
          break;
        case 'trending':
          filteredUsers = mockUsers.filter(user => user.followers > 100);
          break;
        default:
          filteredUsers = mockUsers;
      }

      setNewUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load new users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNewUsers();
    setRefreshing(false);
  };

  const handleFollow = async (userId: string) => {
    try {
      // Mock follow action - replace with actual API call
      console.log('Following user:', userId);
      // Update local state to reflect follow
      setNewUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, followers: user.followers + 1 }
            : user
        )
      );
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'US': '🇺🇸',
      'CA': '🇨🇦',
      'UK': '🇬🇧',
      'DE': '🇩🇪',
      'JP': '🇯🇵',
    };
    return flags[country] || '🌍';
  };

  const renderUser = ({ item }: { item: NewUser }) => (
    <TouchableOpacity 
      style={styles.userCard} 
      onPress={() => handleUserPress(item.id)}
    >
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.displayName}>
              {item.displayName || item.username}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.country}>
              {getCountryFlag(item.country)} {item.country}
            </Text>
            <Text style={styles.joinDate}>
              Joined {formatJoinDate(item.joinedAt)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.followButton}
          onPress={() => handleFollow(item.id)}
        >
          <Ionicons name="add" size={16} color="#007AFF" />
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      </View>
      
      {item.bio && (
        <Text style={styles.bio} numberOfLines={2}>
          {item.bio}
        </Text>
      )}
      
      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>OG{item.ogLevel}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {item.isVerified ? 'Verified' : 'New'}
          </Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ 
    filter, 
    label, 
    icon 
  }: { 
    filter: 'all' | 'verified' | 'trending';
    label: string;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={selectedFilter === filter ? '#fff' : '#888'} 
      />
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading new users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Users</Text>
        <TouchableOpacity onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton filter="all" label="All" icon="people-outline" />
        <FilterButton filter="verified" label="Verified" icon="checkmark-circle-outline" />
        <FilterButton filter="trending" label="Trending" icon="trending-up-outline" />
      </View>

      <FlatList
        data={newUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#888" />
            <Text style={styles.emptyStateText}>No new users found</Text>
            <Text style={styles.emptyStateSubtext}>
              Check back later for new community members
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  username: {
    fontSize: 14,
    color: '#888',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  country: {
    fontSize: 12,
    color: '#888',
  },
  joinDate: {
    fontSize: 12,
    color: '#888',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
