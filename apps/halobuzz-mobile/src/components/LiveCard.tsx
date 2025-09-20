import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import { colors, spacingObj as spacing, typography, radii, shadows } from '../theme';
import { Stream } from '../types/stream';

interface LiveCardProps {
  stream: Stream;
  onPress: (stream: Stream) => void;
  loading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - spacing.lg * 3) / 2; // 2-column grid with padding

export default function LiveCard({ stream, onPress, loading = false }: LiveCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    } else {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h`;
    }
  };

  const getCountryFlag = (country: string) => {
    // Simple country code to flag emoji mapping
    const flags: Record<string, string> = {
      'NP': '🇳🇵', // Nepal
      'IN': '🇮🇳', // India
      'US': '🇺🇸', // United States
      'GB': '🇬🇧', // United Kingdom
      'CA': '🇨🇦', // Canada
      'AU': '🇦🇺', // Australia
      'DE': '🇩🇪', // Germany
      'FR': '🇫🇷', // France
      'JP': '🇯🇵', // Japan
      'KR': '🇰🇷', // South Korea
      'CN': '🇨🇳', // China
      'SG': '🇸🇬', // Singapore
      'MY': '🇲🇾', // Malaysia
      'TH': '🇹🇭', // Thailand
      'ID': '🇮🇩', // Indonesia
      'PH': '🇵🇭', // Philippines
      'VN': '🇻🇳', // Vietnam
    };
    
    return flags[country.toUpperCase()] || '🌍';
  };

  if (loading) {
    return (
      <View style={[styles.container, { width: cardWidth }]}>
        <ShimmerPlaceholder
          style={[styles.thumbnail, { width: cardWidth }]}
          shimmerColors={[colors.surface, colors.card, colors.surface]}
        />
        <View style={styles.content}>
          <ShimmerPlaceholder
            style={styles.hostNameShimmer}
            shimmerColors={[colors.surface, colors.card, colors.surface]}
          />
          <ShimmerPlaceholder
            style={styles.viewerCountShimmer}
            shimmerColors={[colors.surface, colors.card, colors.surface]}
          />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={() => onPress(stream)}
      accessibilityLabel={`Live stream by ${stream.host.username}, ${formatViewerCount(stream.viewers)} viewers`}
      accessibilityRole="button"
      accessibilityHint="Tap to join this live stream"
      activeOpacity={0.8}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {!imageError ? (
          <Image
            source={{ uri: stream.thumbnail || stream.thumb }}
            style={[styles.thumbnail, { width: cardWidth }]}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderThumbnail, { width: cardWidth }]}>
            <Text style={styles.placeholderText}>📺</Text>
          </View>
        )}
        
        {/* Live indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Duration */}
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>{formatDuration(stream.startedAt)}</Text>
        </View>

        {/* Country flag */}
        <View style={styles.countryContainer}>
          <Text style={styles.countryFlag}>{getCountryFlag(stream.country)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.hostInfo}>
          <Text style={styles.hostName} numberOfLines={1}>
            {stream.host.username}
          </Text>
          {stream.host.ogLevel && stream.host.ogLevel >= 3 && (
            <View style={styles.ogBadge}>
              <Text style={styles.ogText}>OG{stream.host.ogLevel}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.viewerInfo}>
          <Text style={styles.viewerCount}>
            {formatViewerCount(stream.viewers)} 👁
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    aspectRatio: 1,
    backgroundColor: colors.surface,
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: colors.muted,
  },
  liveIndicator: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.live,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    marginRight: 4,
  },
  liveText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  durationContainer: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.backdrop,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  durationText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  countryContainer: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.backdrop,
    borderRadius: radii.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryFlag: {
    fontSize: 12,
  },
  content: {
    padding: spacing.sm,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  hostName: {
    color: colors.text,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
  },
  ogBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: spacing.xs,
  },
  ogText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  viewerInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewerCount: {
    color: colors.sub,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  // Shimmer styles
  hostNameShimmer: {
    height: 14,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  viewerCountShimmer: {
    height: 12,
    width: 40,
    borderRadius: radii.sm,
    alignSelf: 'flex-end',
  },
});
