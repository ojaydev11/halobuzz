import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';

interface LoadingSpinnerProps {
  text?: string;
  useShimmer?: boolean;
  size?: 'small' | 'large';
}

// Pre-computed skeleton layout to avoid layout passes during loading
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  text,
  useShimmer = false,
  size = 'large'
}) => {
  if (useShimmer) {
    return (
      <View style={styles.shimmerContainer}>
        <ShimmerPlaceholder
          style={styles.shimmerMain}
          shimmerColors={['#1a1a1a', '#2a2a2a', '#1a1a1a']}
          duration={1500}
          visible={false}
        />
        <ShimmerPlaceholder
          style={styles.shimmerText}
          shimmerColors={['#1a1a1a', '#2a2a2a', '#1a1a1a']}
          duration={1500}
          visible={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size={size}
        color="#007AFF"
        hidesWhenStopped={false}
      />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B10',
  },
  shimmerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B10',
    paddingHorizontal: 20,
  },
  shimmerMain: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 16,
  },
  shimmerText: {
    width: 120,
    height: 20,
    borderRadius: 4,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
});

LoadingSpinner.displayName = 'LoadingSpinner';