import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { apiClient } from '@/lib/api';

interface ReelItemDto {
  id: string;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  viewUrl: string;
  createdAt: string;
  userId?: any;
  username?: string;
  avatar?: string;
}

export default function ReelsScreen() {
  const [loading, setLoading] = useState(true);
  const [reels, setReels] = useState<ReelItemDto[]>([]);

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reels?limit=20');
      const items = res.data?.reels || res.data?.data?.reels || [];
      setReels(items);
    } catch (e) {
      Alert.alert('Error', 'Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReelCard item={item} />}
      />
    </SafeAreaView>
  );
}

function ReelCard({ item }: { item: ReelItemDto }) {
  const player = useVideoPlayer(item.viewUrl, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <View style={styles.card}>
      <VideoView style={styles.video} player={player} />
      <View style={styles.overlay}>
        <View style={styles.headerRow}>
          <Image source={{ uri: item.avatar || `https://via.placeholder.com/40x40/007AFF/ffffff?text=${(item.username||'?').charAt(0).toUpperCase()}` }} style={styles.avatar} />                                                                                                                                 
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>@{item.username || 'creator'}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 16 },
  card: { width, height },
  video: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subtitle: { color: '#ccc', fontSize: 12 },
});