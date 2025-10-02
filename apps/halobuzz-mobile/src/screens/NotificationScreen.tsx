import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'game' | 'social' | 'system' | 'promotion';
  timestamp: string;
  read: boolean;
  action?: {
    type: string;
    data: any;
  };
}

interface NotificationSettings {
  pushNotifications: boolean;
  gameInvites: boolean;
  tournamentUpdates: boolean;
  socialActivity: boolean;
  promotions: boolean;
  systemUpdates: boolean;
  emailNotifications: boolean;
}

const NotificationScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    gameInvites: true,
    tournamentUpdates: true,
    socialActivity: true,
    promotions: false,
    systemUpdates: true,
    emailNotifications: true
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');

      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
      } else {
        // Fallback notifications
        setNotifications([
          {
            _id: '1',
            title: 'Tournament Invitation',
            message: 'You\'ve been invited to join the Grand Championship tournament!',
            type: 'game',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            read: false,
            action: {
              type: 'tournament',
              data: { tournamentId: 'grand-championship' }
            }
          },
          {
            _id: '2',
            title: 'Game Victory!',
            message: 'Congratulations! You won the Speed Chess tournament and earned 500 coins.',
            type: 'game',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            read: false
          },
          {
            _id: '3',
            title: 'New Follower',
            message: 'ProGamer_X started following you!',
            type: 'social',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: true
          },
          {
            _id: '4',
            title: 'Daily Bonus Available',
            message: 'Your daily login bonus of 100 coins is ready to claim!',
            type: 'promotion',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            read: true
          },
          {
            _id: '5',
            title: 'System Maintenance',
            message: 'Scheduled maintenance will occur tonight from 2-4 AM EST.',
            type: 'system',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            read: true
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/notifications/settings');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      await apiClient.put('/notifications/settings', { [key]: value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          setNotifications([]);
        }}
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      game: 'game-controller',
      social: 'people',
      system: 'settings',
      promotion: 'gift'
    };
    return icons[type as keyof typeof icons] || 'notifications';
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      game: '#667EEA',
      social: '#4CAF50',
      system: '#FF9800',
      promotion: '#9C27B0'
    };
    return colors[type as keyof typeof colors] || '#8B949E';
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = (now.getTime() - notificationTime.getTime()) / (1000 * 60);

    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return notificationTime.toLocaleDateString();
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'all', label: 'All', count: notifications.length },
        { key: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
        { key: 'settings', label: 'Settings', count: 0 }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            activeTab === tab.key && styles.tabButtonActive
          ]}
          onPress={() => setActiveTab(tab.key as any)}
        >
          <Text style={[
            styles.tabText,
            activeTab === tab.key && styles.tabTextActive
          ]}>
            {tab.label}
          </Text>
          {tab.count > 0 && tab.key !== 'settings' && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{tab.count}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => markAsRead(item._id)}
    >
      <View style={[
        styles.notificationIcon,
        { backgroundColor: getNotificationColor(item.type) + '20' }
      ]}>
        <Ionicons 
          name={getNotificationIcon(item.type) as any} 
          size={20} 
          color={getNotificationColor(item.type)} 
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[
            styles.notificationTitle,
            !item.read && styles.unreadText
          ]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        <Text style={styles.notificationMessage}>
          {item.message}
        </Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderSettingsContent = () => (
    <View style={styles.settingsContent}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      
      {Object.entries(settings).map(([key, value]) => (
        <View key={key} style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </Text>
            <Text style={styles.settingDescription}>
              {getSettingDescription(key)}
            </Text>
          </View>
          <Switch
            value={value}
            onValueChange={(newValue) => updateSetting(key as keyof NotificationSettings, newValue)}
            trackColor={{ false: '#2A3441', true: '#667EEA' }}
            thumbColor={value ? '#FFFFFF' : '#8B949E'}
          />
        </View>
      ))}
    </View>
  );

  const getSettingDescription = (key: string) => {
    const descriptions = {
      pushNotifications: 'Receive push notifications on your device',
      gameInvites: 'Get notified about game invitations',
      tournamentUpdates: 'Updates about tournaments you\'re in',
      socialActivity: 'Social interactions and friend activity',
      promotions: 'Special offers and promotional content',
      systemUpdates: 'Important system announcements',
      emailNotifications: 'Receive notifications via email'
    };
    return descriptions[key as keyof typeof descriptions] || '';
  };

  const filteredNotifications = activeTab === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Notifications</Text>
        <Text style={styles.subtitle}>Stay updated</Text>
        {activeTab === 'all' && notifications.length > 0 && (
          <TouchableOpacity onPress={clearAllNotifications}>
            <Text style={styles.clearButton}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderTabBar()}

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : activeTab === 'settings' ? (
        renderSettingsContent()
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2
  },
  clearButton: {
    fontSize: 14,
    color: '#667EEA',
    fontWeight: '600'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#667EEA'
  },
  tabText: {
    fontSize: 14,
    color: '#8B949E',
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  tabBadge: {
    backgroundColor: '#667EEA',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 15
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  unreadNotification: {
    borderColor: '#667EEA',
    backgroundColor: '#1A1F29'
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  notificationContent: {
    flex: 1
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1
  },
  unreadText: {
    fontWeight: 'bold'
  },
  notificationTime: {
    fontSize: 11,
    color: '#8B949E',
    marginLeft: 8
  },
  notificationMessage: {
    fontSize: 12,
    color: '#8B949E',
    lineHeight: 16
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667EEA',
    marginTop: 6
  },
  settingsContent: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  settingInfo: {
    flex: 1
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  settingDescription: {
    fontSize: 11,
    color: '#8B949E',
    lineHeight: 14
  }
});

export default NotificationScreen;