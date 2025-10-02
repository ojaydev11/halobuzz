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

interface StreamConfig {
  title: string;
  category: string;
  isPrivate: boolean;
  allowComments: boolean;
  quality: '720p' | '1080p';
}

const StreamingScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamConfig, setStreamConfig] = useState<StreamConfig>({
    title: '',
    category: 'gaming',
    isPrivate: false,
    allowComments: true,
    quality: '720p'
  });
  const [loading, setLoading] = useState(false);
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    // Simulate viewer count updates
    const interval = setInterval(() => {
      if (isStreaming) {
        setViewers(prev => prev + Math.floor(Math.random() * 3) - 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const startStream = async () => {
    if (!streamConfig.title.trim()) {
      Alert.alert('Error', 'Please enter a stream title');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/streams/start', streamConfig);
      
      if (response.data?.success) {
        setIsStreaming(true);
        setViewers(Math.floor(Math.random() * 10) + 1);
        Alert.alert('Stream Started!', 'Your stream is now live');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const stopStream = () => {
    Alert.alert(
      'Stop Stream',
      'Are you sure you want to stop streaming?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => {
          setIsStreaming(false);
          setViewers(0);
        }}
      ]
    );
  };

  const renderStreamControls = () => (
    <View style={styles.controlsContainer}>
      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Stream Title</Text>
        <TouchableOpacity style={styles.inputButton}>
          <Text style={styles.inputText}>
            {streamConfig.title || 'Enter stream title...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#8B949E" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Category</Text>
        <TouchableOpacity style={styles.inputButton}>
          <Text style={styles.inputText}>{streamConfig.category}</Text>
          <Ionicons name="chevron-down" size={16} color="#8B949E" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlRow}>
        <Text style={styles.controlLabel}>Quality</Text>
        <TouchableOpacity style={styles.inputButton}>
          <Text style={styles.inputText}>{streamConfig.quality}</Text>
          <Ionicons name="chevron-down" size={16} color="#8B949E" />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.controlLabel}>Private Stream</Text>
        <TouchableOpacity
          style={[
            styles.toggle,
            streamConfig.isPrivate && styles.toggleActive
          ]}
          onPress={() => setStreamConfig(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
        >
          <View style={[
            styles.toggleThumb,
            streamConfig.isPrivate && styles.toggleThumbActive
          ]} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.controlLabel}>Allow Comments</Text>
        <TouchableOpacity
          style={[
            styles.toggle,
            streamConfig.allowComments && styles.toggleActive
          ]}
          onPress={() => setStreamConfig(prev => ({ ...prev, allowComments: !prev.allowComments }))}
        >
          <View style={[
            styles.toggleThumb,
            streamConfig.allowComments && styles.toggleThumbActive
          ]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStreamingView = () => (
    <View style={styles.streamingContainer}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.streamPreview}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.streamOverlay}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          
          <View style={styles.viewerCount}>
            <Ionicons name="eye" size={16} color="#FFFFFF" />
            <Text style={styles.viewerText}>{viewers}</Text>
          </View>

          <View style={styles.streamInfo}>
            <Text style={styles.streamTitle}>{streamConfig.title}</Text>
            <Text style={styles.streamCategory}>{streamConfig.category}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.streamStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{viewers}</Text>
          <Text style={styles.statLabel}>Viewers</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>45m</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>720p</Text>
          <Text style={styles.statLabel}>Quality</Text>
        </View>
      </View>

      <View style={styles.streamActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="settings" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📺 Streaming</Text>
        <Text style={styles.subtitle}>
          {isStreaming ? 'Live Stream' : 'Start Streaming'}
        </Text>
      </View>

      {isStreaming ? renderStreamingView() : renderStreamControls()}

      <View style={styles.bottomActions}>
        {isStreaming ? (
          <TouchableOpacity
            style={[styles.primaryButton, styles.stopButton]}
            onPress={stopStream}
          >
            <Ionicons name="stop" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Stop Stream</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, styles.startButton]}
            onPress={startStream}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="videocam" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Start Stream</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2
  },
  controlsContainer: {
    padding: 20
  },
  controlRow: {
    marginBottom: 20
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1F29',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  inputText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    paddingHorizontal: 2
  },
  toggleActive: {
    backgroundColor: '#667EEA'
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start'
  },
  toggleThumbActive: {
    alignSelf: 'flex-end'
  },
  streamingContainer: {
    flex: 1,
    padding: 20
  },
  streamPreview: {
    height: height * 0.4,
    borderRadius: 15,
    marginBottom: 20,
    position: 'relative'
  },
  streamOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 15
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  viewerCount: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  viewerText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4
  },
  streamInfo: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  streamCategory: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)'
  },
  streamStats: {
    flexDirection: 'row',
    backgroundColor: '#1A1F29',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    color: '#8B949E'
  },
  streamActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  actionButton: {
    alignItems: 'center',
    padding: 10
  },
  actionText: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 4
  },
  bottomActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A3441'
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8
  },
  startButton: {
    backgroundColor: '#4CAF50'
  },
  stopButton: {
    backgroundColor: '#F44336'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

export default StreamingScreen;