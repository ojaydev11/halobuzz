import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';

const { width: screenWidth } = Dimensions.get('window');

// Pre-computed skeleton layouts for different content types
export const SkeletonLayouts = {
  // Stream card skeleton (most common)
  streamCard: {
    height: 200,
    elements: [
      { width: screenWidth - 32, height: 140, top: 0, left: 16, borderRadius: 8 }, // Thumbnail
      { width: 40, height: 40, top: 150, left: 16, borderRadius: 20 }, // Avatar
      { width: screenWidth - 80, height: 16, top: 158, left: 66, borderRadius: 4 }, // Title
      { width: 120, height: 12, top: 180, left: 66, borderRadius: 4 }, // Metadata
    ],
  },

  // User profile skeleton
  userProfile: {
    height: 80,
    elements: [
      { width: 60, height: 60, top: 10, left: 16, borderRadius: 30 }, // Avatar
      { width: 140, height: 16, top: 20, left: 86, borderRadius: 4 }, // Name
      { width: 100, height: 12, top: 42, left: 86, borderRadius: 4 }, // Username
    ],
  },

  // Chat message skeleton
  chatMessage: {
    height: 60,
    elements: [
      { width: 32, height: 32, top: 14, left: 16, borderRadius: 16 }, // Avatar
      { width: 80, height: 12, top: 16, left: 56, borderRadius: 4 }, // Name
      { width: screenWidth - 100, height: 14, top: 32, left: 56, borderRadius: 4 }, // Message
    ],
  },

  // Game card skeleton
  gameCard: {
    height: 120,
    elements: [
      { width: 80, height: 80, top: 20, left: 16, borderRadius: 8 }, // Game icon
      { width: 140, height: 16, top: 25, left: 106, borderRadius: 4 }, // Game title
      { width: 100, height: 12, top: 45, left: 106, borderRadius: 4 }, // Category
      { width: 60, height: 12, top: 65, left: 106, borderRadius: 4 }, // Players
    ],
  },
};

interface SkeletonProps {
  layout: keyof typeof SkeletonLayouts;
  count?: number;
  animate?: boolean;
  backgroundColor?: string;
  highlightColor?: string;
}

// Optimized skeleton component with minimal re-renders
export const SkeletonLoader: React.FC<SkeletonProps> = React.memo(({
  layout,
  count = 1,
  animate = true,
  backgroundColor = '#1a1a1a',
  highlightColor = '#2a2a2a',
}) => {
  const skeletonConfig = SkeletonLayouts[layout];

  if (!skeletonConfig) {
    console.warn(`Unknown skeleton layout: ${layout}`);
    return null;
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonItem
          key={index}
          config={skeletonConfig}
          animate={animate}
          backgroundColor={backgroundColor}
          highlightColor={highlightColor}
        />
      ))}
    </View>
  );
});

// Individual skeleton item with optimized animations
const SkeletonItem: React.FC<{
  config: typeof SkeletonLayouts[keyof typeof SkeletonLayouts];
  animate: boolean;
  backgroundColor: string;
  highlightColor: string;
}> = React.memo(({ config, animate, backgroundColor, highlightColor }) => {
  return (
    <View style={[styles.skeletonItem, { height: config.height }]}>
      {config.elements.map((element, index) => (
        <ShimmerPlaceholder
          key={index}
          visible={false}
          style={[
            styles.skeletonElement,
            {
              width: element.width,
              height: element.height,
              top: element.top,
              left: element.left,
              borderRadius: element.borderRadius,
            },
          ]}
          shimmerColors={[backgroundColor, highlightColor, backgroundColor]}
          duration={animate ? 1500 : 0}
        />
      ))}
    </View>
  );
});

// Performance: Pre-rendered skeleton screens for instant display
export const PrecomputedSkeletons = {
  // Generate common skeleton combinations
  streamList: (count: number = 5) => (
    <SkeletonLoader layout="streamCard" count={count} />
  ),

  userList: (count: number = 8) => (
    <SkeletonLoader layout="userProfile" count={count} />
  ),

  chatHistory: (count: number = 10) => (
    <SkeletonLoader layout="chatMessage" count={count} />
  ),

  gameGrid: (count: number = 6) => (
    <SkeletonLoader layout="gameCard" count={count} />
  ),
};

// Hook for skeleton state management
export const useSkeletonState = (isLoading: boolean, minDisplayTime: number = 500) => {
  const [showSkeleton, setShowSkeleton] = React.useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    if (isLoading) {
      startTime.current = Date.now();
      setShowSkeleton(true);
    } else {
      const elapsed = Date.now() - startTime.current;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setShowSkeleton(false);
      }, remainingTime);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, minDisplayTime]);

  return showSkeleton;
};

// Skeleton container for FlashList integration
export const SkeletonListContainer: React.FC<{
  children: React.ReactNode;
  isLoading: boolean;
  skeletonType: keyof typeof SkeletonLayouts;
  skeletonCount?: number;
}> = React.memo(({ children, isLoading, skeletonType, skeletonCount = 5 }) => {
  const showSkeleton = useSkeletonState(isLoading, 300);

  return (
    <View style={styles.container}>
      {showSkeleton ? (
        <SkeletonLoader layout={skeletonType} count={skeletonCount} />
      ) : (
        children
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  skeletonItem: {
    position: 'relative',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  skeletonElement: {
    position: 'absolute',
    backgroundColor: '#1a1a1a',
  },
});

SkeletonLoader.displayName = 'SkeletonLoader';
SkeletonItem.displayName = 'SkeletonItem';
SkeletonListContainer.displayName = 'SkeletonListContainer';