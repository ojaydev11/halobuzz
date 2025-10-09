import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function HelpSettings() {
  const helpSections = [
    {
      title: 'Getting Started',
      items: [
        { title: 'How to create an account', icon: 'person-add-outline' },
        { title: 'Setting up your profile', icon: 'person-outline' },
        { title: 'Understanding the interface', icon: 'phone-portrait-outline' },
        { title: 'First steps guide', icon: 'play-circle-outline' },
      ]
    },
    {
      title: 'Account & Security',
      items: [
        { title: 'Password reset', icon: 'key-outline' },
        { title: 'Two-factor authentication', icon: 'shield-checkmark-outline' },
        { title: 'Privacy settings', icon: 'lock-closed-outline' },
        { title: 'Account recovery', icon: 'refresh-outline' },
      ]
    },
    {
      title: 'Features & Usage',
      items: [
        { title: 'Live streaming', icon: 'videocam-outline' },
        { title: 'Gaming features', icon: 'game-controller-outline' },
        { title: 'Messaging system', icon: 'chatbubbles-outline' },
        { title: 'AI Assistant', icon: 'sparkles-outline' },
      ]
    },
    {
      title: 'Troubleshooting',
      items: [
        { title: 'App not working', icon: 'bug-outline' },
        { title: 'Connection issues', icon: 'wifi-outline' },
        { title: 'Performance problems', icon: 'speedometer-outline' },
        { title: 'Error messages', icon: 'warning-outline' },
      ]
    }
  ];

  const contactOptions = [
    {
      title: 'Live Chat Support',
      description: 'Get instant help from our support team',
      icon: 'chatbubble-outline',
      action: () => console.log('Open live chat')
    },
    {
      title: 'Email Support',
      description: 'Send us an email and we\'ll get back to you',
      icon: 'mail-outline',
      action: () => Linking.openURL('mailto:support@halobuzz.com')
    },
    {
      title: 'Phone Support',
      description: 'Call us for immediate assistance',
      icon: 'call-outline',
      action: () => Linking.openURL('tel:+1234567890')
    },
    {
      title: 'Community Forum',
      description: 'Get help from other users',
      icon: 'people-outline',
      action: () => console.log('Open community forum')
    }
  ];

  const handleHelpItemPress = (item: any) => {
    console.log(`Help item pressed: ${item.title}`);
    // In a real app, this would navigate to the specific help article
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>Find answers to your questions</Text>
        </View>

        {helpSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.helpItem}
                onPress={() => handleHelpItemPress(item)}
              >
                <View style={styles.helpItemContent}>
                  <Ionicons name={item.icon as any} size={20} color="#667EEA" />
                  <Text style={styles.helpItemTitle}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          {contactOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactOption}
              onPress={option.action}
            >
              <View style={styles.contactContent}>
                <View style={styles.contactIcon}>
                  <Ionicons name={option.icon as any} size={24} color="#667EEA" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>{option.title}</Text>
                  <Text style={styles.contactDescription}>{option.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          
          <TouchableOpacity style={styles.resourceItem}>
            <View style={styles.resourceContent}>
              <Ionicons name="document-text-outline" size={20} color="#667EEA" />
              <Text style={styles.resourceTitle}>User Manual</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceItem}>
            <View style={styles.resourceContent}>
              <Ionicons name="play-outline" size={20} color="#667EEA" />
              <Text style={styles.resourceTitle}>Video Tutorials</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceItem}>
            <View style={styles.resourceContent}>
              <Ionicons name="newspaper-outline" size={20} color="#667EEA" />
              <Text style={styles.resourceTitle}>Release Notes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Can't find what you're looking for? Our support team is here to help!
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
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
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
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  helpItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helpItemTitle: {
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 12,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 14,
    color: '#718096',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resourceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 12,
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


