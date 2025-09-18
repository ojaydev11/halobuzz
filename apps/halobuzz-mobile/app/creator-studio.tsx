import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';

interface CreatorStats {
  totalViews: number;
  totalLikes: number;
  totalFollowers: number;
  totalEarnings: number;
  streamsCount: number;
  reelsCount: number;
  avgViewDuration: number;
  engagementRate: number;
}

interface RecentContent {
  id: string;
  type: 'stream' | 'reel';
  title: string;
  thumbnail?: string;
  views: number;
  likes: number;
  createdAt: string;
  duration?: number;
}

export default function CreatorStudioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recentContent, setRecentContent] = useState<RecentContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCreatorData();
  }, []);

  const loadCreatorData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      const mockStats: CreatorStats = {
        totalViews: 125000,
        totalLikes: 8500,
        totalFollowers: 2400,
        totalEarnings: 1250,
        streamsCount: 45,
        reelsCount: 120,
        avgViewDuration: 8.5,
        engagementRate: 12.5,
      };

      const mockContent: RecentContent[] = [
        {
          id: '1',
          type: 'stream',
          title: 'Gaming Session: Epic Battles',
          thumbnail: 'https://via.placeholder.com/200x120',
          views: 1250,
          likes: 89,
          createdAt: new Date().toISOString(),
          duration: 3600,
        },
        {
          id: '2',
          type: 'reel',
          title: 'Quick Tips: Pro Gaming',
          thumbnail: 'https://via.placeholder.com/200x120',
          views: 890,
          likes: 156,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          duration: 30,
        },
        {
          id: '3',
          type: 'stream',
          title: 'Chat with Viewers',
          thumbnail: 'https://via.placeholder.com/200x120',
          views: 2100,
          likes: 234,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          duration: 1800,
        },
      ];

      setStats(mockStats);
      setRecentContent(mockContent);
    } catch (error) {
      console.error('Failed to load creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCreatorData();
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = '#007AFF' 
  }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const QuickAction = ({ 
    title, 
    subtitle, 
    icon, 
    onPress, 
    color = '#007AFF' 
  }: {
    title: string;
    subtitle: string;
    icon: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#888" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading creator studio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Creator Studio</Text>
        <TouchableOpacity onPress={() => router.push('/creator/analytics')}>
          <Ionicons name="analytics-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {user?.username}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Here's your creator dashboard overview
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Views"
              value={formatNumber(stats?.totalViews || 0)}
              icon="eye-outline"
              color="#00ff00"
            />
            <StatCard
              title="Total Likes"
              value={formatNumber(stats?.totalLikes || 0)}
              icon="heart-outline"
              color="#ff0000"
            />
            <StatCard
              title="Followers"
              value={formatNumber(stats?.totalFollowers || 0)}
              icon="people-outline"
              color="#007AFF"
            />
            <StatCard
              title="Earnings"
              value={`$${formatNumber(stats?.totalEarnings || 0)}`}
              icon="cash-outline"
              color="#ffaa00"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              title="Start Live Stream"
              subtitle="Go live and connect with your audience"
              icon="videocam-outline"
              onPress={() => router.push('/(tabs)/live')}
              color="#ff0000"
            />
            <QuickAction
              title="Create Reel"
              subtitle="Upload and share short-form content"
              icon="film-outline"
              onPress={() => router.push('/create/reel')}
              color="#007AFF"
            />
            <QuickAction
              title="AI Content Studio"
              subtitle="Generate content with AI assistance"
              icon="sparkles-outline"
              onPress={() => router.push('/ai-studio')}
              color="#ff00ff"
            />
            <QuickAction
              title="Schedule Stream"
              subtitle="Plan your upcoming broadcasts"
              icon="calendar-outline"
              onPress={() => router.push('/schedule')}
              color="#00ff00"
            />
          </View>
        </View>

        {/* Content Performance */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>Content Performance</Text>
          <View style={styles.performanceStats}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{stats?.streamsCount || 0}</Text>
              <Text style={styles.performanceLabel}>Streams</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{stats?.reelsCount || 0}</Text>
              <Text style={styles.performanceLabel}>Reels</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{stats?.avgViewDuration || 0}m</Text>
              <Text style={styles.performanceLabel}>Avg Duration</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{stats?.engagementRate || 0}%</Text>
              <Text style={styles.performanceLabel}>Engagement</Text>
            </View>
          </View>
        </View>

        {/* Recent Content */}
        <View style={styles.recentContentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Content</Text>
            <TouchableOpacity onPress={() => router.push('/content/manage')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentContent.map((content) => (
            <TouchableOpacity 
              key={content.id} 
              style={styles.contentItem}
              onPress={() => router.push(`/content/${content.id}`)}
            >
              <View style={styles.contentThumbnail}>
                {content.thumbnail ? (
                  <Image source={{ uri: content.thumbnail }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons 
                      name={content.type === 'stream' ? 'videocam-outline' : 'film-outline'} 
                      size={24} 
                      color="#888" 
                    />
                  </View>
                )}
                <View style={styles.contentTypeBadge}>
                  <Text style={styles.contentTypeText}>
                    {content.type === 'stream' ? 'LIVE' : 'REEL'}
                  </Text>
                </View>
                {content.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {formatDuration(content.duration)}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {content.title}
                </Text>
                <Text style={styles.contentDate}>
                  {new Date(content.createdAt).toLocaleDateString()}
                </Text>
                <View style={styles.contentStats}>
                  <View style={styles.contentStat}>
                    <Ionicons name="eye-outline" size={14} color="#888" />
                    <Text style={styles.contentStatText}>{formatNumber(content.views)}</Text>
                  </View>
                  <View style={styles.contentStat}>
                    <Ionicons name="heart-outline" size={14} color="#888" />
                    <Text style={styles.contentStatText}>{formatNumber(content.likes)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Creator Tools */}
        <View style={styles.toolsSection}>
          <Text style={styles.sectionTitle}>Creator Tools</Text>
          <View style={styles.toolsGrid}>
            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => router.push('/creator/analytics')}
            >
              <Ionicons name="analytics-outline" size={24} color="#007AFF" />
              <Text style={styles.toolText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => router.push('/creator/monetization')}
            >
              <Ionicons name="cash-outline" size={24} color="#00ff00" />
              <Text style={styles.toolText}>Monetization</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => router.push('/creator/audience')}
            >
              <Ionicons name="people-outline" size={24} color="#ffaa00" />
              <Text style={styles.toolText}>Audience</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => router.push('/creator/settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#888" />
              <Text style={styles.toolText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#888',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActions: {
    gap: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  performanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  performanceStats: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#888',
  },
  recentContentSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  contentItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  contentThumbnail: {
    position: 'relative',
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTypeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#ff0000',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contentTypeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 8,
    color: '#fff',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  contentDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  contentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  contentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentStatText: {
    fontSize: 12,
    color: '#888',
  },
  toolsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  toolText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginTop: 8,
  },
});
