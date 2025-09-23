import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.sectionText}>
          By accessing and using HaloBuzz, you accept and agree to be bound by the terms and 
          provision of this agreement. If you do not agree to abide by the above, please do 
          not use this service.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.sectionText}>
          HaloBuzz is a live streaming platform that allows users to create, share, and discover 
          live content. Our service includes:
        </Text>
        <Text style={styles.bulletPoint}>• Live streaming capabilities</Text>
        <Text style={styles.bulletPoint}>• Virtual gift system</Text>
        <Text style={styles.bulletPoint}>• Interactive chat features</Text>
        <Text style={styles.bulletPoint}>• Gaming integration</Text>
        <Text style={styles.bulletPoint}>• Social networking features</Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.sectionText}>
          To access certain features, you must create an account. You agree to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide accurate and complete information</Text>
        <Text style={styles.bulletPoint}>• Maintain the security of your password</Text>
        <Text style={styles.bulletPoint}>• Accept responsibility for all activities under your account</Text>
        <Text style={styles.bulletPoint}>• Be at least 18 years old</Text>

        <Text style={styles.sectionTitle}>4. Acceptable Use</Text>
        <Text style={styles.sectionText}>
          You agree not to use HaloBuzz to:
        </Text>
        <Text style={styles.bulletPoint}>• Violate any laws or regulations</Text>
        <Text style={styles.bulletPoint}>• Infringe on intellectual property rights</Text>
        <Text style={styles.bulletPoint}>• Harass, abuse, or harm others</Text>
        <Text style={styles.bulletPoint}>• Share inappropriate or offensive content</Text>
        <Text style={styles.bulletPoint}>• Spam or send unsolicited communications</Text>
        <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to our systems</Text>

        <Text style={styles.sectionTitle}>5. Content Policy</Text>
        <Text style={styles.sectionText}>
          You are responsible for all content you create and share. Content must:
        </Text>
        <Text style={styles.bulletPoint}>• Be original or properly licensed</Text>
        <Text style={styles.bulletPoint}>• Comply with community guidelines</Text>
        <Text style={styles.bulletPoint}>• Not contain illegal, harmful, or offensive material</Text>
        <Text style={styles.bulletPoint}>• Respect others' privacy and rights</Text>

        <Text style={styles.sectionTitle}>6. Virtual Currency and Payments</Text>
        <Text style={styles.sectionText}>
          HaloBuzz uses virtual currency (coins) for gifts and features. You understand that:
        </Text>
        <Text style={styles.bulletPoint}>• Virtual currency has no real-world value</Text>
        <Text style={styles.bulletPoint}>• Purchases are final and non-refundable</Text>
        <Text style={styles.bulletPoint}>• We may modify virtual currency features at any time</Text>
        <Text style={styles.bulletPoint}>• Payment processing is handled by third-party providers</Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
        <Text style={styles.sectionText}>
          HaloBuzz and its original content, features, and functionality are owned by HaloBuzz 
          and are protected by international copyright, trademark, and other intellectual property laws.
        </Text>

        <Text style={styles.sectionTitle}>8. Privacy</Text>
        <Text style={styles.sectionText}>
          Your privacy is important to us. Please review our Privacy Policy, which also governs 
          your use of the service, to understand our practices.
        </Text>

        <Text style={styles.sectionTitle}>9. Termination</Text>
        <Text style={styles.sectionText}>
          We may terminate or suspend your account immediately, without prior notice, for conduct 
          that we believe violates these Terms or is harmful to other users, us, or third parties.
        </Text>

        <Text style={styles.sectionTitle}>10. Disclaimers</Text>
        <Text style={styles.sectionText}>
          HaloBuzz is provided "as is" without warranties of any kind. We do not guarantee that 
          the service will be uninterrupted, secure, or error-free.
        </Text>

        <Text style={styles.sectionTitle}>11. Limitation of Liability</Text>
        <Text style={styles.sectionText}>
          In no event shall HaloBuzz be liable for any indirect, incidental, special, consequential, 
          or punitive damages resulting from your use of the service.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law</Text>
        <Text style={styles.sectionText}>
          These Terms shall be governed by and construed in accordance with the laws of Nepal, 
          without regard to conflict of law principles.
        </Text>

        <Text style={styles.sectionTitle}>13. Changes to Terms</Text>
        <Text style={styles.sectionText}>
          We reserve the right to modify these Terms at any time. We will notify users of any 
          material changes by posting the new Terms on this page.
        </Text>

        <Text style={styles.sectionTitle}>14. Contact Information</Text>
        <Text style={styles.sectionText}>
          If you have any questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>Email: legal@halobuzz.com</Text>
        <Text style={styles.contactInfo}>Address: HaloBuzz Legal Team, Kathmandu, Nepal</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using HaloBuzz, you acknowledge that you have read and understood these Terms of Service 
            and agree to be bound by them.
          </Text>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 25,
    marginBottom: 15,
  },
  sectionText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginLeft: 15,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 16,
    color: '#ff6b35',
    marginBottom: 8,
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
