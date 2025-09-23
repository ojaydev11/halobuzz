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

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.sectionText}>
          We collect information you provide directly to us, such as when you create an account, 
          use our services, or contact us for support. This includes:
        </Text>
        <Text style={styles.bulletPoint}>• Account information (username, email, phone number)</Text>
        <Text style={styles.bulletPoint}>• Profile information (photos, bio, preferences)</Text>
        <Text style={styles.bulletPoint}>• Content you create (streams, messages, comments)</Text>
        <Text style={styles.bulletPoint}>• Payment information (processed securely by third-party providers)</Text>
        <Text style={styles.bulletPoint}>• Device information (device type, operating system, unique identifiers)</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.sectionText}>
          We use the information we collect to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide, maintain, and improve our services</Text>
        <Text style={styles.bulletPoint}>• Process transactions and send related information</Text>
        <Text style={styles.bulletPoint}>• Send technical notices, updates, and support messages</Text>
        <Text style={styles.bulletPoint}>• Respond to your comments and questions</Text>
        <Text style={styles.bulletPoint}>• Monitor and analyze trends and usage</Text>
        <Text style={styles.bulletPoint}>• Personalize your experience</Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.sectionText}>
          We do not sell, trade, or otherwise transfer your personal information to third parties 
          except in the following circumstances:
        </Text>
        <Text style={styles.bulletPoint}>• With your consent</Text>
        <Text style={styles.bulletPoint}>• To comply with legal obligations</Text>
        <Text style={styles.bulletPoint}>• To protect our rights and safety</Text>
        <Text style={styles.bulletPoint}>• With service providers who assist in our operations</Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.sectionText}>
          We implement appropriate security measures to protect your personal information against 
          unauthorized access, alteration, disclosure, or destruction. This includes encryption, 
          secure servers, and regular security audits.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.sectionText}>
          You have the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Access your personal information</Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
        <Text style={styles.bulletPoint}>• Delete your account and data</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        <Text style={styles.bulletPoint}>• Opt out of certain communications</Text>

        <Text style={styles.sectionTitle}>6. Age Requirements</Text>
        <Text style={styles.sectionText}>
          HaloBuzz is intended for users who are 18 years or older. We do not knowingly collect 
          personal information from children under 18. If we become aware that we have collected 
          personal information from a child under 18, we will take steps to delete such information.
        </Text>

        <Text style={styles.sectionTitle}>7. International Users</Text>
        <Text style={styles.sectionText}>
          If you are accessing our services from outside Nepal, please note that your information 
          may be transferred to, stored, and processed in Nepal where our servers are located.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.sectionText}>
          We may update this Privacy Policy from time to time. We will notify you of any changes 
          by posting the new Privacy Policy on this page and updating the "Last updated" date.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.sectionText}>
          If you have any questions about this Privacy Policy, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>Email: privacy@halobuzz.com</Text>
        <Text style={styles.contactInfo}>Address: HaloBuzz Privacy Team, Kathmandu, Nepal</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using HaloBuzz, you agree to the collection and use of information in accordance 
            with this Privacy Policy.
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
