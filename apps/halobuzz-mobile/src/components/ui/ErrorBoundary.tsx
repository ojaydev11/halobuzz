import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Button from './Button';
import { colors, spacing, layoutStyles } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text variant="h3" style={styles.title}>Something went wrong</Text>
          <Text variant="bodySmall" style={styles.message}>
            We're sorry, but something unexpected happened. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <Text variant="caption" style={styles.errorDetails}>
              {this.state.error.message}
            </Text>
          )}
          <Button
            title="Try Again"
            onPress={this.handleRetry}
            variant="primary"
            style={styles.retryButton}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  title: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.sub,
  },
  errorDetails: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.error,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: spacing.md,
  },
});

export default ErrorBoundary;
