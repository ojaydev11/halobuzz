import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Switch,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function LiveScreen() {
  const { user } = useAuth();
  const [channelName, setChannelName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamCategory, setStreamCategory] = useState('gaming');
  const [isPublic, setIsPublic] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('go-live');

  const categories = [
    { id: 'gaming', name: 'Gaming', icon: 'game-controller', color: '#FF6B6B' },
    { id: 'music', name: 'Music', icon: 'musical-notes', color: '#4ECDC4' },
    { id: 'art', name: 'Art', icon: 'brush', color: '#45B7D1' },
    { id: 'talk', name: 'Talk Show', icon: 'chatbubbles', color: '#96CEB4' },
    { id: 'education', name: 'Education', icon: 'school', color: '#FFEAA7' },
    { id: 'sports', name: 'Sports', icon: 'football', color: '#DDA0DD' },
  ];

  const mockLiveStreams = [
    {
      id: '1',
      title: 'Epic Gaming Session!',
      host: 'GamerPro',
      viewers: 1250,
      likes: 890,
      category: 'gaming',
      thumbnail: 'https://picsum.photos/300/200?random=1',
      isLive: true,
    },
    {
      id: '2',
      title: 'Music Production Live',
      host: 'MusicMaker',
      viewers: 450,
      likes: 320,
      category: 'music',
      thumbnail: 'https://picsum.photos/300/200?random=2',
      isLive: true,
    },
    {
      id: '3',
      title: 'Digital Art Creation',
      host: 'ArtistLife',
      viewers: 780,
      likes: 560,
      category: 'art',
      thumbnail: 'https://picsum.photos/300/200?random=3',
      isLive: true,
    },
  ];

  useEffect(() => {
    if (isConnected) {
      // Simulate viewer count updates
      const interval = setInterval(() => {
        setViewerCount(prev => prev + Math.floor(Math.random() * 5));
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const startStream = async () => {
    if (!streamTitle.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }
    
    setIsLoading(true);

    try {
      // Simulate stream start (since Agora doesn't work in Expo Go)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      setViewerCount(Math.floor(Math.random() * 50) + 10);
      Alert.alert('Success', 'Stream started successfully! (Demo Mode)');
    } catch (err: any) {
      console.error('Start stream failed:', err);
      Alert.alert('Error', err?.message || 'Failed to start stream');
    } finally {
      setIsLoading(false);
    }
  };

  const endStream = () => {
    Alert.alert(
      'End Stream',
      'Are you sure you want to end the stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', onPress: () => {
          setIsConnected(false);
          setViewerCount(0);
          setLikes(0);
          setComments(0);
        }}
      ]
    );
  };

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleCamera = () => setIsCameraOn(!isCameraOn);

  const renderGoLiveTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.setupContainer}>
        <View style={styles.quickStartCard}>
          <Text style={styles.cardTitle}>Quick Start</Text>
          <Text style={styles.cardSubtitle}>Start streaming in seconds</Text>
          
          <TouchableOpacity
            style={styles.quickStartButton}
            onPress={() => {
              const userName = user?.username || user?.displayName || 'User';
              setStreamTitle(`${userName}'s Stream`);
              startStream();
            }}
          >
            <Ionicons name="videocam" size={24} color="#fff" />
            <Text style={styles.quickStartText}>Go Live Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stream Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stream Title</Text>
            <TextInput
              style={styles.input}
              placeholder="What are you streaming about?"
              placeholderTextColor="#888"
              value={streamTitle}
              onChangeText={setStreamTitle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    streamCategory === category.id && styles.categoryButtonActive,
                    { backgroundColor: streamCategory === category.id ? category.color : '#1a1a1a' }
                  ]}
                  onPress={() => setStreamCategory(category.id)}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={20} 
                    color={streamCategory === category.id ? '#fff' : '#888'} 
                  />
                  <Text style={[
                    styles.categoryText,
                    streamCategory === category.id && styles.categoryTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Channel Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter channel name"
              placeholderTextColor="#888"
              value={channelName}
              onChangeText={setChannelName}
            />
          </View>

          <View style={styles.switchGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Public Stream</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#333', true: '#007AFF' }}
                thumbColor={isPublic ? '#fff' : '#888'}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.startButton, isLoading && styles.startButtonDisabled]}
          onPress={startStream}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="videocam" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Streaming</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderLiveStreamsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.streamsContainer}>
        <Text style={styles.sectionTitle}>Live Now</Text>
        {mockLiveStreams.map((stream) => (
          <TouchableOpacity key={stream.id} style={styles.streamCard}>
            <Image source={{ uri: stream.thumbnail }} style={styles.streamThumbnail} />
            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle} numberOfLines={1}>{stream.title}</Text>
              <Text style={styles.streamHost}>@{stream.host}</Text>
              <View style={styles.streamStats}>
                <View style={styles.statItem}>
                  <Ionicons name="eye" size={14} color="#888" />
                  <Text style={styles.statText}>{stream.viewers}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={14} color="#ff0000" />
                  <Text style={styles.statText}>{stream.likes}</Text>
                </View>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderStreamingTab = () => (
    <View style={styles.streamingContainer}>
      <View style={styles.videoContainer}>
        <Text style={styles.videoText}>
          {isCameraOn ? '📹 Live Video Feed' : '📹 Camera Off'}
        </Text>
        <Text style={styles.streamTitle}>{streamTitle}</Text>
        <Text style={styles.channelText}>Channel: {channelName || 'Default'}</Text>
        <Text style={styles.statusText}>🔴 LIVE (Demo Mode)</Text>
      </View>

      <View style={styles.streamStats}>
        <View style={styles.statCard}>
          <Ionicons name="eye" size={20} color="#fff" />
          <Text style={styles.statNumber}>{viewerCount}</Text>
          <Text style={styles.statLabel}>Viewers</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="heart" size={20} color="#ff0000" />
          <Text style={styles.statNumber}>{likes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="chatbubble" size={20} color="#007AFF" />
          <Text style={styles.statNumber}>{comments}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons 
            name={isMuted ? "mic-off" : "mic"} 
            size={24} 
            color={isMuted ? '#ff0000' : '#fff'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
          onPress={toggleCamera}
        >
          <Ionicons 
            name={isCameraOn ? "videocam" : "videocam-off"} 
            size={24} 
            color={!isCameraOn ? '#ff0000' : '#fff'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setLikes(prev => prev + 1)}
        >
          <Ionicons name="heart" size={24} color="#ff0000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setComments(prev => prev + 1)}
        >
          <Ionicons name="chatbubble" size={24} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endButton]}
          onPress={endStream}
        >
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Streaming</Text>
        <Text style={styles.subtitle}>Connect with your audience</Text>
      </View>

      {!isConnected ? (
        <>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'go-live' && styles.activeTab]}
              onPress={() => setActiveTab('go-live')}
            >
              <Ionicons 
                name="add-circle" 
                size={20} 
                color={activeTab === 'go-live' ? '#007AFF' : '#888'} 
              />
              <Text style={[styles.tabText, activeTab === 'go-live' && styles.activeTabText]}>
                Go Live
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'live-streams' && styles.activeTab]}
              onPress={() => setActiveTab('live-streams')}
            >
              <Ionicons 
                name="play-circle" 
                size={20} 
                color={activeTab === 'live-streams' ? '#007AFF' : '#888'} 
              />
              <Text style={[styles.tabText, activeTab === 'live-streams' && styles.activeTabText]}>
                Live Streams
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'go-live' ? renderGoLiveTab() : renderLiveStreamsTab()}
        </>
      ) : (
        renderStreamingTab()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  setupContainer: {
    flex: 1,
  },
  quickStartCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  quickStartButton: {
    backgroundColor: '#ff0000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickStartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryButtonActive: {
    // backgroundColor handled inline
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#fff',
  },
  switchGroup: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    color: '#fff',
    fontSize: 16,
  },
  startButton: {
    backgroundColor: '#ff0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  startButtonDisabled: {
    backgroundColor: '#666',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  streamsContainer: {
    flex: 1,
  },
  streamCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  streamThumbnail: {
    width: 120,
    height: 80,
  },
  streamInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  streamHost: {
    color: '#888',
    fontSize: 14,
  },
  streamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff0000',
    marginRight: 4,
  },
  liveText: {
    color: '#ff0000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streamingContainer: {
    flex: 1,
    padding: 20,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  videoText: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 12,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  channelText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  statusText: {
    color: '#ff0000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  streamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#ff0000',
  },
  endButton: {
    backgroundColor: '#ff0000',
  },
});