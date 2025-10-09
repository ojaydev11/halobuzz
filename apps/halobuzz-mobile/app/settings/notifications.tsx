import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationSettings() {
  const [settings, setSettings] = React.useState({
    pushNotifications: true,
    emailNotifications: false,
    liveStreams: true,
    messages: true,
    games: true,
    achievements: true,
    marketing: false,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive notifications on your device</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={() => toggleSetting('pushNotifications')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.pushNotifications ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Email Notifications</Text>
              <Text style={styles.settingDescription}>Receive notifications via email</Text>
            </View>
            <Switch
              value={settings.emailNotifications}
              onValueChange={() => toggleSetting('emailNotifications')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.emailNotifications ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Notifications</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Live Streams</Text>
              <Text style={styles.settingDescription}>Get notified when creators go live</Text>
            </View>
            <Switch
              value={settings.liveStreams}
              onValueChange={() => toggleSetting('liveStreams')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.liveStreams ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Messages</Text>
              <Text style={styles.settingDescription}>Get notified about new messages</Text>
            </View>
            <Switch
              value={settings.messages}
              onValueChange={() => toggleSetting('messages')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.messages ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Games</Text>
              <Text style={styles.settingDescription}>Get notified about game updates and tournaments</Text>
            </View>
            <Switch
              value={settings.games}
              onValueChange={() => toggleSetting('games')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.games ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Achievements</Text>
              <Text style={styles.settingDescription}>Get notified when you earn achievements</Text>
            </View>
            <Switch
              value={settings.achievements}
              onValueChange={() => toggleSetting('achievements')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.achievements ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing & Promotions</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Marketing Emails</Text>
              <Text style={styles.settingDescription}>Receive promotional content and updates</Text>
            </View>
            <Switch
              value={settings.marketing}
              onValueChange={() => toggleSetting('marketing')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.marketing ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Sound</Text>
              <Text style={styles.settingDescription}>Play sound for notifications</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={() => toggleSetting('soundEnabled')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.soundEnabled ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Vibration</Text>
              <Text style={styles.settingDescription}>Vibrate for notifications</Text>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={() => toggleSetting('vibrationEnabled')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.vibrationEnabled ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
});


