import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SupportScreen() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const categories = [
    { id: 'account', title: 'Account Issues', icon: '👤' },
    { id: 'streaming', title: 'Streaming Problems', icon: '📹' },
    { id: 'payments', title: 'Payment & Gifts', icon: '💳' },
    { id: 'technical', title: 'Technical Support', icon: '🔧' },
    { id: 'report', title: 'Report Content', icon: '🚨' },
    { id: 'feedback', title: 'Feedback & Suggestions', icon: '💬' },
  ];

  const handleSubmitSupport = () => {
    if (!selectedCategory || !message.trim()) {
      Alert.alert('Missing Information', 'Please select a category and enter your message.');
      return;
    }

    // In a real app, this would send the support request to the backend
    Alert.alert(
      'Support Request Sent',
      'Thank you for contacting us! We will get back to you within 24 hours.',
      [
        {
          text: 'OK',
          onPress: () => {
            setSelectedCategory('');
            setMessage('');
            setEmail('');
          }
        }
      ]
    );
  };

  const handleContactMethod = (method: string, value: string) => {
    Alert.alert(
      `Contact via ${method}`,
      `You can reach us at: ${value}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Support & Help</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.welcomeText}>
          We're here to help! Choose a category below or contact us directly.
        </Text>

        <Text style={styles.sectionTitle}>📋 Support Categories</Text>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonSelected
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextSelected
              ]}>
                {category.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>✉️ Send us a Message</Text>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Your Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Message *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your issue or question..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitSupport}
          >
            <Text style={styles.submitButtonText}>Send Support Request</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>📞 Direct Contact</Text>
        <View style={styles.contactContainer}>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContactMethod('Email', 'support@halobuzz.com')}
          >
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactText}>Email Support</Text>
            <Text style={styles.contactValue}>support@halobuzz.com</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContactMethod('WhatsApp', '+977-XXXXXXXXX')}
          >
            <Text style={styles.contactIcon}>💬</Text>
            <Text style={styles.contactText}>WhatsApp</Text>
            <Text style={styles.contactValue}>+977-XXXXXXXXX</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => handleContactMethod('Discord', 'HaloBuzz Community')}
          >
            <Text style={styles.contactIcon}>🎮</Text>
            <Text style={styles.contactText}>Discord Community</Text>
            <Text style={styles.contactValue}>Join our Discord server</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>
        <View style={styles.faqContainer}>
          <Text style={styles.faqQuestion}>How do I start streaming?</Text>
          <Text style={styles.faqAnswer}>
            Tap the "+" button on the home screen, select "Go Live", and follow the setup process.
          </Text>

          <Text style={styles.faqQuestion}>How do I send virtual gifts?</Text>
          <Text style={styles.faqAnswer}>
            During a live stream, tap the gift icon, select a gift, and tap "Send".
          </Text>

          <Text style={styles.faqQuestion}>How do I report inappropriate content?</Text>
          <Text style={styles.faqAnswer}>
            Tap the "..." menu on any content and select "Report" to flag inappropriate material.
          </Text>

          <Text style={styles.faqQuestion}>How do I change my password?</Text>
          <Text style={styles.faqAnswer}>
            Go to Settings → Account → Change Password and follow the instructions.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>🕒 Response Times</Text>
        <View style={styles.responseTimeContainer}>
          <Text style={styles.responseTimeText}>
            • Email Support: Within 24 hours
          </Text>
          <Text style={styles.responseTimeText}>
            • WhatsApp: Within 2-4 hours
          </Text>
          <Text style={styles.responseTimeText}>
            • Discord: Real-time community support
          </Text>
          <Text style={styles.responseTimeText}>
            • Critical Issues: Within 1 hour
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for using HaloBuzz! We appreciate your feedback and are committed to 
            providing excellent support.
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
  welcomeText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 25,
    marginBottom: 15,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryButtonSelected: {
    borderColor: '#ff6b35',
    backgroundColor: '#2a1a1a',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#ff6b35',
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactContainer: {
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  contactIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  contactText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 5,
  },
  contactValue: {
    fontSize: 14,
    color: '#ff6b35',
  },
  faqContainer: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 15,
  },
  responseTimeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  responseTimeText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  footer: {
    marginTop: 20,
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
