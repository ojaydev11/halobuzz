import { useState, useEffect, useRef } from 'react';
import {
  RtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcConnection,
  RtcStats,
  RtcLocalView,
  RtcRemoteView,
  VideoSourceType,
  AudioProfileType,
  AudioScenarioType,
} from 'react-native-agora';
import Constants from 'expo-constants';
import { secureLogger } from '@/lib/security';
import { apiClient } from '@/lib/api';

const AGORA_APP_ID = Constants.expoConfig?.extra?.agoraAppId || '';

// Validate Agora App ID
if (!AGORA_APP_ID && !__DEV__) {
  throw new Error('Agora App ID is required for production builds');
}

interface AgoraError {
  code: number;
  message: string;
}

interface AgoraState {
  isJoined: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  remoteUsers: number[];
  connectionState: string;
  isInitialized: boolean;
  error: string | null;
}

export function useAgora() {
  const [state, setState] = useState<AgoraState>({
    isJoined: false,
    isMuted: false,
    isCameraOn: true,
    remoteUsers: [],
    connectionState: 'disconnected',
    isInitialized: false,
    error: null
  });
  
  const engineRef = useRef<RtcEngine | null>(null);
  const channelRef = useRef<string>('');
  const currentTokenRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  
  // Don't auto-initialize - wait for explicit permission
  // useEffect(() => {
  //   initializeEngine();
  //   return () => {
  //     if (engineRef.current) {
  //       engineRef.current.destroy();
  //     }
  //   };
  // }, []);
  
  const updateState = (updates: Partial<AgoraState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupEngine();
    };
  }, []);

  const initializeEngine = async (): Promise<void> => {
    if (engineRef.current || isInitializingRef.current) {
      secureLogger.log('Agora engine already initialized or initializing');
      return;
    }
    
    if (!AGORA_APP_ID) {
      const error = 'Agora App ID not configured';
      updateState({ error, connectionState: 'error' });
      throw new Error(error);
    }
    
    try {
      isInitializingRef.current = true;
      updateState({ error: null, connectionState: 'connecting' });
      
      secureLogger.log('Initializing Agora engine');
      const engine = await RtcEngine.create(AGORA_APP_ID);
      engineRef.current = engine;

      // Set up event listeners with error handling
      engine.addListener('onJoinChannelSuccess', (channel, uid, elapsed) => {
        secureLogger.log('Joined channel successfully', { channel, uid: uid.toString() });
        updateState({ 
          isJoined: true, 
          connectionState: 'connected',
          error: null 
        });
      });

      engine.addListener('onLeaveChannel', (stats) => {
        secureLogger.log('Left channel', { stats });
        updateState({
          isJoined: false,
          connectionState: 'disconnected',
          remoteUsers: []
        });
      });

      engine.addListener('onUserJoined', (uid, elapsed) => {
        secureLogger.log('User joined', { uid: uid.toString() });
        updateState({
          remoteUsers: [...state.remoteUsers, uid]
        });
      });

      engine.addListener('onUserOffline', (uid, reason) => {
        secureLogger.log('User offline', { uid: uid.toString(), reason });
        updateState({
          remoteUsers: state.remoteUsers.filter(id => id !== uid)
        });
      });

      engine.addListener('onError', (errorCode: number) => {
        const error = `Agora error: ${errorCode}`;
        secureLogger.error('Agora error', { errorCode });
        updateState({ 
          connectionState: 'error',
          error
        });
      });
      
      engine.addListener('onConnectionStateChanged', (state, reason) => {
        secureLogger.log('Connection state changed', { state, reason });
        updateState({ connectionState: state });
      });
      
      engine.addListener('onTokenPrivilegeWillExpire', (token) => {
        secureLogger.warn('Agora token will expire soon');
        // Refresh token
        refreshAgoraToken();
      });

      // Configure engine settings
      await engine.enableVideo();
      await engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      
      // Audio settings for better quality
      await engine.setAudioProfile(
        AudioProfileType.AudioProfileMusicHighQuality,
        AudioScenarioType.AudioScenarioChatRoom
      );
      
      updateState({ isInitialized: true });
      secureLogger.log('Agora engine initialized successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLogger.error('Failed to initialize Agora engine', error);
      updateState({ 
        error: errorMessage,
        connectionState: 'error',
        isInitialized: false 
      });
      throw error;
    } finally {
      isInitializingRef.current = false;
    }
  };
  
  const cleanupEngine = async (): Promise<void> => {
    try {
      if (state.isJoined) {
        await leaveChannel();
      }
      
      if (engineRef.current) {
        secureLogger.log('Destroying Agora engine');
        await engineRef.current.destroy();
        engineRef.current = null;
      }
      
      updateState({
        isJoined: false,
        isInitialized: false,
        connectionState: 'disconnected',
        remoteUsers: [],
        error: null
      });
    } catch (error) {
      secureLogger.error('Error cleaning up Agora engine', error);
    }
  };
  
  const refreshAgoraToken = async (): Promise<void> => {
    try {
      if (!channelRef.current) {
        return;
      }
      
      const response = await apiClient.getAgoraToken(channelRef.current);
      if (response.success && response.data.token) {
        currentTokenRef.current = response.data.token;
        await engineRef.current?.renewToken(response.data.token);
        secureLogger.log('Agora token refreshed successfully');
      }
    } catch (error) {
      secureLogger.error('Failed to refresh Agora token', error);
    }
  };

  const joinChannel = async (channelName: string, token?: string): Promise<void> => {
    try {
      // Initialize engine if not already done
      if (!state.isInitialized) {
        await initializeEngine();
      }
      
      if (!engineRef.current) {
        throw new Error('Agora engine not initialized');
      }
      
      if (!channelName.trim()) {
        throw new Error('Channel name is required');
      }
      
      // Get token from backend if not provided
      let rtcToken = token;
      if (!rtcToken) {
        secureLogger.log('Fetching Agora token from backend');
        const response = await apiClient.getAgoraToken(channelName);
        if (response.success && response.data.token) {
          rtcToken = response.data.token;
        } else {
          throw new Error('Failed to get Agora token from server');
        }
      }
      
      channelRef.current = channelName;
      currentTokenRef.current = rtcToken;
      
      secureLogger.log('Joining Agora channel', { channelName });
      updateState({ connectionState: 'connecting', error: null });
      
      await engineRef.current.joinChannel(rtcToken || '', channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join channel';
      secureLogger.error('Failed to join channel', error);
      updateState({ 
        error: errorMessage,
        connectionState: 'error'
      });
      throw error;
    }
  };

  const leaveChannel = async (): Promise<void> => {
    try {
      if (!engineRef.current) {
        secureLogger.warn('Attempted to leave channel but engine not initialized');
        return;
      }

      secureLogger.log('Leaving Agora channel');
      updateState({ connectionState: 'disconnecting' });
      
      await engineRef.current.leaveChannel();
      channelRef.current = '';
      currentTokenRef.current = null;
      
    } catch (error) {
      secureLogger.error('Failed to leave channel', error);
      throw error;
    }
  };

  const toggleMute = async (): Promise<void> => {
    try {
      if (!engineRef.current) {
        throw new Error('Agora engine not initialized');
      }

      const newMutedState = !state.isMuted;
      await engineRef.current.muteLocalAudio(newMutedState);
      updateState({ isMuted: newMutedState });
      
      secureLogger.log('Audio mute toggled', { muted: newMutedState });
    } catch (error) {
      secureLogger.error('Failed to toggle mute', error);
      throw error;
    }
  };

  const toggleCamera = async (): Promise<void> => {
    try {
      if (!engineRef.current) {
        throw new Error('Agora engine not initialized');
      }

      const newCameraState = !state.isCameraOn;
      await engineRef.current.muteLocalVideo(!newCameraState);
      updateState({ isCameraOn: newCameraState });
      
      secureLogger.log('Camera toggled', { cameraOn: newCameraState });
    } catch (error) {
      secureLogger.error('Failed to toggle camera', error);
      throw error;
    }
  };

  const switchCamera = async (): Promise<void> => {
    try {
      if (!engineRef.current) {
        throw new Error('Agora engine not initialized');
      }

      await engineRef.current.switchCamera();
      secureLogger.log('Camera switched');
    } catch (error) {
      secureLogger.error('Failed to switch camera', error);
      throw error;
    }
  };

  return {
    // State
    isJoined: state.isJoined,
    isMuted: state.isMuted,
    isCameraOn: state.isCameraOn,
    remoteUsers: state.remoteUsers,
    connectionState: state.connectionState,
    isInitialized: state.isInitialized,
    error: state.error,
    
    // Actions
    initializeEngine,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleCamera,
    switchCamera,
    cleanupEngine,
  };
}
