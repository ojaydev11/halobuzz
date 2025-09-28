// Big Games Lobby Screen - Main UI for HaloBuzz multiplayer games
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GameMode {
  id: string;
  name: string;
  description: string;
  playerCount: string;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  status: 'available' | 'beta' | 'coming_soon' | 'maintenance';
  thumbnail: string;
  playerCountLive: number;
  queueTime: string;
}

interface MatchmakingStatus {
  inQueue: boolean;
  gameMode?: string;
  estimatedWaitTime?: number;
  playersInQueue?: number;
  queueStartTime?: number;
}

interface LiveStats {
  totalPlayers: number;
  activeMatches: number;
  peakConcurrent: number;
  averageWaitTime: string;
}

const GAME_MODES: GameMode[] = [
  {
    id: 'halo-arena',
    name: 'HaloArena',
    description: '5v5 tactical MOBA-style combat with heroes, lanes, and objectives',
    playerCount: '5v5',
    estimatedTime: '15-25 min',
    difficulty: 'Hard',
    status: 'available',
    thumbnail: 'https://via.placeholder.com/400x200/1a237e/ffffff?text=HaloArena',
    playerCountLive: 1247,
    queueTime: '12s avg'
  },
  {
    id: 'halo-royale',
    name: 'HaloRoyale',
    description: '60-player battle royale with shrinking zones and loot progression',
    playerCount: '60 players',
    estimatedTime: '20-30 min',
    difficulty: 'Expert',
    status: 'available',
    thumbnail: 'https://via.placeholder.com/400x200/2e7d32/ffffff?text=HaloRoyale',
    playerCountLive: 3891,
    queueTime: '8s avg'
  },
  {
    id: 'halo-rally',
    name: 'HaloRally',
    description: 'High-speed vehicle racing with combat and power-ups',
    playerCount: '8 players',
    estimatedTime: '8-12 min',
    difficulty: 'Medium',
    status: 'beta',
    thumbnail: 'https://via.placeholder.com/400x200/f57c00/ffffff?text=HaloRally',
    playerCountLive: 432,
    queueTime: '18s avg'
  },
  {
    id: 'halo-raids',
    name: 'HaloRaids',
    description: 'Cooperative PvE missions against AI bosses and hordes',
    playerCount: '4 players',
    estimatedTime: '30-45 min',
    difficulty: 'Hard',
    status: 'beta',
    thumbnail: 'https://via.placeholder.com/400x200/7b1fa2/ffffff?text=HaloRaids',
    playerCountLive: 216,
    queueTime: '25s avg'
  },
  {
    id: 'halo-tactics',
    name: 'HaloTactics',
    description: 'Strategic card-based autobattler with unit deployment',
    playerCount: '1v1',
    estimatedTime: '12-18 min',
    difficulty: 'Medium',
    status: 'coming_soon',
    thumbnail: 'https://via.placeholder.com/400x200/5d4037/ffffff?text=HaloTactics',
    playerCountLive: 0,
    queueTime: 'Soon™'
  }
];

export default function BigGamesLobbyScreen() {
  const navigation = useNavigation();
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<MatchmakingStatus>({ inQueue: false });
  const [liveStats, setLiveStats] = useState<LiveStats>({
    totalPlayers: 5786,
    activeMatches: 237,
    peakConcurrent: 8934,
    averageWaitTime: '14s'
  });
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for queue status
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    if (matchmakingStatus.inQueue) {
      pulseAnimation.start();
    } else {
      pulseAnimation.stop();
      pulseAnim.setValue(1);
    }

    return () => pulseAnimation.stop();
  }, [matchmakingStatus.inQueue]);

  // Simulate live stats updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        ...prev,
        totalPlayers: prev.totalPlayers + Math.floor(Math.random() * 20 - 10),
        activeMatches: prev.activeMatches + Math.floor(Math.random() * 6 - 3),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleGameModeSelect = (gameMode: GameMode) => {
    if (gameMode.status === 'maintenance') {
      Alert.alert('Maintenance', 'This game mode is currently under maintenance.');
      return;
    }

    if (gameMode.status === 'coming_soon') {
      Alert.alert('Coming Soon', `${gameMode.name} will be available soon!`);
      return;
    }

    setSelectedGameMode(gameMode);
  };

  const handleStartMatchmaking = async () => {
    if (!selectedGameMode) return;

    setLoading(true);

    try {
      // Simulate matchmaking request
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMatchmakingStatus({
        inQueue: true,
        gameMode: selectedGameMode.id,
        estimatedWaitTime: parseInt(selectedGameMode.queueTime) * 1000,
        playersInQueue: Math.floor(Math.random() * 50) + 10,
        queueStartTime: Date.now()
      });

      // Simulate finding match
      setTimeout(() => {
        setMatchmakingStatus({ inQueue: false });
        Alert.alert(
          'Match Found!',
          `Starting ${selectedGameMode.name} match...`,
          [
            {
              text: 'Join Match',
              onPress: () => {
                if (selectedGameMode.id === 'halo-arena') {
                  navigation.navigate('HaloArena' as never);
                } else if (selectedGameMode.id === 'halo-royale') {
                  navigation.navigate('HaloRoyale' as never);
                } else {
                  navigation.navigate('GameLobby' as never, {
                    gameMode: selectedGameMode.id
                  } as never);
                }
              }
            }
          ]
        );
      }, Math.random() * 15000 + 5000); // 5-20 second queue time

    } catch (error) {
      Alert.alert('Error', 'Failed to join matchmaking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMatchmaking = () => {
    setMatchmakingStatus({ inQueue: false });
  };

  const getDifficultyColor = (difficulty: GameMode['difficulty']) => {
    switch (difficulty) {
      case 'Easy': return '#4caf50';
      case 'Medium': return '#ff9800';
      case 'Hard': return '#f44336';
      case 'Expert': return '#9c27b0';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: GameMode['status']) => {
    switch (status) {
      case 'available': return '#4caf50';
      case 'beta': return '#ff9800';
      case 'coming_soon': return '#757575';
      case 'maintenance': return '#f44336';
      default: return '#757575';
    }
  };

  const renderGameModeCard = (gameMode: GameMode) => (
    <TouchableOpacity
      key={gameMode.id}
      style={[
        styles.gameModeCard,
        selectedGameMode?.id === gameMode.id && styles.selectedCard
      ]}
      onPress={() => handleGameModeSelect(gameMode)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={
          selectedGameMode?.id === gameMode.id
            ? ['rgba(66, 165, 245, 0.3)', 'rgba(21, 101, 192, 0.3)']
            : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
        }
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.gameModeTitle}>{gameMode.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(gameMode.status) }]}>
              <Text style={styles.statusText}>
                {gameMode.status === 'coming_soon' ? 'Soon' : gameMode.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.gameModeDescription}>{gameMode.description}</Text>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#42A5F5" />
            <Text style={styles.statText}>{gameMode.playerCount}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#66BB6A" />
            <Text style={styles.statText}>{gameMode.estimatedTime}</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.difficultyDot, { backgroundColor: getDifficultyColor(gameMode.difficulty) }]} />
            <Text style={styles.statText}>{gameMode.difficulty}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.liveStats}>
            <Text style={styles.livePlayersText}>
              {gameMode.playerCountLive.toLocaleString()} online
            </Text>
            <Text style={styles.queueTimeText}>
              {gameMode.queueTime}
            </Text>
          </View>

          {gameMode.status === 'available' && (
            <LinearGradient
              colors={['#42A5F5', '#1E88E5']}
              style={styles.playButton}
            >
              <Ionicons name="play" size={20} color="white" />
            </LinearGradient>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1421" />

      {/* Background */}
      <LinearGradient
        colors={['#0D1421', '#1A237E', '#0D1421']}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleText}>Big Games</Text>
            <Text style={styles.headerSubtitle}>Choose your battlefield</Text>
          </View>

          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>

        {/* Live Stats Bar */}
        <Animated.View
          style={[
            styles.statsBar,
            { opacity: fadeAnim }
          ]}
        >
          <BlurView intensity={20} tint="dark" style={styles.statsBlur}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#42A5F5" />
              <Text style={styles.statValue}>{liveStats.totalPlayers.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="game-controller" size={16} color="#66BB6A" />
              <Text style={styles.statValue}>{liveStats.activeMatches}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Ionicons name="timer" size={16} color="#FFA726" />
              <Text style={styles.statValue}>{liveStats.averageWaitTime}</Text>
              <Text style={styles.statLabel}>Avg Wait</Text>
            </View>
          </BlurView>
        </Animated.View>

        {/* Game Modes */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.gameModesContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {GAME_MODES.map(renderGameModeCard)}
          </Animated.View>
        </ScrollView>

        {/* Matchmaking Panel */}
        {(selectedGameMode || matchmakingStatus.inQueue) && (
          <Animated.View
            style={[
              styles.matchmakingPanel,
              matchmakingStatus.inQueue && {
                transform: [{ scale: pulseAnim }]
              }
            ]}
          >
            <BlurView intensity={30} tint="dark" style={styles.panelBlur}>
              {matchmakingStatus.inQueue ? (
                <View style={styles.queueStatus}>
                  <ActivityIndicator size="large" color="#42A5F5" />
                  <Text style={styles.queueText}>
                    Finding match for {matchmakingStatus.gameMode}...
                  </Text>
                  <Text style={styles.queueSubtext}>
                    {matchmakingStatus.playersInQueue} players in queue
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelMatchmaking}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.selectedGameInfo}>
                  <Text style={styles.selectedGameName}>{selectedGameMode?.name}</Text>
                  <Text style={styles.selectedGameDesc}>{selectedGameMode?.description}</Text>

                  <TouchableOpacity
                    style={[styles.startButton, loading && styles.disabledButton]}
                    onPress={handleStartMatchmaking}
                    disabled={loading || selectedGameMode?.status !== 'available'}
                  >
                    <LinearGradient
                      colors={['#42A5F5', '#1E88E5']}
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Ionicons name="play" size={24} color="white" />
                          <Text style={styles.startButtonText}>Start Matchmaking</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          </Animated.View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1421',
  },
  backgroundGradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsBlur: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  gameModesContainer: {
    paddingHorizontal: 20,
  },
  gameModeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    borderColor: '#42A5F5',
    borderWidth: 2,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameModeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  gameModeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveStats: {
    flex: 1,
  },
  livePlayersText: {
    fontSize: 14,
    color: '#42A5F5',
    fontWeight: '600',
  },
  queueTimeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchmakingPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  panelBlur: {
    padding: 24,
  },
  queueStatus: {
    alignItems: 'center',
  },
  queueText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  queueSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    marginBottom: 20,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedGameInfo: {
    alignItems: 'center',
  },
  selectedGameName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  selectedGameDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  startButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});