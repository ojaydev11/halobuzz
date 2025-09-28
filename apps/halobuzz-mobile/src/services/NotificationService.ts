import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/apiClient';

/**
 * Notification Service for HaloBuzz Mobile App
 * Handles push notifications, local notifications, and notification preferences
 */

export interface NotificationData {
  type: 'stream_start' | 'stream_end' | 'gift_received' | 'follow' | 'message' | 'achievement' | 'system';
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  vibrate?: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  streamNotifications: boolean;
  giftNotifications: boolean;
  followNotifications: boolean;
  messageNotifications: boolean;
  achievementNotifications: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private preferences: NotificationPreferences = {
    pushEnabled: true,
    streamNotifications: true,
    giftNotifications: true,
    followNotifications: true,
    messageNotifications: true,
    achievementNotifications: true,
    systemNotifications: true,
    soundEnabled: true,
    vibrateEnabled: true
  };

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: this.preferences.soundEnabled,
          shouldSetBadge: true,
        }),
      });

      // Load user preferences
      await this.loadPreferences();

      // Register for push notifications
      await this.registerForPushNotifications();

      // Set up notification listeners
      this.setupNotificationListeners();

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for push notifications');
        return null;
      }

      // Check if we already have permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '5c8d3620-68bb-4fd8-94c3-6575c9c218bb', // From app.config.ts
      });

      this.expoPushToken = token.data;
      console.log('Expo push token:', this.expoPushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      await apiClient.post('/notifications/register-token', {
        token,
        platform: Platform.OS,
        preferences: this.preferences
      });
      console.log('Push token sent to backend successfully');
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listen for notification responses (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    // Update app badge count
    this.updateBadgeCount();

    // Handle different notification types
    const data = notification.request.content.data;
    if (data?.type) {
      switch (data.type) {
        case 'stream_start':
          this.handleStreamStartNotification(data);
          break;
        case 'gift_received':
          this.handleGiftNotification(data);
          break;
        case 'follow':
          this.handleFollowNotification(data);
          break;
        case 'message':
          this.handleMessageNotification(data);
          break;
        case 'achievement':
          this.handleAchievementNotification(data);
          break;
      }
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    if (data?.type && data?.route) {
      // Navigate to specific route based on notification type
      this.navigateToRoute(data.route, data.params);
    }
  }

  /**
   * Navigate to route (this would integrate with your navigation system)
   */
  private navigateToRoute(route: string, params?: any): void {
    // This would integrate with your navigation system
    // For now, we'll just log the navigation
    console.log(`Navigate to: ${route}`, params);
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(notificationData: NotificationData): Promise<void> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
        },
        trigger: null, // Show immediately
      });

      console.log('Local notification scheduled:', notificationId);
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  /**
   * Update badge count
   */
  async updateBadgeCount(count?: number): Promise<void> {
    try {
      if (count !== undefined) {
        await Notifications.setBadgeCountAsync(count);
      } else {
        // Get current count and increment
        const currentCount = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(currentCount + 1);
      }
    } catch (error) {
      console.error('Failed to update badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear badge count:', error);
    }
  }

  /**
   * Load notification preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  /**
   * Save notification preferences to storage
   */
  async savePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...preferences };
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
      
      // Update backend with new preferences
      if (this.expoPushToken) {
        await this.sendTokenToBackend(this.expoPushToken);
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Get current notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted' && this.preferences.pushEnabled;
    } catch (error) {
      console.error('Failed to check notification status:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Handle specific notification types
   */
  private handleStreamStartNotification(data: any): void {
    console.log('Stream start notification:', data);
    // Handle stream start logic
  }

  private handleGiftNotification(data: any): void {
    console.log('Gift notification:', data);
    // Handle gift notification logic
  }

  private handleFollowNotification(data: any): void {
    console.log('Follow notification:', data);
    // Handle follow notification logic
  }

  private handleMessageNotification(data: any): void {
    console.log('Message notification:', data);
    // Handle message notification logic
  }

  private handleAchievementNotification(data: any): void {
    console.log('Achievement notification:', data);
    // Handle achievement notification logic
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Get expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
