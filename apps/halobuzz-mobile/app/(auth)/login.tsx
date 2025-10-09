import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/AuthContext';

export default function LoginScreen() {
  const { isAuthenticated, login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setIsLoggingIn(true);
      await login(email, password);
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your credentials and try again');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login('demo@halobuzz.com', 'demo123');
    } catch (error) {
      Alert.alert('Demo Login Failed', 'Please try again');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎮 HaloBuzz</Text>
        <Text style={styles.subtitle}>Live Streaming & Gaming Platform</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8B949E"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8B949E"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={[styles.loginButton, isLoggingIn && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.demoButton, isLoggingIn && styles.disabledButton]} 
            onPress={handleDemoLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.demoButtonText}>Demo Login</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>✅ Live Backend Connected:</Text>
          <Text style={styles.infoText}>https://halo-api-production.up.railway.app</Text>
          <Text style={styles.infoText}>MongoDB Atlas (Production)</Text>
          <Text style={styles.infoText}>WiFi: Preserved (LAN mode)</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B949E',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: '#FFFFFF',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  demoButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 15,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00FF00',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
});