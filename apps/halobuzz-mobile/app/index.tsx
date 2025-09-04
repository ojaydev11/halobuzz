import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // You can add a loading screen here
  }

  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
