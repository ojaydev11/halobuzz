import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { 
  RtcLocalView, 
  RtcRemoteView,
  RtcEngine,
  ChannelProfile,
  ClientRole
} from 'react-native-agora';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { ChatPanel } from '../components/ChatPanel';
import { GiftPanel } from '../components/GiftPanel';
import { ViewerCount } from '../components/ViewerCount';
import { GiftAnimation } from '../components/GiftAnimation';
import { StreamControls } from '../components/StreamControls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiveRoomProps {
  streamId: string;
  isHost: boolean;
}

export const LiveRoomScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { streamId, isHost } = route.params as LiveRoomProps;
  
  const [engine, setEngine] = useState<RtcEngine | null>(null);
  const [joined, setJoined] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [showGifts, setShowGifts] = useState(false);
  const [currentGiftAnimation, setCurrentGiftAnimation] = useState<any>(null);
  const [streamInfo, setStreamInfo] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  
  const chatRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeStream();
    connectWebSocket();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeStream = async () => {
    try {
      // Initialize Agora engine
      const agoraEngine = await RtcEngine.create(process.env.AGORA_APP_ID!);
      await agoraEngine.enableVideo();
      await agoraEngine.setChannelProfile(ChannelProfile.LiveBroadcasting);
      
      setEngine(agoraEngine);

      // Set up event handlers
      agoraEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
        console.log('Joined channel:', channel);
        setJoined(true);
      });

      agoraEngine.addListener('UserJoined', (uid, elapsed) => {
        console.log('User joined:', uid);
      });

      agoraEngine.addListener('UserOffline', (uid, reason) => {
        console.log('User left:', uid);
      });

      agoraEngine.addListener('Error', (error) => {
        console.error('Agora error:', error);
        Alert.alert('Stream Error', 'Failed to connect to stream');
      });

      // Join stream
      if (isHost) {
        await startHostStream(agoraEngine);
      } else {
        await joinViewerStream(agoraEngine);
      }
    } catch (error) {
      console.error('Failed to initialize stream:', error);
      Alert.alert('Error', 'Failed to initialize stream');
    }
  };

  const startHostStream = async (agoraEngine: RtcEngine) => {
    try {
      // Start stream via API
      const response = await apiService.post('/api/v1/streams/start', {
        title: 'Live Stream',
        category: 'entertainment'
      });

      const { rtcToken, channelName, uid } = response.data.data;
      setStreamInfo(response.data.data);

      // Configure as broadcaster
      await agoraEngine.setClientRole(ClientRole.Broadcaster);
      await agoraEngine.joinChannel(rtcToken, channelName, null, uid);
    } catch (error) {
      console.error('Failed to start stream:', error);
      Alert.alert('Error', 'Failed to start stream');
    }
  };

  const joinViewerStream = async (agoraEngine: RtcEngine) => {
    try {
      // Join stream via API
      const response = await apiService.post('/api/v1/streams/join', {
        streamId
      });

      const { rtcToken, channelName, uid, streamInfo: info } = response.data.data;
      setStreamInfo(info);
      setViewerCount(info.currentViewers);

      // Configure as audience
      await agoraEngine.setClientRole(ClientRole.Audience);
      await agoraEngine.joinChannel(rtcToken, channelName, null, uid);
    } catch (error) {
      console.error('Failed to join stream:', error);
      Alert.alert('Error', 'Failed to join stream');
    }
  };

  const connectWebSocket = () => {
    // Connect to real-time updates
    socketService.connect();
    
    socketService.on('message', (message: any) => {
      setMessages(prev => [...prev.slice(-50), message]);
      chatRef.current?.scrollToEnd({ animated: true });
    });

    socketService.on('viewerUpdate', (count: number) => {
      setViewerCount(count);
    });

    socketService.on('gift', (gift: any) => {
      setCurrentGiftAnimation(gift);
      setTimeout(() => setCurrentGiftAnimation(null), 5000);
    });

    // Join stream room
    socketService.emit('joinStream', { streamId });
  };

  const cleanup = async () => {
    try {
      // Leave stream
      if (engine) {
        await engine.leaveChannel();
        await engine.destroy();
      }

      // Leave WebSocket room
      socketService.emit('leaveStream', { streamId });
      socketService.disconnect();

      // End stream if host
      if (isHost && streamInfo?.streamId) {
        await apiService.post('/api/v1/streams/end', {
          streamId: streamInfo.streamId
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const handleSendMessage = (text: string) => {
    socketService.emit('message', {
      streamId,
      text,
      type: 'text'
    });
  };

  const handleSendGift = async (gift: any) => {
    try {
      const response = await apiService.post('/api/v1/gifts/send', {
        streamId,
        giftId: gift._id,
        quantity: 1
      });

      if (response.data.success) {
        setShowGifts(false);
        // Gift animation will be triggered by WebSocket event
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send gift');
    }
  };

  const toggleMute = async () => {
    if (engine) {
      await engine.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (engine) {
      await engine.muteLocalVideoStream(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleEndStream = () => {
    Alert.alert(
      'End Stream',
      'Are you sure you want to end this stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End', 
          style: 'destructive',
          onPress: () => {
            cleanup();
            navigation.goBack();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.videoContainer}>
        {isHost ? (
          <RtcLocalView.SurfaceView 
            style={styles.video}
            channelId={streamInfo?.channelName}
          />
        ) : (
          streamInfo?.hostUid && (
            <RtcRemoteView.SurfaceView
              style={styles.video}
              channelId={streamInfo?.channelName}
              uid={streamInfo.hostUid}
            />
          )
        )}

        {/* Overlay UI */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <ViewerCount count={viewerCount} />
            
            {isHost && (
              <TouchableOpacity 
                onPress={handleEndStream}
                style={styles.endButton}
              >
                <Text style={styles.endButtonText}>END</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stream Info */}
          {streamInfo && (
            <View style={styles.streamInfo}>
              <Text style={styles.streamTitle}>{streamInfo.title}</Text>
              <View style={styles.streamMeta}>
                <Text style={styles.streamCategory}>{streamInfo.category}</Text>
                {streamInfo.isAudioOnly && (
                  <View style={styles.audioOnlyBadge}>
                    <Ionicons name="mic" size={12} color="#fff" />
                    <Text style={styles.audioOnlyText}>Audio</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Chat Panel */}
          <ChatPanel
            messages={messages}
            onSend={handleSendMessage}
            ref={chatRef}
          />

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {isHost ? (
              <StreamControls
                isMuted={isMuted}
                isVideoEnabled={isVideoEnabled}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                onSwitchCamera={() => engine?.switchCamera()}
              />
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.giftButton}
                  onPress={() => setShowGifts(true)}
                >
                  <Ionicons name="gift" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.shareButton}
                  onPress={() => {/* Share logic */}}
                >
                  <Ionicons name="share-social" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Gift Animation Overlay */}
        {currentGiftAnimation && (
          <GiftAnimation 
            gift={currentGiftAnimation}
            onComplete={() => setCurrentGiftAnimation(null)}
          />
        )}
      </View>

      {/* Gift Panel Modal */}
      {showGifts && (
        <GiftPanel
          onSelect={handleSendGift}
          onClose={() => setShowGifts(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  videoContainer: {
    flex: 1,
    position: 'relative'
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  endButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF3B30'
  },
  endButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  streamInfo: {
    position: 'absolute',
    top: 70,
    left: 15,
    right: 15
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  streamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  streamCategory: {
    color: '#fff',
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  audioOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4
  },
  audioOnlyText: {
    color: '#fff',
    fontSize: 12
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
    gap: 20
  },
  giftButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,107,107,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});