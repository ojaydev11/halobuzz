import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStreams } from '@/hooks/useStreams';
import { Stream } from '@/types/stream';

export default function DiscoverScreen() {
  const { streams, loading, error, refresh } = useStreams();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderStream = ({ item }: { item: Stream }) => (
    <TouchableOpacity style={styles.streamCard}>
      <View style={styles.streamThumbnail}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Text style={styles.placeholderText}>Live</Text>
          </View>
        )}
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerCount}>
          <Text style={styles.viewerText}>{item.currentViewers} viewers</Text>
        </View>
      </View>
      
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.hostName}>@{item.host.username}</Text>
        <View style={styles.streamStats}>
          <Text style={styles.statText}>{item.totalLikes} likes</Text>
          <Text style={styles.statText}>•</Text>
          <Text style={styles.statText}>{item.totalCoins} coins</Text>
        </View>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load streams</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>Find live streams</Text>
      </View>

      <FlatList
        data={streams}
        renderItem={renderStream}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  streamCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  streamThumbnail: {
    position: 'relative',
    height: 200,
    backgroundColor: '#333',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  liveIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#ff0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewerCount: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
  },
  streamInfo: {
    padding: 16,
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  streamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
