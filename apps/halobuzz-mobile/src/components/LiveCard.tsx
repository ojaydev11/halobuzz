import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FastImage from 'react-native-fast-image';
import { formatViewerCount } from '../utils/formatters';

interface LiveCardProps {
  stream: {
    id: string;
    title: string;
    hostName: string;
    hostAvatar: string;
    thumbnail: string;
    viewers: number;
    country: string;
    countryFlag: string;
    tags: string[];
    isNewHost?: boolean;
    isHot?: boolean;
    category: string;
  };
  onPress: () => void;
  index: number;
  style?: any;
}

const LiveCard: React.FC<LiveCardProps> = ({ stream, onPress, index, style }) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50, // Staggered animation
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Live pulse animation for viewer count
    if (stream.viewers > 100) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const handlePress = () => {
    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.touchable}
      >
        <View style={styles.card}>
          {/* Thumbnail with gradient overlay */}
          <View style={styles.thumbnailContainer}>
            <FastImage
              source={{ uri: stream.thumbnail }}
              style={styles.thumbnail}
              resizeMode={FastImage.resizeMode.cover}
            />
            
            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.gradient}
            />

            {/* Top badges */}
            <View style={styles.topBadges}>
              {/* Live indicator */}
              <Animated.View
                style={[
                  styles.liveBadge,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#ff4757', '#ff6b6b']}
                  style={styles.liveBadgeGradient}
                >
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </LinearGradient>
              </Animated.View>

              {/* Hot badge */}
              {stream.isHot && (
                <LinearGradient
                  colors={['#ffa502', '#ff6348']}
                  style={styles.hotBadge}
                >
                  <Text style={styles.hotText}>🔥 HOT</Text>
                </LinearGradient>
              )}
            </View>

            {/* Bottom info */}
            <View style={styles.bottomInfo}>
              {/* Viewer count */}
              <View style={styles.viewerContainer}>
                <Icon name="visibility" size={14} color="#fff" />
                <Text style={styles.viewerCount}>
                  {formatViewerCount(stream.viewers)}
                </Text>
              </View>

              {/* Country flag */}
              <View style={styles.countryContainer}>
                <Text style={styles.countryFlag}>{stream.countryFlag}</Text>
              </View>
            </View>

            {/* Category tag */}
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>
                {stream.category.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Host info */}
          <View style={styles.hostInfo}>
            <View style={styles.hostLeft}>
              <View style={styles.avatarContainer}>
                <FastImage
                  source={{ uri: stream.hostAvatar }}
                  style={styles.avatar}
                />
                {stream.isNewHost && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newText}>NEW</Text>
                  </View>
                )}
              </View>
              <View style={styles.hostDetails}>
                <Text style={styles.hostName} numberOfLines={1}>
                  {stream.hostName}
                </Text>
                <Text style={styles.streamTitle} numberOfLines={1}>
                  {stream.title}
                </Text>
              </View>
            </View>
          </View>

          {/* Tags */}
          {stream.tags.length > 0 && (
            <View style={styles.tags}>
              {stream.tags.slice(0, 2).map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    elevation: 4,
    shadowColor: '#6a5acd',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  touchable: {
    flex: 1,
  },
  card: {
    flex: 1,
  },
  thumbnailContainer: {
    aspectRatio: 9/16,
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  topBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveBadge: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  liveBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  hotBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  hotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  countryContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  countryFlag: {
    fontSize: 16,
  },
  categoryTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(106, 90, 205, 0.9)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  hostInfo: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6a5acd',
  },
  newBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#00d2d3',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  newText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  streamTitle: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tag: {
    backgroundColor: 'rgba(106, 90, 205, 0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tagText: {
    color: '#a29bfe',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default LiveCard;