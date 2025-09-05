import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  Image,
  RefreshControl,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import { LiveStreamCard } from '../components/LiveStreamCard';
import { CategoryFilter } from '../components/CategoryFilter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HomeScreen = () => {
  const navigation = useNavigation();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadStreams();
  }, [selectedCategory]);

  const loadStreams = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await apiService.get('/api/v1/streams/active', {
        params: {
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          page: isRefresh ? 1 : page,
          limit: 20
        }
      });

      if (isRefresh) {
        setStreams(response.data.data);
        setPage(1);
      } else {
        setStreams(prev => [...prev, ...response.data.data]);
      }
    } catch (error) {
      console.error('Failed to load streams:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStreamPress = (stream: any) => {
    navigation.navigate('LiveRoom', { 
      streamId: stream._id,
      isHost: false 
    });
  };

  const handleStartStream = () => {
    navigation.navigate('StartStream');
  };

  const renderStream = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.streamCard}
      onPress={() => handleStreamPress(item)}
      activeOpacity={0.9}
    >
      <LiveStreamCard stream={item} />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Live Streams</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Search')}>
        <Ionicons name="search" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="videocam-off" size={64} color="#666" />
      <Text style={styles.emptyText}>No live streams</Text>
      <Text style={styles.emptySubtext}>Be the first to go live!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <CategoryFilter
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <FlatList
        data={streams}
        renderItem={renderStream}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.streamList}
        ListEmptyComponent={!loading ? renderEmptyState() : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStreams(true)}
            colors={['#FF6B6B']}
            tintColor="#FF6B6B"
          />
        }
        onEndReached={() => {
          if (!loading && streams.length >= 20) {
            setPage(prev => prev + 1);
            loadStreams();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => 
          loading && streams.length > 0 ? (
            <ActivityIndicator size="large" color="#FF6B6B" style={{ margin: 20 }} />
          ) : null
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleStartStream}
        activeOpacity={0.8}
      >
        <Ionicons name="videocam" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  streamList: {
    paddingHorizontal: 10,
    paddingBottom: 80
  },
  streamCard: {
    flex: 1,
    margin: 5
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    fontWeight: '600'
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5
  }
});