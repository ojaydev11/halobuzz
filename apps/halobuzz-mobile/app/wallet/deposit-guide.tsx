import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DepositGuideScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState('esewa');

  const paymentMethods = [
    {
      id: 'esewa',
      name: 'eSewa',
      icon: '💰',
      available: true,
      fees: '2.5%',
      minAmount: 100,
      maxAmount: 100000,
      processingTime: 'Instant',
      description: 'Most popular digital wallet in Nepal',
    },
    {
      id: 'khalti',
      name: 'Khalti',
      icon: '📱',
      available: true,
      fees: '3.0%',
      minAmount: 100,
      maxAmount: 50000,
      processingTime: 'Instant',
      description: 'Digital wallet for Nepali users',
    },
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      icon: '💳',
      available: true,
      fees: '2.9% + $0.30',
      minAmount: 500,
      maxAmount: 500000,
      processingTime: 'Instant',
      description: 'International credit/debit cards via Stripe',
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '🌐',
      available: true,
      fees: '3.4% + $0.30',
      minAmount: 500,
      maxAmount: 200000,
      processingTime: 'Instant',
      description: 'Global PayPal payments',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: '🏦',
      available: true,
      fees: 'No fees',
      minAmount: 1000,
      maxAmount: 1000000,
      processingTime: '1-3 business days',
      description: 'Direct bank transfer (manual verification)',
    },
  ];

  const conversionRates = {
    NPR: { rate: 1, symbol: 'Rs.', coins: 50 }, // 1 NPR = 50 coins
    USD: { rate: 133, symbol: '$', coins: 6650 }, // 1 USD = 6650 coins
    EUR: { rate: 145, symbol: '€', coins: 7250 }, // 1 EUR = 7250 coins
    GBP: { rate: 168, symbol: '£', coins: 8400 }, // 1 GBP = 8400 coins
  };

  const getStepByStepGuide = (method: string) => {
    switch (method) {
      case 'esewa':
        return [
          '1. Click "Proceed to Pay" button',
          '2. You will be redirected to eSewa website',
          '3. Login to your eSewa account',
          '4. Confirm the payment amount and merchant',
          '5. Enter your eSewa PIN to complete payment',
          '6. You will receive instant confirmation',
          '7. Coins will be added to your account immediately',
        ];
      case 'khalti':
        return [
          '1. Click "Proceed to Pay" button',
          '2. You will be redirected to Khalti payment gateway',
          '3. Enter your Khalti mobile number',
          '4. Enter the OTP sent to your mobile',
          '5. Confirm the payment with your Khalti PIN',
          '6. Payment confirmation will be instant',
          '7. Coins will be credited immediately',
        ];
      case 'stripe':
        return [
          '1. Click "Proceed to Pay" button',
          '2. Enter your card details securely',
          '3. Card Number, Expiry Date, and CVC',
          '4. Enter billing address information',
          '5. Review payment amount and click Pay',
          '6. 3D Secure verification may be required',
          '7. Instant confirmation and coin credit',
        ];
      case 'paypal':
        return [
          '1. Click "Proceed to Pay" button',
          '2. Login to your PayPal account',
          '3. Review the payment details',
          '4. Select payment method (card/bank)',
          '5. Confirm and authorize payment',
          '6. Return to HaloBuzz automatically',
          '7. Coins credited instantly',
        ];
      case 'bank':
        return [
          '1. Click "Proceed to Pay" button',
          '2. Note down our bank account details',
          '3. Visit your bank or use online banking',
          '4. Transfer amount to provided account',
          '5. Use your UserID as transfer reference',
          '6. Upload transfer receipt in app',
          '7. Manual verification within 24 hours',
          '8. Coins credited after verification',
        ];
      default:
        return [];
    }
  };

  const getBankDetails = () => ({
    bankName: 'Nepal Investment Mega Bank',
    accountName: 'HaloBuzz Pvt. Ltd.',
    accountNumber: '01234567890123456',
    branch: 'New Road, Kathmandu',
    swiftCode: 'NIMBNPKA',
  });

  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
  const bankDetails = getBankDetails();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Deposit Guide</Text>
        <TouchableOpacity onPress={() => router.push('/support')}>
          <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Conversion Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💱 Conversion Rates</Text>
          <Text style={styles.sectionSubtitle}>Live exchange rates updated hourly</Text>
          <View style={styles.ratesGrid}>
            {Object.entries(conversionRates).map(([currency, data]) => (
              <View key={currency} style={styles.rateCard}>
                <Text style={styles.currencyCode}>{currency}</Text>
                <Text style={styles.rateText}>
                  {data.symbol}1 = {data.coins} coins
                </Text>
                {currency === 'NPR' && (
                  <Text style={styles.popularBadge}>Most Popular</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Methods</Text>
          <Text style={styles.sectionSubtitle}>Choose your preferred payment method</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardActive,
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.methodHeader}>
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDescription}>{method.description}</Text>
                </View>
                <View style={styles.methodBadges}>
                  {method.available && <Text style={styles.availableBadge}>Available</Text>}
                </View>
              </View>

              <View style={styles.methodDetails}>
                <View style={styles.methodDetail}>
                  <Text style={styles.detailLabel}>Fees:</Text>
                  <Text style={styles.detailValue}>{method.fees}</Text>
                </View>
                <View style={styles.methodDetail}>
                  <Text style={styles.detailLabel}>Limits:</Text>
                  <Text style={styles.detailValue}>
                    Rs.{method.minAmount} - Rs.{method.maxAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.methodDetail}>
                  <Text style={styles.detailLabel}>Processing:</Text>
                  <Text style={styles.detailValue}>{method.processingTime}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step by Step Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Step-by-Step Guide</Text>
          <Text style={styles.sectionSubtitle}>
            How to deposit using {selectedMethodData?.name}
          </Text>

          <View style={styles.stepsContainer}>
            {getStepByStepGuide(selectedMethod).map((step, index) => (
              <View key={index} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bank Details (if bank transfer selected) */}
        {selectedMethod === 'bank' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏦 Bank Account Details</Text>
            <Text style={styles.sectionSubtitle}>Use these details for bank transfer</Text>

            <View style={styles.bankDetailsCard}>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Bank Name:</Text>
                <Text style={styles.bankValue}>{bankDetails.bankName}</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Account Name:</Text>
                <Text style={styles.bankValue}>{bankDetails.accountName}</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Account Number:</Text>
                <Text style={styles.bankValue}>{bankDetails.accountNumber}</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Branch:</Text>
                <Text style={styles.bankValue}>{bankDetails.branch}</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>SWIFT Code:</Text>
                <Text style={styles.bankValue}>{bankDetails.swiftCode}</Text>
              </View>

              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  Alert.alert('Copied', 'Bank details copied to clipboard');
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Important Notes</Text>

          <View style={styles.noteCard}>
            <View style={styles.note}>
              <Ionicons name="time-outline" size={20} color="#ffaa00" />
              <Text style={styles.noteText}>
                Deposits are usually instant, but may take up to 15 minutes during peak hours
              </Text>
            </View>
            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#00ff00" />
              <Text style={styles.noteText}>
                All payments are secured with 256-bit SSL encryption
              </Text>
            </View>
            <View style={styles.note}>
              <Ionicons name="receipt-outline" size={20} color="#007AFF" />
              <Text style={styles.noteText}>
                Keep payment receipts until coins are credited to your account
              </Text>
            </View>
            <View style={styles.note}>
              <Ionicons name="help-circle-outline" size={20} color="#888" />
              <Text style={styles.noteText}>
                Contact support if payment is not reflected within 30 minutes
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Frequently Asked Questions</Text>

          <View style={styles.faqContainer}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What if my payment fails?</Text>
              <Text style={styles.faqAnswer}>
                Payment failures are rare. If it happens, amount will be automatically refunded within 5-7 business days. Contact support for immediate assistance.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Are there any hidden charges?</Text>
              <Text style={styles.faqAnswer}>
                No hidden charges. Only the processing fees shown above apply. What you see is what you pay.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Can I get a refund for my coins?</Text>
              <Text style={styles.faqAnswer}>
                Coins can only be withdrawn back to your payment method, subject to our withdrawal policy and minimum limits.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Is my payment information safe?</Text>
              <Text style={styles.faqAnswer}>
                Yes, we use industry-standard security protocols. Payment details are processed by certified payment gateways and never stored on our servers.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/wallet/recharge')}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Start Deposit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Linking.openURL('https://support.halobuzz.com/deposit')}
          >
            <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>Get Help</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rateCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  rateText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff0000',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  methodCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#002244',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 12,
    color: '#888',
  },
  methodBadges: {
    alignItems: 'flex-end',
  },
  availableBadge: {
    backgroundColor: '#00ff0044',
    color: '#00ff00',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  methodDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodDetail: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  stepsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  bankDetailsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  bankDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bankLabel: {
    fontSize: 14,
    color: '#888',
  },
  bankValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF22',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    marginLeft: 12,
    lineHeight: 20,
  },
  faqContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});