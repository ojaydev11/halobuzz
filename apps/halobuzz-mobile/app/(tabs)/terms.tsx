import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.lastUpdated}>Last Updated: October 9, 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using HaloBuzz ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Eligibility</Text>
        <Text style={styles.paragraph}>
          You must be at least 13 years old to use HaloBuzz. Users between 13-18 require parental consent. By using the Service, you represent that you meet these requirements.
        </Text>

        <Text style={styles.sectionTitle}>3. Account Responsibilities</Text>
        <Text style={styles.paragraph}>You agree to:</Text>
        <Text style={styles.bulletPoint}>• Provide accurate registration information</Text>
        <Text style={styles.bulletPoint}>• Maintain the security of your account credentials</Text>
        <Text style={styles.bulletPoint}>• Accept responsibility for all activities under your account</Text>
        <Text style={styles.bulletPoint}>• Notify us immediately of any unauthorized use</Text>

        <Text style={styles.sectionTitle}>4. Prohibited Conduct</Text>
        <Text style={styles.paragraph}>You may not:</Text>
        <Text style={styles.bulletPoint}>• Post illegal, harmful, or inappropriate content</Text>
        <Text style={styles.bulletPoint}>• Harass, bully, or threaten other users</Text>
        <Text style={styles.bulletPoint}>• Share sexually explicit content (18+ material prohibited)</Text>
        <Text style={styles.bulletPoint}>• Engage in fraud, scams, or money laundering</Text>
        <Text style={styles.bulletPoint}>• Cheat, exploit bugs, or manipulate games</Text>
        <Text style={styles.bulletPoint}>• Use bots, automation, or unauthorized tools</Text>
        <Text style={styles.bulletPoint}>• Impersonate others or create fake accounts</Text>
        <Text style={styles.bulletPoint}>• Spam or distribute malware</Text>

        <Text style={styles.sectionTitle}>5. Content Ownership & License</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you post. By posting, you grant HaloBuzz a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content within the Service.
        </Text>

        <Text style={styles.sectionTitle}>6. Virtual Currency & Purchases</Text>
        <Text style={styles.paragraph}>
          Coins purchased in-app have no real-world monetary value. All purchases are final and non-refundable except where required by law. We reserve the right to modify pricing at any time.
        </Text>

        <Text style={styles.sectionTitle}>7. OG Membership</Text>
        <Text style={styles.paragraph}>
          OG Tier subscriptions renew automatically unless canceled 24 hours before renewal. Benefits may change with reasonable notice. Downgrades take effect at the end of the current billing period.
        </Text>

        <Text style={styles.sectionTitle}>8. Creator Earnings</Text>
        <Text style={styles.paragraph}>
          Creators may earn through gifts and subscriptions. Payouts require KYC verification and minimum balance thresholds. We reserve the right to withhold payments for fraudulent activity.
        </Text>

        <Text style={styles.sectionTitle}>9. Content Moderation</Text>
        <Text style={styles.paragraph}>
          We reserve the right to remove content, suspend accounts, or ban users for violating these Terms. Automated systems and human moderators may review content. Appeals can be submitted to support@halobuzz.com.
        </Text>

        <Text style={styles.sectionTitle}>10. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          HaloBuzz trademarks, logos, and app design are our property. You may not use them without written permission. We respect intellectual property rights and will respond to valid copyright claims.
        </Text>

        <Text style={styles.sectionTitle}>11. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          The Service integrates with third parties (payment processors, streaming providers). Your use of their services is subject to their terms and privacy policies.
        </Text>

        <Text style={styles.sectionTitle}>12. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE UPTIME, ACCURACY, OR FITNESS FOR A PARTICULAR PURPOSE.
        </Text>

        <Text style={styles.sectionTitle}>13. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, HALOBUZZ SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
        </Text>

        <Text style={styles.sectionTitle}>14. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify and hold harmless HaloBuzz from claims arising from your use of the Service, content you post, or violation of these Terms.
        </Text>

        <Text style={styles.sectionTitle}>15. Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          Disputes will be resolved through binding arbitration in accordance with the rules of Nepal Arbitration Council. You waive your right to a jury trial or class action.
        </Text>

        <Text style={styles.sectionTitle}>16. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms are governed by the laws of Nepal. Exclusive jurisdiction lies with courts in Kathmandu, Nepal.
        </Text>

        <Text style={styles.sectionTitle}>17. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these Terms at any time. Continued use after changes constitutes acceptance. Material changes will be notified via email or in-app notification.
        </Text>

        <Text style={styles.sectionTitle}>18. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account at any time for violations of these Terms. You may delete your account in settings at any time.
        </Text>

        <Text style={styles.sectionTitle}>19. Severability</Text>
        <Text style={styles.paragraph}>
          If any provision of these Terms is found invalid, the remaining provisions will continue in effect.
        </Text>

        <Text style={styles.sectionTitle}>20. Contact Information</Text>
        <Text style={styles.contact}>Email: legal@halobuzz.com</Text>
        <Text style={styles.contact}>Support: support@halobuzz.com</Text>
        <Text style={styles.contact}>Website: https://halobuzz.com/terms</Text>
        <Text style={styles.contact}>Address: HaloBuzz Inc., Kathmandu, Nepal</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 HaloBuzz. All rights reserved.</Text>
          <Text style={styles.footerText}>By using HaloBuzz, you agree to these Terms.</Text>
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
    marginHorizontal: -32, // Offset for centering
  },
  placeholder: {
    width: 40, // Match back button width for centering
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
    textAlign: 'center',
    marginBottom: 4,
  },
});
