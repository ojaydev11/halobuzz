// Accessibility service for consistent accessibility features across the app

export const ACCESSIBILITY_LABELS = {
  // Navigation
  HOME_TAB: 'Home tab',
  REELS_TAB: 'Reels tab',
  WALLET_TAB: 'Wallet tab',
  PROFILE_TAB: 'Profile tab',
  
  // Home screen
  SEARCH_BUTTON: 'Search',
  NOTIFICATIONS_BUTTON: 'Notifications',
  LIVE_STREAM_CARD: 'Live stream',
  FEATURED_BANNER: 'Featured content',
  FILTER_TAB: 'Filter',
  CONTINUE_WATCHING: 'Continue watching',
  DAILY_CHECKIN: 'Daily check-in',
  
  // Live stream
  LIVE_INDICATOR: 'Live',
  VIEWER_COUNT: 'viewers',
  DURATION: 'duration',
  HOST_NAME: 'host',
  COUNTRY_FLAG: 'country',
  OG_BADGE: 'OG level',
  
  // Actions
  JOIN_STREAM: 'Join live stream',
  LEAVE_STREAM: 'Leave live stream',
  LIKE_STREAM: 'Like stream',
  SHARE_STREAM: 'Share stream',
  SEND_GIFT: 'Send gift',
  CLAIM_REWARD: 'Claim reward',
  DISMISS: 'Dismiss',
  VIEW_ALL: 'View all',
  
  // Status
  LOADING: 'Loading',
  ERROR: 'Error',
  EMPTY_STATE: 'No content available',
  CONNECTION_ERROR: 'Connection error',
} as const;

// Helper function to create accessible labels for live streams
export const createLiveStreamLabel = (stream: {
  host: { username: string; ogLevel?: number };
  viewers: number;
  country: string;
  duration?: string;
}) => {
  const parts = [
    `Live stream by ${stream.host.username}`,
    `${formatViewerCount(stream.viewers)} viewers`,
  ];
  
  if (stream.host.ogLevel && stream.host.ogLevel >= 3) {
    parts.push(`OG level ${stream.host.ogLevel}`);
  }
  
  if (stream.duration) {
    parts.push(`streaming for ${stream.duration}`);
  }
  
  parts.push(`from ${stream.country}`);
  
  return parts.join(', ');
};

// Helper function to format viewer counts for accessibility
export const formatViewerCount = (count: number): string => {
  if (count >= 1000000) {
    return `${Math.round(count / 100000) / 10} million`;
  } else if (count >= 1000) {
    return `${Math.round(count / 100) / 10} thousand`;
  }
  return count.toString();
};

// Helper function to create accessible duration labels
export const createDurationLabel = (startedAt: string): string => {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) {
    return `${diffMins} minutes`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }
};

// Helper function to create accessible country labels
export const createCountryLabel = (countryCode: string): string => {
  const countryNames: Record<string, string> = {
    'NP': 'Nepal',
    'IN': 'India',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'TH': 'Thailand',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'VN': 'Vietnam',
  };
  
  return countryNames[countryCode.toUpperCase()] || countryCode;
};

// Helper function to create accessible progress labels
export const createProgressLabel = (progress: number): string => {
  const percentage = Math.round(progress * 100);
  return `${percentage} percent watched`;
};

// Helper function to create accessible time labels
export const createTimeLabel = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  } else if (diffMins < 1440) { // 24 hours
    const hours = Math.floor(diffMins / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffMins / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
};

// Accessibility hints for common actions
export const ACCESSIBILITY_HINTS = {
  JOIN_STREAM: 'Double tap to join this live stream',
  LEAVE_STREAM: 'Double tap to leave this live stream',
  LIKE_STREAM: 'Double tap to like this stream',
  SHARE_STREAM: 'Double tap to share this stream',
  SEND_GIFT: 'Double tap to send a gift',
  CLAIM_REWARD: 'Double tap to claim your daily reward',
  FILTER_CONTENT: 'Double tap to filter content by this category',
  VIEW_MORE: 'Double tap to view more content',
  DISMISS_NOTIFICATION: 'Double tap to dismiss this notification',
  SEARCH: 'Double tap to search for streams and users',
  VIEW_NOTIFICATIONS: 'Double tap to view your notifications',
} as const;

// Screen reader announcements
export const SCREEN_READER_ANNOUNCEMENTS = {
  STREAM_JOINED: 'Joined live stream',
  STREAM_LEFT: 'Left live stream',
  GIFT_SENT: 'Gift sent successfully',
  REWARD_CLAIMED: 'Daily reward claimed',
  FILTER_CHANGED: 'Filter changed',
  CONTENT_LOADED: 'Content loaded',
  ERROR_OCCURRED: 'An error occurred',
  CONNECTION_RESTORED: 'Connection restored',
} as const;

// Helper function to announce to screen reader
export const announceToScreenReader = (message: string) => {
  // This would typically use a screen reader announcement service
  // For React Native, you might use react-native-accessibility-announcer
  console.log('Screen reader announcement:', message);
};

// Helper function to create accessible button props
export const createAccessibleButtonProps = (
  label: string,
  hint?: string,
  role: 'button' | 'link' | 'tab' = 'button'
) => ({
  accessibilityLabel: label,
  accessibilityRole: role,
  accessibilityHint: hint,
});

// Helper function to create accessible image props
export const createAccessibleImageProps = (
  label: string,
  hint?: string
) => ({
  accessibilityLabel: label,
  accessibilityRole: 'image',
  accessibilityHint: hint,
});

export default {
  ACCESSIBILITY_LABELS,
  ACCESSIBILITY_HINTS,
  SCREEN_READER_ANNOUNCEMENTS,
  createLiveStreamLabel,
  formatViewerCount,
  createDurationLabel,
  createCountryLabel,
  createProgressLabel,
  createTimeLabel,
  announceToScreenReader,
  createAccessibleButtonProps,
  createAccessibleImageProps,
};
