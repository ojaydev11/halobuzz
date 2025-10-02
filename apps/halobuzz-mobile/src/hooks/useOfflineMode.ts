import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineModeState {
  isOffline: boolean;
  isOnline: boolean;
  connectionType: string | null;
}

export function useOfflineMode(): OfflineModeState {
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      setConnectionType(state.type);
      
      if (__DEV__) {
        console.log('🌐 Network status:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          isOffline: offline
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    connectionType
  };
}

export function createOfflineFallback<T>(
  onlineFunction: () => Promise<T>,
  offlineFunction: () => T,
  isOffline: boolean
): () => Promise<T> {
  return async () => {
    if (isOffline) {
      if (__DEV__) {
        console.log('🔄 Using offline fallback');
      }
      return offlineFunction();
    }
    
    try {
      return await onlineFunction();
    } catch (error) {
      if (__DEV__) {
        console.warn('🌐 Online function failed, falling back to offline mode', error);
      }
      return offlineFunction();
    }
  };
}

export const OFFLINE_MESSAGES = {
  NO_INTERNET: 'No internet connection. Some features may be limited.',
  SERVER_ERROR: 'Server is temporarily unavailable. Using offline mode.',
  TIMEOUT: 'Request timed out. Check your connection.',
  CONNECTION_REFUSED: 'Cannot connect to server. Please check if backend is running.'
};

export default useOfflineMode;
