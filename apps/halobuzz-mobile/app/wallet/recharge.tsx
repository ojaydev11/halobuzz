import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import analytics, { ANALYTICS_EVENTS } from '@/services/analytics';
import * as WebBrowser from 'expo-web-browser';

export default function WalletRecharge() {
  const router = useRouter();
  const [amount, setAmount] = useState('100');
  const [coins, setCoins] = useState('500');
  const [method, setMethod] = useState<'esewa'|'khalti'|'stripe'|'paypal'>('esewa');
  const [loading, setLoading] = useState(false);

  const startRecharge = async () => {
    try {
      setLoading(true);
      const res = await apiClient.post('/wallet/recharge', {
        amount: Number(amount),
        coins: Number(coins),
        paymentMethod: method,
      });
      const data = res.data || res.data?.data;
      analytics.track('wallet_recharge_initiated', { amount: Number(amount), coins: Number(coins), method });
      const url = data?.paymentUrl;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      }
      if (data?.clientSecret) {
        Alert.alert('Stripe', 'Client secret received; proceed with Stripe SDK');
        analytics.track('wallet_stripe_client_secret_received');
      }
      if (data?.approvalUrl) {
        await WebBrowser.openBrowserAsync(data.approvalUrl);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Recharge failed');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recharge</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Quick Amounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Quick Select</Text>
          <View style={styles.quickAmounts}>
            {[
              { amount: '100', coins: '500', popular: false },
              { amount: '500', coins: '2500', popular: true },
              { amount: '1000', coins: '5200', popular: false },
              { amount: '2000', coins: '10600', popular: false },
            ].map((option) => (
              <TouchableOpacity
                key={option.amount}
                style={[
                  styles.quickAmount,
                  amount === option.amount && styles.quickAmountActive,
                ]}
                onPress={() => {
                  setAmount(option.amount);
                  setCoins(option.coins);
                }}
              >
                {option.popular && <Text style={styles.popularBadge}>Popular</Text>}
                <Text style={styles.quickAmountText}>Rs.{option.amount}</Text>
                <Text style={styles.quickCoinsText}>{option.coins} coins</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Custom Amount</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount (NPR)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                setCoins((parseInt(text) * 5).toString()); // 1 NPR = 5 coins
              }}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Coins to receive</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={coins}
              editable={false}
              placeholder="Calculated coins"
              placeholderTextColor="#888"
            />
            <Text style={styles.conversionNote}>1 NPR = 5 coins (bonus included)</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.methods}>
            {[
              { id: 'esewa', name: 'eSewa', icon: '💰', fees: '2.5%' },
              { id: 'khalti', name: 'Khalti', icon: '📱', fees: '3.0%' },
              { id: 'stripe', name: 'Card', icon: '💳', fees: '2.9%' },
              { id: 'paypal', name: 'PayPal', icon: '🌐', fees: '3.4%' },
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.method, method === m.id && styles.methodActive]}
                onPress={() => setMethod(m.id as any)}
              >
                <Text style={styles.methodIcon}>{m.icon}</Text>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{m.name}</Text>
                  <Text style={styles.methodFees}>Fees: {m.fees}</Text>
                </View>
                {method === m.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#00ff00" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>Rs.{amount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing fee:</Text>
            <Text style={styles.summaryValue}>
              Rs.{Math.round(parseInt(amount || '0') * 0.025)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total to pay:</Text>
            <Text style={styles.summaryValueBold}>
              Rs.{parseInt(amount || '0') + Math.round(parseInt(amount || '0') * 0.025)}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }]}>
            <Text style={styles.summaryLabel}>Coins to receive:</Text>
            <Text style={styles.summaryValueHighlight}>{coins} coins</Text>
          </View>
        </View>

        {/* Help Link */}
        <TouchableOpacity
          style={styles.helpLink}
          onPress={() => router.push('/wallet/deposit-guide')}
        >
          <Ionicons name="help-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.helpLinkText}>Need help with deposits?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={startRecharge}
          disabled={loading || !amount || parseInt(amount) < 100}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : 'Proceed to Pay'}
          </Text>
        </TouchableOpacity>
      </View>
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
    position: 'relative',
  },
  quickAmountActive: {
    borderColor: '#007AFF',
    backgroundColor: '#002244',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff0000',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  quickCoinsText: {
    fontSize: 12,
    color: '#007AFF',
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
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: '#0f0f0f',
  },
  conversionNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
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
  methodName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodFees: {
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
  summaryValueBold: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryValueHighlight: {
    fontSize: 16,
    color: '#00ff00',
    fontWeight: 'bold',
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
  buttonDisabled: { backgroundColor: '#335f9f' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

