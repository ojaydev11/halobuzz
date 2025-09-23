import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [language, setLanguage] = useState('en');
  const [country, setCountry] = useState('US');
  const [liteMode, setLiteMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be available soon');
          },
        },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightComponent, 
    showArrow = true 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color="#007AFF" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent || (showArrow && <Ionicons name="chevron-forward" size={16} color="#888" />)}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => router.push('/profile/edit')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="KYC Verification"
            subtitle={user?.kycStatus === 'approved' ? 'Verified' : 'Pending verification'}
            onPress={() => router.push('/kyc')}
          />
          <SettingItem
            icon="key-outline"
            title="Change Password"
            subtitle="Update your account password"
            onPress={() => router.push('/change-password')}
          />
          <SettingItem
            icon="card-outline"
            title="Payment Methods"
            subtitle="Manage your payment options"
            onPress={() => router.push('/payment-methods')}
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push notifications and alerts"
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#333', true: '#007AFF' }}
                thumbColor="#fff"
              />
            }
            showArrow={false}
          />
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Always use dark theme"
            rightComponent={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#333', true: '#007AFF' }}
                thumbColor="#fff"
              />
            }
            showArrow={false}
          />
          <SettingItem
            icon="play-outline"
            title="Auto-play Videos"
            subtitle="Automatically play videos in feed"
            rightComponent={
              <Switch
                value={autoPlay}
                onValueChange={setAutoPlay}
                trackColor={{ false: '#333', true: '#007AFF' }}
                thumbColor="#fff"
              />
            }
            showArrow={false}
          />
          <SettingItem
            icon="cellular-outline"
            title="Data Saver"
            subtitle="Reduce data usage"
            rightComponent={
              <Switch
                value={dataSaver || liteMode}
                onValueChange={(v) => { setDataSaver(v); setLiteMode(v); }}
                trackColor={{ false: '#333', true: '#007AFF' }}
                thumbColor="#fff"
              />
            }
            showArrow={false}
          />
          <SettingItem
            icon="language-outline"
            title="Language"
            subtitle="English / नेपाली"
            onPress={() => router.push('/language')}
          />
          <SettingItem
            icon="globe-outline"
            title="Country/Region"
            subtitle="United States"
            onPress={() => router.push('/country')}
          />
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <SettingItem
            icon="lock-closed-outline"
            title="Privacy Settings"
            subtitle="Control your privacy and data"
            onPress={() => router.push('/privacy')}
          />
          <SettingItem
            icon="eye-outline"
            title="Blocked Users"
            subtitle="Manage blocked accounts"
            onPress={() => router.push('/blocked-users')}
          />
          <SettingItem
            icon="shield-outline"
            title="Two-Factor Authentication"
            subtitle="Add extra security to your account"
            onPress={() => router.push('/2fa')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Data Export"
            subtitle="Download your data"
            onPress={() => router.push('/data-export')}
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => router.push('/help')}
          />
          <SettingItem
            icon="chatbubble-outline"
            title="Contact Us"
            subtitle="Send us a message"
            onPress={() => router.push('/contact')}
          />
          <SettingItem
            icon="bug-outline"
            title="Report a Bug"
            subtitle="Help us improve the app"
            onPress={() => router.push('/report-bug')}
          />
          <SettingItem
            icon="star-outline"
            title="Rate App"
            subtitle="Rate us on the App Store"
            onPress={() => router.push('/rate-app')}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingItem
            icon="information-circle-outline"
            title="App Version"
            subtitle="1.0.0"
            showArrow={false}
          />
          <SettingItem
            icon="document-outline"
            title="Terms of Service"
            subtitle="Read our terms and conditions"
            onPress={() => router.push('/legal/terms')}
          />
          <SettingItem
            icon="shield-outline"
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={() => router.push('/legal/privacy')}
          />
          <SettingItem
            icon="people-outline"
            title="Community Guidelines"
            subtitle="Our community rules and standards"
            onPress={() => router.push('/legal/guidelines')}
          />
          <SettingItem
            icon="help-circle-outline"
            title="Support & Help"
            subtitle="Get help and contact support"
            onPress={() => router.push('/support')}
          />
          <SettingItem
            icon="code-outline"
            title="Open Source Licenses"
            subtitle="Third-party libraries"
            onPress={() => router.push('/licenses')}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <SettingItem
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
          />
          <SettingItem
            icon="trash-outline"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={handleDeleteAccount}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  settingRight: {
    marginLeft: 12,
  },
});
