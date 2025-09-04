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

const AGORA_APP_ID = Constants.expoConfig?.extra?.agoraAppId || '';

export function useAgora() {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  
  const engineRef = useRef<RtcEngine | null>(null);
  const channelRef = useRef<string>('');

  useEffect(() => {
    initializeEngine();
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  const initializeEngine = async () => {
    try {
      const engine = await RtcEngine.create(AGORA_APP_ID);
      engineRef.current = engine;

      // Set up event listeners
      engine.addListener('onJoinChannelSuccess', (channel, uid, elapsed) => {
        console.log('Joined channel successfully:', channel, uid);
        setIsJoined(true);
        setConnectionState('connected');
      });

      engine.addListener('onLeaveChannel', (stats) => {
        console.log('Left channel:', stats);
        setIsJoined(false);
        setConnectionState('disconnected');
        setRemoteUsers([]);
      });

      engine.addListener('onUserJoined', (uid, elapsed) => {
        console.log('User joined:', uid);
        setRemoteUsers(prev => [...prev, uid]);
      });

      engine.addListener('onUserOffline', (uid, reason) => {
        console.log('User offline:', uid, reason);
        setRemoteUsers(prev => prev.filter(id => id !== uid));
      });

      engine.addListener('onError', (error) => {
        console.error('Agora error:', error);
        setConnectionState('error');
      });

      // Enable video
      await engine.enableVideo();
      
      // Set channel profile to live broadcasting
      await engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
      
      // Set client role to broadcaster by default
      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
    }
  };

  const joinChannel = async (channelName: string, token?: string) => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }

    try {
      channelRef.current = channelName;
      await engineRef.current.joinChannel(token || '', channelName, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (error) {
      console.error('Failed to join channel:', error);
      throw error;
    }
  };

  const leaveChannel = async () => {
    if (!engineRef.current) {
      return;
    }

    try {
      await engineRef.current.leaveChannel();
      channelRef.current = '';
    } catch (error) {
      console.error('Failed to leave channel:', error);
      throw error;
    }
  };

  const toggleMute = async () => {
    if (!engineRef.current) {
      return;
    }

    try {
      await engineRef.current.muteLocalAudio(!isMuted);
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      throw error;
    }
  };

  const toggleCamera = async () => {
    if (!engineRef.current) {
      return;
    }

    try {
      await engineRef.current.muteLocalVideo(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    } catch (error) {
      console.error('Failed to toggle camera:', error);
      throw error;
    }
  };

  const switchCamera = async () => {
    if (!engineRef.current) {
      return;
    }

    try {
      await engineRef.current.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  };

  return {
    isJoined,
    isMuted,
    isCameraOn,
    remoteUsers,
    connectionState,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleCamera,
    switchCamera,
  };
}
