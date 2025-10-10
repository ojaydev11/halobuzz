import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: October 9, 2025</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          HaloBuzz ("we", "us", or "our") collects information to provide better services to our users. We collect:
        </Text>
        <Text style={styles.bulletPoint}>• Account information (email, phone number, profile details)</Text>
        <Text style={styles.bulletPoint}>• User-generated content (livestreams, videos, messages, comments)</Text>
        <Text style={styles.bulletPoint}>• Usage data (app interactions, features used, viewing history)</Text>
        <Text style={styles.bulletPoint}>• Device information (device type, operating system, unique identifiers)</Text>
        <Text style={styles.bulletPoint}>• Location data (country/region for content personalization)</Text>
        <Text style={styles.bulletPoint}>• Payment information (processed securely by App Store/Google Play)</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide and maintain our services</Text>
        <Text style={styles.bulletPoint}>• Process transactions and send notifications</Text>
        <Text style={styles.bulletPoint}>• Personalize your experience and content recommendations</Text>
        <Text style={styles.bulletPoint}>• Improve our services through analytics</Text>
        <Text style={styles.bulletPoint}>• Prevent fraud and ensure platform security</Text>
        <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
        <Text style={styles.bulletPoint}>• Communicate with you about updates and promotions</Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. We may share information with:
        </Text>
        <Text style={styles.bulletPoint}>• Service providers (payment processors, analytics providers)</Text>
        <Text style={styles.bulletPoint}>• Law enforcement when legally required</Text>
        <Text style={styles.bulletPoint}>• Other users (public profile information, streams, messages)</Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your data.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bulletPoint}>• Access your personal data</Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate data</Text>
        <Text style={styles.bulletPoint}>• Delete your account and data</Text>
        <Text style={styles.bulletPoint}>• Opt-out of marketing communications</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>

        <Text style={styles.sectionTitle}>6. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          HaloBuzz is not intended for users under 13 years of age. Users between 13-18 require parental consent. We verify age during registration and may request additional verification.
        </Text>

        <Text style={styles.sectionTitle}>7. Cookies and Tracking</Text>
        <Text style={styles.paragraph}>
          We use cookies and similar technologies for analytics and personalization. You can control cookie preferences in your device settings.
        </Text>

        <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          Our app integrates with third-party services including:
        </Text>
        <Text style={styles.bulletPoint}>• Payment processors (Apple Pay, Google Pay, Stripe)</Text>
        <Text style={styles.bulletPoint}>• Analytics providers (PostHog)</Text>
        <Text style={styles.bulletPoint}>• Error tracking (Sentry)</Text>
        <Text style={styles.bulletPoint}>• Video streaming (Agora)</Text>

        <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
        <Text style={styles.paragraph}>
          Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this privacy policy from time to time. We will notify you of any significant changes via email or in-app notification.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          For privacy-related questions or to exercise your rights, contact us at:
        </Text>
        <Text style={styles.contact}>Email: privacy@halobuzz.com</Text>
        <Text style={styles.contact}>Website: https://halobuzz.com/privacy</Text>
        <Text style={styles.contact}>Address: HaloBuzz Inc., Kathmandu, Nepal</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 HaloBuzz. All rights reserved.</Text>
        </View>
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
    backgroundColor: '#0B0B10',
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: -32,
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#9B9BA5',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6C5CE7',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: '#D1D1D6',
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#D1D1D6',
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 8,
  },
  contact: {
    fontSize: 15,
    color: '#6C5CE7',
    lineHeight: 24,
    marginBottom: 8,
  },
  footer: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#6B6B78',
  },
});
