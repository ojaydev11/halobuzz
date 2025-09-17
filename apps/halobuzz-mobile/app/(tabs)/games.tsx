import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '@/src/lib/api';

export default function GamesTab() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.listGlobalGames();
        setGames(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <FlatList
      data={games}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 12 }}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/game/[id]', params: { id: item.id } })} style={{ backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
          <Text style={{ color: '#aaa', marginTop: 4 }}>Time left: {item.timeLeftSec}s</Text>
          <Text style={{ color: '#aaa', marginTop: 2 }}>Bet: {item.minBet}–{item.maxBet}</Text>
        </Pressable>
      )}
    />
  );
}

