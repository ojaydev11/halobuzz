import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width, height } = Dimensions.get('window');

interface CallParticipant {
  _id: string;
  username: string;
  avatar: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isCurrentUser: boolean;
}

interface VideoCall {
  _id: string;
  participants: CallParticipant[];
  status: 'connecting' | 'active' | 'ended';
  duration: number;
  isGroupCall: boolean;
}

const VideoCallScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [call, setCall] = useState<VideoCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    initializeCall();
    
    // Start call timer
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const initializeCall = async () => {
    try {
      // Simulate loading call
      setTimeout(() => {
        setCall({
          _id: 'call_1',
          participants: [
            {
              _id: user?.id || 'user1',
              username: user?.username || 'You',
              avatar: '',
              isMuted: false,
              isVideoOn: true,
              isCurrentUser: true
            },
            {
              _id: 'user2',
              username: 'ProGamer_X',
              avatar: '',
              isMuted: false,
              isVideoOn: true,
              isCurrentUser: false
            },
            {
              _id: 'user3',
              username: 'ChessMaster',
              avatar: '',
              isMuted: true,
              isVideoOn: false,
              isCurrentUser: false
            }
          ],
          status: 'active',
          duration: 0,
          isGroupCall: true
        });
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to initialize call:', error);
      setLoading(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Update participant state
    if (call) {
      setCall(prev => prev ? {
        ...prev,
        participants: prev.participants.map(p => 
          p.isCurrentUser ? { ...p, isMuted: !isMuted } : p
        )
      } : null);
    }
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // Update participant state
    if (call) {
      setCall(prev => prev ? {
        ...prev,
        participants: prev.participants.map(p => 
          p.isCurrentUser ? { ...p, isVideoOn: !isVideoOn } : p
        )
      } : null);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const endCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end the call?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: () => {
          setCall(prev => prev ? { ...prev, status: 'ended' } : null);
          navigation.goBack();
        }}
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderParticipantVideo = (participant: CallParticipant, index: number) => {
    const isMainView = index === 0;
    
    return (
      <View key={participant._id} style={[
        styles.participantVideo,
        isMainView ? styles.mainVideo : styles.sideVideo
      ]}>
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.videoPlaceholder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {participant.isVideoOn ? (
            <View style={styles.videoContent}>
              <Text style={styles.videoText}>Video Feed</Text>
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {participant.username[0].toUpperCase()}
              </Text>
            </View>
          )}
          
          <View style={styles.participantOverlay}>
            <Text style={styles.participantName}>{participant.username}</Text>
            {participant.isMuted && (
              <View style={styles.mutedIndicator}>
                <Ionicons name="mic-off" size={12} color="#F44336" />
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderCallControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons 
            name={isMuted ? "mic-off" : "mic"} 
            size={24} 
            color={isMuted ? "#F44336" : "#FFFFFF"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Ionicons 
            name={isVideoOn ? "videocam" : "videocam-off"} 
            size={24} 
            color={!isVideoOn ? "#F44336" : "#FFFFFF"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          <Ionicons 
            name={isSpeakerOn ? "volume-high" : "volume-low"} 
            size={24} 
            color={isSpeakerOn ? "#4CAF50" : "#FFFFFF"} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Ionicons name="call" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCallInfo = () => (
    <View style={styles.callInfo}>
      <Text style={styles.callDuration}>{formatDuration(duration)}</Text>
      <Text style={styles.callStatus}>
        {call?.isGroupCall ? 'Group Call' : '1-on-1 Call'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667EEA" />
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!call || call.status === 'ended') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Call Ended</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Call</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderCallInfo()}

      <View style={styles.videoContainer}>
        {call.participants.map((participant, index) => 
          renderParticipantVideo(participant, index)
        )}
      </View>

      {renderCallControls()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#8B949E',
    marginTop: 10
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#667EEA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  headerSpacer: {
    width: 24
  },
  callInfo: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  callDuration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  callStatus: {
    fontSize: 12,
    color: '#8B949E'
  },
  videoContainer: {
    flex: 1,
    padding: 10
  },
  participantVideo: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10
  },
  mainVideo: {
    height: height * 0.4
  },
  sideVideo: {
    height: height * 0.15,
    flexDirection: 'row'
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  videoContent: {
    alignItems: 'center'
  },
  videoText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  participantOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  participantName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  mutedIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 12
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: '#1A1F29',
    borderTopWidth: 1,
    borderTopColor: '#2A3441'
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center'
  },
  controlButtonActive: {
    backgroundColor: '#F44336'
  },
  endCallButton: {
    backgroundColor: '#F44336',
    width: 60,
    height: 60,
    borderRadius: 30
  }
});

export default VideoCallScreen;