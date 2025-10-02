import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useOfflineMode } from '@/hooks/useOfflineMode';

interface NetworkStatusProps {
  showWhenOnline?: boolean;
}

export function NetworkStatus({ showWhenOnline = false }: NetworkStatusProps) {
  const { isOffline, connectionType } = useOfflineMode();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isOffline || showWhenOnline) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOffline, showWhenOnline, fadeAnim]);

  if (!isOffline && !showWhenOnline) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <View style={[
        styles.statusBar,
        isOffline ? styles.offline : styles.online
      ]}>
        <Text style={styles.text}>
          {isOffline 
            ? `📡 No internet connection (${connectionType || 'unknown'})`
            : `🌐 Connected (${connectionType || 'unknown'})`
          }
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  offline: {
    backgroundColor: '#FF6B6B',
  },
  online: {
    backgroundColor: '#4CAF50',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NetworkStatus;
