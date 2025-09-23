import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '@/lib/api';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (token) {
      handleVerifyEmail();
    }
  }, [token]);

  const handleVerifyEmail = async () => {
    if (!token) {
      Alert.alert('Error', 'Invalid verification token');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.verifyEmail(token);
      
      if (response.success) {
        setVerified(true);
        Alert.alert(
          'Email Verified',
          'Your email has been successfully verified! You can now access all features.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        'This verification link is invalid or has expired. Please request a new verification email.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login')
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = () => {
    Alert.alert(
      'Resend Verification',
      'Please log in to your account and check your email for a new verification link.',
      [
        {
          text: 'OK',
          onPress: () => router.replace('/login')
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#ff6b35" />
            <Text style={styles.title}>Verifying Email...</Text>
            <Text style={styles.subtitle}>Please wait while we verify your email address.</Text>
          </>
        ) : verified ? (
          <>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.subtitle}>
              Your email has been successfully verified. You can now access all features of HaloBuzz.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Email Verification</Text>
            <Text style={styles.subtitle}>
              We're verifying your email address. This may take a moment.
            </Text>
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleResendVerification}
            >
              <Text style={styles.buttonText}>Resend Verification Email</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 60,
    color: '#4CAF50',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
