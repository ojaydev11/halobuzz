import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useAgora } from '@/hooks/useAgora';
import { useAuth } from '@/store/AuthContext';
import { useStreams } from '@/hooks/useStreams';

export default function LiveScreen() {
  const [channelName, setChannelName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const { user } = useAuth();
  const { createStream } = useStreams();
  
  const {
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleCamera,
    isJoined: agoraJoined,
    isMuted: agoraMuted,
    isCameraOn: agoraCameraOn,
  } = useAgora();

  useEffect(() => {
    setIsJoined(agoraJoined);
    setIsMuted(agoraMuted);
    setIsCameraOn(agoraCameraOn);
  }, [agoraJoined, agoraMuted, agoraCameraOn]);

  const handleJoinChannel = async () => {
    if (!channelName.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    try {
      if (isHost) {
        // Create a new stream
        const stream = await createStream({
          title: `Live Stream - ${channelName}`,
          description: 'Live stream from mobile app',
          category: 'entertainment',
          isAudioOnly: false,
          isPrivate: false,
        });
        
        if (stream?.agoraChannel) {
          await joinChannel(stream.agoraChannel, stream.agoraToken);
        }
      } else {
        // Join existing channel
        await joinChannel(channelName);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to join channel');
      console.error('Join channel error:', error);
    }
  };

  const handleLeaveChannel = async () => {
    try {
      await leaveChannel();
    } catch (error) {
      Alert.alert('Error', 'Failed to leave channel');
      console.error('Leave channel error:', error);
    }
  };

  const handleToggleMute = async () => {
    try {
      await toggleMute();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle mute');
      console.error('Toggle mute error:', error);
    }
  };

  const handleToggleCamera = async () => {
    try {
      await toggleCamera();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle camera');
      console.error('Toggle camera error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Streaming</Text>
        <Text style={styles.subtitle}>
          {isHost ? 'Start your stream' : 'Join a live stream'}
        </Text>
      </View>

      {!isJoined ? (
        <View style={styles.joinSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Channel Name</Text>
            <TextInput
              style={styles.input}
              value={channelName}
              onChangeText={setChannelName}
              placeholder="Enter channel name"
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, isHost && styles.modeButtonActive]}
              onPress={() => setIsHost(true)}
            >
              <Text style={[styles.modeText, isHost && styles.modeTextActive]}>
                Host Stream
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, !isHost && styles.modeButtonActive]}
              onPress={() => setIsHost(false)}
            >
              <Text style={[styles.modeText, !isHost && styles.modeTextActive]}>
                Join Stream
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinChannel}
          >
            <Text style={styles.joinButtonText}>
              {isHost ? 'Start Stream' : 'Join Channel'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.streamSection}>
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlaceholder}>
              {isCameraOn ? 'Video Stream' : 'Camera Off'}
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}
            >
              <Text style={styles.controlButtonText}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, !isCameraOn && styles.controlButtonActive]}
              onPress={handleToggleCamera}
            >
              <Text style={styles.controlButtonText}>
                {isCameraOn ? 'Camera Off' : 'Camera On'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.leaveButton]}
              onPress={handleLeaveChannel}
            >
              <Text style={styles.controlButtonText}>Leave</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.streamInfo}>
            <Text style={styles.channelText}>Channel: {channelName}</Text>
            <Text style={styles.userText}>User: {user?.username}</Text>
          </View>
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  joinSection: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  modeTextActive: {
    color: '#fff',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  streamSection: {
    flex: 1,
    padding: 20,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  videoPlaceholder: {
    fontSize: 18,
    color: '#888',
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  controlButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  controlButtonActive: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  leaveButton: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  streamInfo: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  channelText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  userText: {
    fontSize: 14,
    color: '#888',
  },
});
