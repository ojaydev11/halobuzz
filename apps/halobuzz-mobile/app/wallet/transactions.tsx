import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';

export default function WalletTransactions() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/wallet/transactions?limit=50');
        const data = res.data || res.data?.data;
        setItems(data?.transactions || []);
      } catch {
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color="#007AFF" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.desc}>{item.description}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: item.amount > 0 ? '#00ff00' : '#ff0000' }]}>
                  {item.amount > 0 ? '+' : ''}{item.amount}
                </Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', marginHorizontal: 20, marginVertical: 6, borderRadius: 12, padding: 16 },
  desc: { color: '#fff', fontSize: 16, marginBottom: 2 },
  date: { color: '#888', fontSize: 12 },
  amount: { fontWeight: 'bold', fontSize: 16 },
  status: { color: '#888', fontSize: 12, textTransform: 'capitalize' },
});

