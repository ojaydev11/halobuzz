import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface LiveStream {
  _id: string;
  title: string;
  streamer: {
    username: string;
    avatar: string;
    level: number;
  };
  viewers: number;
  category: string;
  thumbnail: string;
  isLive: boolean;
  duration: number;
  tags: string[];
  game?: string;
}

const LiveScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchLiveStreams();
  }, [selectedCategory]);

  const fetchLiveStreams = async () => {
    try {
      const response = await apiClient.get('/streams/live', {
        params: { category: selectedCategory !== 'all' ? selectedCategory : undefined }
      });

      if (response.data && response.data.streams) {
        setStreams(response.data.streams);
      } else {
        // Fallback streams data
        setStreams([
          {
            _id: '1',
            title: 'Epic Gaming Session - Come Join!',
            streamer: {
              username: 'ProGamer_X',
              avatar: '',
              level: 25
            },
            viewers: 1247,
            category: 'gaming',
            thumbnail: '',
            isLive: true,
            duration: 3600,
            tags: ['gaming', 'fun', 'interactive'],
            game: 'Battle Royale'
          },
          {
            _id: '2',
            title: 'Late Night Chat & Music',
            streamer: {
              username: 'MusicMaven',
              avatar: '',
              level: 18
            },
            viewers: 892,
            category: 'music',
            thumbnail: '',
            isLive: true,
            duration: 7200,
            tags: ['music', 'chat', 'relaxing']
          },
          {
            _id: '3',
            title: 'Cooking Masterclass - Italian Cuisine',
            streamer: {
              username: 'ChefMarco',
              avatar: '',
              level: 32
            },
            viewers: 2156,
            category: 'cooking',
            thumbnail: '',
            isLive: true,
            duration: 5400,
            tags: ['cooking', 'italian', 'tutorial']
          },
          {
            _id: '4',
            title: 'Fitness Workout - HIIT Session',
            streamer: {
              username: 'FitLife',
              avatar: '',
              level: 15
            },
            viewers: 634,
            category: 'fitness',
            thumbnail: '',
            isLive: true,
            duration: 1800,
            tags: ['fitness', 'hiit', 'workout']
          },
          {
            _id: '5',
            title: 'Art Creation - Digital Painting',
            streamer: {
              username: 'DigitalArtist',
              avatar: '',
              level: 22
            },
            viewers: 445,
            category: 'art',
            thumbnail: '',
            isLive: true,
            duration: 10800,
            tags: ['art', 'digital', 'creative']
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch live streams:', error);
      setStreams([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const joinStream = (stream: LiveStream) => {
    Alert.alert(
      'Join Stream',
      `Join ${stream.streamer.username}'s stream "${stream.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join', onPress: () => {
          // Navigate to stream
          console.log('Joining stream:', stream._id);
        }}
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      gaming: ['#667EEA', '#764BA2'],
      music: ['#F093FB', '#F5576C'],
      cooking: ['#4FACFE', '#00F2FE'],
      fitness: ['#43E97B', '#38F9D7'],
      art: ['#FA709A', '#FEE140'],
      all: ['#667EEA', '#764BA2']
    };
    return colors[category as keyof typeof colors] || colors.all;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const renderCategoryFilter = () => {
    const categories = [
      { key: 'all', label: 'All', icon: '📺' },
      { key: 'gaming', label: 'Gaming', icon: '🎮' },
      { key: 'music', label: 'Music', icon: '🎵' },
      { key: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
      { key: 'fitness', label: 'Fitness', icon: '💪' },
      { key: 'art', label: 'Art', icon: '🎨' }
    ];

    return (
      <View style={styles.categoryFilter}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              styles.categoryText,
              selectedCategory === category.key && styles.categoryTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStreamCard = ({ item }: { item: LiveStream }) => (
    <TouchableOpacity onPress={() => joinStream(item)}>
      <View style={styles.streamCard}>
        <LinearGradient
          colors={getCategoryColor(item.category)}
          style={styles.streamThumbnail}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View style={styles.viewerCount}>
            <Ionicons name="eye" size={12} color="#FFFFFF" />
            <Text style={styles.viewerText}>{item.viewers.toLocaleString()}</Text>
          </View>
          {item.game && (
            <View style={styles.gameTag}>
              <Text style={styles.gameText}>{item.game}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.streamInfo}>
          <View style={styles.streamerInfo}>
            <View style={styles.streamerAvatar}>
              <Text style={styles.avatarText}>{item.streamer.username[0].toUpperCase()}</Text>
            </View>
            <View style={styles.streamerDetails}>
              <Text style={styles.streamerName}>{item.streamer.username}</Text>
              <Text style={styles.streamerLevel}>Level {item.streamer.level}</Text>
            </View>
          </View>

          <Text style={styles.streamTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.streamMeta}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔴 Live Streams</Text>
        <Text style={styles.subtitle}>Watch & interact</Text>
      </View>

      {renderCategoryFilter()}

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={streams}
          renderItem={renderStreamCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLiveStreams();
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#2A3441'
  },
  categoryButtonActive: {
    backgroundColor: '#667EEA'
  },
  categoryIcon: {
    fontSize: 16,
    marginBottom: 4
  },
  categoryText: {
    fontSize: 10,
    color: '#8B949E',
    fontWeight: '600'
  },
  categoryTextActive: {
    color: '#FFFFFF'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 15
  },
  streamCard: {
    backgroundColor: '#1A1F29',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  streamThumbnail: {
    height: 200,
    position: 'relative'
  },
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  viewerCount: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  viewerText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4
  },
  gameTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  gameText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  streamInfo: {
    padding: 15
  },
  streamerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  streamerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  streamerDetails: {
    flex: 1
  },
  streamerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2
  },
  streamerLevel: {
    fontSize: 10,
    color: '#8B949E'
  },
  streamTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 18
  },
  streamMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  durationText: {
    fontSize: 10,
    color: '#8B949E'
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
    fontSize: 8,
    color: '#8B949E'
  }
});

export default LiveScreen;





