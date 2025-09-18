import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  BackHandler,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import { useStreams } from '@/hooks/useStreams';
import StreamPlayer from '@/components/StreamPlayer';
import StreamChat from '@/components/StreamChat';
import SocialFeatures from '@/components/SocialFeatures';
import { Stream } from '@/types/stream';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function StreamViewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getStreamById, likeStream, followUser } = useStreams();
  
  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showSocialFeatures, setShowSocialFeatures] = useState(true);

  useEffect(() => {
    loadStream();
    
    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [id]);

  const loadStream = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const stream = await getStreamById(id as string);
      if (stream) {
        setStream(stream);
      } else {
        setError('Failed to load stream');
      }
    } catch (err) {
      console.error('Stream load error:', err);
      setError('Failed to load stream');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      return true;
    }
    return false;
  };

  const handleClose = () => {
    router.back();
  };

  const handleLike = async (streamId: string) => {
    try {
      const success = await likeStream(streamId);
      if (success) {
        // Update local stream data
        setStream(prev => prev ? {
          ...prev,
          totalLikes: (prev.totalLikes || 0) + 1,
        } : null);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const success = await followUser(userId);
      if (success) {
        // Update local stream data
        setStream(prev => prev ? {
          ...prev,
          host: {
            ...prev.host,
            followers: (prev.host.followers || 0) + 1,
          },
        } : null);
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  const handleShare = (streamData: any) => {
    // Implement sharing logic
    Alert.alert('Share', `Sharing ${streamData.title}`);
  };

  const handleGift = (streamId: string) => {
    // Implement gift sending logic
    Alert.alert('Gift', `Sending gift to stream ${streamId}`);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const toggleSocialFeatures = () => {
    setShowSocialFeatures(!showSocialFeatures);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !stream) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Stream not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#000" 
        hidden={isFullscreen}
      />
      
      {/* Stream Player */}
      <StreamPlayer
        stream={stream}
        onClose={handleClose}
        onLike={handleLike}
        onShare={handleShare}
        onFollow={handleFollow}
        onGift={handleGift}
        isFullscreen={isFullscreen}
        autoPlay={true}
      />

      {/* Chat Component */}
      <StreamChat
        streamId={stream.id}
        hostId={stream.host.id}
        onGift={handleGift}
        onFollow={handleFollow}
        isVisible={showChat}
        onToggleVisibility={toggleChat}
      />

      {/* Social Features */}
      {showSocialFeatures && !isFullscreen && (
        <SocialFeatures
          streamId={stream.id}
          hostId={stream.host.id}
          hostUsername={stream.host.username}
          currentLikes={stream.totalLikes || 0}
          currentFollowers={stream.host.followers || 0}
          onLike={handleLike}
          onFollow={handleFollow}
          onShare={handleShare}
          onGift={handleGift}
        />
      )}

      {/* Stream Info Overlay */}
      {!isFullscreen && (
        <View style={styles.streamInfoOverlay}>
          <View style={styles.streamTitleContainer}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              {stream.title}
            </Text>
            <Text style={styles.hostName}>@{stream.host.username}</Text>
          </View>
          
          <View style={styles.streamStats}>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>👁️</Text>
              <Text style={styles.statText}>{stream.currentViewers}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statText}>{stream.totalLikes}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statIcon}>💎</Text>
              <Text style={styles.statText}>{stream.totalCoins}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Control Buttons */}
      {!isFullscreen && (
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleFullscreen}
          >
            <Text style={styles.controlButtonText}>⛶</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleChat}
          >
            <Text style={styles.controlButtonText}>💬</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleSocialFeatures}
          >
            <Text style={styles.controlButtonText}>👥</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 16,
    textAlign: 'center',
  },
  streamInfoOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
  },
  streamTitleContainer: {
    marginBottom: 12,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hostName: {
    color: '#ccc',
    fontSize: 14,
  },
  streamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controlButtons: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 20,
  },
});
