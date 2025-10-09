// Expo Go Compatible Agora Hook
// This provides mock functionality for development/testing

import { useState, useEffect, useRef } from 'react';
import Constants from 'expo-constants';
import { secureLogger } from '@/lib/security';
import { apiClient } from '@/lib/api';

const AGORA_APP_ID = Constants.expoConfig?.extra?.agoraAppId || '';

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

// Mock Agora Engine for Expo Go compatibility
class MockAgoraEngine {
  private listeners: Map<string, Function[]> = new Map();
  
  addListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  removeListener(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
  
  async enableVideo() {
    secureLogger.log('Mock: enableVideo');
  }
  
  async setChannelProfile(profile: any) {
    secureLogger.log('Mock: setChannelProfile', profile);
  }
  
  async setClientRole(role: any) {
    secureLogger.log('Mock: setClientRole', role);
  }
  
  async setAudioProfile(profile: any, scenario: any) {
    secureLogger.log('Mock: setAudioProfile', profile, scenario);
  }
  
  async joinChannel(token: string, channel: string, uid: number, options: any) {
    secureLogger.log('Mock: joinChannel', { channel, uid });
    // Simulate successful join
    setTimeout(() => {
      const joinListeners = this.listeners.get('onJoinChannelSuccess');
      if (joinListeners) {
        joinListeners.forEach(callback => callback({ channelId: channel }, 1000));
      }
    }, 1000);
  }
  
  async leaveChannel() {
    secureLogger.log('Mock: leaveChannel');
    // Simulate successful leave
    setTimeout(() => {
      const leaveListeners = this.listeners.get('onLeaveChannel');
      if (leaveListeners) {
        leaveListeners.forEach(callback => callback({}));
      }
    }, 500);
  }
  
  async muteLocalAudioStream(muted: boolean) {
    secureLogger.log('Mock: muteLocalAudioStream', muted);
  }
  
  async muteLocalVideoStream(muted: boolean) {
    secureLogger.log('Mock: muteLocalVideoStream', muted);
  }
  
  async switchCamera() {
    secureLogger.log('Mock: switchCamera');
  }
  
  async renewToken(token: string) {
    secureLogger.log('Mock: renewToken');
  }
  
  release() {
    secureLogger.log('Mock: release');
    this.listeners.clear();
  }
}

// Mock create function
const createAgoraRtcEngine = () => new MockAgoraEngine();

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
  
  const engineRef = useRef<MockAgoraEngine | null>(null);
  const channelRef = useRef<string>('');
  const currentTokenRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  
  const updateState = (updates: Partial<AgoraState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    return () => {
      cleanupEngine();
    };
  }, []);

  const initializeEngine = async (): Promise<void> => {
    if (engineRef.current || isInitializingRef.current) {
      secureLogger.log('Mock Agora engine already initialized or initializing');
      return;
    }
    
    try {
      isInitializingRef.current = true;
      updateState({ error: null, connectionState: 'connecting' });
      
      secureLogger.log('Initializing Mock Agora engine for Expo Go');
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      // Set up event listeners
      engine.addListener('onJoinChannelSuccess', (connection: any, elapsed: number) => {
        secureLogger.log('Mock: Joined channel successfully', { connection: connection.channelId, elapsed });
        updateState({ 
          isJoined: true, 
          connectionState: 'connected',
          error: null 
        });
      });

      engine.addListener('onLeaveChannel', (stats: any) => {
        secureLogger.log('Mock: Left channel', { stats });
        updateState({
          isJoined: false,
          connectionState: 'disconnected',
          remoteUsers: []
        });
      });

      engine.addListener('onUserJoined', (uid: any, elapsed: any) => {
        secureLogger.log('Mock: User joined', { uid: uid.toString() });
        updateState({
          remoteUsers: [...state.remoteUsers, uid]
        });
      });

      engine.addListener('onUserOffline', (uid: any, reason: any) => {
        secureLogger.log('Mock: User offline', { uid: uid.toString(), reason });
        updateState({
          remoteUsers: state.remoteUsers.filter(id => id !== uid)
        });
      });

      engine.addListener('onError', (errorCode: number) => {
        const error = `Mock Agora error: ${errorCode}`;
        secureLogger.error('Mock Agora error', { errorCode });
        updateState({ 
          connectionState: 'error',
          error
        });
      });
      
      engine.addListener('onConnectionStateChanged', (state: any, reason: any) => {
        secureLogger.log('Mock: Connection state changed', { state, reason });
        updateState({ connectionState: state });
      });
      
      engine.addListener('onTokenPrivilegeWillExpire', (token: any) => {
        secureLogger.warn('Mock: Agora token will expire soon');
        refreshAgoraToken();
      });

      // Configure engine settings
      await engine.enableVideo();
      await engine.setChannelProfile(1); // LiveBroadcasting
      await engine.setClientRole(1); // Broadcaster
      
      updateState({ isInitialized: true });
      secureLogger.log('Mock Agora engine initialized successfully');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      secureLogger.error('Failed to initialize Mock Agora engine', error);
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
        secureLogger.log('Destroying Mock Agora engine');
        engineRef.current?.release();
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
      secureLogger.error('Error cleaning up Mock Agora engine', error);
    }
  };
  
  const refreshAgoraToken = async (): Promise<void> => {
    try {
      if (!channelRef.current) {
        return;
      }
      
      secureLogger.log('Mock: Refreshing Agora token');
      // Mock token refresh
      currentTokenRef.current = 'mock-token-' + Date.now();
    } catch (error) {
      secureLogger.error('Failed to refresh Mock Agora token', error);
    }
  };

  const joinChannel = async (channelName: string, token?: string): Promise<void> => {
    try {
      if (!state.isInitialized) {
        await initializeEngine();
      }
      
      if (!engineRef.current) {
        throw new Error('Mock Agora engine not initialized');
      }
      
      if (!channelName.trim()) {
        throw new Error('Channel name is required');
      }
      
      channelRef.current = channelName;
      currentTokenRef.current = token || 'mock-token';
      
      secureLogger.log('Mock: Joining Agora channel', { channelName });
      updateState({ connectionState: 'connecting', error: null });
      
      await engineRef.current.joinChannel(currentTokenRef.current, channelName, 0, {
        clientRoleType: 1, // Broadcaster
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

      secureLogger.log('Mock: Leaving Agora channel');
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
        throw new Error('Mock Agora engine not initialized');
      }

      const newMutedState = !state.isMuted;
      engineRef.current?.muteLocalAudioStream(newMutedState);
      updateState({ isMuted: newMutedState });
      
      secureLogger.log('Mock: Audio mute toggled', { muted: newMutedState });
    } catch (error) {
      secureLogger.error('Failed to toggle mute', error);
      throw error;
    }
  };

  const toggleCamera = async (): Promise<void> => {
    try {
      if (!engineRef.current) {
        throw new Error('Mock Agora engine not initialized');
      }

      const newCameraState = !state.isCameraOn;
      engineRef.current?.muteLocalVideoStream(!newCameraState);
      updateState({ isCameraOn: newCameraState });
      
      secureLogger.log('Mock: Camera toggled', { cameraOn: newCameraState });
    } catch (error) {
      secureLogger.error('Failed to toggle camera', error);
      throw error;
    }
  };

  const switchCamera = async (): Promise<void> => {
    try {
      if (!engineRef.current) {
        throw new Error('Mock Agora engine not initialized');
      }

      await engineRef.current.switchCamera();
      secureLogger.log('Mock: Camera switched');
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

// Export mock components for compatibility
export const RtcLocalView = ({ style, ...props }: any) => {
  secureLogger.log('Mock RtcLocalView rendered');
  return null; // Return null for Expo Go compatibility
};

export const RtcRemoteView = ({ style, ...props }: any) => {
  secureLogger.log('Mock RtcRemoteView rendered');
  return null; // Return null for Expo Go compatibility
};

export default useAgora;