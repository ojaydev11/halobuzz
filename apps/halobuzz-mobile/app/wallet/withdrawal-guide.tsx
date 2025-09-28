import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function WithdrawalGuideScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState('bank');

  const withdrawalMethods = [
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: '🏦',
      available: true,
      fees: '2% (min Rs.25)',
      minAmount: 1000,
      maxAmount: 500000,
      processingTime: '1-3 business days',
      description: 'Direct transfer to your bank account',
      kycRequired: true,
    },
    {
      id: 'esewa',
      name: 'eSewa',
      icon: '💰',
      available: true,
      fees: '3%',
      minAmount: 500,
      maxAmount: 100000,
      processingTime: '2-4 hours',
      description: 'Instant withdrawal to eSewa wallet',
      kycRequired: false,
    },
    {
      id: 'khalti',
      name: 'Khalti',
      icon: '📱',
      available: true,
      fees: '3.5%',
      minAmount: 500,
      maxAmount: 50000,
      processingTime: '2-4 hours',
      description: 'Instant withdrawal to Khalti wallet',
      kycRequired: false,
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '🌐',
      available: true,
      fees: '4% + $0.30',
      minAmount: 2000,
      maxAmount: 200000,
      processingTime: '1-2 business days',
      description: 'International PayPal withdrawal',
      kycRequired: true,
    },
    {
      id: 'crypto',
      name: 'Cryptocurrency',
      icon: '₿',
      available: false,
      fees: 'Network fees only',
      minAmount: 5000,
      maxAmount: 1000000,
      processingTime: '10-30 minutes',
      description: 'Bitcoin, Ethereum, USDT withdrawal',
      kycRequired: true,
    },
  ];

  const kycLevels = [
    {
      level: 'Basic KYC',
      maxWithdrawal: 25000,
      requirements: ['Phone verification', 'Email verification', 'Basic profile'],
      documents: [],
    },
    {
      level: 'Standard KYC',
      maxWithdrawal: 100000,
      requirements: ['Basic KYC +', 'Government ID', 'Address proof'],
      documents: ['Citizenship/Passport', 'Utility bill/Bank statement'],
    },
    {
      level: 'Premium KYC',
      maxWithdrawal: 500000,
      requirements: ['Standard KYC +', 'Video verification', 'Bank verification'],
      documents: ['All standard docs +', 'Bank account proof', 'Video call verification'],
    },
  ];

  const getStepByStepGuide = (method: string) => {
    switch (method) {
      case 'bank':
        return [
          '1. Ensure you have completed KYC verification',
          '2. Add your bank account details in settings',
          '3. Enter withdrawal amount (min Rs.1,000)',
          '4. Confirm bank account details',
          '5. Submit withdrawal request',
          '6. Wait for admin approval (up to 24 hours)',
          '7. Funds transferred within 1-3 business days',
          '8. SMS/email confirmation when completed',
        ];
      case 'esewa':
        return [
          '1. Verify your eSewa account in app settings',
          '2. Enter withdrawal amount (min Rs.500)',
          '3. Confirm your eSewa number',
          '4. Review withdrawal fees (3%)',
          '5. Submit withdrawal request',
          '6. Automatic processing within 2-4 hours',
          '7. Check eSewa balance for confirmation',
          '8. Keep transaction ID for records',
        ];
      case 'khalti':
        return [
          '1. Link your Khalti account in settings',
          '2. Enter withdrawal amount (min Rs.500)',
          '3. Confirm your Khalti mobile number',
          '4. Review withdrawal fees (3.5%)',
          '5. Submit withdrawal request',
          '6. Automatic processing within 2-4 hours',
          '7. Check Khalti balance for funds',
          '8. SMS confirmation from Khalti',
        ];
      case 'paypal':
        return [
          '1. Complete Premium KYC verification',
          '2. Add PayPal email in account settings',
          '3. Enter withdrawal amount (min Rs.2,000)',
          '4. Confirm PayPal email address',
          '5. Review international fees',
          '6. Submit withdrawal request',
          '7. Manual review within 24 hours',
          '8. PayPal transfer within 1-2 business days',
        ];
      case 'crypto':
        return [
          '1. Complete Premium KYC verification',
          '2. Add cryptocurrency wallet address',
          '3. Select cryptocurrency (BTC, ETH, USDT)',
          '4. Enter withdrawal amount',
          '5. Review network fees',
          '6. Confirm wallet address (irreversible!)',
          '7. Submit withdrawal request',
          '8. Manual security review',
          '9. Crypto sent within 10-30 minutes',
        ];
      default:
        return [];
    }
  };

  const selectedMethodData = withdrawalMethods.find(m => m.id === selectedMethod);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdrawal Guide</Text>
        <TouchableOpacity onPress={() => router.push('/support')}>
          <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* KYC Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ KYC Verification Levels</Text>
          <Text style={styles.sectionSubtitle}>Higher KYC levels unlock higher withdrawal limits</Text>

          {kycLevels.map((kyc, index) => (
            <View key={index} style={styles.kycCard}>
              <View style={styles.kycHeader}>
                <Text style={styles.kycLevel}>{kyc.level}</Text>
                <Text style={styles.kycLimit}>Up to Rs.{kyc.maxWithdrawal.toLocaleString()}</Text>
              </View>
              <Text style={styles.kycRequirements}>Requirements:</Text>
              {kyc.requirements.map((req, reqIndex) => (
                <Text key={reqIndex} style={styles.requirementItem}>• {req}</Text>
              ))}
              {kyc.documents.length > 0 && (
                <>
                  <Text style={styles.kycRequirements}>Documents needed:</Text>
                  {kyc.documents.map((doc, docIndex) => (
                    <Text key={docIndex} style={styles.requirementItem}>• {doc}</Text>
                  ))}
                </>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.kycButton}
            onPress={() => router.push('/settings/kyc-verification')}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.kycButtonText}>Start KYC Verification</Text>
          </TouchableOpacity>
        </View>

        {/* Withdrawal Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💸 Withdrawal Methods</Text>
          <Text style={styles.sectionSubtitle}>Choose your preferred withdrawal method</Text>

          {withdrawalMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardActive,
                !method.available && styles.methodCardDisabled,
              ]}
              onPress={() => method.available && setSelectedMethod(method.id)}
            >
              <View style={styles.methodHeader}>
                <Text style={[styles.methodIcon, !method.available && { opacity: 0.5 }]}>
                  {method.icon}
                </Text>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, !method.available && { opacity: 0.5 }]}>
                    {method.name}
                  </Text>
                  <Text style={[styles.methodDescription, !method.available && { opacity: 0.5 }]}>
                    {method.description}
                  </Text>
                </View>
                <View style={styles.methodBadges}>
                  {method.available ? (
                    <Text style={styles.availableBadge}>Available</Text>
                  ) : (
                    <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                  )}
                  {method.kycRequired && (
                    <Text style={styles.kycRequiredBadge}>KYC Required</Text>
                  )}
                </View>
              </View>

              {method.available && (
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
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Step by Step Guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Step-by-Step Guide</Text>
          <Text style={styles.sectionSubtitle}>
            How to withdraw using {selectedMethodData?.name}
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

        {/* Withdrawal Limits & Fees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Limits & Fees</Text>

          <View style={styles.feesCard}>
            <Text style={styles.feesTitle}>Daily Withdrawal Limits</Text>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Basic KYC:</Text>
              <Text style={styles.feeValue}>Rs.25,000 per day</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Standard KYC:</Text>
              <Text style={styles.feeValue}>Rs.100,000 per day</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Premium KYC:</Text>
              <Text style={styles.feeValue}>Rs.500,000 per day</Text>
            </View>
          </View>

          <View style={styles.feesCard}>
            <Text style={styles.feesTitle}>Processing Times</Text>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Digital wallets:</Text>
              <Text style={styles.feeValue}>2-4 hours (automatic)</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>Bank transfers:</Text>
              <Text style={styles.feeValue}>1-3 business days</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeLabel}>International:</Text>
              <Text style={styles.feeValue}>1-5 business days</Text>
            </View>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Important Information</Text>

          <View style={styles.noteCard}>
            <View style={styles.note}>
              <Ionicons name="shield-outline" size={20} color="#ffaa00" />
              <Text style={styles.noteText}>
                All withdrawals are manually reviewed for security. Large amounts may require additional verification.
              </Text>
            </View>
            <View style={styles.note}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.noteText}>
                Withdrawals are processed during business hours (9 AM - 6 PM, Sunday to Friday).
              </Text>
            </View>
            <View style={styles.note}>
              <Ionicons name="ban-outline" size={20} color="#ff0000" />
              <Text style={styles.noteText}>
                Bonus coins cannot be withdrawn. Only earned/deposited coins are withdrawable.
              </Text>
            </View>
            <View style={styles.note}>
              <Ionicons name="document-text-outline" size={20} color="#00ff00" />
              <Text style={styles.noteText}>
                Keep transaction receipts and IDs for your records until funds are received.
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❓ Withdrawal FAQ</Text>

          <View style={styles.faqContainer}>
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How long does KYC verification take?</Text>
              <Text style={styles.faqAnswer}>
                Basic KYC: Instant. Standard KYC: 2-24 hours. Premium KYC: 1-3 business days with video call scheduling.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Can I cancel a withdrawal request?</Text>
              <Text style={styles.faqAnswer}>
                Yes, you can cancel pending withdrawal requests from your transaction history before they are processed.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What if my withdrawal is delayed?</Text>
              <Text style={styles.faqAnswer}>
                Contact support with your transaction ID. Delays usually occur due to bank holidays or additional security checks.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Are there tax implications?</Text>
              <Text style={styles.faqAnswer}>
                You are responsible for reporting earnings as per your local tax laws. We provide transaction reports for tax filing.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What about failed withdrawals?</Text>
              <Text style={styles.faqAnswer}>
                Failed withdrawals are automatically refunded to your account balance. Check your bank details if withdrawals keep failing.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/wallet/withdraw')}
          >
            <Ionicons name="cash-outline" size={24} color="#fff" />
            <Text style={styles.primaryButtonText}>Start Withdrawal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/wallet/transactions')}
          >
            <Ionicons name="list-outline" size={24} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>
        </View>

        {/* Support Contact */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Contact our 24/7 support team for withdrawal assistance
          </Text>
          <View style={styles.supportButtons}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => Linking.openURL('https://wa.me/9779801234567')}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
              <Text style={styles.supportButtonText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => Linking.openURL('mailto:support@halobuzz.com')}
            >
              <Ionicons name="mail-outline" size={20} color="#007AFF" />
              <Text style={styles.supportButtonText}>Email</Text>
            </TouchableOpacity>
          </View>
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
  kycCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  kycHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  kycLimit: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  kycRequirements: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
  },
  requirementItem: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 8,
    marginBottom: 2,
  },
  kycButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  kycButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
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
  methodCardDisabled: {
    opacity: 0.6,
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
    marginBottom: 4,
  },
  comingSoonBadge: {
    backgroundColor: '#ffaa0044',
    color: '#ffaa00',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffaa00',
    marginBottom: 4,
  },
  kycRequiredBadge: {
    backgroundColor: '#ff000044',
    color: '#ff0000',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff0000',
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
  feesCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  feesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#888',
  },
  feeValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
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
  supportSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});