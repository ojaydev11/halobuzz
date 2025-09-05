import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'grid' | 'banner';
  count?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'card', 
  count = 1,
  style 
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const renderSkeletonCard = () => (
    <View style={[styles.card, style]}>
      <View style={styles.cardImage}>
        <View style={styles.skeleton} />
      </View>
      <View style={styles.cardContent}>
        <View style={[styles.skeleton, styles.title]} />
        <View style={[styles.skeleton, styles.subtitle]} />
      </View>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.05)', 'transparent']}
          style={styles.shimmerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );

  const renderSkeletonList = () => (
    <View style={[styles.listItem, style]}>
      <View style={styles.listAvatar}>
        <View style={styles.skeleton} />
      </View>
      <View style={styles.listContent}>
        <View style={[styles.skeleton, styles.listTitle]} />
        <View style={[styles.skeleton, styles.listSubtitle]} />
      </View>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.05)', 'transparent']}
          style={styles.shimmerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );

  const renderSkeletonGrid = () => (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.gridItem, style]}>
          <View style={styles.gridImage}>
            <View style={styles.skeleton} />
          </View>
          <View style={styles.gridContent}>
            <View style={[styles.skeleton, styles.gridTitle]} />
            <View style={[styles.skeleton, styles.gridSubtitle]} />
          </View>
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX }],
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255, 255, 255, 0.05)', 'transparent']}
              style={styles.shimmerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
      ))}
    </View>
  );

  const renderSkeletonBanner = () => (
    <View style={[styles.banner, style]}>
      <View style={styles.skeleton} />
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.05)', 'transparent']}
          style={styles.shimmerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );

  switch (type) {
    case 'list':
      return (
        <View>
          {Array.from({ length: count }).map((_, index) => (
            <View key={index}>{renderSkeletonList()}</View>
          ))}
        </View>
      );
    case 'grid':
      return renderSkeletonGrid();
    case 'banner':
      return renderSkeletonBanner();
    case 'card':
    default:
      return (
        <View>
          {Array.from({ length: count }).map((_, index) => (
            <View key={index}>{renderSkeletonCard()}</View>
          ))}
        </View>
      );
  }
};

const styles = StyleSheet.create({
  // Card skeleton
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  cardImage: {
    height: 200,
    backgroundColor: '#252538',
  },
  cardContent: {
    padding: 16,
  },
  title: {
    width: '70%',
    height: 16,
    marginBottom: 8,
  },
  subtitle: {
    width: '50%',
    height: 12,
  },

  // List skeleton
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e',
    marginVertical: 4,
    marginHorizontal: 16,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#252538',
    marginRight: 12,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    width: '60%',
    height: 14,
    marginBottom: 6,
  },
  listSubtitle: {
    width: '40%',
    height: 10,
  },

  // Grid skeleton
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 36) / 2,
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    position: 'relative',
  },
  gridImage: {
    aspectRatio: 9/16,
    backgroundColor: '#252538',
  },
  gridContent: {
    padding: 10,
  },
  gridTitle: {
    width: '80%',
    height: 12,
    marginBottom: 6,
  },
  gridSubtitle: {
    width: '60%',
    height: 10,
  },

  // Banner skeleton
  banner: {
    height: 180,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#252538',
    position: 'relative',
  },

  // Common styles
  skeleton: {
    backgroundColor: '#252538',
    borderRadius: 4,
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
    width: SCREEN_WIDTH * 2,
  },
});

export default SkeletonLoader;