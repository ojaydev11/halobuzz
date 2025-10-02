import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface SearchResult {
  _id: string;
  type: 'user' | 'game' | 'stream' | 'tournament';
  title: string;
  subtitle: string;
  avatar?: string;
  followers?: number;
  viewers?: number;
  participants?: number;
  category?: string;
  tags?: string[];
}

const SearchScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'games' | 'streams' | 'tournaments'>('all');

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, activeFilter]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/search', {
        params: { 
          q: searchQuery,
          type: activeFilter !== 'all' ? activeFilter : undefined
        }
      });

      if (response.data && response.data.results) {
        setResults(response.data.results);
      } else {
        // Fallback search results
        setResults(generateMockResults());
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults(generateMockResults());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockResults = (): SearchResult[] => {
    const mockResults: SearchResult[] = [
      {
        _id: '1',
        type: 'user',
        title: 'ProGamer_X',
        subtitle: 'Level 25 • 1.2K followers',
        followers: 1200
      },
      {
        _id: '2',
        type: 'game',
        title: 'Speed Chess Tournament',
        subtitle: 'Strategy • 32 players',
        participants: 32,
        category: 'strategy',
        tags: ['chess', 'tournament', 'strategy']
      },
      {
        _id: '3',
        type: 'stream',
        title: 'Epic Gaming Session',
        subtitle: 'Gaming • 847 viewers',
        viewers: 847,
        category: 'gaming',
        tags: ['gaming', 'live', 'interactive']
      },
      {
        _id: '4',
        type: 'tournament',
        title: 'Grand Championship',
        subtitle: 'Multi-Game • 64 players',
        participants: 64,
        category: 'multiplayer',
        tags: ['championship', 'multiplayer', 'prize']
      },
      {
        _id: '5',
        type: 'user',
        title: 'ChessMaster',
        subtitle: 'Level 18 • 856 followers',
        followers: 856
      }
    ];

    return mockResults.filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getResultIcon = (type: string) => {
    const icons = {
      user: 'person',
      game: 'game-controller',
      stream: 'videocam',
      tournament: 'trophy'
    };
    return icons[type as keyof typeof icons] || 'search';
  };

  const getResultColor = (type: string) => {
    const colors = {
      user: '#4CAF50',
      game: '#667EEA',
      stream: '#F44336',
      tournament: '#FF9800'
    };
    return colors[type as keyof typeof colors] || '#8B949E';
  };

  const handleResultPress = (result: SearchResult) => {
    switch (result.type) {
      case 'user':
        console.log('Navigate to user profile:', result._id);
        break;
      case 'game':
        console.log('Navigate to game:', result._id);
        break;
      case 'stream':
        console.log('Join stream:', result._id);
        break;
      case 'tournament':
        console.log('Join tournament:', result._id);
        break;
    }
  };

  const renderFilterButtons = () => {
    const filters = [
      { key: 'all', label: 'All', icon: '🔍' },
      { key: 'users', label: 'Users', icon: '👥' },
      { key: 'games', label: 'Games', icon: '🎮' },
      { key: 'streams', label: 'Streams', icon: '📺' },
      { key: 'tournaments', label: 'Tournaments', icon: '🏆' }
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter(filter.key as any)}
          >
            <Text style={styles.filterIcon}>{filter.icon}</Text>
            <Text style={[
              styles.filterText,
              activeFilter === filter.key && styles.filterTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={[
        styles.resultIcon,
        { backgroundColor: getResultColor(item.type) + '20' }
      ]}>
        <Ionicons 
          name={getResultIcon(item.type) as any} 
          size={20} 
          color={getResultColor(item.type)} 
        />
      </View>

      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
        {item.tags && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.resultMeta}>
        {item.followers && (
          <Text style={styles.metaText}>{item.followers.toLocaleString()} followers</Text>
        )}
        {item.viewers && (
          <Text style={styles.metaText}>{item.viewers.toLocaleString()} viewers</Text>
        )}
        {item.participants && (
          <Text style={styles.metaText}>{item.participants} players</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={64} color="#8B949E" />
      <Text style={styles.emptyTitle}>Search HaloBuzz</Text>
      <Text style={styles.emptySubtitle}>
        Find users, games, streams, and tournaments
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8B949E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#8B949E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8B949E" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length > 0 && renderFilterButtons()}

      {searchQuery.length === 0 ? (
        renderEmptyState()
      ) : loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                performSearch();
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3441',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#2A3441'
  },
  filterButtonActive: {
    backgroundColor: '#667EEA'
  },
  filterIcon: {
    fontSize: 16,
    marginBottom: 4
  },
  filterText: {
    fontSize: 10,
    color: '#8B949E',
    fontWeight: '600'
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    lineHeight: 20
  },
  resultsList: {
    padding: 15
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  resultInfo: {
    flex: 1
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 6
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6
  },
  tag: {
    backgroundColor: '#2A3441',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  tagText: {
    fontSize: 9,
    color: '#8B949E'
  },
  resultMeta: {
    alignItems: 'flex-end'
  },
  metaText: {
    fontSize: 10,
    color: '#8B949E',
    marginBottom: 2
  }
});

export default SearchScreen;




