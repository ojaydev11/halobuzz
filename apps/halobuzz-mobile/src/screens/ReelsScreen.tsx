import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, FlatList, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/store/AuthContextOptimized';

interface ReelItemDto {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  viewUrl: string;
  createdAt: string;
  userId?: any;
  username?: string;
  avatar?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  isLiked?: boolean;
  isFollowing?: boolean;
  creator?: {
    id: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
}

export default function ReelsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reels, setReels] = useState<ReelItemDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await apiClient.get('/reels', {
        params: { limit: 20, offset: refresh ? 0 : reels.length }
      });

      const items = res.data?.reels || res.data?.data?.reels || [];

      if (refresh) {
        setReels(items);
      } else {
        setReels(prev => [...prev, ...items]);
      }
    } catch (e) {
      console.error('Failed to load reels:', e);
      // Fallback mock data for demo
      const mockReels: ReelItemDto[] = [
        {
          id: '1',
          title: 'Amazing dance moves! 💃',
          viewUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          username: 'danceQueen',
          avatar: 'https://i.pravatar.cc/150?img=1',
          likes: 1250,
          comments: 89,
          shares: 45,
          views: 12580,
          isLiked: false,
          isFollowing: false,
          tags: ['dance', 'trending', 'viral'],
          createdAt: new Date().toISOString(),
          creator: {
            id: 'user1',
            username: 'danceQueen',
            avatar: 'https://i.pravatar.cc/150?img=1',
            isVerified: true
          }
        },
        {
          id: '2',
          title: 'Gaming highlights 🎮',
          viewUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
          username: 'proGamer',
          avatar: 'https://i.pravatar.cc/150?img=2',
          likes: 890,
          comments: 67,
          shares: 23,
          views: 8750,
          isLiked: true,
          isFollowing: true,
          tags: ['gaming', 'highlights', 'esports'],
          createdAt: new Date().toISOString(),
          creator: {
            id: 'user2',
            username: 'proGamer',
            avatar: 'https://i.pravatar.cc/150?img=2',
            isVerified: false
          }
        }
      ];
      setReels(mockReels);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async (reelId: string) => {
    try {
      const reel = reels.find(r => r.id === reelId);
      if (!reel) return;

      const newIsLiked = !reel.isLiked;

      // Optimistic update
      setReels(prev => prev.map(r =>
        r.id === reelId
          ? {
              ...r,
              isLiked: newIsLiked,
              likes: (r.likes || 0) + (newIsLiked ? 1 : -1)
            }
          : r
      ));

      const response = await apiClient.post(`/reels/${reelId}/like`, {
        action: newIsLiked ? 'like' : 'unlike'
      });

      if (!response.success) {
        // Revert on failure
        setReels(prev => prev.map(r =>
          r.id === reelId
            ? {
                ...r,
                isLiked: !newIsLiked,
                likes: (r.likes || 0) - (newIsLiked ? 1 : -1)
              }
            : r
        ));
      }
    } catch (error) {
      console.error('Failed to like/unlike reel:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const reel = reels.find(r => r.creator?.id === userId || r.userId === userId);
      if (!reel) return;

      const newIsFollowing = !reel.isFollowing;

      // Optimistic update
      setReels(prev => prev.map(r =>
        (r.creator?.id === userId || r.userId === userId)
          ? { ...r, isFollowing: newIsFollowing }
          : r
      ));

      const response = await apiClient.post(`/users/${userId}/follow`, {
        action: newIsFollowing ? 'follow' : 'unfollow'
      });

      if (!response.success) {
        // Revert on failure
        setReels(prev => prev.map(r =>
          (r.creator?.id === userId || r.userId === userId)
            ? { ...r, isFollowing: !newIsFollowing }
            : r
        ));
      }
    } catch (error) {
      console.error('Failed to follow/unfollow user:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);
    }
  }).current;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelCard
            item={item}
            isActive={index === currentIndex}
            onLike={handleLike}
            onFollow={handleFollow}
            currentUser={user}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 80,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReels(true)}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onEndReached={() => loadReels()}
        onEndReachedThreshold={0.5}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </SafeAreaView>
  );
}

interface ReelCardProps {
  item: ReelItemDto;
  isActive: boolean;
  onLike: (id: string) => void;
  onFollow: (userId: string) => void;
  currentUser: any;
}

function ReelCard({ item, isActive, onLike, onFollow, currentUser }: ReelCardProps) {
  const player = useVideoPlayer(item.viewUrl, (p) => {
    p.loop = true;
    if (isActive) {
      p.play();
    } else {
      p.pause();
    }
  });

  const formatNumber = (num?: number): string => {
    if (!num) return '0';
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const creator = item.creator || {
    id: item.userId || 'unknown',
    username: item.username || 'creator',
    avatar: item.avatar || 'https://i.pravatar.cc/150',
    isVerified: false
  };

  const isOwnReel = currentUser?.id === creator.id;

  return (
    <View style={styles.card}>
      <VideoView style={styles.video} player={player} />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
      />

      {/* Content overlay */}
      <View style={styles.contentOverlay}>
        {/* Left side content */}
        <View style={styles.leftContent}>
          <View style={styles.creatorInfo}>
            <View style={styles.creatorHeader}>
              <Text style={styles.username}>@{creator.username}</Text>
              {creator.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
              )}
              {!item.isFollowing && !isOwnReel && (
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={() => onFollow(creator.id)}
                >
                  <Text style={styles.followButtonText}>Follow</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.reelTitle}>{item.title}</Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.map((tag, index) => (
                  <Text key={index} style={styles.tag}>#{tag}</Text>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Right side actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(item.id)}
          >
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={28}
              color={item.isLiked ? "#FF0040" : "#FFFFFF"}
            />
            <Text style={styles.actionText}>
              {formatNumber(item.likes)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>
              {formatNumber(item.comments)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="arrow-redo-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>
              {formatNumber(item.shares)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Creator avatar */}
          <TouchableOpacity style={styles.creatorAvatar}>
            <Image
              source={{ uri: creator.avatar }}
              style={styles.avatarImage}
              defaultSource={{ uri: 'https://i.pravatar.cc/150' }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

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
  card: {
    width,
    height,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32,
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  creatorInfo: {
    marginBottom: 16,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  followButton: {
    backgroundColor: '#FF0040',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 12,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  reelTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 8,
    fontWeight: '500',
  },
  rightActions: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  creatorAvatar: {
    marginTop: 16,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});