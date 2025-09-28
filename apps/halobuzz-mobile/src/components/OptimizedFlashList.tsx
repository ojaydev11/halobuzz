import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { View, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { SkeletonListContainer } from './SkeletonLoader';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

const { height: screenHeight } = Dimensions.get('window');

interface OptimizedFlashListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  isLoading?: boolean;
  skeletonType?: 'streamCard' | 'userProfile' | 'chatMessage' | 'gameCard';
  estimatedItemSize?: number;
  overscan?: number;
  prefetchItems?: number;
  enablePrefetch?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  numColumns?: number;
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  contentContainerStyle?: any;
  style?: any;
}

// Performance-optimized FlashList wrapper
export const OptimizedFlashList = <T extends any>({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.7,
  onRefresh,
  refreshing = false,
  isLoading = false,
  skeletonType = 'streamCard',
  estimatedItemSize,
  overscan = 2,
  prefetchItems = 5,
  enablePrefetch = true,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  numColumns = 1,
  horizontal = false,
  showsVerticalScrollIndicator = false,
  showsHorizontalScrollIndicator = false,
  contentContainerStyle,
  style,
}: OptimizedFlashListProps<T>) => {
  const flashListRef = useRef<FlashList<T>>(null);
  const [visibleRange, setVisibleRange] = useState({ startIndex: 0, endIndex: 0 });
  const prefetchCache = useRef(new Set<number>());
  const scrollMetrics = useRef({ offset: 0, velocity: 0 });

  // Performance: Memoize renderItem to prevent unnecessary re-renders
  const memoizedRenderItem = useCallback<ListRenderItem<T>>(
    ({ item, index, extraData }) => {
      // Track item render performance
      const startTime = Date.now();

      const component = renderItem({ item, index, extraData });

      // Log slow renders in development
      if (__DEV__) {
        const renderTime = Date.now() - startTime;
        if (renderTime > 16) { // More than one frame
          console.warn(`Slow render at index ${index}: ${renderTime}ms`);
        }
      }

      return component;
    },
    [renderItem]
  );

  // Viewport-based prefetching
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems, changed }: any) => {
      if (!enablePrefetch || !viewableItems.length) return;

      const newStartIndex = Math.max(0, viewableItems[0].index - overscan);
      const newEndIndex = Math.min(
        data.length - 1,
        viewableItems[viewableItems.length - 1].index + overscan
      );

      setVisibleRange({ startIndex: newStartIndex, endIndex: newEndIndex });

      // Prefetch items above and below viewport
      if (onEndReached && newEndIndex > data.length - prefetchItems) {
        PerformanceMonitor.markStart('prefetch_more_items');
        onEndReached();
        PerformanceMonitor.markEnd('prefetch_more_items');
      }

      // Cache visible range for memory optimization
      for (let i = newStartIndex; i <= newEndIndex; i++) {
        prefetchCache.current.add(i);
      }

      // Clean up cache for items far from viewport
      const itemsToRemove: number[] = [];
      prefetchCache.current.forEach(index => {
        if (index < newStartIndex - overscan * 2 || index > newEndIndex + overscan * 2) {
          itemsToRemove.push(index);
        }
      });
      itemsToRemove.forEach(index => prefetchCache.current.delete(index));
    },
    [data.length, enablePrefetch, overscan, prefetchItems, onEndReached]
  );

  // Performance: Throttled scroll handler
  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset, velocity } = event.nativeEvent;
      const currentOffset = horizontal ? contentOffset.x : contentOffset.y;
      const currentVelocity = horizontal ? velocity.x : velocity.y;

      scrollMetrics.current = {
        offset: currentOffset,
        velocity: currentVelocity,
      };

      // Reduce render frequency during fast scrolling
      if (Math.abs(currentVelocity) > 1000) {
        // High velocity scrolling - reduce updates
        return;
      }
    },
    [horizontal]
  );

  // Optimized refresh control
  const refreshControl = useMemo(
    () =>
      onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#007AFF"
          colors={['#007AFF']}
          progressBackgroundColor="#1a1a1a"
        />
      ) : undefined,
    [onRefresh, refreshing]
  );

  // Auto-calculate estimated item size based on first few items
  const calculatedItemSize = useMemo(() => {
    if (estimatedItemSize) return estimatedItemSize;

    // Default sizes by content type
    const defaultSizes = {
      streamCard: 200,
      userProfile: 80,
      chatMessage: 60,
      gameCard: 120,
    };

    return defaultSizes[skeletonType] || 80;
  }, [estimatedItemSize, skeletonType]);

  // Performance monitoring
  useEffect(() => {
    PerformanceMonitor.markStart('flashlist_mount');
    return () => {
      PerformanceMonitor.markEnd('flashlist_mount');
    };
  }, []);

  return (
    <SkeletonListContainer
      isLoading={isLoading && data.length === 0}
      skeletonType={skeletonType}
      skeletonCount={Math.ceil(screenHeight / calculatedItemSize)}
    >
      <FlashList
        ref={flashListRef}
        data={data}
        renderItem={memoizedRenderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={calculatedItemSize}

        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={horizontal ? 5 : 10}
        windowSize={horizontal ? 3 : 5}
        initialNumToRender={horizontal ? 3 : 8}
        updateCellsBatchingPeriod={50}

        // Scroll optimizations
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          waitForInteraction: false,
          itemVisiblePercentThreshold: 30,
          minimumViewTime: 100,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16} // 60fps

        // Layout
        numColumns={numColumns}
        horizontal={horizontal}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}

        // Components
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={refreshControl}

        // Styling
        contentContainerStyle={[
          styles.contentContainer,
          contentContainerStyle,
        ]}
        style={[styles.list, style]}

        // Memory optimization
        getItemType={(item, index) => {
          // Group similar items for better recycling
          if (typeof item === 'object' && item !== null) {
            return (item as any).type || 'default';
          }
          return 'default';
        }}

        // Performance budget enforcement
        drawDistance={screenHeight * 1.5} // Limit off-screen rendering
      />
    </SkeletonListContainer>
  );
};

// Performance monitoring wrapper for list items
export const withListItemPerformance = <P extends object>(
  Component: React.ComponentType<P>,
  itemName: string
) => {
  return React.memo(React.forwardRef<any, P>((props, ref) => {
    useEffect(() => {
      PerformanceMonitor.markStart(`list_item_${itemName}`);
      return () => {
        PerformanceMonitor.markEnd(`list_item_${itemName}`);
      };
    }, []);

    return <Component {...props} ref={ref} />;
  }));
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  contentContainer: {
    paddingHorizontal: 0,
  },
});

OptimizedFlashList.displayName = 'OptimizedFlashList';