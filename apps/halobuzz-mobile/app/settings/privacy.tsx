import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacySettings() {
  const [settings, setSettings] = React.useState({
    profileVisibility: true,
    showOnlineStatus: true,
    allowMessages: true,
    dataCollection: false,
    analytics: false,
    crashReports: true,
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
          <Text style={styles.sectionTitle}>Profile Privacy</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Public Profile</Text>
              <Text style={styles.settingDescription}>Allow others to view your profile</Text>
            </View>
            <Switch
              value={settings.profileVisibility}
              onValueChange={() => toggleSetting('profileVisibility')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.profileVisibility ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Online Status</Text>
              <Text style={styles.settingDescription}>Let others see when you're online</Text>
            </View>
            <Switch
              value={settings.showOnlineStatus}
              onValueChange={() => toggleSetting('showOnlineStatus')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.showOnlineStatus ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Allow Messages</Text>
              <Text style={styles.settingDescription}>Let others send you direct messages</Text>
            </View>
            <Switch
              value={settings.allowMessages}
              onValueChange={() => toggleSetting('allowMessages')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.allowMessages ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Analytics</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Data Collection</Text>
              <Text style={styles.settingDescription}>Allow collection of usage data</Text>
            </View>
            <Switch
              value={settings.dataCollection}
              onValueChange={() => toggleSetting('dataCollection')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.dataCollection ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Analytics</Text>
              <Text style={styles.settingDescription}>Help improve the app with analytics</Text>
            </View>
            <Switch
              value={settings.analytics}
              onValueChange={() => toggleSetting('analytics')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.analytics ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Crash Reports</Text>
              <Text style={styles.settingDescription}>Send crash reports to help fix bugs</Text>
            </View>
            <Switch
              value={settings.crashReports}
              onValueChange={() => toggleSetting('crashReports')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.crashReports ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download-outline" size={20} color="#667EEA" />
            <Text style={styles.actionButtonText}>Download My Data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color="#E53E3E" />
            <Text style={[styles.actionButtonText, { color: '#E53E3E' }]}>Delete Account</Text>
          </TouchableOpacity>
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    marginVertical: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA',
    marginLeft: 12,
  },
});


