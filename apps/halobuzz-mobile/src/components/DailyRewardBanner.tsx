import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LottieView from 'lottie-react-native';
import { hapticFeedback } from '../utils/haptics';

interface DailyRewardBannerProps {
  onClaim: () => void;
}

const DailyRewardBanner: React.FC<DailyRewardBannerProps> = ({ onClaim }) => {
  const [claimed, setClaimed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Daily streak data (would come from Redux/API)
  const streakDays = 5;
  const totalDays = 7;
  const todayReward = 100;
  const weeklyBonus = 1000;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Coin rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: streakDays / totalDays,
      duration: 1500,
      delay: 500,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleClaim = () => {
    if (claimed) return;

    hapticFeedback('success');
    
    // Claim animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setClaimed(true);
      onClaim();
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (claimed) {
    return (
      <View style={styles.claimedContainer}>
        <LinearGradient
          colors={['#2ecc71', '#27ae60']}
          style={styles.claimedGradient}
        >
          <Icon name="check-circle" size={20} color="#fff" />
          <Text style={styles.claimedText}>Daily Reward Claimed!</Text>
        </LinearGradient>
      </View>
    );
  }

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
        onPress={handleClaim}
        style={styles.touchable}
      >
        <LinearGradient
          colors={['#6c5ce7', '#5f3dc4']}
          style={styles.gradient}
        >
          {/* Left side - Coin animation */}
          <View style={styles.leftSection}>
            <Animated.View
              style={[
                styles.coinContainer,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <LinearGradient
                colors={['#ffd700', '#ffb300']}
                style={styles.coin}
              >
                <Text style={styles.coinText}>💰</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Center - Content */}
          <View style={styles.centerSection}>
            <View style={styles.header}>
              <Text style={styles.title}>Daily Reward</Text>
              <View style={styles.streakBadge}>
                <Icon name="local-fire-department" size={14} color="#ff6b6b" />
                <Text style={styles.streakText}>{streakDays} Days</Text>
              </View>
            </View>
            
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardAmount}>+{todayReward} Coins</Text>
              <Text style={styles.rewardSubtext}>
                {totalDays - streakDays} days to {weeklyBonus} bonus!
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressWidth,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressDots}>
                {Array.from({ length: totalDays }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index < streakDays && styles.dotActive,
                      index === streakDays - 1 && styles.dotCurrent,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Right side - CTA */}
          <View style={styles.rightSection}>
            <View style={styles.claimButton}>
              <Text style={styles.claimText}>CLAIM</Text>
              <Icon name="arrow-forward" size={16} color="#fff" />
            </View>
          </View>

          {/* Sparkle effect */}
          <View style={styles.sparkles}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkle2]}>✨</Text>
            <Text style={[styles.sparkle, styles.sparkle3]}>✨</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  touchable: {
    flex: 1,
  },
  gradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  leftSection: {
    marginRight: 16,
  },
  coinContainer: {
    width: 50,
    height: 50,
  },
  coin: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  coinText: {
    fontSize: 24,
  },
  centerSection: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  streakText: {
    color: '#ff6b6b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rewardInfo: {
    marginBottom: 8,
  },
  rewardAmount: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  rewardSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  progressContainer: {
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffd700',
    borderRadius: 2,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#ffd700',
  },
  dotCurrent: {
    transform: [{ scale: 1.2 }],
    backgroundColor: '#fff',
  },
  rightSection: {
    marginLeft: 16,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  claimText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sparkles: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 12,
    opacity: 0.6,
  },
  sparkle2: {
    top: 10,
    left: -20,
  },
  sparkle3: {
    top: 20,
    left: -10,
  },
  claimedContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  claimedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  claimedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DailyRewardBanner;