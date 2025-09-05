import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { colors, spacing, typography, radii, shadows } from '../theme';
import { CheckinReward } from '../types/stream';

interface DailyCheckinProps {
  reward?: CheckinReward;
  loading: boolean;
  onClaim: () => void;
  onDismiss?: () => void;
}

export default function DailyCheckin({
  reward,
  loading,
  onClaim,
  onDismiss,
}: DailyCheckinProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Check if user has already claimed today
    const lastClaimDate = localStorage?.getItem('lastCheckinDate');
    const today = new Date().toDateString();
    
    if (lastClaimDate === today) {
      setClaimed(true);
    }
  }, []);

  const handleClaim = async () => {
    try {
      await onClaim();
      setClaimed(true);
      
      // Store claim date
      const today = new Date().toDateString();
      localStorage?.setItem('lastCheckinDate', today);
      
      // Animate success
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to claim check-in:', error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible || claimed) {
    return null;
  }

  const streakText = reward?.streak 
    ? `Day ${reward.streak} streak!`
    : 'Start your streak!';

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔥</Text>
          </View>
          <View style={styles.textContent}>
            <Text style={styles.title}>Daily Check-in</Text>
            <Text style={styles.subtitle}>{streakText}</Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.coinsContainer}>
            <Text style={styles.coinsText}>+{reward?.coinsAwarded || 20}</Text>
            <Text style={styles.coinsLabel}>coins</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.claimButton,
              loading && styles.claimButtonLoading,
            ]}
            onPress={handleClaim}
            disabled={loading}
            accessibilityLabel="Claim daily check-in reward"
            accessibilityRole="button"
            accessibilityHint="Tap to claim your daily coins"
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.claimButtonText}>Check in</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          accessibilityLabel="Dismiss daily check-in"
          accessibilityRole="button"
        >
          <Text style={styles.dismissIcon}>×</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.sm,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 20,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.sub,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  coinsContainer: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  coinsText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  coinsLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  claimButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    minWidth: 80,
    alignItems: 'center',
  },
  claimButtonLoading: {
    backgroundColor: colors.muted,
  },
  claimButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: {
    color: colors.sub,
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
  },
});
