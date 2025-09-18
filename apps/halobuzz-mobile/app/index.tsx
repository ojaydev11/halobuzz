import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/store/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading HaloBuzz...</Text>
      </View>
    );
  }

  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
});
