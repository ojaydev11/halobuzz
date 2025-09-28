import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width, height } = Dimensions.get('window');

interface AdvancedGame {
  _id: string;
  name: string;
  code: string;
  description: string;
  type: 'battle-royale' | 'tournament' | 'multiplayer' | 'ai-challenge' | 'skill' | 'strategy';
  category: string;
  minStake: number;
  maxStake: number;
  duration: number;
  playerCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  features: string[];
  rewards: {
    winner: number;
    topThree: number[];
    participation: number;
  };
  requirements: {
    level: number;
    winRate?: number;
    experience?: number;
  };
}

interface GameSession {
  sessionId: string;
  gameId: string;
  players: Player[];
  status: 'waiting' | 'starting' | 'active' | 'finished';
  timeRemaining: number;
  currentRound: number;
  totalRounds: number;
}

interface Player {
  id: string;
  username: string;
  level: number;
  avatar: string;
  score: number;
  rank: number;
  status: 'active' | 'eliminated' | 'disconnected';
}

const AdvancedGamesScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [games, setGames] = useState<AdvancedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<AdvancedGame | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [gameInProgress, setGameInProgress] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [userStats, setUserStats] = useState({
    totalGames: 0,
    wins: 0,
    winRate: 0,
    experience: 0,
    ranking: 0
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchAdvancedGames();
    fetchUserProfile();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Pulse animation for active elements
    const pulseSequence = Animated.sequence([
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
    ]);
    Animated.loop(pulseSequence).start();
  };

  const fetchAdvancedGames = async () => {
    try {
      const response = await apiClient.get('/games/advanced/list');
      if (response.data && response.data.games) {
        setGames(response.data.games);
      } else {
        // Advanced games data
        setGames([
          {
            _id: '1',
            name: 'Crypto Battle Royale',
            code: 'crypto-battle-royale',
            description: 'Last player standing wins the crypto pot! 100 players enter, only 1 survives.',
            type: 'battle-royale',
            category: 'combat',
            minStake: 50,
            maxStake: 5000,
            duration: 900, // 15 minutes
            playerCount: 100,
            difficulty: 'extreme',
            features: ['real-time-combat', 'power-ups', 'shrinking-zone', 'spectator-mode'],
            rewards: {
              winner: 80, // 80% of pot
              topThree: [10, 6, 4], // 2nd, 3rd, 4th place
              participation: 0
            },
            requirements: {
              level: 10,
              winRate: 0.3,
              experience: 5000
            }
          },
          {
            _id: '2',
            name: 'Speed Chess Tournament',
            code: 'speed-chess',
            description: 'Rapid-fire chess matches. Think fast, play faster!',
            type: 'tournament',
            category: 'strategy',
            minStake: 25,
            maxStake: 2500,
            duration: 600, // 10 minutes
            playerCount: 32,
            difficulty: 'hard',
            features: ['time-pressure', 'bracket-elimination', 'elo-rating', 'replay-analysis'],
            rewards: {
              winner: 50,
              topThree: [25, 15, 10],
              participation: 0
            },
            requirements: {
              level: 5,
              experience: 1000
            }
          },
          {
            _id: '3',
            name: 'AI Poker Master',
            code: 'ai-poker',
            description: 'Test your poker skills against advanced AI opponents',
            type: 'ai-challenge',
            category: 'cards',
            minStake: 10,
            maxStake: 1000,
            duration: 1800, // 30 minutes
            playerCount: 6,
            difficulty: 'hard',
            features: ['advanced-ai', 'psychological-analysis', 'bluff-detection', 'adaptive-difficulty'],
            rewards: {
              winner: 400, // 4x multiplier
              topThree: [200, 100, 50],
              participation: 0
            },
            requirements: {
              level: 3
            }
          },
          {
            _id: '4',
            name: 'Reflex Arena',
            code: 'reflex-arena',
            description: 'Lightning-fast reaction game. Test your reflexes against the world!',
            type: 'skill',
            category: 'arcade',
            minStake: 5,
            maxStake: 500,
            duration: 180, // 3 minutes
            playerCount: 50,
            difficulty: 'medium',
            features: ['reaction-time', 'global-leaderboard', 'combo-system', 'precision-scoring'],
            rewards: {
              winner: 300,
              topThree: [150, 75, 37],
              participation: 5
            },
            requirements: {
              level: 1
            }
          },
          {
            _id: '5',
            name: 'Strategy Empire',
            code: 'strategy-empire',
            description: 'Build and conquer! Real-time strategy with resource management.',
            type: 'strategy',
            category: 'rts',
            minStake: 100,
            maxStake: 10000,
            duration: 2700, // 45 minutes
            playerCount: 8,
            difficulty: 'extreme',
            features: ['resource-management', 'base-building', 'tech-trees', 'alliance-system'],
            rewards: {
              winner: 600,
              topThree: [300, 150, 75],
              participation: 10
            },
            requirements: {
              level: 15,
              winRate: 0.4,
              experience: 10000
            }
          },
          {
            _id: '6',
            name: 'Trivia Championship',
            code: 'trivia-championship',
            description: 'Knowledge is power! Answer questions faster than your opponents.',
            type: 'multiplayer',
            category: 'trivia',
            minStake: 15,
            maxStake: 1500,
            duration: 300, // 5 minutes
            playerCount: 20,
            difficulty: 'medium',
            features: ['category-selection', 'streak-bonuses', 'lifelines', 'live-scoring'],
            rewards: {
              winner: 250,
              topThree: [125, 62, 31],
              participation: 3
            },
            requirements: {
              level: 2
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch advanced games:', error);
      setGames([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const [balanceResponse, profileResponse] = await Promise.all([
        apiClient.get('/wallet'),
        apiClient.get('/profile/gaming-stats')
      ]);

      if (balanceResponse.data?.wallet?.balance) {
        setUserBalance(balanceResponse.data.wallet.balance);
      } else {
        setUserBalance(5000); // Fallback
      }

      if (profileResponse.data?.stats) {
        setUserStats(profileResponse.data.stats);
        setUserLevel(profileResponse.data.level || 1);
      } else {
        // Fallback stats
        setUserStats({
          totalGames: 25,
          wins: 15,
          winRate: 0.6,
          experience: 3500,
          ranking: 1250
        });
        setUserLevel(8);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUserBalance(5000);
      setUserLevel(8);
    }
  };

  const joinGame = async (game: AdvancedGame) => {
    // Check requirements
    if (userLevel < game.requirements.level) {
      Alert.alert(
        'Level Required',
        `You need to be level ${game.requirements.level} to play this game. You are currently level ${userLevel}.`
      );
      return;
    }

    if (game.requirements.winRate && userStats.winRate < game.requirements.winRate) {
      Alert.alert(
        'Win Rate Required',
        `You need a win rate of at least ${(game.requirements.winRate * 100).toFixed(0)}% to play this game.`
      );
      return;
    }

    if (game.requirements.experience && userStats.experience < game.requirements.experience) {
      Alert.alert(
        'Experience Required',
        `You need at least ${game.requirements.experience} experience points to play this game.`
      );
      return;
    }

    if (userBalance < game.minStake) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least ${game.minStake} coins to join this game.`
      );
      return;
    }

    setSelectedGame(game);
    setModalVisible(true);
  };

  const startGameSession = async (stakeAmount: number) => {
    if (!selectedGame) return;

    try {
      setGameInProgress(true);
      Vibration.vibrate([0, 100, 50, 100]);

      const response = await apiClient.post(`/games/advanced/${selectedGame.code}/join`, {
        stake: stakeAmount
      });

      if (response.data?.session) {
        setCurrentSession(response.data.session);
        setModalVisible(false);

        Alert.alert(
          'Game Joined!',
          `Waiting for ${selectedGame.playerCount - (response.data.session.players?.length || 0)} more players...`,
          [{ text: 'OK' }]
        );

        // Start session polling
        pollGameSession(response.data.session.sessionId);
      }
    } catch (error: any) {
      setGameInProgress(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to join game');
    }
  };

  const pollGameSession = async (sessionId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/games/advanced/session/${sessionId}`);
        if (response.data?.session) {
          setCurrentSession(response.data.session);

          if (response.data.session.status === 'finished') {
            clearInterval(interval);
            setGameInProgress(false);
            showGameResults(response.data.session);
          }
        }
      } catch (error) {
        console.error('Failed to poll game session:', error);
      }
    }, 2000);

    // Clean up after 1 hour
    setTimeout(() => clearInterval(interval), 3600000);
  };

  const showGameResults = (session: GameSession) => {
    const userPlayer = session.players.find(p => p.id === user?.id);
    const isWinner = userPlayer?.rank === 1;

    Vibration.vibrate(isWinner ? [0, 100, 50, 100, 50, 100] : [0, 200]);

    Alert.alert(
      isWinner ? '🎉 Victory!' : '🎮 Game Finished',
      `You finished in position ${userPlayer?.rank}/${session.players.length}\nScore: ${userPlayer?.score}\n${isWinner ? 'Congratulations on your victory!' : 'Better luck next time!'}`,
      [{ text: 'Continue', onPress: () => setCurrentSession(null) }]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: ['#4CAF50', '#66BB6A'],
      medium: ['#FF9800', '#FFB74D'],
      hard: ['#F44336', '#EF5350'],
      extreme: ['#9C27B0', '#BA68C8']
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'battle-royale': '⚔️',
      'tournament': '🏆',
      'multiplayer': '👥',
      'ai-challenge': '🤖',
      'skill': '🎯',
      'strategy': '🧠'
    };
    return icons[type as keyof typeof icons] || '🎮';
  };

  const renderGameCard = ({ item }: { item: AdvancedGame }) => {
    const canPlay = userLevel >= item.requirements.level &&
      (!item.requirements.winRate || userStats.winRate >= item.requirements.winRate) &&
      (!item.requirements.experience || userStats.experience >= item.requirements.experience) &&
      userBalance >= item.minStake;

    return (
      <Animated.View style={[styles.gameCard, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => joinGame(item)} disabled={!canPlay}>
          <LinearGradient
            colors={getDifficultyColor(item.difficulty)}
            style={[styles.gameGradient, !canPlay && styles.disabledGame]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.gameHeader}>
              <Text style={styles.gameIcon}>{getTypeIcon(item.type)}</Text>
              <View style={styles.gameInfo}>
                <Text style={styles.gameName}>{item.name}</Text>
                <Text style={styles.gameType}>{item.type.toUpperCase().replace('-', ' ')}</Text>
              </View>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyText}>{item.difficulty.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.gameDescription} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.gameFeatures}>
              {item.features.slice(0, 2).map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature.replace('-', ' ')}</Text>
                </View>
              ))}
            </View>

            <View style={styles.gameStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Players</Text>
                <Text style={styles.statValue}>{item.playerCount}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Min Stake</Text>
                <Text style={styles.statValue}>{item.minStake} 🪙</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Winner</Text>
                <Text style={styles.statValue}>{item.rewards.winner}%</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{Math.floor(item.duration / 60)}m</Text>
              </View>
            </View>

            {!canPlay && (
              <View style={styles.requirementsBanner}>
                <Text style={styles.requirementsText}>
                  {userLevel < item.requirements.level ? `Level ${item.requirements.level} Required` :
                   item.requirements.winRate && userStats.winRate < item.requirements.winRate ? 'Higher Win Rate Required' :
                   item.requirements.experience && userStats.experience < item.requirements.experience ? 'More Experience Required' :
                   'Insufficient Balance'}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderStakeModal = () => {
    const [stakeAmount, setStakeAmount] = useState(selectedGame?.minStake.toString() || '');

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            {selectedGame && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedGame.name}</Text>
                <Text style={styles.modalDescription}>{selectedGame.description}</Text>

                <View style={styles.gameDetailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Players:</Text>
                    <Text style={styles.detailValue}>{selectedGame.playerCount}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{Math.floor(selectedGame.duration / 60)} minutes</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Winner Gets:</Text>
                    <Text style={styles.detailValue}>{selectedGame.rewards.winner}% of pot</Text>
                  </View>
                </View>

                <View style={styles.stakeContainer}>
                  <Text style={styles.stakeLabel}>Your Stake:</Text>
                  <View style={styles.stakeInputContainer}>
                    <TextInput
                      style={styles.stakeInput}
                      value={stakeAmount}
                      onChangeText={setStakeAmount}
                      keyboardType="numeric"
                      placeholder={`${selectedGame.minStake} - ${selectedGame.maxStake}`}
                    />
                    <Text style={styles.coinSymbol}>🪙</Text>
                  </View>
                  <View style={styles.quickStakes}>
                    {[selectedGame.minStake, selectedGame.minStake * 5, selectedGame.minStake * 10, selectedGame.maxStake].map(amount => (
                      <TouchableOpacity
                        key={amount}
                        style={styles.quickStakeButton}
                        onPress={() => setStakeAmount(amount.toString())}
                      >
                        <Text style={styles.quickStakeText}>{amount}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.joinButton, gameInProgress && styles.disabledButton]}
                  onPress={() => startGameSession(parseInt(stakeAmount))}
                  disabled={gameInProgress || !stakeAmount}
                >
                  <Text style={styles.joinButtonText}>
                    {gameInProgress ? 'Joining Game...' : `Join Game - ${stakeAmount || 0} 🪙`}
                  </Text>
                </TouchableOpacity>

                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>Game Features:</Text>
                  {selectedGame.features.map((feature, index) => (
                    <Text key={index} style={styles.featureItem}>• {feature.replace('-', ' ')}</Text>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>⚡ Advanced Arena</Text>
          <Text style={styles.subtitle}>Elite Gaming Experience</Text>
        </View>
        <View style={styles.userStats}>
          <Text style={styles.balanceText}>{userBalance} 🪙</Text>
          <Text style={styles.levelText}>Level {userLevel}</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{userStats.totalGames}</Text>
          <Text style={styles.statText}>Games</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{(userStats.winRate * 100).toFixed(0)}%</Text>
          <Text style={styles.statText}>Win Rate</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>#{userStats.ranking}</Text>
          <Text style={styles.statText}>Rank</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={games}
          renderItem={renderGameCard}
          keyExtractor={(item: AdvancedGame) => item._id}
          contentContainerStyle={styles.gamesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAdvancedGames();
              }}
            />
          }
        />
      )}

      {renderStakeModal()}

      {currentSession && (
        <View style={styles.sessionOverlay}>
          <Text style={styles.sessionText}>
            Game in Progress: {currentSession.players.length}/{selectedGame?.playerCount} players
          </Text>
          <Animated.View style={[styles.sessionPulse, { transform: [{ scale: pulseAnim }] }]} />
        </View>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2
  },
  userStats: {
    alignItems: 'flex-end'
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0D90A'
  },
  levelText: {
    fontSize: 12,
    color: '#58A6FF',
    marginTop: 2
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1F29',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statText: {
    fontSize: 10,
    color: '#8B949E',
    marginTop: 2
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  gamesList: {
    padding: 15
  },
  gameCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden'
  },
  gameGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  disabledGame: {
    opacity: 0.6
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  gameIcon: {
    fontSize: 30,
    marginRight: 12
  },
  gameInfo: {
    flex: 1
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  gameType: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600'
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  difficultyText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  gameDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    lineHeight: 16
  },
  gameFeatures: {
    flexDirection: 'row',
    marginBottom: 10
  },
  featureTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6
  },
  featureText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2
  },
  statValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  requirementsBanner: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)'
  },
  requirementsText: {
    fontSize: 10,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)'
  },
  modalContent: {
    backgroundColor: '#1A1F29',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '85%'
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 15
  },
  modalDescription: {
    fontSize: 13,
    color: '#8B949E',
    marginBottom: 20,
    lineHeight: 18
  },
  gameDetailsContainer: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 12,
    color: '#8B949E'
  },
  detailValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  stakeContainer: {
    marginBottom: 20
  },
  stakeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10
  },
  stakeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1419',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  stakeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingVertical: 15
  },
  coinSymbol: {
    fontSize: 18,
    marginLeft: 10
  },
  quickStakes: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  quickStakeButton: {
    flex: 1,
    backgroundColor: '#2A3441',
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center'
  },
  quickStakeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  joinButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  disabledButton: {
    backgroundColor: '#2A3441'
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  featuresContainer: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 12
  },
  featuresTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  featureItem: {
    fontSize: 10,
    color: '#8B949E',
    marginBottom: 4,
    lineHeight: 14
  },
  sessionOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  sessionText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  sessionPulse: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#00FF00',
    borderRadius: 5,
    right: 15,
    top: '50%'
  }
});

export default AdvancedGamesScreen;