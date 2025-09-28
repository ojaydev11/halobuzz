import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedFlashList, withListItemPerformance } from './OptimizedFlashList';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const { width: screenWidth } = Dimensions.get('window');

interface Stream {
  id: string;
  title: string;
  thumbnail: string;
  hostName: string;
  hostAvatar: string;
  viewers: number;
  category: string;
  isLive: boolean;
  duration?: number;
  type?: string; // For recycling optimization
}

interface StreamListProps {
  onStreamPress?: (stream: Stream) => void;
  category?: string;
  refreshable?: boolean;
}

// Individual stream card component (optimized for recycling)
const StreamCard = withListItemPerformance<{
  stream: Stream;
  onPress?: (stream: Stream) => void;
}>(({ stream, onPress }) => {
  const handlePress = useCallback(() => {
    onPress?.(stream);
  }, [stream, onPress]);

  return (
    <TouchableOpacity
      style={styles.streamCard}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Thumbnail container with overlay */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: stream.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
          // Performance: Prioritize decoding
          priority="high"
          // Enable native image optimizations
          fadeDuration={0}
        />

        {/* Live indicator */}
        {stream.isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {/* Viewer count */}
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={12} color="#fff" />
          <Text style={styles.viewerText}>
            {stream.viewers > 1000 ? `${(stream.viewers / 1000).toFixed(1)}K` : stream.viewers}
          </Text>
        </View>

        {/* Duration for non-live streams */}
        {!stream.isLive && stream.duration && (
          <View style={styles.duration}>
            <Text style={styles.durationText}>
              {Math.floor(stream.duration / 60)}:{(stream.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        )}
      </View>

      {/* Stream info */}
      <View style={styles.streamInfo}>
        <View style={styles.hostInfo}>
          <Image
            source={{ uri: stream.hostAvatar }}
            style={styles.hostAvatar}
            // Performance: Lower priority for avatars
            priority="low"
          />
          <View style={styles.streamMeta}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              {stream.title}
            </Text>
            <Text style={styles.hostName} numberOfLines={1}>
              {stream.hostName}
            </Text>
            <Text style={styles.category} numberOfLines={1}>
              {stream.category}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}, 'StreamCard');

// Main StreamList component using optimized FlashList
export const StreamList: React.FC<StreamListProps> = ({
  onStreamPress,
  category,
  refreshable = true,
}) => {
  // Infinite scroll with caching
  const {
    data: streams,
    isLoading,
    isRefreshing,
    hasMore,
    loadMore,
    refresh,
  } = useInfiniteScroll<Stream>({
    fetchFn: async (page, pageSize) => {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      const mockStreams: Stream[] = Array.from({ length: pageSize }, (_, i) => ({
        id: `stream_${page}_${i}`,
        title: `Stream ${page}-${i}: Live Gaming Session`,
        thumbnail: `https://picsum.photos/400/225?random=${page * pageSize + i}`,
        hostName: `User${page}${i}`,
        hostAvatar: `https://picsum.photos/40/40?random=${page * pageSize + i + 1000}`,
        viewers: Math.floor(Math.random() * 5000) + 10,
        category: category || 'Gaming',
        isLive: Math.random() > 0.3,
        duration: Math.random() > 0.3 ? undefined : Math.floor(Math.random() * 3600),
        type: 'stream', // For FlashList recycling
      }));

      return {
        data: mockStreams,
        hasMore: page < 10, // Mock pagination limit
        total: pageSize * 10,
      };
    },
    pageSize: 10,
    cacheKey: `streams_${category || 'all'}`,
    staleTime: 60000, // 1 minute cache
    prefetchPages: 2,
    enableCache: true,
  });

  // Optimized keyExtractor
  const keyExtractor = useCallback((item: Stream, index: number) => {
    return item.id || `stream_${index}`;
  }, []);

  // Optimized renderItem
  const renderItem = useCallback(({ item }: { item: Stream }) => (
    <StreamCard stream={item} onPress={onStreamPress} />
  ), [onStreamPress]);

  // Empty state component
  const EmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="videocam-off" size={64} color="#666" />
      <Text style={styles.emptyText}>No streams available</Text>
      <Text style={styles.emptySubtext}>Pull down to refresh</Text>
    </View>
  ), []);

  return (
    <OptimizedFlashList
      data={streams}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={loadMore}
      onEndReachedThreshold={0.7}
      onRefresh={refreshable ? refresh : undefined}
      refreshing={isRefreshing}
      isLoading={isLoading}
      skeletonType="streamCard"
      estimatedItemSize={200}
      overscan={2}
      prefetchItems={5}
      enablePrefetch={true}
      ListEmptyComponent={EmptyComponent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}

      // Performance: Enable efficient item recycling
      numColumns={1}
      horizontal={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 8,
  },
  streamCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    // Performance: Enable hardware acceleration
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 127, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  viewerCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 2,
    fontWeight: '500',
  },
  duration: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  streamInfo: {
    padding: 12,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    marginRight: 10,
  },
  streamMeta: {
    flex: 1,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  hostName: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  category: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
});

StreamList.displayName = 'StreamList';