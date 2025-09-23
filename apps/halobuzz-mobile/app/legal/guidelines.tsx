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

export default function CommunityGuidelinesScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Community Guidelines</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <Text style={styles.introText}>
          Welcome to HaloBuzz! Our community guidelines help create a safe, respectful, and 
          enjoyable environment for everyone. Please read and follow these guidelines to help 
          maintain our positive community.
        </Text>

        <Text style={styles.sectionTitle}>🎯 Our Community Values</Text>
        <Text style={styles.sectionText}>
          We believe in creating a platform where creativity, respect, and positive interactions 
          thrive. Our community is built on:
        </Text>
        <Text style={styles.bulletPoint}>• Respect for all users regardless of background</Text>
        <Text style={styles.bulletPoint}>• Encouragement of creative expression</Text>
        <Text style={styles.bulletPoint}>• Support for content creators</Text>
        <Text style={styles.bulletPoint}>• Safe and inclusive environment</Text>

        <Text style={styles.sectionTitle}>✅ What We Encourage</Text>
        <Text style={styles.sectionText}>
          We love to see content that:
        </Text>
        <Text style={styles.bulletPoint}>• Showcases your talents and creativity</Text>
        <Text style={styles.bulletPoint}>• Builds positive connections with others</Text>
        <Text style={styles.bulletPoint}>• Shares knowledge and skills</Text>
        <Text style={styles.bulletPoint}>• Promotes cultural exchange and understanding</Text>
        <Text style={styles.bulletPoint}>• Supports and uplifts other creators</Text>

        <Text style={styles.sectionTitle}>❌ Prohibited Content</Text>
        <Text style={styles.sectionText}>
          The following content is not allowed on HaloBuzz:
        </Text>
        <Text style={styles.bulletPoint}>• Nudity, sexual content, or adult material</Text>
        <Text style={styles.bulletPoint}>• Violence, graphic content, or harmful activities</Text>
        <Text style={styles.bulletPoint}>• Hate speech, discrimination, or harassment</Text>
        <Text style={styles.bulletPoint}>• Illegal activities or dangerous behavior</Text>
        <Text style={styles.bulletPoint}>• Spam, scams, or misleading information</Text>
        <Text style={styles.bulletPoint}>• Copyright infringement or stolen content</Text>
        <Text style={styles.bulletPoint}>• Content involving minors</Text>

        <Text style={styles.sectionTitle}>🚫 Prohibited Behavior</Text>
        <Text style={styles.sectionText}>
          Please do not:
        </Text>
        <Text style={styles.bulletPoint}>• Harass, bully, or intimidate other users</Text>
        <Text style={styles.bulletPoint}>• Share personal information without consent</Text>
        <Text style={styles.bulletPoint}>• Create fake accounts or impersonate others</Text>
        <Text style={styles.bulletPoint}>• Manipulate the platform or use bots</Text>
        <Text style={styles.bulletPoint}>• Engage in fraudulent activities</Text>
        <Text style={styles.bulletPoint}>• Spam or send unsolicited messages</Text>

        <Text style={styles.sectionTitle}>🎁 Gift and Payment Guidelines</Text>
        <Text style={styles.sectionText}>
          When using our virtual gift system:
        </Text>
        <Text style={styles.bulletPoint}>• Gifts should be given voluntarily and respectfully</Text>
        <Text style={styles.bulletPoint}>• Do not pressure others to send gifts</Text>
        <Text style={styles.bulletPoint}>• Report any suspicious payment activities</Text>
        <Text style={styles.bulletPoint}>• Understand that virtual currency has no real-world value</Text>

        <Text style={styles.sectionTitle}>🔒 Privacy and Safety</Text>
        <Text style={styles.sectionText}>
          Protect yourself and others:
        </Text>
        <Text style={styles.bulletPoint}>• Never share personal information publicly</Text>
        <Text style={styles.bulletPoint}>• Be cautious when meeting people offline</Text>
        <Text style={styles.bulletPoint}>• Report suspicious or inappropriate behavior</Text>
        <Text style={styles.bulletPoint}>• Use our blocking and reporting features when needed</Text>

        <Text style={styles.sectionTitle}>📱 Streaming Best Practices</Text>
        <Text style={styles.sectionText}>
          For a great streaming experience:
        </Text>
        <Text style={styles.bulletPoint}>• Ensure good lighting and audio quality</Text>
        <Text style={styles.bulletPoint}>• Interact with your audience respectfully</Text>
        <Text style={styles.bulletPoint}>• Moderate your chat appropriately</Text>
        <Text style={styles.bulletPoint}>• Respect intellectual property rights</Text>
        <Text style={styles.bulletPoint}>• Follow local laws and regulations</Text>

        <Text style={styles.sectionTitle}>⚖️ Enforcement</Text>
        <Text style={styles.sectionText}>
          Violations of these guidelines may result in:
        </Text>
        <Text style={styles.bulletPoint}>• Content removal</Text>
        <Text style={styles.bulletPoint}>• Temporary account restrictions</Text>
        <Text style={styles.bulletPoint}>• Permanent account suspension</Text>
        <Text style={styles.bulletPoint}>• Legal action in severe cases</Text>

        <Text style={styles.sectionTitle}>📞 Reporting and Appeals</Text>
        <Text style={styles.sectionText}>
          If you see something that violates our guidelines:
        </Text>
        <Text style={styles.bulletPoint}>• Use the report button on content or profiles</Text>
        <Text style={styles.bulletPoint}>• Contact our support team for serious issues</Text>
        <Text style={styles.bulletPoint}>• Appeal moderation decisions if you believe they're unfair</Text>

        <Text style={styles.sectionTitle}>🔄 Updates to Guidelines</Text>
        <Text style={styles.sectionText}>
          These guidelines may be updated periodically to reflect changes in our community 
          and platform. We will notify users of significant changes.
        </Text>

        <Text style={styles.sectionTitle}>📧 Contact Us</Text>
        <Text style={styles.sectionText}>
          Questions about these guidelines? Contact us at:
        </Text>
        <Text style={styles.contactInfo}>Email: community@halobuzz.com</Text>
        <Text style={styles.contactInfo}>Support: support@halobuzz.com</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for helping us maintain a positive and safe community on HaloBuzz!
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
    marginBottom: 20,
    fontStyle: 'italic',
  },
  introText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
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
