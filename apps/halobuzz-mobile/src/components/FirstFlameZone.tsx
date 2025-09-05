import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FastImage from 'react-native-fast-image';

interface FirstFlameZoneProps {
  streams: Array<{
    id: string;
    hostName: string;
    hostAvatar: string;
    viewers: number;
    isNewHost: boolean;
  }>;
  onPress: (stream: any) => void;
}

const FirstFlameZone: React.FC<FirstFlameZoneProps> = ({ streams, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Pulse animation for flame icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!streams || streams.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <LinearGradient
        colors={['rgba(255, 107, 107, 0.1)', 'rgba(255, 71, 87, 0.05)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
              }}
            >
              <Text style={styles.flameIcon}>🔥</Text>
            </Animated.View>
            <View>
              <Text style={styles.title}>First Flame Zone</Text>
              <Text style={styles.subtitle}>Support new creators!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Icon name="arrow-forward" size={14} color="#ff4757" />
          </TouchableOpacity>
        </View>

        {/* New hosts list */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {streams.map((stream, index) => (
            <TouchableOpacity
              key={stream.id}
              onPress={() => onPress(stream)}
              style={[
                styles.hostCard,
                index === 0 && styles.firstCard,
                index === streams.length - 1 && styles.lastCard,
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.avatarContainer}>
                <FastImage
                  source={{ uri: stream.hostAvatar }}
                  style={styles.avatar}
                />
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                </View>
                {/* New badge */}
                <View style={styles.newBadge}>
                  <Text style={styles.newText}>NEW</Text>
                </View>
              </View>
              
              <Text style={styles.hostName} numberOfLines={1}>
                {stream.hostName}
              </Text>
              
              <View style={styles.viewerInfo}>
                <Icon name="visibility" size={10} color="#999" />
                <Text style={styles.viewerCount}>{stream.viewers}</Text>
              </View>

              {/* Welcome bonus indicator */}
              <View style={styles.bonusIndicator}>
                <Text style={styles.bonusText}>+50 🎁</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* AI tip */}
        <View style={styles.aiTip}>
          <LinearGradient
            colors={['rgba(106, 90, 205, 0.1)', 'rgba(106, 90, 205, 0.05)']}
            style={styles.aiTipGradient}
          >
            <Icon name="auto-awesome" size={14} color="#6a5acd" />
            <Text style={styles.aiTipText}>
              HaloAI: Supporting new hosts earns you karma points!
            </Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameIcon: {
    fontSize: 24,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    color: '#ff4757',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingVertical: 8,
    gap: 12,
  },
  hostCard: {
    alignItems: 'center',
    width: 72,
    marginRight: 12,
  },
  firstCard: {
    marginLeft: 0,
  },
  lastCard: {
    marginRight: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ff4757',
  },
  liveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff4757',
  },
  newBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -16 }],
    backgroundColor: '#00d2d3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  hostName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  viewerCount: {
    color: '#999',
    fontSize: 10,
  },
  bonusIndicator: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bonusText: {
    color: '#ffd700',
    fontSize: 10,
    fontWeight: 'bold',
  },
  aiTip: {
    marginTop: 12,
  },
  aiTipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  aiTipText: {
    color: '#a29bfe',
    fontSize: 11,
    flex: 1,
  },
});

export default FirstFlameZone;