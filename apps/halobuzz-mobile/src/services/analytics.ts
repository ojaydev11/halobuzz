// Analytics service for tracking user interactions
// This can be integrated with Amplitude, GA4, or your preferred analytics platform

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

class AnalyticsService {
  private isEnabled: boolean = true;
  private queue: AnalyticsEvent[] = [];

  // Initialize analytics (call this in your app initialization)
  init(apiKey?: string) {
    // Initialize your analytics SDK here
    // Example: Amplitude.init(apiKey);
    console.log('Analytics initialized');
  }

  // Track an event
  track(event: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        timestamp: Date.now(),
        platform: 'mobile',
        app_version: '1.0.0', // Get from app config
      },
    };

    // Add to queue
    this.queue.push(analyticsEvent);

    // In production, send to your analytics service
    this.sendEvent(analyticsEvent);

    // Log for development
    console.log('Analytics Event:', analyticsEvent);
  }

  // Send event to analytics service
  private sendEvent(event: AnalyticsEvent) {
    // Example: Amplitude.getInstance().logEvent(event.event, event.properties);
    // Example: analytics().logEvent(event.event, event.properties);
  }

  // Set user properties
  setUserProperties(properties: Record<string, any>) {
    // Example: Amplitude.getInstance().setUserProperties(properties);
    console.log('User properties set:', properties);
  }

  // Identify user
  identify(userId: string, properties?: Record<string, any>) {
    // Example: Amplitude.getInstance().setUserId(userId);
    // Example: Amplitude.getInstance().setUserProperties(properties);
    console.log('User identified:', userId, properties);
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  // Flush queued events
  flush() {
    // Send all queued events
    this.queue.forEach(event => this.sendEvent(event));
    this.queue = [];
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Predefined event constants
export const ANALYTICS_EVENTS = {
  // Home screen events
  HOME_IMPRESSION: 'home_impression',
  HOME_BANNER_TAP: 'home_banner_tap',
  HOME_FILTER_CHANGE: 'home_filter_change',
  HOME_LIVECARD_IMPRESSION: 'home_livecard_impression',
  HOME_LIVECARD_TAP: 'home_livecard_tap',
  HOME_CONTINUE_TAP: 'home_continue_tap',
  HOME_CHECKIN_CLAIM: 'home_checkin_claim',
  HOME_CHECKIN_DISMISS: 'home_checkin_dismiss',
  HOME_CONTINUE_VIEW_ALL: 'home_continue_view_all',
  
  // Stream events
  STREAM_JOIN: 'stream_join',
  STREAM_LEAVE: 'stream_leave',
  STREAM_LIKE: 'stream_like',
  STREAM_SHARE: 'stream_share',
  STREAM_GIFT_SEND: 'stream_gift_send',
  
  // User events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_PROFILE_UPDATE: 'user_profile_update',
  
  // Navigation events
  NAVIGATION_TAB_CHANGE: 'navigation_tab_change',
  NAVIGATION_SCREEN_VIEW: 'navigation_screen_view',
  
  // Error events
  ERROR_NETWORK: 'error_network',
  ERROR_API: 'error_api',
  ERROR_CRASH: 'error_crash',
} as const;

// Helper functions for common tracking patterns
export const trackHomeImpression = (networkClass?: string) => {
  analytics.track(ANALYTICS_EVENTS.HOME_IMPRESSION, {
    network_class: networkClass,
    cold_start: true, // This should be determined by app state
  });
};

export const trackLiveCardImpression = (streamId: string, position: number) => {
  analytics.track(ANALYTICS_EVENTS.HOME_LIVECARD_IMPRESSION, {
    stream_id: streamId,
    position,
  });
};

export const trackLiveCardTap = (streamId: string, position: number) => {
  analytics.track(ANALYTICS_EVENTS.HOME_LIVECARD_TAP, {
    stream_id: streamId,
    position,
  });
};

export const trackFilterChange = (filter: string) => {
  analytics.track(ANALYTICS_EVENTS.HOME_FILTER_CHANGE, {
    filter,
  });
};

export const trackBannerTap = (itemId: string, position: number) => {
  analytics.track(ANALYTICS_EVENTS.HOME_BANNER_TAP, {
    item_id: itemId,
    position,
  });
};

export const trackCheckinClaim = (streak: number) => {
  analytics.track(ANALYTICS_EVENTS.HOME_CHECKIN_CLAIM, {
    streak_length: streak,
  });
};

export const trackStreamJoin = (streamId: string, channelName: string) => {
  analytics.track(ANALYTICS_EVENTS.STREAM_JOIN, {
    stream_id: streamId,
    channel_name: channelName,
  });
};

export const trackStreamLeave = (streamId: string, duration: number) => {
  analytics.track(ANALYTICS_EVENTS.STREAM_LEAVE, {
    stream_id: streamId,
    duration_seconds: duration,
  });
};

export const trackGiftSend = (streamId: string, giftId: string, quantity: number, value: number) => {
  analytics.track(ANALYTICS_EVENTS.STREAM_GIFT_SEND, {
    stream_id: streamId,
    gift_id: giftId,
    quantity,
    value,
  });
};

export default analytics;
