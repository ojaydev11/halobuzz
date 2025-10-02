import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useAuth } from '@/store/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner text="Loading HaloBuzz..." useShimmer />;
  }

  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({});