import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MinimalTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HaloBuzz Test</Text>
      <Text style={styles.subtitle}>App is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B949E',
  },
});


