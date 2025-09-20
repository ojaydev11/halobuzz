import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
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
      const url = data?.paymentUrl;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      }
      if (data?.clientSecret) {
        Alert.alert('Stripe', 'Client secret received; proceed with Stripe SDK');
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
        <Text style={styles.label}>Amount (local currency)</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />

        <Text style={styles.label}>Coins</Text>
        <TextInput style={styles.input} value={coins} onChangeText={setCoins} keyboardType="numeric" />

        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.methods}>
          {(['esewa','khalti','stripe','paypal'] as const).map(m => (
            <TouchableOpacity key={m} style={[styles.method, method===m && styles.methodActive]} onPress={() => setMethod(m)}>
              <Text style={styles.methodText}>{m.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={startRecharge} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Processing...' : 'Proceed to Pay'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  label: { color: '#888', marginTop: 12, marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  methods: { flexDirection: 'row', gap: 8, marginTop: 8 },
  method: { backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  methodActive: { backgroundColor: '#007AFF' },
  methodText: { color: '#fff', fontWeight: '600' },
  button: { marginTop: 24, backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#335f9f' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

