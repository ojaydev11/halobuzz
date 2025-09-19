import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, spacingObj as spacing, typography, radii } from '../theme';
import { RegionFilter } from '../types/stream';

interface FilterTabsProps {
  activeFilter: RegionFilter;
  onFilterChange: (filter: RegionFilter) => void;
  followingCount?: number;
}

const filters: Array<{
  key: RegionFilter;
  label: string;
  flag?: string;
}> = [
  { key: 'all', label: 'All', flag: '🌍' },
  { key: 'nepal', label: 'Nepal', flag: '🇳🇵' },
  { key: 'asia', label: 'Asia', flag: '🌏' },
  { key: 'global', label: 'Global', flag: '🌎' },
  { key: 'following', label: 'Following', flag: '⭐' },
];

export default function FilterTabs({
  activeFilter,
  onFilterChange,
  followingCount = 0,
}: FilterTabsProps) {
  const getFilterLabel = (filter: typeof filters[0]) => {
    if (filter.key === 'following' && followingCount > 0) {
      return `${filter.label} (${followingCount})`;
    }
    return filter.label;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={120} // Approximate tab width for snapping
        snapToAlignment="start"
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.key;
          
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.tab,
                isActive && styles.activeTab,
              ]}
              onPress={() => onFilterChange(filter.key)}
              accessibilityLabel={`Filter by ${filter.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityHint={`Tap to filter streams by ${filter.label}`}
            >
              <View style={styles.tabContent}>
                {filter.flag && (
                  <Text style={styles.flag}>{filter.flag}</Text>
                )}
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.activeTabText,
                  ]}
                  numberOfLines={1}
                >
                  {getFilterLabel(filter)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.accent,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flag: {
    fontSize: 14,
  },
  tabText: {
    color: colors.sub,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  activeTabText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
});
