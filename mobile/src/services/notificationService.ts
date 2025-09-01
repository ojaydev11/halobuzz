import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

class NotificationService {
  private expoPushToken: string | null = null;

  async initializePushNotifications() {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Get push token
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // Replace with your Expo project ID
        });
        this.expoPushToken = token.data;
        console.log('Expo push token:', token.data);
      } else {
        console.log('Must use physical device for Push Notifications');
      }

      // Set up notification listeners
      this.setupNotificationListeners();

    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  private setupNotificationListeners() {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification response (user tapped notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  private handleNotificationReceived(notification: Notifications.Notification) {
    const { title, body, data } = notification.request.content;
    
    // Handle different notification types
    switch (data?.type) {
      case 'live_stream_started':
        this.handleLiveStreamNotification(data);
        break;
      case 'new_message':
        this.handleMessageNotification(data);
        break;
      case 'gift_received':
        this.handleGiftNotification(data);
        break;
      case 'battle_invite':
        this.handleBattleNotification(data);
        break;
      case 'game_result':
        this.handleGameNotification(data);
        break;
      case 'og_tier_upgrade':
        this.handleOGTierNotification(data);
        break;
      default:
        console.log('Unknown notification type:', data?.type);
    }
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { data } = response.notification.request.content;
    
    // Navigate based on notification type
    switch (data?.type) {
      case 'live_stream_started':
        // Navigate to live stream
        break;
      case 'new_message':
        // Navigate to inbox
        break;
      case 'gift_received':
        // Navigate to profile/wallet
        break;
      case 'battle_invite':
        // Navigate to battle
        break;
      case 'game_result':
        // Navigate to game results
        break;
      case 'og_tier_upgrade':
        // Navigate to OG store
        break;
    }
  }

  private handleLiveStreamNotification(data: any) {
    // Handle live stream notifications
    console.log('Live stream notification:', data);
  }

  private handleMessageNotification(data: any) {
    // Handle message notifications
    console.log('Message notification:', data);
  }

  private handleGiftNotification(data: any) {
    // Handle gift notifications
    console.log('Gift notification:', data);
  }

  private handleBattleNotification(data: any) {
    // Handle battle notifications
    console.log('Battle notification:', data);
  }

  private handleGameNotification(data: any) {
    // Handle game notifications
    console.log('Game notification:', data);
  }

  private handleOGTierNotification(data: any) {
    // Handle OG tier notifications
    console.log('OG tier notification:', data);
  }

  // Send local notification
  async sendLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }

  // Schedule notification
  async scheduleNotification(title: string, body: string, trigger: any, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger,
    });
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Register for specific notification types
  async registerForNotifications(types: string[]) {
    // This would typically involve calling your backend API
    // to register the user for specific notification types
    console.log('Registering for notification types:', types);
  }

  // Unregister from notifications
  async unregisterFromNotifications() {
    // This would typically involve calling your backend API
    // to unregister the user from notifications
    console.log('Unregistering from notifications');
  }
}

export const notificationService = new NotificationService();

export const initializePushNotifications = async () => {
  await notificationService.initializePushNotifications();
};
