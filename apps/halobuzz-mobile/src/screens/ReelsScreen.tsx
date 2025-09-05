import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { useIsFocused } from '@react-navigation/native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface Reel {
  _id: string;
  userId: {
    _id: string;
    username: string;
    avatar: string;
  };
  fileKey: string;
  viewUrl: string;
  title: string;
  description: string;
  tags: string[];
  metadata: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  isLiked: boolean;
}

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  onLike: (reelId: string) => void;
  onComment: (reelId: string) => void;
  onShare: (reelId: string) => void;
  onFollow: (userId: string) => void;
}

const ReelItem: React.FC<ReelItemProps> = ({ 
  reel, 
  isActive, 
  onLike, 
  onComment, 
  onShare,
  onFollow
}) => {
  const [liked, setLiked] = useState(reel.isLiked);
  const [likeCount, setLikeCount] = useState(reel.metadata.likes);

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    onLike(reel._id);
  };

  return (
    <View style={styles.reelContainer}>
      <Video
        source={{ uri: reel.viewUrl }}
        style={styles.video}
        paused={!isActive}
        repeat
        resizeMode="cover"
        muted={!isActive}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        playWhenInactive={false}
      />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <TouchableOpacity 
            style={styles.userRow}
            onPress={() => onFollow(reel.userId._id)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {reel.userId.username[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.username}>@{reel.userId.username}</Text>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followText}>Follow</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Title and Description */}
          <Text style={styles.title} numberOfLines={2}>{reel.title}</Text>
          {reel.description && (
            <Text style={styles.description} numberOfLines={3}>
              {reel.description}
            </Text>
          )}

          {/* Tags */}
          {reel.tags.length > 0 && (
            <View style={styles.tags}>
              {reel.tags.slice(0, 3).map((tag, index) => (
                <Text key={index} style={styles.tag}>#{tag}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLike}
          >
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={32} 
              color={liked ? "#FF6B6B" : "#fff"} 
            />
            <Text style={styles.actionText}>
              {likeCount > 0 ? likeCount.toLocaleString() : 'Like'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onComment(reel._id)}
          >
            <Ionicons name="chatbubble-outline" size={32} color="#fff" />
            <Text style={styles.actionText}>
              {reel.metadata.comments > 0 ? reel.metadata.comments.toLocaleString() : 'Comment'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onShare(reel._id)}
          >
            <Ionicons name="arrow-redo-outline" size={32} color="#fff" />
            <Text style={styles.actionText}>
              {reel.metadata.shares > 0 ? reel.metadata.shares.toLocaleString() : 'Share'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="more-vert" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Music/Audio Indicator */}
      <View style={styles.musicIndicator}>
        <Ionicons name="musical-notes" size={16} color="#fff" />
        <Text style={styles.musicText}>Original Audio</Text>
      </View>
    </View>
  );
};

export const ReelsScreen = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const isFocused = useIsFocused();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      } else {
        setLoading(true);
      }

      const response = await apiService.get('/api/v1/reels', {
        params: {
          page: isRefresh ? 1 : page,
          limit: 10
        }
      });

      if (response.data.success) {
        if (isRefresh) {
          setReels(response.data.data);
        } else {
          setReels(prev => [...prev, ...response.data.data]);
        }
      }
    } catch (error) {
      console.error('Failed to load reels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLike = async (reelId: string) => {
    try {
      await apiService.post(`/api/v1/reels/${reelId}/like`);
    } catch (error) {
      console.error('Failed to like reel:', error);
    }
  };

  const handleComment = (reelId: string) => {
    // Navigate to comments screen
    console.log('Open comments for:', reelId);
  };

  const handleShare = async (reelId: string) => {
    try {
      const reel = reels.find(r => r._id === reelId);
      if (reel) {
        await Share.share({
          message: `Check out this amazing reel: ${reel.title}`,
          url: `https://halobuzz.com/reels/${reelId}`
        });
        
        // Track share
        await apiService.post(`/api/v1/reels/${reelId}/share`);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await apiService.post(`/api/v1/users/${userId}/follow`);
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderReel = ({ item, index }: { item: Reel; index: number }) => (
    <ReelItem
      reel={item}
      isActive={isFocused && index === currentIndex}
      onLike={handleLike}
      onComment={handleComment}
      onShare={handleShare}
      onFollow={handleFollow}
    />
  );

  if (loading && reels.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item._id}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => {
          if (!loading) {
            setPage(prev => prev + 1);
            loadReels();
          }
        }}
        onEndReachedThreshold={2}
        refreshing={refreshing}
        onRefresh={() => loadReels(true)}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />

      {/* Upload Button */}
      <TouchableOpacity style={styles.uploadButton}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#666',
    marginTop: 10
  },
  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative'
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end'
  },
  userInfo: {
    position: 'absolute',
    bottom: 100,
    left: 15,
    right: 80
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  followButton: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fff'
  },
  followText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  description: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  tag: {
    color: '#fff',
    fontSize: 14,
    marginRight: 10,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  actions: {
    position: 'absolute',
    right: 15,
    bottom: 100,
    alignItems: 'center'
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 25
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  musicIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  musicText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5
  },
  uploadButton: {
    position: 'absolute',
    top: 50,
    right: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,107,0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});