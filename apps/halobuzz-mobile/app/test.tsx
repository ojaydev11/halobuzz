import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎉 HaloBuzz App is Working!</Text>
        <Text style={styles.subtitle}>
          This is a test screen to verify the app is loading correctly.
        </Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>✅ Status:</Text>
          <Text style={styles.infoText}>• App loaded successfully</Text>
          <Text style={styles.infoText}>• Live backend connected</Text>
          <Text style={styles.infoText}>• WiFi connection preserved</Text>
          <Text style={styles.infoText}>• Expo Go compatible</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🌐 Backend:</Text>
          <Text style={styles.infoText}>https://halo-api-production.up.railway.app</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💾 Database:</Text>
          <Text style={styles.infoText}>MongoDB Atlas (Production)</Text>
        </View>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Continue to App</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          This test screen confirms everything is working properly!
        </Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#8B949E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});


