import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/src/lib/api';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [round, setRound] = useState<any | null>(null);
  const [bet, setBet] = useState('10');
  const [choice, setChoice] = useState<any>('heads');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    let timer: any;
    (async () => {
      await refresh();
      timer = setInterval(refresh, 1000);
    })();
    return () => clearInterval(timer);
  }, [id]);

  async function refresh() {
    try {
      setLoading(true);
      const data = await apiClient.getGlobalGameRound(String(id));
      setRound(data);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      const payload = { userId: 'me', betAmount: Number(bet), choice };
      const res = await apiClient.playGlobalGame(String(id), payload);
      setResult(res);
      await refresh();
    } catch (e) {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !round) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{id}</Text>
      <Text style={{ color: '#aaa', marginTop: 6 }}>Bucket: {round.bucketStart}</Text>
      <Text style={{ color: '#aaa' }}>Commit (seedHash): {round.seedHash}</Text>
      {round.seed && <Text style={{ color: '#aaa' }}>Reveal (seed): {round.seed}</Text>}
      {round.outcome && <Text style={{ color: '#aaa' }}>Outcome: {JSON.stringify(round.outcome)}</Text>}

      <View style={{ height: 16 }} />
      <Text style={{ color: '#fff' }}>Bet Amount</Text>
      <TextInput value={bet} onChangeText={setBet} keyboardType="numeric" style={{ color: '#fff', backgroundColor: '#111', padding: 12, borderRadius: 8, marginTop: 4 }} />

      {/* Minimal choice UI for coin/dice/card */}
      {String(id).includes('coin') && (
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {['heads','tails'].map(opt => (
            <Pressable key={opt} onPress={() => setChoice(opt)} style={{ padding: 12, marginRight: 8, backgroundColor: choice===opt?'#0a84ff':'#222', borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {String(id).includes('dice') && (
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          {['low','high'].map(opt => (
            <Pressable key={opt} onPress={() => setChoice(opt)} style={{ padding: 12, marginRight: 8, backgroundColor: choice===opt?'#0a84ff':'#222', borderRadius: 8 }}>
              <Text style={{ color: '#fff' }}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ height: 16 }} />
      <Pressable disabled={submitting} onPress={submit} style={{ backgroundColor: submitting ? '#444' : '#0a84ff', padding: 14, borderRadius: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Place Bet</Text>
      </Pressable>

      {result && (
        <Text style={{ color: '#aaa', marginTop: 12 }}>Submitted</Text>
      )}
    </ScrollView>
  );
}

