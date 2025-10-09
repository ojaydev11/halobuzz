import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AboutSettings() {
  const appInfo = {
    name: 'HaloBuzz',
    version: '1.0.0',
    build: '2024.01.15',
    description: 'The ultimate social gaming platform with AI-powered features, live streaming, and immersive gaming experiences.',
  };

  const legalItems = [
    {
      title: 'Terms of Service',
      description: 'Read our terms and conditions',
      icon: 'document-text-outline',
      action: () => console.log('Open Terms of Service')
    },
    {
      title: 'Privacy Policy',
      description: 'Learn how we protect your data',
      icon: 'shield-outline',
      action: () => console.log('Open Privacy Policy')
    },
    {
      title: 'Cookie Policy',
      description: 'Understand our cookie usage',
      icon: 'cookie-outline',
      action: () => console.log('Open Cookie Policy')
    },
    {
      title: 'Licenses',
      description: 'View open source licenses',
      icon: 'library-outline',
      action: () => console.log('Open Licenses')
    }
  ];

  const socialLinks = [
    {
      title: 'Website',
      description: 'Visit our official website',
      icon: 'globe-outline',
      action: () => Linking.openURL('https://halobuzz.com')
    },
    {
      title: 'Twitter',
      description: 'Follow us on Twitter',
      icon: 'logo-twitter',
      action: () => Linking.openURL('https://twitter.com/halobuzz')
    },
    {
      title: 'Instagram',
      description: 'Follow us on Instagram',
      icon: 'logo-instagram',
      action: () => Linking.openURL('https://instagram.com/halobuzz')
    },
    {
      title: 'Discord',
      description: 'Join our Discord community',
      icon: 'logo-discord',
      action: () => Linking.openURL('https://discord.gg/halobuzz')
    }
  ];

  const teamMembers = [
    { name: 'Development Team', role: 'Core Development' },
    { name: 'Design Team', role: 'UI/UX Design' },
    { name: 'AI Team', role: 'AI & Machine Learning' },
    { name: 'Community Team', role: 'Community Management' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>🎮</Text>
          </View>
          <Text style={styles.appName}>{appInfo.name}</Text>
          <Text style={styles.appDescription}>{appInfo.description}</Text>
          <View style={styles.versionInfo}>
            <Text style={styles.versionText}>Version {appInfo.version}</Text>
            <Text style={styles.buildText}>Build {appInfo.build}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          {legalItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={item.action}
            >
              <View style={styles.listItemContent}>
                <Ionicons name={item.icon as any} size={20} color="#667EEA" />
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>{item.title}</Text>
                  <Text style={styles.listItemDescription}>{item.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          {socialLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={link.action}
            >
              <View style={styles.listItemContent}>
                <Ionicons name={link.icon as any} size={20} color="#667EEA" />
                <View style={styles.listItemInfo}>
                  <Text style={styles.listItemTitle}>{link.title}</Text>
                  <Text style={styles.listItemDescription}>{link.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <View style={styles.creditsContainer}>
            <Text style={styles.creditsTitle}>Made with ❤️ by:</Text>
            {teamMembers.map((member, index) => (
              <View key={index} style={styles.teamMember}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.acknowledgments}>
            <Text style={styles.acknowledgmentsTitle}>Special Thanks:</Text>
            <Text style={styles.acknowledgmentsText}>
              • React Native Community{'\n'}
              • Expo Team{'\n'}
              • Open Source Contributors{'\n'}
              • Beta Testers
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>React Native / Expo</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Target SDK</Text>
            <Text style={styles.infoValue}>API 34</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Minimum SDK</Text>
            <Text style={styles.infoValue}>API 21</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>January 15, 2024</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 HaloBuzz. All rights reserved.{'\n'}
            Built with passion for the gaming community.
          </Text>
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appIconText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  versionInfo: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 14,
    color: '#A0AEC0',
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
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  listItemDescription: {
    fontSize: 14,
    color: '#718096',
  },
  creditsContainer: {
    marginBottom: 20,
  },
  creditsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  teamMember: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#718096',
  },
  acknowledgments: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 8,
  },
  acknowledgmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  acknowledgmentsText: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  infoValue: {
    fontSize: 14,
    color: '#718096',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
});


