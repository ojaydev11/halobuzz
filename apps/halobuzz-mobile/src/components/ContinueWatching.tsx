import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { colors, spacing, typography, radii, shadows } from '../theme';
import { ContinueWatchingItem } from '../types/stream';

interface ContinueWatchingProps {
  items: ContinueWatchingItem[];
  onItemPress: (item: ContinueWatchingItem) => void;
  onViewAllPress?: () => void;
  loading?: boolean;
}

const itemSize = 60;
const progressRingSize = itemSize + 8;

export default function ContinueWatching({
  items,
  onItemPress,
  onViewAllPress,
  loading = false,
}: ContinueWatchingProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Continue Watching</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={styles.skeletonItem} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Continue Watching</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={itemSize + spacing.sm}
        snapToAlignment="start"
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.streamId}
            style={styles.itemContainer}
            onPress={() => onItemPress(item)}
            accessibilityLabel={`Continue watching ${item.host.username}, ${Math.round(item.progress * 100)}% watched`}
            accessibilityRole="button"
            accessibilityHint="Tap to continue watching this stream"
          >
            {/* Progress ring */}
            <View style={styles.progressRingContainer}>
              <View style={styles.progressRing}>
                <View
                  style={[
                    styles.progressRingFill,
                    {
                      transform: [
                        {
                          rotate: `${item.progress * 360}deg`,
                        },
                      ],
                    },
                  ]}
                />
              </View>
              
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {item.host.avatar ? (
                  <Image
                    source={{ uri: item.host.avatar }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {item.host.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Host name */}
            <Text style={styles.hostName} numberOfLines={1}>
              {item.host.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  itemContainer: {
    alignItems: 'center',
    width: itemSize,
  },
  progressRingContainer: {
    position: 'relative',
    width: progressRingSize,
    height: progressRingSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  progressRing: {
    position: 'absolute',
    width: progressRingSize,
    height: progressRingSize,
    borderRadius: progressRingSize / 2,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  progressRingFill: {
    position: 'absolute',
    width: progressRingSize,
    height: progressRingSize,
    borderRadius: progressRingSize / 2,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  avatarContainer: {
    width: itemSize,
    height: itemSize,
    borderRadius: itemSize / 2,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  avatarText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  hostName: {
    fontSize: typography.fontSize.xs,
    color: colors.sub,
    textAlign: 'center',
    maxWidth: itemSize,
  },
  skeletonItem: {
    width: itemSize,
    height: itemSize + 20,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginRight: spacing.sm,
  },
});
