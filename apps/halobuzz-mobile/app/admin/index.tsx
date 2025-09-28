import React, { useState, useEffect } from 'react';
import { ScrollView, SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';

interface SystemStats {
  onlineUsers: number;
  activeStreams: number;
  totalUsers: number;
  pendingReports: number;
  totalRevenue: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface AdminFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  badge?: number;
  urgent?: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats>({
    onlineUsers: 0,
    activeStreams: 0,
    totalUsers: 0,
    pendingReports: 0,
    totalRevenue: 0,
    systemHealth: 'healthy'
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const adminFeatures: AdminFeature[] = [
    {
      id: 'moderation',
      title: 'Content Moderation',
      description: 'Review and moderate user-generated content',
      icon: 'shield-checkmark-outline',
      route: '/admin/moderation',
      color: '#ff6600',
      badge: stats.pendingReports,
      urgent: stats.pendingReports > 10
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, bans, and permissions',
      icon: 'people-outline',
      route: '/admin/users',
      color: '#007AFF'
    },
    {
      id: 'analytics',
      title: 'Analytics Dashboard',
      description: 'View detailed platform analytics',
      icon: 'analytics-outline',
      route: '/admin/analytics',
      color: '#00ff00'
    },
    {
      id: 'payments',
      title: 'Payment Management',
      description: 'Monitor transactions and disputes',
      icon: 'card-outline',
      route: '/admin/payments',
      color: '#ffaa00'
    },
    {
      id: 'content',
      title: 'Content Library',
      description: 'Manage featured content and promotions',
      icon: 'library-outline',
      route: '/admin/content',
      color: '#ff00ff'
    },
    {
      id: 'system',
      title: 'System Health',
      description: 'Monitor system performance and logs',
      icon: 'pulse-outline',
      route: '/admin/system',
      color: '#00ffff'
    },
    {
      id: 'reports',
      title: 'Reports & Insights',
      description: 'Generate business intelligence reports',
      icon: 'document-text-outline',
      route: '/admin/reports',
      color: '#ff0066'
    },
    {
      id: 'settings',
      title: 'Platform Settings',
      description: 'Configure platform-wide settings',
      icon: 'settings-outline',
      route: '/admin/settings',
      color: '#666666'
    }
  ];

  useEffect(() => {
    loadSystemStats();
  }, []);

  const loadSystemStats = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - in production this would come from backend
      const mockStats: SystemStats = {
        onlineUsers: Math.floor(Math.random() * 2000) + 500,
        activeStreams: Math.floor(Math.random() * 50) + 10,
        totalUsers: Math.floor(Math.random() * 100000) + 50000,
        pendingReports: Math.floor(Math.random() * 20) + 3,
        totalRevenue: Math.floor(Math.random() * 50000) + 10000,
        systemHealth: Math.random() > 0.8 ? 'warning' : 'healthy'
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load system stats:', error);
      Alert.alert('Error', 'Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSystemStats();
    setRefreshing(false);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return '#00ff00';
      case 'warning': return '#ffaa00';
      case 'critical': return '#ff0000';
      default: return '#888';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'critical': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => Alert.alert('Admin', 'Admin profile and settings')}>
          <Ionicons name="person-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* System Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 System Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Platform Status</Text>
              <View style={styles.healthIndicator}>
                <Ionicons
                  name={getHealthIcon(stats.systemHealth) as any}
                  size={16}
                  color={getHealthColor(stats.systemHealth)}
                />
                <Text style={[styles.healthText, { color: getHealthColor(stats.systemHealth) }]}>
                  {stats.systemHealth.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.onlineUsers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Online Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.activeStreams}</Text>
                <Text style={styles.statLabel}>Active Streams</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.totalUsers.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#00ff00' }]}>
                  ${stats.totalRevenue.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Revenue Today</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Admin Features Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Admin Functions</Text>
          <View style={styles.featuresGrid}>
            {adminFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[styles.featureCard, { borderColor: feature.color }]}
                onPress={() => router.push(feature.route as any)}
              >
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                    <Ionicons
                      name={feature.icon as any}
                      size={24}
                      color={feature.color}
                    />
                  </View>
                  {feature.badge !== undefined && feature.badge > 0 && (
                    <View style={[
                      styles.badge,
                      feature.urgent && { backgroundColor: '#ff0000', transform: [{ scale: 1.1 }] }
                    ]}>
                      <Text style={styles.badgeText}>{feature.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
                {feature.urgent && (
                  <View style={styles.urgentIndicator}>
                    <Ionicons name="warning" size={12} color="#ff0000" />
                    <Text style={styles.urgentText}>URGENT</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => Alert.alert('Emergency', 'Enable emergency mode?')}
            >
              <Ionicons name="warning" size={20} color="#ff0000" />
              <Text style={styles.quickActionText}>Emergency Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => router.push('/admin/broadcast')}
            >
              <Ionicons name="megaphone-outline" size={20} color="#007AFF" />
              <Text style={styles.quickActionText}>Send Broadcast</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => Alert.alert('Maintenance', 'Schedule maintenance window?')}
            >
              <Ionicons name="construct-outline" size={20} color="#ffaa00" />
              <Text style={styles.quickActionText}>Maintenance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recent Admin Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <Ionicons name="shield-checkmark" size={16} color="#00ff00" />
              <Text style={styles.activityText}>3 content reports resolved</Text>
              <Text style={styles.activityTime}>2min ago</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="person-remove" size={16} color="#ff6600" />
              <Text style={styles.activityText}>User @spammer123 banned for 24h</Text>
              <Text style={styles.activityTime}>15min ago</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="settings" size={16} color="#007AFF" />
              <Text style={styles.activityText}>Auto-moderation settings updated</Text>
              <Text style={styles.activityTime}>1h ago</Text>
            </View>
            <View style={styles.activityItem}>
              <Ionicons name="cash" size={16} color="#00ff00" />
              <Text style={styles.activityText}>Payment dispute resolved</Text>
              <Text style={styles.activityTime}>3h ago</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16
  },

  // Overview
  overviewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  healthIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#ff6600',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: '#888',
    lineHeight: 14,
  },
  urgentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  urgentText: {
    fontSize: 8,
    color: '#ff0000',
    fontWeight: 'bold',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  quickActionText: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
  },

  // Activity
  activityCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  activityText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
  },
  activityTime: {
    fontSize: 10,
    color: '#888',
  },
});