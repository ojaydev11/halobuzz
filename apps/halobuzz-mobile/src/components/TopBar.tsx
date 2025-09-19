import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { colors, spacingObj as spacing, typography, radii } from '../theme';

interface TopBarProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  notificationCount?: number;
}

export default function TopBar({
  onSearchPress,
  onNotificationPress,
  notificationCount = 0,
}: TopBarProps) {
  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.bg}
        translucent={false}
      />
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>HaloBuzz</Text>
        </View>

        {/* Right side actions */}
        <View style={styles.actionsContainer}>
          {/* Search button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSearchPress}
            accessibilityLabel="Search"
            accessibilityRole="button"
            accessibilityHint="Tap to search for streams and users"
          >
            <Text style={styles.actionIcon}>🔍</Text>
          </TouchableOpacity>

          {/* Notifications button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNotificationPress}
            accessibilityLabel={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
            accessibilityRole="button"
            accessibilityHint="Tap to view notifications"
          >
            <Text style={styles.actionIcon}>🔔</Text>
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  logoContainer: {
    flex: 1,
  },
  logo: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  actionIcon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.live,
    borderRadius: radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
});
