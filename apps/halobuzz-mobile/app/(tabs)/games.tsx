import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/store/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface GameCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string[];
  route: string;
  isNew?: boolean;
  isPremium?: boolean;
}

const GamesScreen: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [userLevel, setUserLevel] = useState(1);
  const [userCoins, setUserCoins] = useState(1000);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const gameCategories: GameCategory[] = [
    {
      id: 'casual',
      title: 'Casual Games',
      subtitle: 'Quick & fun games for everyone',
      icon: '🎯',
      gradient: ['#4CAF50', '#66BB6A'],
      route: '/games/casual',
    },
    {
      id: 'advanced',
      title: 'Advanced Arena',
      subtitle: 'Competitive multiplayer battles',
      icon: '⚔️',
      gradient: ['#F44336', '#EF5350'],
      route: '/games/advanced',
      isNew: true,
      isPremium: true,
    },
    {
      id: 'tournaments',
      title: 'Tournaments',
      subtitle: 'Compete for massive prizes',
      icon: '🏆',
      gradient: ['#FF9800', '#FFB74D'],
      route: '/games/tournaments',
    },
    {
      id: 'leaderboards',
      title: 'Leaderboards',
      subtitle: 'Global rankings & stats',
      icon: '📊',
      gradient: ['#9C27B0', '#BA68C8'],
      route: '/games/leaderboards',
    },
    {
      id: 'social',
      title: 'Social Hub',
      subtitle: 'Friends, guilds & chat',
      icon: '👥',
      gradient: ['#2196F3', '#42A5F5'],
      route: '/games/social',
      isNew: true,
    },
    {
      id: 'achievements',
      title: 'Achievements',
      subtitle: 'Unlock rewards & badges',
      icon: '🎖️',
      gradient: ['#FF5722', '#FF7043'],
      route: '/games/achievements',
    }
  ];

  const handleCategoryPress = (category: GameCategory) => {
    if (category.isPremium && userLevel < 10) {
      Alert.alert(
        'Premium Feature',
        `Advanced Arena requires level 10. You are currently level ${userLevel}.`,
        [
          { text: 'OK', style: 'default' },
          { text: 'Level Up Tips', onPress: () => showLevelUpTips() }
        ]
      );
      return;
    }

    switch (category.id) {
      case 'casual':
        router.push('/games/casual');
        break;
      case 'advanced':
        router.push('/games/advanced');
        break;
      case 'tournaments':
        router.push('/games/tournaments');
        break;
      case 'leaderboards':
        router.push('/games/leaderboards');
        break;
      case 'social':
        router.push('/games/social');
        break;
      case 'achievements':
        router.push('/games/achievements');
        break;
      default:
        Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  const showLevelUpTips = () => {
    Alert.alert(
      'Level Up Tips',
      '• Play daily to earn XP\n• Win games for bonus XP\n• Complete achievements\n• Join tournaments\n• Invite friends for XP boosts',
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  const renderCategoryCard = (category: GameCategory, index: number) => (
    <Animated.View
      key={category.id}
      style={[
        styles.categoryCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50],
              })
            }
          ]
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => handleCategoryPress(category)}
        style={styles.categoryButton}
      >
        <LinearGradient
          colors={category.gradient}
          style={styles.categoryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <View style={styles.categoryBadges}>
              {category.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.badgeText}>NEW</Text>
                </View>
              )}
              {category.isPremium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.badgeText}>⭐</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.categoryContent}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
          </View>

          <View style={styles.categoryFooter}>
            <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🎮 Gaming Center</Text>
          <Text style={styles.headerSubtitle}>Choose your adventure</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.userStats}>
            <Text style={styles.coinsText}>{userCoins} 🪙</Text>
            <Text style={styles.levelText}>Lv.{userLevel}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Quick Stats */}
      <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Games Won</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>75%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>#247</Text>
            <Text style={styles.statLabel}>Global Rank</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Game Categories */}
      <ScrollView
        style={styles.categoriesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContent}
      >
        <View style={styles.categoriesGrid}>
          {gameCategories.map((category, index) => renderCategoryCard(category, index))}
        </View>

        {/* Featured Tournament Banner */}
        <Animated.View style={[styles.tournamentBanner, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.tournamentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tournamentContent}>
              <Text style={styles.tournamentTitle}>🔥 Weekly Championship</Text>
              <Text style={styles.tournamentSubtitle}>
                Prize Pool: 50,000 coins • Starts in 2h 15m
              </Text>
              <TouchableOpacity
                style={styles.tournamentButton}
                onPress={() => router.push('/games/tournaments')}
              >
                <Text style={styles.tournamentButtonText}>Join Now</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tournamentIcon}>🏆</Text>
          </LinearGradient>
        </Animated.View>

        {/* Daily Challenges */}
        <Animated.View style={[styles.challengesSection, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>⚡ Daily Challenges</Text>
          <View style={styles.challengesList}>
            <View style={styles.challengeItem}>
              <Text style={styles.challengeText}>Win 3 games</Text>
              <Text style={styles.challengeReward}>+200 🪙</Text>
            </View>
            <View style={styles.challengeItem}>
              <Text style={styles.challengeText}>Play with friends</Text>
              <Text style={styles.challengeReward}>+150 XP</Text>
            </View>
            <View style={styles.challengeItem}>
              <Text style={styles.challengeText}>Perfect game streak</Text>
              <Text style={styles.challengeReward}>+500 🪙</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  headerLeft: {
    flex: 1
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B949E'
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  userStats: {
    alignItems: 'flex-end'
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0D90A',
    marginBottom: 2
  },
  levelText: {
    fontSize: 12,
    color: '#58A6FF'
  },
  statsContainer: {
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden'
  },
  statsGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)'
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  categoriesContainer: {
    flex: 1
  },
  categoriesContent: {
    padding: 15
  },
  categoriesGrid: {
    gap: 15
  },
  categoryCard: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  categoryButton: {
    // Base button styles
  },
  categoryGradient: {
    padding: 20,
    minHeight: 120
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  categoryIcon: {
    fontSize: 32
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 5
  },
  newBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  premiumBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  categoryContent: {
    flex: 1
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  categorySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18
  },
  categoryFooter: {
    alignItems: 'flex-end',
    marginTop: 10
  },
  tournamentBanner: {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden'
  },
  tournamentGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  tournamentContent: {
    flex: 1
  },
  tournamentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  tournamentSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10
  },
  tournamentButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  tournamentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  tournamentIcon: {
    fontSize: 40,
    marginLeft: 15
  },
  challengesSection: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15
  },
  challengesList: {
    gap: 10
  },
  challengeItem: {
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  challengeText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1
  },
  challengeReward: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  }
});

export default GamesScreen;
