import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

interface Post {
  id: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
    verified: boolean;
    ogLevel: number;
  };
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  type: 'text' | 'image' | 'stream' | 'nft' | 'achievement';
}

interface Story {
  id: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  thumbnail: string;
  timestamp: string;
  isViewed: boolean;
}

interface TrendingTopic {
  id: string;
  hashtag: string;
  posts: number;
  trend: 'up' | 'down' | 'stable';
}

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  followers: number;
  bio: string;
  isFollowing: boolean;
}

export default function SocialHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      
      // Mock posts
      const mockPosts: Post[] = [
        {
          id: '1',
          author: {
            username: 'gamingpro',
            displayName: 'Gaming Pro',
            verified: true,
            ogLevel: 5,
          },
          content: 'Just hit 100K followers! 🎉 Thank you all for the amazing support. The journey has been incredible! #milestone #gaming',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          likes: 1250,
          comments: 89,
          shares: 45,
          isLiked: false,
          isBookmarked: false,
          type: 'text',
        },
        {
          id: '2',
          author: {
            username: 'streamqueen',
            displayName: 'Stream Queen',
            verified: true,
            ogLevel: 4,
          },
          content: 'Check out my new NFT collection! Each piece tells a story from my streaming journey. Available now on the marketplace! 🎨✨',
          image: 'https://via.placeholder.com/400x300/ff00ff/ffffff?text=NFT+Collection',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          likes: 890,
          comments: 67,
          shares: 23,
          isLiked: true,
          isBookmarked: true,
          type: 'nft',
        },
        {
          id: '3',
          author: {
            username: 'contentking',
            displayName: 'Content King',
            verified: false,
            ogLevel: 3,
          },
          content: 'Live streaming in 30 minutes! Join me for some epic gaming action and let\'s break some records together! 🎮🔥',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          likes: 456,
          comments: 34,
          shares: 12,
          isLiked: false,
          isBookmarked: false,
          type: 'stream',
        },
      ];

      // Mock stories
      const mockStories: Story[] = [
        {
          id: '1',
          author: {
            username: 'gamingpro',
            displayName: 'Gaming Pro',
          },
          thumbnail: 'https://via.placeholder.com/80x80/ff0000/ffffff?text=GP',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isViewed: false,
        },
        {
          id: '2',
          author: {
            username: 'streamqueen',
            displayName: 'Stream Queen',
          },
          thumbnail: 'https://via.placeholder.com/80x80/ff00ff/ffffff?text=SQ',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isViewed: true,
        },
        {
          id: '3',
          author: {
            username: 'contentking',
            displayName: 'Content King',
          },
          thumbnail: 'https://via.placeholder.com/80x80/00ff00/ffffff?text=CK',
          timestamp: new Date(Date.now() - 5400000).toISOString(),
          isViewed: false,
        },
      ];

      // Mock trending topics
      const mockTrendingTopics: TrendingTopic[] = [
        { id: '1', hashtag: '#HaloBuzzGaming', posts: 15420, trend: 'up' },
        { id: '2', hashtag: '#NFTCollection', posts: 8930, trend: 'up' },
        { id: '3', hashtag: '#LiveStreaming', posts: 12500, trend: 'stable' },
        { id: '4', hashtag: '#CreatorEconomy', posts: 6780, trend: 'down' },
        { id: '5', hashtag: '#GamingCommunity', posts: 23400, trend: 'up' },
      ];

      // Mock suggested users
      const mockSuggestedUsers: SuggestedUser[] = [
        {
          id: '1',
          username: 'newcreator',
          displayName: 'New Creator',
          verified: false,
          followers: 1250,
          bio: 'Just starting my creator journey!',
          isFollowing: false,
        },
        {
          id: '2',
          username: 'gaminglegend',
          displayName: 'Gaming Legend',
          verified: true,
          followers: 45000,
          bio: 'Professional gamer and streamer',
          isFollowing: false,
        },
        {
          id: '3',
          username: 'artmaster',
          displayName: 'Art Master',
          verified: false,
          followers: 8900,
          bio: 'Digital artist and NFT creator',
          isFollowing: true,
        },
      ];

      setPosts(mockPosts);
      setStories(mockStories);
      setTrendingTopics(mockTrendingTopics);
      setSuggestedUsers(mockSuggestedUsers);
    } catch (error) {
      console.error('Failed to load social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSocialData();
    setRefreshing(false);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked, 
            likes: post.isLiked ? post.likes - 1 : post.likes + 1 
          }
        : post
    ));
  };

  const handleBookmark = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isBookmarked: !post.isBookmarked }
        : post
    ));
  };

  const handleFollow = (userId: string) => {
    setSuggestedUsers(suggestedUsers.map(user => 
      user.id === userId 
        ? { ...user, isFollowing: !user.isFollowing }
        : user
    ));
  };

  const TabButton = ({ id, title, isActive, onPress }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const StoryItem = ({ story }: { story: Story }) => (
    <TouchableOpacity style={styles.storyItem}>
      <View style={[
        styles.storyThumbnail,
        !story.isViewed && styles.storyUnviewed
      ]}>
        <Image source={{ uri: story.thumbnail }} style={styles.storyImage} />
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {story.author.username}
      </Text>
    </TouchableOpacity>
  );

  const PostCard = ({ post }: { post: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {post.author.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorDisplayName}>{post.author.displayName}</Text>
              {post.author.verified && (
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
              )}
              <View style={styles.ogLevel}>
                <Text style={styles.ogLevelText}>OG{post.author.ogLevel}</Text>
              </View>
            </View>
            <Text style={styles.authorUsername}>@{post.author.username}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLike(post.id)}
        >
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={20} 
            color={post.isLiked ? "#ff0000" : "#888"} 
          />
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#888" />
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color="#888" />
          <Text style={styles.actionText}>{post.shares}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleBookmark(post.id)}
        >
          <Ionicons 
            name={post.isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={20} 
            color={post.isBookmarked ? "#007AFF" : "#888"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const TrendingTopicItem = ({ topic }: { topic: TrendingTopic }) => (
    <TouchableOpacity style={styles.trendingItem}>
      <View style={styles.trendingInfo}>
        <Text style={styles.trendingHashtag}>{topic.hashtag}</Text>
        <Text style={styles.trendingPosts}>{topic.posts.toLocaleString()} posts</Text>
      </View>
      <View style={styles.trendingTrend}>
        <Ionicons 
          name={topic.trend === 'up' ? 'trending-up' : 
                topic.trend === 'down' ? 'trending-down' : 'remove'} 
          size={16} 
          color={topic.trend === 'up' ? '#00ff00' : 
                 topic.trend === 'down' ? '#ff0000' : '#888'} 
        />
      </View>
    </TouchableOpacity>
  );

  const SuggestedUserItem = ({ suggestedUser }: { suggestedUser: SuggestedUser }) => (
    <View style={styles.suggestedUserItem}>
      <View style={styles.suggestedUserInfo}>
        <View style={styles.suggestedUserAvatar}>
          <Text style={styles.suggestedUserAvatarText}>
            {suggestedUser.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.suggestedUserDetails}>
          <View style={styles.suggestedUserNameRow}>
            <Text style={styles.suggestedUserDisplayName}>{suggestedUser.displayName}</Text>
            {suggestedUser.verified && (
              <Ionicons name="checkmark-circle" size={14} color="#007AFF" />
            )}
          </View>
          <Text style={styles.suggestedUserUsername}>@{suggestedUser.username}</Text>
          <Text style={styles.suggestedUserBio} numberOfLines={2}>{suggestedUser.bio}</Text>
          <Text style={styles.suggestedUserFollowers}>
            {suggestedUser.followers.toLocaleString()} followers
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          suggestedUser.isFollowing && styles.followingButton
        ]}
        onPress={() => handleFollow(suggestedUser.id)}
      >
        <Text style={[
          styles.followButtonText,
          suggestedUser.isFollowing && styles.followingButtonText
        ]}>
          {suggestedUser.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading social feed...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Social Hub</Text>
          <Text style={styles.subtitle}>Connect with creators</Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/create-post')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, users, hashtags..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Stories */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={styles.addStoryButton}>
            <View style={styles.addStoryIcon}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <Text style={styles.addStoryText}>Add Story</Text>
          </TouchableOpacity>
          {stories.map(story => (
            <StoryItem key={story.id} story={story} />
          ))}
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TabButton
          id="feed"
          title="Feed"
          isActive={activeTab === 'feed'}
          onPress={() => setActiveTab('feed')}
        />
        <TabButton
          id="trending"
          title="Trending"
          isActive={activeTab === 'trending'}
          onPress={() => setActiveTab('trending')}
        />
        <TabButton
          id="discover"
          title="Discover"
          isActive={activeTab === 'discover'}
          onPress={() => setActiveTab('discover')}
        />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'feed' && (
          <View style={styles.feedTab}>
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </View>
        )}

        {activeTab === 'trending' && (
          <View style={styles.trendingTab}>
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            {trendingTopics.map(topic => (
              <TrendingTopicItem key={topic.id} topic={topic} />
            ))}
          </View>
        )}

        {activeTab === 'discover' && (
          <View style={styles.discoverTab}>
            <Text style={styles.sectionTitle}>Suggested Users</Text>
            {suggestedUsers.map(suggestedUser => (
              <SuggestedUserItem key={suggestedUser.id} suggestedUser={suggestedUser} />
            ))}
          </View>
        )}
      </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  storiesContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
  },
  addStoryButton: {
    alignItems: 'center',
    marginRight: 16,
  },
  addStoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addStoryText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  storyThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  storyUnviewed: {
    borderColor: '#007AFF',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  storyUsername: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  feedTab: {
    marginBottom: 20,
  },
  postCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  authorDisplayName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ogLevel: {
    backgroundColor: '#ff00ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ogLevelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  authorUsername: {
    color: '#888',
    fontSize: 14,
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#888',
    fontSize: 14,
  },
  trendingTab: {
    marginBottom: 20,
  },
  trendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  trendingInfo: {
    flex: 1,
  },
  trendingHashtag: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trendingPosts: {
    color: '#888',
    fontSize: 14,
  },
  trendingTrend: {
    padding: 8,
  },
  discoverTab: {
    marginBottom: 20,
  },
  suggestedUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  suggestedUserInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  suggestedUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestedUserAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  suggestedUserDetails: {
    flex: 1,
  },
  suggestedUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  suggestedUserDisplayName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestedUserUsername: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  suggestedUserBio: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  suggestedUserFollowers: {
    color: '#888',
    fontSize: 12,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#333',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#888',
  },
});
