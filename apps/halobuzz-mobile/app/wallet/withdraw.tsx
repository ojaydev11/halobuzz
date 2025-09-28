import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';

export default function WalletWithdraw() {
  const router = useRouter();
  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState<'bank'|'esewa'|'khalti'|'paypal'>('bank');

  const submit = async () => {
    try {
      const res = await apiClient.post('/wallet/withdraw', {
        amount: Number(amount),
        method,
        account: ''
      });
      if (res && (res.success || res.data?.success)) {
        Alert.alert('Submitted', 'Withdrawal request submitted.');
        router.back();
      } else {
        Alert.alert('Error', 'Failed to submit withdrawal request.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit withdrawal');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>
        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Available Balance</Text>
          <Text style={styles.balanceAmount}>12,500 coins</Text>
          <Text style={styles.balanceNote}>Withdrawable balance (bonus coins excluded)</Text>
        </View>

        {/* Quick Amounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💸 Quick Select</Text>
          <View style={styles.quickAmounts}>
            {[
              { coins: '1000', amount: '200' },
              { coins: '2500', amount: '500' },
              { coins: '5000', amount: '1000' },
              { coins: '10000', amount: '2000' },
            ].map((option) => (
              <TouchableOpacity
                key={option.coins}
                style={[
                  styles.quickAmount,
                  amount === option.amount && styles.quickAmountActive,
                ]}
                onPress={() => setAmount(option.amount)}
              >
                <Text style={styles.quickAmountText}>{option.coins} coins</Text>
                <Text style={styles.quickCoinsText}>Rs.{option.amount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Amount</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (coins)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter coins amount"
              placeholderTextColor="#888"
            />
            <Text style={styles.conversionNote}>
              You'll receive: Rs.{Math.floor(parseInt(amount || '0') * 0.2)} (5 coins = 1 NPR)
            </Text>
          </View>
        </View>

        {/* Withdrawal Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Withdrawal Method</Text>
          <View style={styles.methods}>
            {[
              { id: 'bank', name: 'Bank Transfer', icon: '🏦', fees: '2% (min Rs.25)', processing: '1-3 days', kyc: true },
              { id: 'esewa', name: 'eSewa', icon: '💰', fees: '3%', processing: '2-4 hours', kyc: false },
              { id: 'khalti', name: 'Khalti', icon: '📱', fees: '3.5%', processing: '2-4 hours', kyc: false },
              { id: 'paypal', name: 'PayPal', icon: '🌐', fees: '4% + $0.30', processing: '1-2 days', kyc: true },
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.method, method === m.id && styles.methodActive]}
                onPress={() => setMethod(m.id as any)}
              >
                <Text style={styles.methodIcon}>{m.icon}</Text>
                <View style={styles.methodInfo}>
                  <View style={styles.methodHeader}>
                    <Text style={styles.methodName}>{m.name}</Text>
                    {m.kyc && <Text style={styles.kycBadge}>KYC Required</Text>}
                  </View>
                  <Text style={styles.methodFees}>Fees: {m.fees}</Text>
                  <Text style={styles.methodProcessing}>Processing: {m.processing}</Text>
                </View>
                {method === m.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#00ff00" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Withdrawal Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Withdrawal Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>{amount} coins</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Conversion:</Text>
            <Text style={styles.summaryValue}>Rs.{Math.floor(parseInt(amount || '0') * 0.2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing fee:</Text>
            <Text style={styles.summaryValue}>
              Rs.{Math.round(Math.floor(parseInt(amount || '0') * 0.2) * 0.03)}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }]}>
            <Text style={styles.summaryLabel}>You'll receive:</Text>
            <Text style={styles.summaryValueHighlight}>
              Rs.{Math.floor(parseInt(amount || '0') * 0.2) - Math.round(Math.floor(parseInt(amount || '0') * 0.2) * 0.03)}
            </Text>
          </View>
        </View>

        {/* Important Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>⚠️ Important Notes</Text>
          <View style={styles.note}>
            <Ionicons name="time-outline" size={16} color="#ffaa00" />
            <Text style={styles.noteText}>Withdrawals are processed during business hours only</Text>
          </View>
          <View style={styles.note}>
            <Ionicons name="shield-outline" size={16} color="#007AFF" />
            <Text style={styles.noteText}>All withdrawals require manual security review</Text>
          </View>
          <View style={styles.note}>
            <Ionicons name="ban-outline" size={16} color="#ff0000" />
            <Text style={styles.noteText}>Bonus coins cannot be withdrawn</Text>
          </View>
        </View>

        {/* Help Link */}
        <TouchableOpacity
          style={styles.helpLink}
          onPress={() => router.push('/wallet/withdrawal-guide')}
        >
          <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.helpLinkText}>Need help with withdrawals?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!amount || parseInt(amount) < 500) && styles.buttonDisabled]}
          onPress={submit}
          disabled={!amount || parseInt(amount) < 500}
        >
          <Text style={styles.buttonText}>
            {(!amount || parseInt(amount) < 500) ? 'Minimum 500 coins required' : 'Submit Withdrawal Request'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  balanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  balanceTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff00',
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickAmount: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountActive: {
    borderColor: '#007AFF',
    backgroundColor: '#002244',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  quickCoinsText: {
    fontSize: 12,
    color: '#00ff00',
    fontWeight: '600',
  },
  inputGroup: { marginBottom: 16 },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  conversionNote: {
    fontSize: 12,
    color: '#00ff00',
    marginTop: 4,
    fontWeight: '500',
  },
  methods: { gap: 12 },
  method: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodActive: {
    backgroundColor: '#002244',
    borderColor: '#007AFF',
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  kycBadge: {
    backgroundColor: '#ff000044',
    color: '#ff0000',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  methodFees: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  methodProcessing: {
    color: '#888',
    fontSize: 12,
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#888',
  },
  summaryValue: {
    fontSize: 14,
    color: '#fff',
  },
  summaryValueHighlight: {
    fontSize: 16,
    color: '#00ff00',
    fontWeight: 'bold',
  },
  notesCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffaa00',
    marginBottom: 12,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    marginLeft: 8,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  helpLinkText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: { backgroundColor: '#555' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

