// Expo Go Compatible Notification Service
// This provides mock functionality for development/testing

import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/apiClient';

/**
 * Mock Notification Service for HaloBuzz Mobile App (Expo Go Compatible)
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

// Mock Notifications module for Expo Go compatibility
const MockNotifications = {
  setNotificationHandler: (handler: any) => {
    console.log('Mock: setNotificationHandler', handler);
  },
  
  getPermissionsAsync: async () => {
    console.log('Mock: getPermissionsAsync');
    return { status: 'granted' };
  },
  
  requestPermissionsAsync: async () => {
    console.log('Mock: requestPermissionsAsync');
    return { status: 'granted' };
  },
  
  getExpoPushTokenAsync: async () => {
    console.log('Mock: getExpoPushTokenAsync');
    return { data: 'mock-expo-push-token-' + Date.now() };
  },
  
  scheduleNotificationAsync: async (notification: any) => {
    console.log('Mock: scheduleNotificationAsync', notification);
    return 'mock-notification-id';
  },
  
  cancelScheduledNotificationAsync: async (id: string) => {
    console.log('Mock: cancelScheduledNotificationAsync', id);
  },
  
  cancelAllScheduledNotificationsAsync: async () => {
    console.log('Mock: cancelAllScheduledNotificationsAsync');
  },
  
  addNotificationReceivedListener: (listener: any) => {
    console.log('Mock: addNotificationReceivedListener');
    return { remove: () => console.log('Mock: remove notification listener') };
  },
  
  addNotificationResponseReceivedListener: (listener: any) => {
    console.log('Mock: addNotificationResponseReceivedListener');
    return { remove: () => console.log('Mock: remove response listener') };
  },
  
  dismissNotificationAsync: async (id: string) => {
    console.log('Mock: dismissNotificationAsync', id);
  },
  
  dismissAllNotificationsAsync: async () => {
    console.log('Mock: dismissAllNotificationsAsync');
  },
  
  getPresentedNotificationsAsync: async () => {
    console.log('Mock: getPresentedNotificationsAsync');
    return [];
  },
  
  setBadgeCountAsync: async (count: number) => {
    console.log('Mock: setBadgeCountAsync', count);
  },
  
  getBadgeCountAsync: async () => {
    console.log('Mock: getBadgeCountAsync');
    return 0;
  }
};

// Use mock notifications for Expo Go compatibility
const Notifications = MockNotifications;

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
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
      console.log('Initializing Mock Notification Service for Expo Go');
      
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      await this.requestPermissions();
      
      // Get push token
      await this.getPushToken();
      
      // Load preferences
      await this.loadPreferences();
      
      // Set up listeners
      this.setupListeners();
      
      console.log('Mock Notification Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mock Notification Service:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('Mock: Requesting notification permissions');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const granted = finalStatus === 'granted';
      console.log('Mock: Notification permissions:', granted ? 'granted' : 'denied');
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Get Expo push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Mock: Push notifications only work on physical devices');
        return null;
      }

      console.log('Mock: Getting Expo push token');
      const token = await Notifications.getExpoPushTokenAsync();
      this.expoPushToken = token.data;
      
      console.log('Mock: Expo push token:', this.expoPushToken);
      
      // Send token to backend
      if (this.expoPushToken) {
        await this.registerPushToken(this.expoPushToken);
      }
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerPushToken(token: string): Promise<void> {
    try {
      console.log('Mock: Registering push token with backend');
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Mock: Push token registered successfully');
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    console.log('Mock: Setting up notification listeners');
    
    // Notification received listener
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Mock: Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Notification response listener
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Mock: Notification response received:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: any): void {
    console.log('Mock: Handling notification received:', notification);
    // Mock notification handling logic
  }

  /**
   * Handle notification response
   */
  private handleNotificationResponse(response: any): void {
    console.log('Mock: Handling notification response:', response);
    // Mock response handling logic
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(notification: NotificationData): Promise<string | null> {
    try {
      console.log('Mock: Sending local notification:', notification);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound,
        },
        trigger: null, // Show immediately
      });
      
      console.log('Mock: Local notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      return null;
    }
  }

  /**
   * Schedule notification
   */
  async scheduleNotification(notification: NotificationData, trigger: any): Promise<string | null> {
    try {
      console.log('Mock: Scheduling notification:', notification);
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound,
        },
        trigger,
      });
      
      console.log('Mock: Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      console.log('Mock: Canceling notification:', notificationId);
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      console.log('Mock: Canceling all notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      console.log('Mock: Setting badge count:', count);
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      console.log('Mock: Getting badge count');
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  /**
   * Load notification preferences
   */
  async loadPreferences(): Promise<void> {
    try {
      console.log('Mock: Loading notification preferences');
      const stored = await AsyncStorage.getItem('notification_preferences');
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
      console.log('Mock: Notification preferences loaded:', this.preferences);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  }

  /**
   * Save notification preferences
   */
  async savePreferences(): Promise<void> {
    try {
      console.log('Mock: Saving notification preferences:', this.preferences);
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(updates: Partial<NotificationPreferences>): Promise<void> {
    try {
      console.log('Mock: Updating notification preferences:', updates);
      this.preferences = { ...this.preferences, ...updates };
      await this.savePreferences();
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.preferences.pushEnabled;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    console.log('Mock: Cleaning up notification service');
    
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }
}

export default new NotificationService();