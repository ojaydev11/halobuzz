import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { NativeBaseProvider, extendTheme } from 'native-base';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

// Navigation
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import MainTabNavigator from './src/navigation/MainTabNavigator';

// Services
import { initializeSocket } from './src/services/socketService';
import { initializePushNotifications } from './src/services/notificationService';
import { checkFeatureFlags } from './src/services/featureFlagService';

// Store
import { useAppSelector } from './src/store/hooks';
import { selectIsAuthenticated, selectOnboardingComplete } from './src/store/slices/authSlice';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Custom theme
const theme = extendTheme({
  colors: {
    primary: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      500: '#2196F3',
      600: '#1E88E5',
      700: '#1976D2',
      900: '#0D47A1',
    },
    secondary: {
      50: '#F3E5F5',
      100: '#E1BEE7',
      500: '#9C27B0',
      600: '#8E24AA',
      700: '#7B1FA2',
      900: '#4A148C',
    },
    accent: {
      50: '#FFF3E0',
      100: '#FFE0B2',
      500: '#FF9800',
      600: '#FB8C00',
      700: '#F57C00',
      900: '#E65100',
    },
    background: {
      primary: '#000000',
      secondary: '#1A1A1A',
      tertiary: '#2A2A2A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
      tertiary: '#808080',
    },
  },
  config: {
    initialColorMode: 'dark',
  },
});

function AppContent() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const onboardingComplete = useAppSelector(selectOnboardingComplete);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          ...Ionicons.font,
        });

        // Initialize services
        await initializeSocket();
        await initializePushNotifications();
        await checkFeatureFlags();

        // Preload assets
        // await Asset.loadAsync([require('./assets/logo.png')]);
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <NavigationContainer>
      {!onboardingComplete ? (
        <OnboardingNavigator />
      ) : !isAuthenticated ? (
        <OnboardingNavigator />
      ) : (
        <MainTabNavigator />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NativeBaseProvider theme={theme}>
          <SafeAreaProvider>
            <AppContent />
            <StatusBar style="light" />
          </SafeAreaProvider>
        </NativeBaseProvider>
      </PersistGate>
    </Provider>
  );
}
