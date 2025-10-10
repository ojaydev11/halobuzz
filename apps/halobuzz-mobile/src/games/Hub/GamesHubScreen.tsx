import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/AuthContext';
import { useGamesStore, GAME_CATALOG, GameTier } from '../Services/GamesStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

const tierColors: Record<GameTier, { gradient: [string, string]; text: string }> = {
  noob: { gradient: ['#667EEA', '#764BA2'], text: '#667EEA' },
  casual: { gradient: ['#FC5C7D', '#6A82FB'], text: '#FC5C7D' },
  core: { gradient: ['#FA8BFF', '#2BD2FF'], text: '#FA8BFF' },
  pro: { gradient: ['#FDC830', '#F37335'], text: '#FDC830' }
};

export default function GamesHubScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedTier, setSelectedTier] = useState<GameTier | null>(null);
  const catalog = GAME_CATALOG;

  const [fadeAnim] = useState(new Animated.Value(0));
  const [balance, setBalance] = useState(5000);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredGames = selectedTier
    ? catalog.filter(game => game.tier === selectedTier)
    : catalog;

  const getTierBadge = (tier: GameTier) => {
    const colors = tierColors[tier];
    return (
      <LinearGradient
        colors={colors.gradient}
        style={styles.tierBadge}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.tierBadgeText}>{tier.toUpperCase()}</Text>
      </LinearGradient>
    );
  };

  const navigateToGame = (gameId: string) => {
    router.push(`/games/${gameId}` as any);
  };

  const renderTierFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tierFilterContainer}
    >
      <TouchableOpacity
        style={[styles.tierFilterButton, !selectedTier && styles.tierFilterButtonActive]}
        onPress={() => setSelectedTier(null)}
      >
        <Text style={[styles.tierFilterText, !selectedTier && styles.tierFilterTextActive]}>
          All Games
        </Text>
      </TouchableOpacity>

      {(['noob', 'casual', 'core', 'pro'] as GameTier[]).map(tier => (
        <TouchableOpacity
          key={tier}
          style={[
            styles.tierFilterButton,
            selectedTier === tier && styles.tierFilterButtonActive
          ]}
          onPress={() => setSelectedTier(tier)}
        >
          <LinearGradient
            colors={selectedTier === tier ? tierColors[tier].gradient : ['transparent', 'transparent']}
            style={styles.tierFilterGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[
              styles.tierFilterText,
              selectedTier === tier && styles.tierFilterTextActive
            ]}>
              {tier.toUpperCase()}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderGameCard = ({ item }: { item: typeof catalog[0] }) => {
    const tierColor = tierColors[item.tier];

    return (
      <Animated.View style={[styles.gameCard, { opacity: fadeAnim }]}>
        <TouchableOpacity
          onPress={() => navigateToGame(item.id)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={tierColor.gradient}
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Tier Badge */}
            <View style={styles.cardHeader}>
              {getTierBadge(item.tier)}
              <View style={styles.liveBadge}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>

            {/* Game Icon/Image */}
            <View style={styles.gameIconContainer}>
              <Ionicons name={item.icon as any} size={48} color="#FFFFFF" />
            </View>

            {/* Game Info */}
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{item.name}</Text>
              <Text style={styles.gameDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.statText}>{item.maxPlayers}P</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="trophy-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.statText}>
                  {item.entryFee.min}-{item.entryFee.max}
                </Text>
              </View>
            </View>

            {/* Play Button */}
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => navigateToGame(item.id)}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
              <Text style={styles.playButtonText}>Play Now</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🎮 Games Arena</Text>
          <Text style={styles.headerSubtitle}>Choose your challenge</Text>
        </View>
        <View style={styles.balanceContainer}>
          <Ionicons name="wallet-outline" size={20} color="#667EEA" />
          <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Tier Filters */}
      {renderTierFilter()}

      {/* Games Grid */}
      <FlatList
        data={filteredGames}
        renderItem={renderGameCard}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.gamesGrid}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      {/* Coming Soon Banner */}
      {filteredGames.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="game-controller-outline" size={64} color="#CBD5E0" />
          <Text style={styles.emptyStateText}>No games in this tier yet</Text>
          <Text style={styles.emptyStateSubtext}>Check back soon for new games!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0B0B10',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tierFilterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  tierFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    marginRight: 10,
  },
  tierFilterButtonActive: {
    backgroundColor: 'transparent',
  },
  tierFilterGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tierFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
  },
  tierFilterTextActive: {
    color: '#FFFFFF',
  },
  gamesGrid: {
    padding: 20,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  gameCard: {
    width: CARD_WIDTH,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    minHeight: 240,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  gameIconContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  gameIcon: {
    fontSize: 48,
  },
  gameInfo: {
    marginBottom: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B949E',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});
