import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Stream } from '../types/stream';
import LiveCard from './LiveCard';
import EmptyState from './EmptyState';

interface LiveGridProps {
  streams: Stream[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onStreamPress: (stream: Stream) => void;
  hasMore?: boolean;
  error?: string;
}

export default function LiveGrid({
  streams,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  onStreamPress,
  hasMore = false,
  error,
}: LiveGridProps) {
  const renderItem = ({ item, index }: { item: Stream; index: number }) => (
    <LiveCard
      stream={item}
      onPress={onStreamPress}
      loading={false}
    />
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.accent} size="small" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && streams.length === 0) {
      // Show skeleton loading
      return (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 6 }).map((_, index) => (
            <LiveCard
              key={index}
              stream={{} as Stream}
              onPress={() => {}}
              loading={true}
            />
          ))}
        </View>
      );
    }

    if (error) {
      return (
        <EmptyState
          title="Unable to load streams"
          subtitle={error}
          actionText="Try again"
          onAction={onRefresh}
        />
      );
    }

    return (
      <EmptyState
        title="No live streams"
        subtitle="Check back later or explore trending reels"
        actionText="Browse Reels"
        onAction={() => {
          // Navigate to reels tab
          console.log('Navigate to reels');
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={streams}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.contentContainer,
          streams.length === 0 && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={6}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate item height
          offset: 200 * Math.floor(index / 2),
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100, // Space for bottom tab bar
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
