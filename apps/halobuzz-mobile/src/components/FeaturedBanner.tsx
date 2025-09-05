import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ImageBackground,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from '@react-native-community/blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedBannerProps {
  event: {
    id: string;
    title: string;
    subtitle: string;
    image: string;
    type: 'live' | 'festival' | 'promotion' | 'og_sale';
    startDate: Date;
    endDate: Date;
    highlight?: string;
    rewards?: {
      coins?: number;
      gifts?: string[];
      ogDiscount?: number;
    };
  };
  onPress: () => void;
}

const FeaturedBanner: React.FC<FeaturedBannerProps> = ({ event, onPress }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Shimmer effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getEventIcon = () => {
    switch (event.type) {
      case 'live':
        return 'live-tv';
      case 'festival':
        return 'celebration';
      case 'promotion':
        return 'local-offer';
      case 'og_sale':
        return 'stars';
      default:
        return 'event';
    }
  };

  const getEventColors = () => {
    switch (event.type) {
      case 'live':
        return ['#ff4757', '#ff6b6b'];
      case 'festival':
        return ['#ffa502', '#ff6348'];
      case 'promotion':
        return ['#5f27cd', '#341f97'];
      case 'og_sale':
        return ['#f368e0', '#ee5a6f'];
      default:
        return ['#6a5acd', '#4a3d9d'];
    }
  };

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.touchable}
      >
        <ImageBackground
          source={{ uri: event.image }}
          style={styles.banner}
          imageStyle={styles.bannerImage}
        >
          {/* Gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.overlay}
          >
            {/* Event type badge */}
            <View style={styles.typeBadge}>
              <LinearGradient
                colors={getEventColors()}
                style={styles.typeBadgeGradient}
              >
                <Icon name={getEventIcon()} size={16} color="#fff" />
                <Text style={styles.typeText}>
                  {event.type.replace('_', ' ').toUpperCase()}
                </Text>
              </LinearGradient>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.subtitle}>{event.subtitle}</Text>
              
              {/* Highlight */}
              {event.highlight && (
                <View style={styles.highlightContainer}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                    style={styles.highlightGradient}
                  >
                    <Icon name="star" size={14} color="#ffd700" />
                    <Text style={styles.highlightText}>{event.highlight}</Text>
                  </LinearGradient>
                </View>
              )}

              {/* Rewards */}
              {event.rewards && (
                <View style={styles.rewards}>
                  {event.rewards.coins && (
                    <View style={styles.rewardItem}>
                      <Icon name="monetization-on" size={16} color="#ffd700" />
                      <Text style={styles.rewardText}>
                        {event.rewards.coins} Coins
                      </Text>
                    </View>
                  )}
                  {event.rewards.ogDiscount && (
                    <View style={styles.rewardItem}>
                      <Icon name="local-offer" size={16} color="#f368e0" />
                      <Text style={styles.rewardText}>
                        {event.rewards.ogDiscount}% OFF OG
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* CTA */}
            <View style={styles.ctaContainer}>
              <LinearGradient
                colors={getEventColors()}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>JOIN NOW</Text>
                <Icon name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </View>

            {/* Shimmer effect */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslateX }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255, 255, 255, 0.1)',
                  'transparent',
                ]}
                style={styles.shimmerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  touchable: {
    flex: 1,
  },
  banner: {
    width: '100%',
    height: 180,
  },
  bannerImage: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  typeBadge: {
    alignSelf: 'flex-start',
  },
  typeBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  typeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 8,
  },
  highlightContainer: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  highlightGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  highlightText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rewards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ctaContainer: {
    alignSelf: 'flex-end',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  ctaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
    width: 200,
  },
});

export default FeaturedBanner;