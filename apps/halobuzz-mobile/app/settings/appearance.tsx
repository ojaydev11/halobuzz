import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AppearanceSettings() {
  const [settings, setSettings] = React.useState({
    darkMode: false,
    autoDarkMode: true,
    fontSize: 'medium',
    language: 'en',
    animations: true,
    hapticFeedback: true,
  });

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const themes = [
    { id: 'light', name: 'Light', icon: 'sunny-outline' },
    { id: 'dark', name: 'Dark', icon: 'moon-outline' },
    { id: 'auto', name: 'Auto', icon: 'phone-portrait-outline' },
  ];

  const fontSizes = [
    { id: 'small', name: 'Small', size: 12 },
    { id: 'medium', name: 'Medium', size: 14 },
    { id: 'large', name: 'Large', size: 16 },
    { id: 'extra-large', name: 'Extra Large', size: 18 },
  ];

  const languages = [
    { id: 'en', name: 'English', flag: '🇺🇸' },
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'fr', name: 'Français', flag: '🇫🇷' },
    { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { id: 'zh', name: '中文', flag: '🇨🇳' },
    { id: 'ja', name: '日本語', flag: '🇯🇵' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          
          <View style={styles.optionsContainer}>
            {themes.map((theme) => (
              <TouchableOpacity
                key={theme.id}
                style={[
                  styles.optionButton,
                  settings.darkMode === (theme.id === 'dark') && styles.selectedOption
                ]}
                onPress={() => {
                  if (theme.id === 'auto') {
                    updateSetting('autoDarkMode', true);
                    updateSetting('darkMode', false);
                  } else {
                    updateSetting('autoDarkMode', false);
                    updateSetting('darkMode', theme.id === 'dark');
                  }
                }}
              >
                <Ionicons 
                  name={theme.icon as any} 
                  size={24} 
                  color={settings.darkMode === (theme.id === 'dark') ? '#667EEA' : '#718096'} 
                />
                <Text style={[
                  styles.optionText,
                  settings.darkMode === (theme.id === 'dark') && styles.selectedOptionText
                ]}>
                  {theme.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto Dark Mode</Text>
              <Text style={styles.settingDescription}>Automatically switch based on system settings</Text>
            </View>
            <Switch
              value={settings.autoDarkMode}
              onValueChange={() => toggleSetting('autoDarkMode')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.autoDarkMode ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Font Size</Text>
          
          <View style={styles.fontSizeContainer}>
            {fontSizes.map((size) => (
              <TouchableOpacity
                key={size.id}
                style={[
                  styles.fontSizeButton,
                  settings.fontSize === size.id && styles.selectedFontSize
                ]}
                onPress={() => updateSetting('fontSize', size.id)}
              >
                <Text style={[
                  styles.fontSizeText,
                  { fontSize: size.size },
                  settings.fontSize === size.id && styles.selectedFontSizeText
                ]}>
                  Aa
                </Text>
                <Text style={[
                  styles.fontSizeLabel,
                  settings.fontSize === size.id && styles.selectedFontSizeText
                ]}>
                  {size.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          
          <View style={styles.languageContainer}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.languageButton,
                  settings.language === lang.id && styles.selectedLanguage
                ]}
                onPress={() => updateSetting('language', lang.id)}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[
                  styles.languageText,
                  settings.language === lang.id && styles.selectedLanguageText
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Animations</Text>
              <Text style={styles.settingDescription}>Enable smooth animations and transitions</Text>
            </View>
            <Switch
              value={settings.animations}
              onValueChange={() => toggleSetting('animations')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.animations ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Feel vibrations when interacting with the app</Text>
            </View>
            <Switch
              value={settings.hapticFeedback}
              onValueChange={() => toggleSetting('hapticFeedback')}
              trackColor={{ false: '#E2E8F0', true: '#667EEA' }}
              thumbColor={settings.hapticFeedback ? '#FFFFFF' : '#F4F3F4'}
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  selectedOption: {
    borderColor: '#667EEA',
    backgroundColor: '#EBF4FF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginTop: 8,
  },
  selectedOptionText: {
    color: '#667EEA',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
  fontSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fontSizeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  selectedFontSize: {
    borderColor: '#667EEA',
    backgroundColor: '#EBF4FF',
  },
  fontSizeText: {
    fontWeight: 'bold',
    color: '#718096',
    marginBottom: 4,
  },
  fontSizeLabel: {
    fontSize: 12,
    color: '#718096',
  },
  selectedFontSizeText: {
    color: '#667EEA',
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  selectedLanguage: {
    borderColor: '#667EEA',
    backgroundColor: '#EBF4FF',
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  selectedLanguageText: {
    color: '#667EEA',
  },
});


