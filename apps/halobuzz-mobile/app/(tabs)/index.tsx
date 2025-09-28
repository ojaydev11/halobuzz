import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import { apiClient } from '@/lib/api';
import { Stream, User } from '@/types/stream';

const { width } = Dimensions.get('window');

interface TrendingStream {
  id: string;
  title: string;
  host: User;
  viewers: number;
  likes: number;
  category: string;
  thumbnail: string;
  isLive: boolean;
  duration?: number;
}

interface FeaturedCreator {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  followers: number;
  isLive: boolean;
  streamTitle?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  streamCount: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [trendingStreams, setTrendingStreams] = useState<TrendingStream[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categoriesData: Category[] = [
    { id: 'gaming', name: 'Gaming', icon: 'game-controller', color: '#FF6B6B', streamCount: 1250 },
    { id: 'music', name: 'Music', icon: 'musical-notes', color: '#4ECDC4', streamCount: 890 },
    { id: 'art', name: 'Art', icon: 'brush', color: '#45B7D1', streamCount: 650 },
    { id: 'talk', name: 'Talk Show', icon: 'chatbubbles', color: '#96CEB4', streamCount: 420 },
    { id: 'education', name: 'Education', icon: 'school', color: '#FFEAA7', streamCount: 380 },
    { id: 'sports', name: 'Sports', icon: 'football', color: '#DDA0DD', streamCount: 290 },
    { id: 'cooking', name: 'Cooking', icon: 'restaurant', color: '#FF8A65', streamCount: 180 },
    { id: 'fitness', name: 'Fitness', icon: 'fitness', color: '#81C784', streamCount: 150 },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load trending streams
      const streamsResponse = await apiClient.getStreams({ 
        limit: 10, 
        sortBy: 'trending',
        isLive: true 
      });
      
      if (streamsResponse.success && streamsResponse.data?.streams) {
        setTrendingStreams(streamsResponse.data.streams.slice(0, 8));
      } else {
        // Fallback data for production
        setTrendingStreams([
          {
            id: '1',
            title: 'Epic Gaming Session - Come Join!',
            host: { id: '1', username: 'GamerPro', displayName: 'Gamer Pro', avatar: 'https://i.pravatar.cc/150?img=1' },
            viewers: 1250,
            likes: 890,
            category: 'gaming',
            thumbnail: 'https://picsum.photos/400/225?random=1',
            isLive: true,
          },
          {
            id: '2',
            title: 'Music Production Live',
            host: { id: '2', username: 'MusicMaker', displayName: 'Music Maker', avatar: 'https://i.pravatar.cc/150?img=2' },
            viewers: 450,
            likes: 320,
            category: 'music',
            thumbnail: 'https://picsum.photos/400/225?random=2',
            isLive: true,
          },
          {
            id: '3',
            title: 'Digital Art Creation',
            host: { id: '3', username: 'ArtistLife', displayName: 'Artist Life', avatar: 'https://i.pravatar.cc/150?img=3' },
            viewers: 780,
            likes: 560,
            category: 'art',
            thumbnail: 'https://picsum.photos/400/225?random=3',
            isLive: true,
          },
        ]);
      }

      // Load featured creators
      const creatorsResponse = await apiClient.get('/users/featured');
      if (creatorsResponse.success && creatorsResponse.data?.creators) {
        setFeaturedCreators(creatorsResponse.data.creators.slice(0, 6));
      } else {
        // Fallback data
        setFeaturedCreators([
          {
            id: '1',
            username: 'GamerPro',
            displayName: 'Gamer Pro',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: 125000,
            isLive: true,
            streamTitle: 'Epic Gaming Session',
          },
          {
            id: '2',
            username: 'MusicMaker',
            displayName: 'Music Maker',
            avatar: 'https://i.pravatar.cc/150?img=2',
            followers: 89000,
            isLive: true,
            streamTitle: 'Music Production Live',
          },
          {
            id: '3',
            username: 'ArtistLife',
            displayName: 'Artist Life',
            avatar: 'https://i.pravatar.cc/150?img=3',
            followers: 67000,
            isLive: false,
          },
        ]);
      }

      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load home data:', error);
      Alert.alert('Error', 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const renderTrendingStream = ({ item }: { item: TrendingStream }) => (
    <TouchableOpacity
      style={styles.streamCard}
      onPress={() => router.push(`/stream/${item.id}`)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.streamThumbnail} />
      <View style={styles.streamOverlay}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={12} color="#fff" />
          <Text style={styles.viewerText}>{item.viewers.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.streamHost}>@{item.host.username}</Text>
        <View style={styles.streamStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={12} color="#ff0000" />
            <Text style={styles.statText}>{item.likes.toLocaleString()}</Text>
          </View>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: item.color }]}
      onPress={() => router.push(`/category/${item.id}`)}
    >
      <Ionicons name={item.icon as any} size={24} color="#fff" />
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryCount}>{item.streamCount} streams</Text>
    </TouchableOpacity>
  );

  const renderFeaturedCreator = ({ item }: { item: FeaturedCreator }) => (
    <TouchableOpacity
      style={styles.creatorCard}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      <Image source={{ uri: item.avatar }} style={styles.creatorAvatar} />
      {item.isLive && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      <Text style={styles.creatorName} numberOfLines={1}>{item.displayName}</Text>
      <Text style={styles.creatorFollowers}>{item.followers.toLocaleString()} followers</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.displayName || user?.username || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="wallet-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/games/casual')}
          >
            <Ionicons name="game-controller" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Games</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/games/advanced')}
          >
            <Ionicons name="trophy" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Advanced</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/games/social')}
          >
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Social</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/games/tournaments')}
          >
            <Ionicons name="medal" size={20} color="#fff" />
            <Text style={styles.quickActionText}>Tournaments</Text>
          </TouchableOpacity>
        </View>

        {/* Trending Streams */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <TouchableOpacity onPress={() => router.push('/trending')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={trendingStreams}
            renderItem={renderTrendingStream}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => router.push('/categories')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Featured Creators */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Creators</Text>
            <TouchableOpacity onPress={() => router.push('/creators')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredCreators}
            renderItem={renderFeaturedCreator}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

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
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#888',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: 20,
  },
  streamCard: {
    width: width * 0.7,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  streamThumbnail: {
    width: '100%',
    height: 120,
  },
  streamOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0000',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 2,
  },
  streamInfo: {
    padding: 12,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  streamHost: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  streamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#888',
    fontSize: 10,
    marginLeft: 2,
  },
  categoryText: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  categoryCard: {
    width: 100,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  creatorCard: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  liveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff0000',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  creatorName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  creatorFollowers: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
});