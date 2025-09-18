import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface Reel {
  id: string;
  videoUrl: string;
  thumbnail: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    verified: boolean;
    followers: number;
  };
  title: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  duration: number;
  timestamp: string;
  isLiked: boolean;
  isBookmarked: boolean;
  hashtags: string[];
  music: {
    title: string;
    artist: string;
  };
}

interface Comment {
  id: string;
  user: {
    username: string;
    displayName: string;
    avatar?: string;
    verified: boolean;
  };
  text: string;
  likes: number;
  timestamp: string;
  isLiked: boolean;
  replies: Comment[];
}

export default function ReelsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [creatorReels, setCreatorReels] = useState<Reel[]>([]);
  const videoRefs = useRef<{ [key: string]: Video }>({});

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      setLoading(true);
      
      // Mock reels data
      const mockReels: Reel[] = [
        {
          id: '1',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail: 'https://via.placeholder.com/400x600/ff0000/ffffff?text=Gaming+Reel',
          creator: {
            id: '1',
            username: 'gamingpro',
            displayName: 'Gaming Pro',
            verified: true,
            followers: 125000,
          },
          title: 'Epic Gaming Moment',
          description: 'Just pulled off the most insane combo! 🔥 #gaming #epic',
          likes: 15420,
          comments: 892,
          shares: 234,
          views: 1250000,
          duration: 30,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isLiked: false,
          isBookmarked: false,
          hashtags: ['#gaming', '#epic', '#combo'],
          music: {
            title: 'Epic Gaming Music',
            artist: 'GameSound Pro',
          },
        },
        {
          id: '2',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnail: 'https://via.placeholder.com/400x600/ff00ff/ffffff?text=Dance+Reel',
          creator: {
            id: '2',
            username: 'dancequeen',
            displayName: 'Dance Queen',
            verified: true,
            followers: 89000,
          },
          title: 'Dance Challenge',
          description: 'New dance trend alert! Who can do this? 💃 #dance #trending',
          likes: 8930,
          comments: 456,
          shares: 123,
          views: 890000,
          duration: 45,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          isLiked: true,
          isBookmarked: true,
          hashtags: ['#dance', '#trending', '#challenge'],
          music: {
            title: 'Trending Beat',
            artist: 'Dance Master',
          },
        },
        {
          id: '3',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          thumbnail: 'https://via.placeholder.com/400x600/00ff00/ffffff?text=Cooking+Reel',
          creator: {
            id: '3',
            username: 'chefmaster',
            displayName: 'Chef Master',
            verified: false,
            followers: 45000,
          },
          title: 'Quick Recipe',
          description: '5-minute pasta recipe that will blow your mind! 🍝 #cooking #recipe',
          likes: 6780,
          comments: 234,
          shares: 89,
          views: 450000,
          duration: 60,
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          isLiked: false,
          isBookmarked: false,
          hashtags: ['#cooking', '#recipe', '#pasta'],
          music: {
            title: 'Kitchen Vibes',
            artist: 'Cooking Sounds',
          },
        },
      ];

      setReels(mockReels);
    } catch (error) {
      console.error('Failed to load reels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (reelId: string) => {
    try {
      // Mock comments data
      const mockComments: Comment[] = [
        {
          id: '1',
          user: {
            username: 'fan1',
            displayName: 'Super Fan',
            verified: false,
          },
          text: 'This is absolutely amazing! 🔥',
          likes: 23,
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isLiked: false,
          replies: [],
        },
        {
          id: '2',
          user: {
            username: 'gamer2',
            displayName: 'Pro Gamer',
            verified: true,
          },
          text: 'How did you do that combo? Teach me!',
          likes: 45,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isLiked: true,
          replies: [
            {
              id: '3',
              user: {
                username: 'gamingpro',
                displayName: 'Gaming Pro',
                verified: true,
              },
              text: 'Practice makes perfect! I\'ll make a tutorial soon.',
              likes: 12,
              timestamp: new Date(Date.now() - 3500000).toISOString(),
              isLiked: false,
              replies: [],
            },
          ],
        },
      ];

      setComments(mockComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadCreatorReels = async (creatorId: string) => {
    try {
      // Mock creator reels
      const mockCreatorReels: Reel[] = [
        {
          id: '4',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail: 'https://via.placeholder.com/200x300/ff0000/ffffff?text=Reel+1',
          creator: {
            id: creatorId,
            username: 'gamingpro',
            displayName: 'Gaming Pro',
            verified: true,
            followers: 125000,
          },
          title: 'Gaming Tutorial',
          description: 'Learn the basics',
          likes: 5000,
          comments: 200,
          shares: 50,
          views: 100000,
          duration: 45,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isLiked: false,
          isBookmarked: false,
          hashtags: ['#tutorial'],
          music: { title: 'Tutorial Music', artist: 'GameSound Pro' },
        },
        {
          id: '5',
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          thumbnail: 'https://via.placeholder.com/200x300/ff0000/ffffff?text=Reel+2',
          creator: {
            id: creatorId,
            username: 'gamingpro',
            displayName: 'Gaming Pro',
            verified: true,
            followers: 125000,
          },
          title: 'Gaming Tips',
          description: 'Pro tips for beginners',
          likes: 3000,
          comments: 150,
          shares: 30,
          views: 75000,
          duration: 30,
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          isLiked: false,
          isBookmarked: false,
          hashtags: ['#tips'],
          music: { title: 'Tips Music', artist: 'GameSound Pro' },
        },
      ];

      setCreatorReels(mockCreatorReels);
    } catch (error) {
      console.error('Failed to load creator reels:', error);
    }
  };

  const handleLike = (reelId: string) => {
    setReels(reels.map(reel => 
      reel.id === reelId 
        ? { 
            ...reel, 
            isLiked: !reel.isLiked, 
            likes: reel.isLiked ? reel.likes - 1 : reel.likes + 1 
          }
        : reel
    ));
  };

  const handleBookmark = (reelId: string) => {
    setReels(reels.map(reel => 
      reel.id === reelId 
        ? { ...reel, isBookmarked: !reel.isBookmarked }
        : reel
    ));
  };

  const handleFollow = (creatorId: string) => {
    Alert.alert('Follow', 'User followed successfully!');
  };

  const handleShare = (reel: Reel) => {
    Alert.alert('Share', `Sharing "${reel.title}"`);
  };

  const handleComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        user: {
          username: user?.username || 'you',
          displayName: user?.displayName || 'You',
          verified: false,
        },
        text: newComment,
        likes: 0,
        timestamp: new Date().toISOString(),
        isLiked: false,
        replies: [],
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  const handleProfilePress = async (creator: any) => {
    setSelectedCreator(creator);
    await loadCreatorReels(creator.id);
    setShowProfile(true);
  };

  const ReelItem = ({ item, index }: { item: Reel; index: number }) => (
    <View style={styles.reelContainer}>
      <Video
        ref={(ref) => {
          if (ref) videoRefs.current[item.id] = ref;
        }}
        source={{ uri: item.videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={index === currentIndex}
        isLooping
        volume={0.5}
      />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        {/* Creator Info */}
        <View style={styles.creatorInfo}>
          <TouchableOpacity 
            style={styles.creatorAvatar}
            onPress={() => handleProfilePress(item.creator)}
          >
            <Image 
              source={{ uri: item.creator.avatar || `https://via.placeholder.com/40x40/007AFF/ffffff?text=${item.creator.username.charAt(0).toUpperCase()}` }} 
              style={styles.avatarImage}
            />
          </TouchableOpacity>
          <View style={styles.creatorDetails}>
            <TouchableOpacity onPress={() => handleProfilePress(item.creator)}>
              <Text style={styles.creatorName}>{item.creator.displayName}</Text>
            </TouchableOpacity>
            <Text style={styles.creatorUsername}>@{item.creator.username}</Text>
          </View>
          <TouchableOpacity 
            style={styles.followButton}
            onPress={() => handleFollow(item.creator.id)}
          >
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Video Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle}>{item.title}</Text>
          <Text style={styles.videoDescription}>{item.description}</Text>
          <View style={styles.hashtags}>
            {item.hashtags.map((tag, idx) => (
              <Text key={idx} style={styles.hashtag}>{tag}</Text>
            ))}
          </View>
        </View>

        {/* Music Info */}
        <View style={styles.musicInfo}>
          <Ionicons name="musical-notes" size={16} color="#fff" />
          <Text style={styles.musicText}>{item.music.title}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={32} 
              color={item.isLiked ? "#ff0000" : "#fff"} 
            />
            <Text style={styles.actionText}>{item.likes.toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              loadComments(item.id);
              setShowComments(true);
            }}
          >
            <Ionicons name="chatbubble-outline" size={32} color="#fff" />
            <Text style={styles.actionText}>{item.comments.toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-outline" size={32} color="#fff" />
            <Text style={styles.actionText}>{item.shares.toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleBookmark(item.id)}
          >
            <Ionicons 
              name={item.isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={32} 
              color={item.isBookmarked ? "#007AFF" : "#fff"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const CreatorProfileModal = () => (
    <Modal
      visible={showProfile}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.profileModal}>
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowProfile(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.profileTitle}>Creator Profile</Text>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={() => {
              setShowProfile(false);
              router.push('/messages');
            }}
          >
            <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.profileContent}>
          {/* Creator Info */}
          <View style={styles.creatorProfileInfo}>
            <Image 
              source={{ uri: selectedCreator?.avatar || `https://via.placeholder.com/100x100/007AFF/ffffff?text=${selectedCreator?.username?.charAt(0).toUpperCase()}` }} 
              style={styles.profileAvatar}
            />
            <Text style={styles.profileDisplayName}>{selectedCreator?.displayName}</Text>
            <Text style={styles.profileUsername}>@{selectedCreator?.username}</Text>
            {selectedCreator?.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <Text style={styles.followerCount}>
              {selectedCreator?.followers.toLocaleString()} followers
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.profileActions}>
            <TouchableOpacity style={styles.followProfileButton}>
              <Text style={styles.followProfileButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.messageProfileButton}
              onPress={() => {
                setShowProfile(false);
                router.push('/messages');
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              <Text style={styles.messageProfileButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Creator Reels Grid */}
          <View style={styles.reelsGrid}>
            <Text style={styles.reelsGridTitle}>More from {selectedCreator?.displayName}</Text>
            <View style={styles.reelsThumbnailGrid}>
              {creatorReels.map((reel) => (
                <TouchableOpacity 
                  key={reel.id} 
                  style={styles.reelThumbnail}
                  onPress={() => {
                    setShowProfile(false);
                    // Find and navigate to the reel
                    const reelIndex = reels.findIndex(r => r.id === reel.id);
                    if (reelIndex !== -1) {
                      setCurrentIndex(reelIndex);
                    }
                  }}
                >
                  <Image source={{ uri: reel.thumbnail }} style={styles.thumbnailImage} />
                  <View style={styles.thumbnailOverlay}>
                    <Ionicons name="play" size={20} color="#fff" />
                    <Text style={styles.thumbnailDuration}>{reel.duration}s</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const CommentsModal = () => (
    <Modal
      visible={showComments}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.commentsModal}>
        <View style={styles.commentsHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowComments(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.commentsTitle}>Comments</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.commentsContent}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Image 
                source={{ uri: `https://via.placeholder.com/32x32/007AFF/ffffff?text=${comment.user.username.charAt(0).toUpperCase()}` }} 
                style={styles.commentAvatar}
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{comment.user.displayName}</Text>
                  {comment.user.verified && (
                    <Ionicons name="checkmark-circle" size={12} color="#007AFF" />
                  )}
                  <Text style={styles.commentTime}>
                    {new Date(comment.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.commentAction}>
                    <Ionicons 
                      name={comment.isLiked ? "heart" : "heart-outline"} 
                      size={16} 
                      color={comment.isLiked ? "#ff0000" : "#888"} 
                    />
                    <Text style={styles.commentActionText}>{comment.likes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentAction}>
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.commentInput}>
          <TextInput
            style={styles.commentTextInput}
            placeholder="Add a comment..."
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleComment}
          >
            <Ionicons name="send" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

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
        data={reels}
        renderItem={({ item, index }) => <ReelItem item={item} index={index} />}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / height);
          setCurrentIndex(index);
        }}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
      />

      <CreatorProfileModal />
      <CommentsModal />
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
  reelContainer: {
    width: width,
    height: height,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
  },
  creatorAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  creatorUsername: {
    color: '#ccc',
    fontSize: 14,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 100,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  videoDescription: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hashtag: {
    color: '#007AFF',
    fontSize: 16,
    marginRight: 8,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  musicText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  actionButtons: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  profileModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  messageButton: {
    padding: 4,
  },
  profileContent: {
    flex: 1,
    padding: 20,
  },
  creatorProfileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  profileDisplayName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileUsername: {
    color: '#888',
    fontSize: 16,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 4,
  },
  followerCount: {
    color: '#888',
    fontSize: 14,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  followProfileButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  followProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageProfileButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  messageProfileButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  reelsGrid: {
    marginTop: 20,
  },
  reelsGridTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reelsThumbnailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reelThumbnail: {
    width: (width - 60) / 3,
    height: (width - 60) / 3 * 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  thumbnailDuration: {
    color: '#fff',
    fontSize: 10,
  },
  commentsModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  commentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  commentsContent: {
    flex: 1,
    padding: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  commentUsername: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentTime: {
    color: '#888',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    color: '#888',
    fontSize: 12,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
