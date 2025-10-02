import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  icon: string;
  onPress?: () => void;
}

const SettingsScreen: React.FC = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = () => {
    const defaultSettings: SettingItem[] = [
      {
        id: 'notifications',
        title: 'Push Notifications',
        description: 'Receive notifications for games and messages',
        type: 'toggle',
        value: true,
        icon: 'notifications-outline',
        onPress: () => toggleSetting('notifications')
      },
      {
        id: 'sound',
        title: 'Sound Effects',
        description: 'Play sounds for game events',
        type: 'toggle',
        value: true,
        icon: 'volume-high-outline',
        onPress: () => toggleSetting('sound')
      },
      {
        id: 'haptic',
        title: 'Haptic Feedback',
        description: 'Vibration feedback for interactions',
        type: 'toggle',
        value: true,
        icon: 'phone-portrait-outline',
        onPress: () => toggleSetting('haptic')
      },
      {
        id: 'darkMode',
        title: 'Dark Mode',
        description: 'Use dark theme',
        type: 'toggle',
        value: true,
        icon: 'moon-outline',
        onPress: () => toggleSetting('darkMode')
      },
      {
        id: 'autoPlay',
        title: 'Auto-play Videos',
        description: 'Automatically play videos in feeds',
        type: 'toggle',
        value: false,
        icon: 'play-circle-outline',
        onPress: () => toggleSetting('autoPlay')
      },
      {
        id: 'privacy',
        title: 'Privacy Settings',
        description: 'Manage your privacy and data',
        type: 'navigation',
        icon: 'shield-outline',
        onPress: () => console.log('Navigate to privacy')
      },
      {
        id: 'account',
        title: 'Account Settings',
        description: 'Manage your account information',
        type: 'navigation',
        icon: 'person-outline',
        onPress: () => console.log('Navigate to account')
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Password, 2FA, and security options',
        type: 'navigation',
        icon: 'lock-closed-outline',
        onPress: () => console.log('Navigate to security')
      },
      {
        id: 'language',
        title: 'Language',
        description: 'English',
        type: 'navigation',
        icon: 'language-outline',
        onPress: () => console.log('Navigate to language')
      },
      {
        id: 'storage',
        title: 'Storage & Cache',
        description: 'Manage app storage and cache',
        type: 'navigation',
        icon: 'folder-outline',
        onPress: () => console.log('Navigate to storage')
      },
      {
        id: 'help',
        title: 'Help & Support',
        description: 'Get help and contact support',
        type: 'navigation',
        icon: 'help-circle-outline',
        onPress: () => console.log('Navigate to help')
      },
      {
        id: 'about',
        title: 'About',
        description: 'App version and information',
        type: 'navigation',
        icon: 'information-circle-outline',
        onPress: () => console.log('Navigate to about')
      },
      {
        id: 'logout',
        title: 'Logout',
        description: 'Sign out of your account',
        type: 'action',
        icon: 'log-out-outline',
        onPress: handleLogout
      }
    ];

    setSettings(defaultSettings);
    setLoading(false);
  };

  const toggleSetting = (settingId: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === settingId 
        ? { ...setting, value: !setting.value }
        : setting
    ));
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const renderSettingItem = (setting: SettingItem) => (
    <TouchableOpacity
      key={setting.id}
      style={[
        styles.settingItem,
        setting.type === 'action' && styles.actionItem
      ]}
      onPress={setting.onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[
          styles.iconContainer,
          setting.type === 'action' && styles.actionIconContainer
        ]}>
          <Ionicons 
            name={setting.icon as any} 
            size={20} 
            color={setting.type === 'action' ? '#F44336' : '#8B949E'} 
          />
        </View>
        <View style={styles.settingInfo}>
          <Text style={[
            styles.settingTitle,
            setting.type === 'action' && styles.actionTitle
          ]}>
            {setting.title}
          </Text>
          {setting.description && (
            <Text style={styles.settingDescription}>{setting.description}</Text>
          )}
        </View>
      </View>

      <View style={styles.settingRight}>
        {setting.type === 'toggle' ? (
          <Switch
            value={setting.value}
            onValueChange={() => toggleSetting(setting.id)}
            trackColor={{ false: '#2A3441', true: '#667EEA' }}
            thumbColor={setting.value ? '#FFFFFF' : '#8B949E'}
          />
        ) : (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={setting.type === 'action' ? '#F44336' : '#8B949E'} 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map(renderSettingItem)}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      </SafeAreaView>
    );
  }

  const preferences = settings.filter(s => s.type === 'toggle');
  const account = settings.filter(s => s.type === 'navigation' && ['privacy', 'account', 'security'].includes(s.id));
  const app = settings.filter(s => s.type === 'navigation' && ['language', 'storage', 'help', 'about'].includes(s.id));
  const actions = settings.filter(s => s.type === 'action');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Text style={styles.subtitle}>Customize your experience</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {renderSection('Preferences', preferences)}
        {renderSection('Account', account)}
        {renderSection('App', app)}
        {renderSection('Actions', actions)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1
  },
  section: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    marginHorizontal: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  sectionContent: {
    backgroundColor: '#1A1F29',
    marginHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  actionItem: {
    borderBottomWidth: 0
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  actionIconContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)'
  },
  settingInfo: {
    flex: 1
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2
  },
  actionTitle: {
    color: '#F44336'
  },
  settingDescription: {
    fontSize: 11,
    color: '#8B949E',
    lineHeight: 14
  },
  settingRight: {
    marginLeft: 10
  }
});

export default SettingsScreen;