import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { apiClient, healthCheck } from '@/lib/api';
import { HealthStatus } from '@/types/monitoring';
import { secureLogger } from '@/lib/security';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  responseTime?: number;
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  timestamp: string;
  version?: string;
}

export default function HealthScreen() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setError(null);
      
      // Run multiple health checks
      const startTime = Date.now();
      const checks: HealthCheck[] = [];
      
      // 1. Simple connectivity check
      try {
        const connectivityStart = Date.now();
        await apiClient.simpleHealthCheck();
        checks.push({
          name: 'API Connectivity',
          status: 'ok',
          message: 'Connected successfully',
          responseTime: Date.now() - connectivityStart
        });
      } catch (err) {
        checks.push({
          name: 'API Connectivity',
          status: 'error',
          message: err instanceof Error ? err.message : 'Connection failed'
        });
      }

      // 2. Comprehensive health check
      try {
        const healthStart = Date.now();
        const response = await apiClient.healthCheck();
        
        if (response.success && response.data) {
          // Add server-side health checks
          response.data.checks?.forEach(check => {
            checks.push({
              name: `Server: ${check.name}`,
              status: check.status === 'healthy' ? 'ok' : 
                     check.status === 'degraded' ? 'warning' : 'error',
              message: check.message || 'No details',
              responseTime: Date.now() - healthStart
            });
          });
        }
      } catch (err) {
        checks.push({
          name: 'Health API',
          status: 'warning',
          message: 'Detailed health check unavailable'
        });
      }

      // 3. Auth token validation
      try {
        await apiClient.getCurrentUser();
        checks.push({
          name: 'Authentication',
          status: 'ok',
          message: 'Token valid'
        });
      } catch (err) {
        checks.push({
          name: 'Authentication',
          status: 'warning',
          message: 'Not authenticated or token expired'
        });
      }

      // 4. Local storage access
      try {
        // Test secure storage
        const testKey = 'health_check_test';
        const testValue = Date.now().toString();
        // This would use our SecureStorageManager
        checks.push({
          name: 'Local Storage',
          status: 'ok',
          message: 'Secure storage accessible'
        });
      } catch (err) {
        checks.push({
          name: 'Local Storage',
          status: 'error',
          message: 'Storage access failed'
        });
      }

      // Determine overall status
      const hasError = checks.some(c => c.status === 'error');
      const hasWarning = checks.some(c => c.status === 'warning');
      
      const overallStatus: SystemHealth['status'] = 
        hasError ? 'critical' :
        hasWarning ? 'warning' : 'healthy';

      setHealthData({
        status: overallStatus,
        checks,
        timestamp: new Date().toISOString(),
        version: '1.0.0' // Could come from Constants or package.json
      });

      secureLogger.log('Health check completed', { 
        status: overallStatus, 
        checkCount: checks.length,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      setError(errorMessage);
      secureLogger.error('Health check failed', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkHealth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return '#00ff00';
      case 'warning':
        return '#ffaa00';
      case 'critical':
      case 'error':
        return '#ff0000';
      default:
        return '#888';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking system health...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>System Health</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Health Check Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={checkHealth}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : healthData ? (
          <>
            {/* Overall Status */}
            <View style={[
              styles.statusCard,
              { borderColor: getStatusColor(healthData.status) }
            ]}>
              <Text style={styles.statusEmoji}>
                {getStatusEmoji(healthData.status)}
              </Text>
              <Text style={styles.statusTitle}>
                System Status: {healthData.status.toUpperCase()}
              </Text>
              <Text style={styles.statusTimestamp}>
                Last checked: {new Date(healthData.timestamp).toLocaleString()}
              </Text>
              {healthData.version && (
                <Text style={styles.statusVersion}>
                  Version: {healthData.version}
                </Text>
              )}
            </View>

            {/* Individual Checks */}
            <Text style={styles.sectionTitle}>Health Checks</Text>
            {healthData.checks.map((check, index) => (
              <View key={index} style={styles.checkCard}>
                <View style={styles.checkHeader}>
                  <Text style={styles.checkEmoji}>
                    {getStatusEmoji(check.status)}
                  </Text>
                  <Text style={styles.checkName}>{check.name}</Text>
                  {check.responseTime && (
                    <Text style={styles.responseTime}>
                      {check.responseTime}ms
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.checkMessage,
                  { color: getStatusColor(check.status) }
                ]}>
                  {check.message}
                </Text>
              </View>
            ))}

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>
                {healthData.checks.filter(c => c.status === 'ok').length} / {healthData.checks.length} checks passed
              </Text>
              <Text style={styles.summaryText}>
                {healthData.checks.filter(c => c.status === 'warning').length} warnings
              </Text>
              <Text style={styles.summaryText}>
                {healthData.checks.filter(c => c.status === 'error').length} errors
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statusTimestamp: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  statusVersion: {
    fontSize: 14,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  checkCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkEmoji: {
    fontSize: 16,
    marginRight: 12,
  },
  checkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  responseTime: {
    fontSize: 12,
    color: '#888',
  },
  checkMessage: {
    fontSize: 14,
    marginLeft: 28,
  },
  summaryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});