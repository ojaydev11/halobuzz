import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/store/AuthContextOptimized';
import { StyleSheet } from 'react-native';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useEffect, useRef } from 'react';
import { initAnalyticsLazy, initHeavySDKs, conditionallyLoadFeatures } from '@/services/lazyServices';

function AppContent() {
  const { isLoading } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      // Critical: defer all heavy initialization to idle time
      initAnalyticsLazy();
      initHeavySDKs();
      conditionallyLoadFeatures();
    }
  }, []);

  if (isLoading) {
    return <LoadingSpinner useShimmer />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});