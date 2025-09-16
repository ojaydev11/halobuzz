import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';

const { width: screenWidth } = Dimensions.get('window');

interface SearchResult {
  users: UserResult[];
  streams: StreamResult[];
  reels: ReelResult[];
  hashtags: HashtagResult[];
  totalResults: number;
}

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  followers: number;
  isVerified: boolean;
  ogLevel: number;
}

interface StreamResult {
  id: string;
  title: string;
  host: {
    id: string;
    username: string;
    avatar: string;
  };
  category: string;
  currentViewers: number;
  thumbnail: string;
  isLive: boolean;
}

interface ReelResult {
  id: string;
  title: string;
  description: string;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  category: string;
  viewCount: number;
  thumbnail: string;
  createdAt: string;
}

interface HashtagResult {
  tag: string;
  count: number;
  trending: boolean;
}

interface SearchScreenProps {
  onClose: () => void;
}

export default function SearchScreen({ onClose }: SearchScreenProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<HashtagResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'streams' | 'reels' | 'hashtags'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadTrendingHashtags();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for search suggestions
      searchTimeoutRef.current = setTimeout(() => {
        loadSearchSuggestions();
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const loadTrendingHashtags = async () => {
    try {
      const response = await apiClient.getTrendingHashtags();
      if (response.success) {
        setTrendingHashtags(response.data.hashtags);
      }
    } catch (error) {
      console.error('Failed to load trending hashtags:', error);
    }
  };

  const loadSearchSuggestions = async () => {
    try {
      const response = await apiClient.getSearchSuggestions(query);
      if (response.success) {
        setSuggestions(response.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to load search suggestions:', error);
    }
  };

  const performSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setShowSuggestions(false);
      
      const response = await apiClient.search(searchQuery, {
        type: activeTab,
        limit: 20,
        offset: 0
      });

      if (response.success) {
        setResults(response.data.results);
      } else {
        Alert.alert('Search Error', response.error || 'Failed to search');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to perform search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    performSearch();
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleTrendingHashtagPress = (hashtag: string) => {
    setQuery(hashtag);
    setShowSuggestions(false);
    performSearch(hashtag);
  };

  const renderUserItem = ({ item }: { item: UserResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      <View style={styles.userAvatar}>
        {item.avatar ? (
          <Text style={styles.avatarText}>{item.avatar}</Text>
        ) : (
          <Text style={styles.defaultAvatarText}>
            {item.username.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.username}>@{item.username}</Text>
          {item.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
          {item.ogLevel > 0 && <Text style={styles.ogBadge}>👑</Text>}
        </View>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.followerCount}>{item.followers} followers</Text>
      </View>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followButtonText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStreamItem = ({ item }: { item: StreamResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/stream/${item.id}`)}
    >
      <View style={styles.streamThumbnail}>
        {item.thumbnail ? (
          <Text style={styles.thumbnailText}>📺</Text>
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Text style={styles.placeholderText}>Live</Text>
          </View>
        )}
        {item.isLive && (
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.hostName}>@{item.host.username}</Text>
        <View style={styles.streamStats}>
          <Text style={styles.statText}>{item.currentViewers} viewers</Text>
          <Text style={styles.statText}>•</Text>
          <Text style={styles.statText}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderReelItem = ({ item }: { item: ReelResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/reel/${item.id}`)}
    >
      <View style={styles.reelThumbnail}>
        <Text style={styles.reelIcon}>🎬</Text>
        <View style={styles.viewCount}>
          <Text style={styles.viewCountText}>{item.viewCount}</Text>
        </View>
      </View>
      <View style={styles.reelInfo}>
        <Text style={styles.reelTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.reelDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.reelUser}>@{item.user.username}</Text>
        <Text style={styles.reelCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHashtagItem = ({ item }: { item: HashtagResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleTrendingHashtagPress(item.tag)}
    >
      <View style={styles.hashtagIcon}>
        <Text style={styles.hashtagText}>#</Text>
      </View>
      <View style={styles.hashtagInfo}>
        <Text style={styles.hashtagTag}>{item.tag}</Text>
        <Text style={styles.hashtagCount}>{item.count} posts</Text>
        {item.trending && (
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingText}>🔥 Trending</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>Suggestions</Text>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestionItem}
          onPress={() => handleSuggestionPress(suggestion)}
        >
          <Ionicons name="search" size={16} color="#666" />
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTrendingHashtags = () => (
    <View style={styles.trendingContainer}>
      <Text style={styles.trendingTitle}>🔥 Trending Hashtags</Text>
      <View style={styles.hashtagGrid}>
        {trendingHashtags.map((hashtag, index) => (
          <TouchableOpacity
            key={index}
            style={styles.trendingHashtag}
            onPress={() => handleTrendingHashtagPress(hashtag.tag)}
          >
            <Text style={styles.trendingHashtagText}>{hashtag.tag}</Text>
            <Text style={styles.trendingHashtagCount}>{hashtag.count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderResults = () => {
    if (!results) return null;

    const renderContent = () => {
      switch (activeTab) {
        case 'users':
          return (
            <FlatList
              data={results.users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          );
        case 'streams':
          return (
            <FlatList
              data={results.streams}
              renderItem={renderStreamItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          );
        case 'reels':
          return (
            <FlatList
              data={results.reels}
              renderItem={renderReelItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          );
        case 'hashtags':
          return (
            <FlatList
              data={results.hashtags}
              renderItem={renderHashtagItem}
              keyExtractor={(item) => item.tag}
              showsVerticalScrollIndicator={false}
            />
          );
        default:
          return (
            <View>
              {results.users.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Users ({results.users.length})</Text>
                  <FlatList
                    data={results.users.slice(0, 3)}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {results.streams.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Streams ({results.streams.length})</Text>
                  <FlatList
                    data={results.streams.slice(0, 3)}
                    renderItem={renderStreamItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {results.reels.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Reels ({results.reels.length})</Text>
                  <FlatList
                    data={results.reels.slice(0, 3)}
                    renderItem={renderReelItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              )}
              {results.hashtags.length > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Hashtags ({results.hashtags.length})</Text>
                  <FlatList
                    data={results.hashtags.slice(0, 3)}
                    renderItem={renderHashtagItem}
                    keyExtractor={(item) => item.tag}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </View>
          );
      }
    };

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.tabContainer}>
          {(['all', 'users', 'streams', 'reels', 'hashtags'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderContent()}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search users, streams, reels..."
            placeholderTextColor="#666"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isSearching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff4757" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}

        {showSuggestions && suggestions.length > 0 && renderSuggestions()}
        
        {!showSuggestions && !results && !isSearching && renderTrendingHashtags()}
        
        {results && !isSearching && renderResults()}
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
  },
  searchButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  suggestionsContainer: {
    marginTop: 16,
  },
  suggestionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
  },
  trendingContainer: {
    marginTop: 16,
  },
  trendingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  hashtagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trendingHashtag: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  trendingHashtagText: {
    color: '#ff4757',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trendingHashtagCount: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 2,
  },
  resultsContainer: {
    flex: 1,
    marginTop: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTab: {
    backgroundColor: '#ff4757',
  },
  tabText: {
    color: '#fff',
    fontSize: 14,
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
  },
  defaultAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  verifiedBadge: {
    color: '#00d2d3',
    fontSize: 12,
    marginRight: 4,
  },
  ogBadge: {
    fontSize: 12,
  },
  displayName: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  followerCount: {
    color: '#666',
    fontSize: 12,
  },
  followButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streamThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  thumbnailText: {
    fontSize: 24,
  },
  placeholderThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: 'rgba(255, 71, 87, 0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ff4757',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  streamInfo: {
    flex: 1,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hostName: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  streamStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#666',
    fontSize: 12,
    marginRight: 8,
  },
  reelThumbnail: {
    width: 80,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  reelIcon: {
    fontSize: 24,
  },
  viewCount: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewCountText: {
    color: '#fff',
    fontSize: 10,
  },
  reelInfo: {
    flex: 1,
  },
  reelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reelDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  reelUser: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  reelCategory: {
    color: '#ff4757',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hashtagIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hashtagText: {
    color: '#ff4757',
    fontSize: 20,
    fontWeight: 'bold',
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagTag: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hashtagCount: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  trendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
