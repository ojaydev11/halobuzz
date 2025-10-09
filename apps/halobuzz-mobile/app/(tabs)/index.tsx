import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function DiscoverScreen() {
  const [activeTab, setActiveTab] = useState('forYou');
  const [reels, setReels] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);

  // Mock data for reels
  const mockReels = [
    {
      id: '1',
      title: 'Epic Gaming Moment',
      creator: 'GamerPro',
      views: '2.1M',
      likes: '45K',
      thumbnail: 'https://picsum.photos/300/400?random=1',
      duration: '0:15'
    },
    {
      id: '2',
      title: 'Amazing Trick Shot',
      creator: 'TrickMaster',
      views: '1.8M',
      likes: '32K',
      thumbnail: 'https://picsum.photos/300/400?random=2',
      duration: '0:12'
    },
    {
      id: '3',
      title: 'Funny Gaming Fails',
      creator: 'ComedyGamer',
      views: '3.2M',
      likes: '67K',
      thumbnail: 'https://picsum.photos/300/400?random=3',
      duration: '0:20'
    },
    {
      id: '4',
      title: 'Pro Gaming Tips',
      creator: 'ProGamer',
      views: '1.5M',
      likes: '28K',
      thumbnail: 'https://picsum.photos/300/400?random=4',
      duration: '0:18'
    }
  ];

  // Mock data for live streams
  const mockLiveStreams = [
    {
      id: '1',
      title: 'Fortnite Tournament Live',
      streamer: 'TournamentKing',
      viewers: '12.5K',
      thumbnail: 'https://picsum.photos/300/200?random=5',
      category: 'Gaming',
      isLive: true
    },
    {
      id: '2',
      title: 'Minecraft Building Session',
      streamer: 'BuilderPro',
      viewers: '8.2K',
      thumbnail: 'https://picsum.photos/300/200?random=6',
      category: 'Gaming',
      isLive: true
    },
    {
      id: '3',
      title: 'Chat & Game with Viewers',
      streamer: 'InteractiveGamer',
      viewers: '15.3K',
      thumbnail: 'https://picsum.photos/300/200?random=7',
      category: 'Gaming',
      isLive: true
    },
    {
      id: '4',
      title: 'Speedrun Challenge',
      streamer: 'SpeedRunner',
      viewers: '6.7K',
      thumbnail: 'https://picsum.photos/300/200?random=8',
      category: 'Gaming',
      isLive: true
    }
  ];

  useEffect(() => {
    setReels(mockReels);
    setLiveStreams(mockLiveStreams);
  }, []);

  const renderReel = ({ item }) => (
    <View style={styles.reelCard}>
      <Image source={{ uri: item.thumbnail }} style={styles.reelThumbnail} />
      <View style={styles.reelOverlay}>
        <View style={styles.reelInfo}>
          <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.reelCreator}>@{item.creator}</Text>
          <View style={styles.reelStats}>
            <Text style={styles.reelStat}>{item.views} views</Text>
            <Text style={styles.reelStat}>•</Text>
            <Text style={styles.reelStat}>{item.likes} likes</Text>
          </View>
        </View>
        <View style={styles.reelDuration}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
    </View>
  );

  const renderLiveStream = ({ item }) => (
    <View style={styles.liveCard}>
      <Image source={{ uri: item.thumbnail }} style={styles.liveThumbnail} />
      <View style={styles.liveOverlay}>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={styles.viewerCount}>
          <Ionicons name="eye" size={12} color="#FFFFFF" />
          <Text style={styles.viewerText}>{item.viewers}</Text>
        </View>
      </View>
      <View style={styles.liveInfo}>
        <Text style={styles.liveTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.liveStreamer}>@{item.streamer}</Text>
        <Text style={styles.liveCategory}>{item.category}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
            onPress={() => setActiveTab('forYou')}
          >
            <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'live' && styles.activeTab]}
            onPress={() => setActiveTab('live')}
          >
            <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>Live</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'forYou' ? (
          <View style={styles.reelsSection}>
            <Text style={styles.sectionTitle}>Trending Reels</Text>
            <FlatList
              data={reels}
              renderItem={renderReel}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reelsList}
            />
            
            <Text style={styles.sectionTitle}>Live Streams</Text>
            <FlatList
              data={liveStreams}
              renderItem={renderLiveStream}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.liveRow}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : (
          <View style={styles.liveSection}>
            <Text style={styles.sectionTitle}>Live Now</Text>
            <FlatList
              data={liveStreams}
              renderItem={renderLiveStream}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.liveRow}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reelsSection: {
    paddingTop: 20,
  },
  liveSection: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  reelsList: {
    paddingRight: 20,
  },
  reelCard: {
    width: 200,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  reelThumbnail: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  reelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  reelInfo: {
    flex: 1,
  },
  reelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reelCreator: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  reelStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reelStat: {
    fontSize: 11,
    color: '#8B949E',
    marginRight: 8,
  },
  reelDuration: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  liveRow: {
    justifyContent: 'space-between',
  },
  liveCard: {
    width: (width - 60) / 2,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  liveThumbnail: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  liveOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewerText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  liveInfo: {
    padding: 12,
  },
  liveTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  liveStreamer: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 2,
  },
  liveCategory: {
    fontSize: 11,
    color: '#8B949E',
  },
});