import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notificationService, NotificationPreferences } from '../src/services/NotificationService';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    streamNotifications: true,
    giftNotifications: true,
    followNotifications: true,
    messageNotifications: true,
    achievementNotifications: true,
    systemNotifications: true,
    soundEnabled: true,
    vibrateEnabled: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const currentPreferences = notificationService.getPreferences();
      setPreferences(currentPreferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);
      await notificationService.savePreferences(newPreferences);
    } catch (error) {
      console.error('Failed to update preference:', error);
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationService.scheduleLocalNotification({
        type: 'system',
        title: 'Test Notification',
        body: 'This is a test notification from HaloBuzz!',
        sound: preferences.soundEnabled,
        vibrate: preferences.vibrateEnabled
      });
      Alert.alert('Success', 'Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const granted = await notificationService.requestPermissions();
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted!');
        await loadPreferences();
      } else {
        Alert.alert('Permission Denied', 'Notification permissions were denied. You can enable them in your device settings.');
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      Alert.alert('Error', 'Failed to request notification permissions');
    }
  };

  const SettingRow = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    icon 
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <Ionicons name={icon as any} size={20} color="#6366f1" />
          <Text style={styles.settingTitle}>{title}</Text>
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#374151', true: '#6366f1' }}
        thumbColor={value ? '#ffffff' : '#9ca3af'}
      />
    </View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="General" />
        
        <SettingRow
          title="Push Notifications"
          description="Enable or disable all push notifications"
          value={preferences.pushEnabled}
          onValueChange={(value) => updatePreference('pushEnabled', value)}
          icon="notifications"
        />

        <SettingRow
          title="Sound"
          description="Play sound for notifications"
          value={preferences.soundEnabled}
          onValueChange={(value) => updatePreference('soundEnabled', value)}
          icon="volume-high"
        />

        <SettingRow
          title="Vibration"
          description="Vibrate for notifications"
          value={preferences.vibrateEnabled}
          onValueChange={(value) => updatePreference('vibrateEnabled', value)}
          icon="phone-portrait"
        />

        <SectionHeader title="Notification Types" />

        <SettingRow
          title="Stream Notifications"
          description="Get notified when followed creators go live"
          value={preferences.streamNotifications}
          onValueChange={(value) => updatePreference('streamNotifications', value)}
          icon="videocam"
        />

        <SettingRow
          title="Gift Notifications"
          description="Get notified when you receive gifts"
          value={preferences.giftNotifications}
          onValueChange={(value) => updatePreference('giftNotifications', value)}
          icon="gift"
        />

        <SettingRow
          title="Follow Notifications"
          description="Get notified when someone follows you"
          value={preferences.followNotifications}
          onValueChange={(value) => updatePreference('followNotifications', value)}
          icon="person-add"
        />

        <SettingRow
          title="Message Notifications"
          description="Get notified of new messages"
          value={preferences.messageNotifications}
          onValueChange={(value) => updatePreference('messageNotifications', value)}
          icon="chatbubble"
        />

        <SettingRow
          title="Achievement Notifications"
          description="Get notified of achievements and milestones"
          value={preferences.achievementNotifications}
          onValueChange={(value) => updatePreference('achievementNotifications', value)}
          icon="trophy"
        />

        <SettingRow
          title="System Notifications"
          description="Get notified of system updates and announcements"
          value={preferences.systemNotifications}
          onValueChange={(value) => updatePreference('systemNotifications', value)}
          icon="settings"
        />

        <SectionHeader title="Actions" />

        <TouchableOpacity style={styles.actionButton} onPress={handleTestNotification}>
          <Ionicons name="send" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleRequestPermissions}>
          <Ionicons name="key" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Request Permissions</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Notification preferences are synced across all your devices.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  sectionHeader: {
    paddingVertical: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});
