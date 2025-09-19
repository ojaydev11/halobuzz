import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { apiClient } from '@/lib/api';

const { width: screenWidth } = Dimensions.get('window');

interface SocialFeaturesProps {
  streamId: string;
  hostId: string;
  hostUsername: string;
  currentLikes: number;
  currentFollowers: number;
  onLike: (streamId: string) => void;
  onFollow: (userId: string) => void;
  onShare: (streamData: any) => void;
  onGift: (streamId: string) => void;
}

interface UserStats {
  followers: number;
  following: number;
  totalLikes: number;
  totalStreams: number;
  isFollowing: boolean;
  isLiked: boolean;
}

export default function SocialFeatures({
  streamId,
  hostId,
  hostUsername,
  currentLikes,
  currentFollowers,
  onLike,
  onFollow,
  onShare,
  onGift,
}: SocialFeaturesProps) {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    followers: currentFollowers,
    following: 0,
    totalLikes: currentLikes,
    totalStreams: 0,
    isFollowing: false,
    isLiked: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  
  const likeAnimation = useState(new Animated.Value(1))[0];
  const followAnimation = useState(new Animated.Value(1))[0];
  const giftAnimation = useState(new Animated.Value(1))[0];

  useEffect(() => {
    loadUserStats();
  }, [hostId]);

  const loadUserStats = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getUserProfile(hostId);
      if (response.success) {
        setUserStats({
          followers: response.data?.followers || currentFollowers,
          following: response.data?.following || 0,
          totalLikes: response.data?.totalLikes || currentLikes,
          totalStreams: response.data?.totalStreams || 0,
          isFollowing: response.data?.isFollowing || false,
          isLiked: response.data?.isLiked || false,
        });
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      
      // Animate like button
      Animated.sequence([
        Animated.timing(likeAnimation, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(likeAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const response = await apiClient.likeStream(streamId);
      if (response.success) {
        setUserStats(prev => ({
          ...prev,
          isLiked: !prev.isLiked,
          totalLikes: prev.isLiked ? prev.totalLikes - 1 : prev.totalLikes + 1,
        }));
        onLike(streamId);
      } else {
        Alert.alert('Error', response.error || 'Failed to like stream');
      }
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Error', 'Failed to like stream');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      
      // Animate follow button
      Animated.sequence([
        Animated.timing(followAnimation, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(followAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      const response = userStats.isFollowing 
        ? await apiClient.unfollowUser(hostId)
        : await apiClient.followUser(hostId);

      if (response.success) {
        setUserStats(prev => ({
          ...prev,
          isFollowing: !prev.isFollowing,
          followers: prev.isFollowing ? prev.followers - 1 : prev.followers + 1,
        }));
        onFollow(hostId);
        
        Alert.alert(
          'Success',
          userStats.isFollowing 
            ? `You unfollowed @${hostUsername}` 
            : `You're now following @${hostUsername}`
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to follow user');
      }
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('Error', 'Failed to follow user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    setShowShareMenu(true);
    onShare({
      streamId,
      hostUsername,
      title: `Check out @${hostUsername}'s live stream!`,
      url: `halobuzz://stream/${streamId}`,
    });
  };

  const handleGift = () => {
    setShowGiftMenu(true);
    onGift(streamId);
  };

  const shareOptions = [
    {
      id: 'copy-link',
      title: 'Copy Link',
      icon: 'copy-outline',
      action: () => {
        // Implement copy to clipboard
        Alert.alert('Link Copied', 'Stream link copied to clipboard');
        setShowShareMenu(false);
      },
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: 'logo-whatsapp',
      action: () => {
        // Implement WhatsApp sharing
        Alert.alert('Share', 'Opening WhatsApp...');
        setShowShareMenu(false);
      },
    },
    {
      id: 'telegram',
      title: 'Telegram',
      icon: 'logo-telegram',
      action: () => {
        // Implement Telegram sharing
        Alert.alert('Share', 'Opening Telegram...');
        setShowShareMenu(false);
      },
    },
    {
      id: 'facebook',
      title: 'Facebook',
      icon: 'logo-facebook',
      action: () => {
        // Implement Facebook sharing
        Alert.alert('Share', 'Opening Facebook...');
        setShowShareMenu(false);
      },
    },
    {
      id: 'twitter',
      title: 'Twitter',
      icon: 'logo-twitter',
      action: () => {
        // Implement Twitter sharing
        Alert.alert('Share', 'Opening Twitter...');
        setShowShareMenu(false);
      },
    },
  ];

  const giftOptions = [
    { id: '1', name: 'Rose', value: 10, icon: '🌹', color: '#ff4757' },
    { id: '2', name: 'Heart', value: 50, icon: '❤️', color: '#ff4757' },
    { id: '3', name: 'Crown', value: 100, icon: '👑', color: '#ffd700' },
    { id: '4', name: 'Diamond', value: 500, icon: '💎', color: '#00d2d3' },
    { id: '5', name: 'Rocket', value: 1000, icon: '🚀', color: '#ff9ff3' },
    { id: '6', name: 'Super Gift', value: 5000, icon: '🎁', color: '#ff6b6b' },
  ];

  return (
    <View style={styles.container}>
      {/* User Stats */}
      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userStats.followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userStats.following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userStats.totalLikes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{userStats.totalStreams}</Text>
          <Text style={styles.statLabel}>Streams</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.likeButton,
              userStats.isLiked && styles.likeButtonActive,
            ]}
            onPress={handleLike}
            disabled={isLoading}
          >
            <Ionicons
              name={userStats.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={userStats.isLiked ? '#ff4757' : '#fff'}
            />
            <Text style={styles.actionButtonText}>Like</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: followAnimation }] }}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.followButton,
              userStats.isFollowing && styles.followButtonActive,
            ]}
            onPress={handleFollow}
            disabled={isLoading}
          >
            <Ionicons
              name={userStats.isFollowing ? 'person-remove' : 'person-add'}
              size={24}
              color={userStats.isFollowing ? '#ff4757' : '#fff'}
            />
            <Text style={styles.actionButtonText}>
              {userStats.isFollowing ? 'Unfollow' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: giftAnimation }] }}>
          <TouchableOpacity
            style={[styles.actionButton, styles.giftButton]}
            onPress={handleGift}
          >
            <Ionicons name="gift-outline" size={24} color="#ffd700" />
            <Text style={styles.actionButtonText}>Gift</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Share Menu Modal */}
      {showShareMenu && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Stream</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowShareMenu(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.shareOptions}>
              {shareOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.shareOption}
                  onPress={option.action}
                >
                  <Ionicons name={option.icon as any} size={24} color="#fff" />
                  <Text style={styles.shareOptionText}>{option.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Gift Menu Modal */}
      {showGiftMenu && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send a Gift</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowGiftMenu(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.giftOptions}>
              {giftOptions.map((gift) => (
                <TouchableOpacity
                  key={gift.id}
                  style={[styles.giftOption, { borderColor: gift.color }]}
                  onPress={() => {
                    // Implement gift sending
                    Alert.alert('Gift Sent', `You sent a ${gift.name} to @${hostUsername}!`);
                    setShowGiftMenu(false);
                  }}
                >
                  <Text style={styles.giftIcon}>{gift.icon}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  <Text style={styles.giftValue}>{gift.value} coins</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  likeButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.5)',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(255, 71, 87, 0.4)',
    borderColor: '#ff4757',
  },
  followButton: {
    backgroundColor: 'rgba(0, 210, 211, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 211, 0.5)',
  },
  followButtonActive: {
    backgroundColor: 'rgba(0, 210, 211, 0.4)',
    borderColor: '#00d2d3',
  },
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  giftButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 20,
    width: screenWidth * 0.8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 8,
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shareOption: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
  },
  shareOptionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  giftOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  giftOption: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  giftIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  giftName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  giftValue: {
    color: '#ffd700',
    fontSize: 10,
  },
});
