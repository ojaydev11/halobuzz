import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAgora } from '@/hooks/useAgora';
import { useAuth } from '@/store/AuthContext';
import { useStreams } from '@/hooks/useStreams';
import PermissionGate from '@/components/PermissionGate';
import { secureLogger } from '@/lib/security';

export default function LiveScreen() {
  const [channelName, setChannelName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const { user } = useAuth();
  const { createStream } = useStreams();
  
  const {
    isJoined,
    isMuted,
    isCameraOn,
    remoteUsers,
    connectionState,
    isInitialized,
    error,
    initializeEngine,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useAgora();

  const handleJoinChannel = async () => {
    if (!channelName.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    setIsLoading(true);
    try {
      if (isHost) {
        secureLogger.log('Creating new stream', { channelName });
        // Create a new stream
        const streamResponse = await createStream({
          title: `Live Stream - ${channelName}`,
          description: 'Live stream from mobile app',
          category: 'entertainment',
          isAudioOnly: false,
          isPrivate: false,
        });
        
        if (streamResponse?.data?.stream?.agoraChannel) {
          await joinChannel(
            streamResponse.data.stream.agoraChannel, 
            streamResponse.data.stream.agoraToken
          );
        } else {
          throw new Error('Failed to get stream details from server');
        }
      } else {
        secureLogger.log('Joining existing channel', { channelName });
        // Join existing channel - token will be fetched automatically
        await joinChannel(channelName);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join channel';
      Alert.alert('Error', errorMessage);
      secureLogger.error('Join channel error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveChannel = async () => {
    setIsLoading(true);
    try {
      await leaveChannel();
      secureLogger.log('Left channel successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to leave channel';
      Alert.alert('Error', errorMessage);
      secureLogger.error('Leave channel error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMute = async () => {
    try {
      await toggleMute();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle mute';
      Alert.alert('Error', errorMessage);
      secureLogger.error('Toggle mute error', error);
    }
  };

  const handleToggleCamera = async () => {
    try {
      await toggleCamera();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle camera';
      Alert.alert('Error', errorMessage);
      secureLogger.error('Toggle camera error', error);
    }
  };
  
  const handleSwitchCamera = async () => {
    try {
      await switchCamera();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch camera';
      Alert.alert('Error', errorMessage);
      secureLogger.error('Switch camera error', error);
    }
  };
  
  const handlePermissionGranted = () => {
    setHasPermissions(true);
    secureLogger.log('Live streaming permissions granted');
  };
  
  const handlePermissionDenied = () => {
    setHasPermissions(false);
    Alert.alert(
      'Permissions Required',
      'Camera and microphone access are required for live streaming.',
      [{ text: 'OK' }]
    );
  };
  
  if (!hasPermissions) {
    return (
      <PermissionGate
        requiredPermissions={['both']}
        onPermissionGranted={handlePermissionGranted}
        onPermissionDenied={handlePermissionDenied}
        showExplanation={true}
      >
        <View />
      </PermissionGate>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Streaming</Text>
        <Text style={styles.subtitle}>
          {isHost ? 'Start your stream' : 'Join a live stream'}
        </Text>
        
        {/* Connection Status */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusIndicator,
            connectionState === 'connected' ? styles.statusConnected :
            connectionState === 'connecting' ? styles.statusConnecting :
            connectionState === 'error' ? styles.statusError :
            styles.statusDisconnected
          ]} />
          <Text style={styles.statusText}>
            {connectionState === 'connected' ? 'Connected' :
             connectionState === 'connecting' ? 'Connecting...' :
             connectionState === 'error' ? 'Connection Error' :
             'Disconnected'}
          </Text>
        </View>
        
        {/* Error Display */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>

      {!isJoined ? (
        <View style={styles.joinSection}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Connecting...</Text>
            </View>
          )}
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
            style={[styles.joinButton, (isLoading || !isInitialized) && styles.joinButtonDisabled]}
            onPress={handleJoinChannel}
            disabled={isLoading || !isInitialized}
          >
            <Text style={styles.joinButtonText}>
              {isLoading ? 'Connecting...' :
               !isInitialized ? 'Initializing...' :
               isHost ? 'Start Stream' : 'Join Channel'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.streamSection}>
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlaceholder}>
              {isCameraOn ? 'Video Stream' : 'Camera Off'}
            </Text>
            
            {/* Remote Users Count */}
            {remoteUsers.length > 0 && (
              <View style={styles.remoteUsersInfo}>
                <Text style={styles.remoteUsersText}>
                  {remoteUsers.length} viewer{remoteUsers.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
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
              style={styles.controlButton}
              onPress={handleSwitchCamera}
            >
              <Text style={styles.controlButtonText}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.leaveButton]}
              onPress={handleLeaveChannel}
              disabled={isLoading}
            >
              <Text style={styles.controlButtonText}>
                {isLoading ? 'Leaving...' : 'Leave'}
              </Text>
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#00ff00',
  },
  statusConnecting: {
    backgroundColor: '#ffaa00',
  },
  statusError: {
    backgroundColor: '#ff0000',
  },
  statusDisconnected: {
    backgroundColor: '#888',
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 8,
  },
  joinSection: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 12,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
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
  joinButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6,
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
    position: 'relative',
  },
  remoteUsersInfo: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  remoteUsersText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
    flexWrap: 'wrap',
    gap: 8,
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
