import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
  isNew?: boolean;
  isPremium?: boolean;
}

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
  category: 'streaming' | 'gaming' | 'social' | 'commerce' | 'creator' | 'ai';
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'achievement' | 'social' | 'streaming' | 'gaming' | 'commerce';
  timestamp: string;
  isRead: boolean;
  icon: string;
  color: string;
}

export default function NavigationHubScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadNavigationData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Pulse animation for premium features
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const loadNavigationData = async () => {
    try {
      setLoading(true);
      
      // Quick Actions
      const mockQuickActions: QuickAction[] = [
        {
          id: '1',
          title: 'Go Live',
          subtitle: 'Start streaming now',
          icon: 'videocam',
          color: '#ff0000',
          route: '/live',
          isNew: false,
        },
        {
          id: '2',
          title: 'AI Studio',
          subtitle: 'Create with AI',
          icon: 'sparkles',
          color: '#ff00ff',
          route: '/ai-studio',
          isNew: true,
        },
        {
          id: '3',
          title: 'NFT Market',
          subtitle: 'Buy & sell NFTs',
          icon: 'diamond',
          color: '#9d4edd',
          route: '/nft-marketplace',
          isPremium: true,
        },
        {
          id: '4',
          title: 'Gaming Hub',
          subtitle: 'Play & compete',
          icon: 'game-controller',
          color: '#00ff00',
          route: '/games',
          isNew: false,
        },
        {
          id: '5',
          title: 'Creator Studio',
          subtitle: 'Manage content',
          icon: 'star',
          color: '#ffaa00',
          route: '/creator-studio',
          isNew: false,
        },
        {
          id: '6',
          title: 'Social Hub',
          subtitle: 'Connect & share',
          icon: 'people',
          color: '#007AFF',
          route: '/social-hub',
          isNew: true,
        },
        {
          id: '7',
          title: 'Live Commerce',
          subtitle: 'Shop while streaming',
          icon: 'storefront',
          color: '#ff6b35',
          route: '/live-commerce',
          isPremium: true,
        },
        {
          id: '8',
          title: 'Gamification',
          subtitle: 'Level up & earn',
          icon: 'trophy',
          color: '#ff00ff',
          route: '/gamification',
          isNew: true,
        },
      ];

      // Feature Cards
      const mockFeatureCards: FeatureCard[] = [
        {
          id: '1',
          title: 'Live Streaming',
          description: 'Broadcast to millions with ultra-low latency',
          icon: 'videocam',
          color: '#ff0000',
          route: '/live',
          category: 'streaming',
        },
        {
          id: '2',
          title: 'AI Content Creation',
          description: 'Generate videos, images, and music with AI',
          icon: 'sparkles',
          color: '#ff00ff',
          route: '/ai-studio',
          category: 'ai',
        },
        {
          id: '3',
          title: 'NFT Marketplace',
          description: 'Create, buy, and trade digital collectibles',
          icon: 'diamond',
          color: '#9d4edd',
          route: '/nft-marketplace',
          category: 'commerce',
        },
        {
          id: '4',
          title: 'Gaming Platform',
          description: 'Play games and compete with friends',
          icon: 'game-controller',
          color: '#00ff00',
          route: '/games',
          category: 'gaming',
        },
        {
          id: '5',
          title: 'Creator Economy',
          description: 'Monetize your content and build your brand',
          icon: 'star',
          color: '#ffaa00',
          route: '/creator-studio',
          category: 'creator',
        },
        {
          id: '6',
          title: 'Social Network',
          description: 'Connect with creators and fans worldwide',
          icon: 'people',
          color: '#007AFF',
          route: '/social-hub',
          category: 'social',
        },
        {
          id: '7',
          title: 'Live Commerce',
          description: 'Sell products during live streams',
          icon: 'storefront',
          color: '#ff6b35',
          route: '/live-commerce',
          category: 'commerce',
        },
        {
          id: '8',
          title: 'Gamification',
          description: 'Earn rewards and level up your experience',
          icon: 'trophy',
          color: '#ff00ff',
          route: '/gamification',
          category: 'social',
        },
      ];

      // Notifications
      const mockNotifications: NotificationItem[] = [
        {
          id: '1',
          title: 'Achievement Unlocked!',
          message: 'You earned the "First Stream" badge',
          type: 'achievement',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isRead: false,
          icon: 'trophy',
          color: '#ffaa00',
        },
        {
          id: '2',
          title: 'New Follower',
          message: 'gamingpro started following you',
          type: 'social',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isRead: false,
          icon: 'person-add',
          color: '#007AFF',
        },
        {
          id: '3',
          title: 'Stream Alert',
          message: 'streamqueen is live now!',
          type: 'streaming',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          isRead: true,
          icon: 'videocam',
          color: '#ff0000',
        },
        {
          id: '4',
          title: 'Game Invitation',
          message: 'contentking invited you to play',
          type: 'gaming',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          isRead: true,
          icon: 'game-controller',
          color: '#00ff00',
        },
      ];

      setQuickActions(mockQuickActions);
      setFeatureCards(mockFeatureCards);
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load navigation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.isPremium && !user?.isPremium) {
      Alert.alert(
        'Premium Feature',
        'This feature requires a premium subscription. Upgrade now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    router.push(action.route as any);
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    setNotifications(notifications.map(n => 
      n.id === notification.id ? { ...n, isRead: true } : n
    ));
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'achievement':
        router.push('/gamification');
        break;
      case 'social':
        router.push('/social-hub');
        break;
      case 'streaming':
        router.push('/live');
        break;
      case 'gaming':
        router.push('/games');
        break;
      case 'commerce':
        router.push('/live-commerce');
        break;
    }
  };

  const QuickActionCard = ({ action }: { action: QuickAction }) => (
    <Animated.View style={{ transform: [{ scale: action.isPremium ? pulseAnim : 1 }] }}>
      <TouchableOpacity
        style={styles.quickActionCard}
        onPress={() => handleQuickAction(action)}
      >
        <LinearGradient
          colors={[`${action.color}20`, `${action.color}10`]}
          style={styles.quickActionGradient}
        >
          <View style={styles.quickActionHeader}>
            <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
              <Ionicons name={action.icon as any} size={24} color="#fff" />
            </View>
            {action.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
            {action.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.quickActionTitle}>{action.title}</Text>
          <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const FeatureCard = ({ feature }: { feature: FeatureCard }) => (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={() => router.push(feature.route as any)}
    >
      <LinearGradient
        colors={[`${feature.color}15`, `${feature.color}05`]}
        style={styles.featureGradient}
      >
        <View style={styles.featureHeader}>
          <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
            <Ionicons name={feature.icon as any} size={20} color="#fff" />
          </View>
          <Text style={styles.featureCategory}>{feature.category}</Text>
        </View>
        <Text style={styles.featureTitle}>{feature.title}</Text>
        <Text style={styles.featureDescription}>{feature.description}</Text>
        <View style={styles.featureArrow}>
          <Ionicons name="arrow-forward" size={16} color={feature.color} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const NotificationItem = ({ notification }: { notification: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: notification.color }]}>
        <Ionicons name={notification.icon as any} size={16} color="#fff" />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        <Text style={styles.notificationTime}>
          {new Date(notification.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      {!notification.isRead && (
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading navigation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>HaloBuzz Hub</Text>
          <Text style={styles.subtitle}>Your gateway to everything</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickActionsContainer}>
            {quickActions.map(action => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Notifications */}
      <View style={styles.notificationsSection}>
        <View style={styles.notificationsHeader}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.notificationsContainer}>
            {notifications.slice(0, 3).map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Feature Cards */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Explore Features</Text>
        <ScrollView style={styles.featuresContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.featuresGrid}>
            {featureCards.map(feature => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  quickActionsSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    width: 120,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    position: 'relative',
  },
  quickActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  premiumBadge: {
    backgroundColor: '#ff00ff',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  notificationsSection: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    width: 280,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationMessage: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  },
  notificationTime: {
    color: '#888',
    fontSize: 10,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  featuresSection: {
    flex: 1,
    paddingTop: 20,
  },
  featuresContainer: {
    flex: 1,
  },
  featuresGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featureCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureGradient: {
    padding: 20,
    position: 'relative',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCategory: {
    color: '#888',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  featureTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featureArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
});
