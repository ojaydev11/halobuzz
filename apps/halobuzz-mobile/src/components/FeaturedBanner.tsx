import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { colors, spacingObj as spacing, typography, radii, shadows } from '../theme';
import { FeaturedItem } from '../types/stream';

interface FeaturedBannerProps {
  items: FeaturedItem[];
  onItemPress: (item: FeaturedItem) => void;
  loading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const bannerWidth = screenWidth - spacing.lg * 2;
const bannerHeight = bannerWidth * 0.6; // 1:1.6 aspect ratio

export default function FeaturedBanner({
  items,
  onItemPress,
  loading = false,
}: FeaturedBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / bannerWidth);
    setCurrentIndex(index);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * bannerWidth,
      animated: true,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { height: bannerHeight }]}>
        <View style={styles.skeletonBanner} />
      </View>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={bannerWidth}
        snapToAlignment="start"
      >
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.bannerItem, { width: bannerWidth }]}
            onPress={() => onItemPress(item)}
            accessibilityLabel={`Featured: ${item.title}`}
            accessibilityRole="button"
            accessibilityHint="Tap to view featured content"
          >
            <Image
              source={{ uri: item.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{item.title}</Text>
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>{item.cta}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      {items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
              ]}
              onPress={() => scrollToIndex(index)}
              accessibilityLabel={`Go to slide ${index + 1}`}
              accessibilityRole="button"
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  bannerItem: {
    height: bannerHeight,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  bannerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  bannerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.normal * typography.fontSize.base,
  },
  bannerCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  bannerCtaText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.muted,
  },
  activeDot: {
    backgroundColor: colors.accent,
    width: 24,
  },
  skeletonBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
});
