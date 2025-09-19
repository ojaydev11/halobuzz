import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Game {
  id: string;
  name: string;
  description: string;
  category: 'arcade' | 'puzzle' | 'action' | 'strategy' | 'sports';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  minCoinsToPlay: number;
  coinRewardMultiplier: number;
  maxPlayers: number;
  isActive: boolean;
  thumbnail: string;
  gameUrl: string;
  instructions: string[];
  leaderboardEnabled: boolean;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinReward: number;
  xpReward: number;
  requirement: {
    type: 'score' | 'time' | 'wins' | 'streak' | 'combo';
    value: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  startTime: Date;
  endTime?: Date;
  score: number;
  coinsEarned: number;
  xpEarned: number;
  achievements: string[];
  isCompleted: boolean;
  isWon: boolean;
  gameData: any;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  gameId: string;
  timestamp: Date;
}

interface CoinsBalance {
  totalCoins: number;
  bonusCoins: number;
  availableCoins: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: Date;
}

export default function EnhancedGamesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [coinsBalance, setCoinsBalance] = useState<CoinsBalance | null>(null);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const categories = [
    { id: 'all', name: 'All Games', icon: 'grid-outline' },
    { id: 'arcade', name: 'Arcade', icon: 'game-controller-outline' },
    { id: 'puzzle', name: 'Puzzle', icon: 'extension-puzzle-outline' },
    { id: 'action', name: 'Action', icon: 'flash-outline' },
    { id: 'strategy', name: 'Strategy', icon: 'bulb-outline' },
    { id: 'sports', name: 'Sports', icon: 'football-outline' },
  ];

  useEffect(() => {
    loadGames();
    loadCoinsBalance();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      
      // Try API call first
      const response = await fetch('https://halo-api-production.up.railway.app/api/v1/games-enhanced/list', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.games) {
          setGames(data.games);
          return;
        }
      }
      
      // Fallback to mock data
      console.log('Using mock games data');
      loadMockGames();
    } catch (error) {
      console.error('Failed to load games:', error);
      // Fallback to mock data
      loadMockGames();
    } finally {
      setLoading(false);
    }
  };

  const loadMockGames = () => {
    const mockGames: Game[] = [
      {
        id: '1',
        name: 'HaloBuzz Racing',
        description: 'High-speed racing game with power-ups and obstacles',
        category: 'arcade',
        difficulty: 'medium',
        minCoinsToPlay: 10,
        coinRewardMultiplier: 2.5,
        maxPlayers: 4,
        isActive: true,
        thumbnail: 'https://via.placeholder.com/300x200/ff0000/ffffff?text=Racing+Game',
        gameUrl: '/games/racing',
        instructions: [
          'Use arrow keys or swipe to control your car',
          'Collect coins and power-ups',
          'Avoid obstacles and other cars',
          'Complete laps to earn bonus points'
        ],
        leaderboardEnabled: true,
        achievements: [
          {
            id: 'racing_1',
            name: 'First Race',
            description: 'Complete your first race',
            icon: '🏁',
            coinReward: 50,
            xpReward: 100,
            requirement: { type: 'wins', value: 1 },
            rarity: 'common'
          }
        ]
      },
      {
        id: '2',
        name: 'Puzzle Master',
        description: 'Match-3 puzzle game with special effects',
        category: 'puzzle',
        difficulty: 'easy',
        minCoinsToPlay: 5,
        coinRewardMultiplier: 1.8,
        maxPlayers: 1,
        isActive: true,
        thumbnail: 'https://via.placeholder.com/300x200/00ff00/ffffff?text=Puzzle+Game',
        gameUrl: '/games/puzzle',
        instructions: [
          'Match 3 or more gems of the same color',
          'Create special combinations for bonus points',
          'Clear all gems to advance to next level'
        ],
        leaderboardEnabled: true,
        achievements: []
      },
      {
        id: '3',
        name: 'Battle Arena',
        description: 'Real-time multiplayer battle game',
        category: 'action',
        difficulty: 'hard',
        minCoinsToPlay: 25,
        coinRewardMultiplier: 4.0,
        maxPlayers: 8,
        isActive: true,
        thumbnail: 'https://via.placeholder.com/300x200/ff00ff/ffffff?text=Battle+Game',
        gameUrl: '/games/battle',
        instructions: [
          'Defeat other players to earn points',
          'Collect weapons and power-ups',
          'Survive as long as possible'
        ],
        leaderboardEnabled: true,
        achievements: []
      }
    ];
    
    setGames(mockGames);
  };

  const loadCoinsBalance = async () => {
    try {
      // Mock API call - replace with actual API
      const response = await fetch('https://halo-api-production.up.railway.app/api/v1/coins/balance', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.balance !== undefined) {
          setCoinsBalance({
            totalCoins: data.balance,
            bonusCoins: data.bonusBalance || 0,
            availableCoins: data.balance,
            totalEarned: data.totalEarned || 0,
            totalSpent: data.totalSpent || 0,
            lastUpdated: new Date()
          });
          return;
        }
      }
      
      // Fallback to mock data
      console.log('Using mock coins data');
      setCoinsBalance({
        totalCoins: 150,
        bonusCoins: 25,
        availableCoins: 125,
        totalEarned: 500,
        totalSpent: 350,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to load coins balance:', error);
      setCoinsBalance({
        totalCoins: 150,
        bonusCoins: 25,
        availableCoins: 125,
        totalEarned: 500,
        totalSpent: 350,
        lastUpdated: new Date()
      });
    }
  };

  const startGame = async (game: Game) => {
    try {
      if (!coinsBalance || coinsBalance.availableCoins < game.minCoinsToPlay) {
        Alert.alert(
          'Insufficient Coins',
          `You need ${game.minCoinsToPlay} coins to play this game. You have ${coinsBalance?.availableCoins || 0} coins.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Get Coins', onPress: () => router.push('/wallet') }
          ]
        );
        return;
      }

      // Start game session
      const response = await fetch(`https://halo-api-production.up.railway.app/api/v1/games-enhanced/${game.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userCoins: coinsBalance.availableCoins
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession({
          id: data.sessionId,
          userId: user?.id || '',
          gameId: game.id,
          startTime: new Date(),
          score: 0,
          coinsEarned: 0,
          xpEarned: 0,
          achievements: [],
          isCompleted: false,
          isWon: false,
          gameData: {}
        });
        setIsPlaying(true);
        setGameScore(0);
        setSelectedGame(game);
        setShowGameModal(true);
      } else {
        Alert.alert('Error', 'Failed to start game. Please try again.');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      Alert.alert('Error', 'Failed to start game. Please try again.');
    }
  };

  const endGame = async (finalScore: number, isWon: boolean = false) => {
    if (!currentSession || !selectedGame) return;

    try {
      const response = await fetch(`https://halo-api-production.up.railway.app/api/v1/games-enhanced/session/${currentSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalScore,
          isWon,
          gameData: { score: finalScore, completed: true }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update coins balance
        await loadCoinsBalance();
        
        Alert.alert(
          'Game Complete!',
          `Score: ${finalScore}\nCoins Earned: ${data.rewards.coins}\nXP Earned: ${data.rewards.xp}`,
          [
            { text: 'OK', onPress: () => {
              setShowGameModal(false);
              setIsPlaying(false);
              setCurrentSession(null);
              setGameScore(0);
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  };

  const loadLeaderboard = async (gameId: string) => {
    try {
      const response = await fetch(`https://halo-api-production.up.railway.app/api/v1/games-enhanced/${gameId}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#00ff00';
      case 'medium': return '#ffaa00';
      case 'hard': return '#ff0000';
      case 'expert': return '#ff00ff';
      default: return '#888';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'arcade': return 'game-controller';
      case 'puzzle': return 'extension-puzzle';
      case 'action': return 'flash';
      case 'strategy': return 'brain';
      case 'sports': return 'football';
      default: return 'game-controller';
    }
  };

  const filteredGames = selectedCategory === 'all' 
    ? games 
    : games.filter(game => game.category === selectedCategory);

  const GameCard = ({ game }: { game: Game }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => startGame(game)}
    >
      <Image source={{ uri: game.thumbnail }} style={styles.gameThumbnail} />
      
      <View style={styles.gameInfo}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameName}>{game.name}</Text>
          <View style={styles.gameBadges}>
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(game.difficulty) }]}>
              <Text style={styles.difficultyText}>{game.difficulty.toUpperCase()}</Text>
            </View>
            {game.leaderboardEnabled && (
              <View style={styles.leaderboardBadge}>
                <Ionicons name="trophy" size={12} color="#ffaa00" />
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.gameDescription} numberOfLines={2}>
          {game.description}
        </Text>
        
        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Ionicons name="diamond" size={14} color="#007AFF" />
            <Text style={styles.statText}>{game.minCoinsToPlay} coins</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={14} color="#00ff00" />
            <Text style={styles.statText}>{game.maxPlayers} players</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={14} color="#ff00ff" />
            <Text style={styles.statText}>{game.coinRewardMultiplier}x reward</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const GameModal = () => (
    <Modal
      visible={showGameModal}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.gameModal}>
        <View style={styles.gameModalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowGameModal(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.gameModalTitle}>{selectedGame?.name}</Text>
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => {
              if (selectedGame) {
                loadLeaderboard(selectedGame.id);
                setShowLeaderboard(true);
              }
            }}
          >
            <Ionicons name="trophy" size={20} color="#ffaa00" />
          </TouchableOpacity>
        </View>

        <View style={styles.gameContent}>
          {isPlaying ? (
            <View style={styles.gamePlayArea}>
              <Text style={styles.scoreText}>Score: {gameScore}</Text>
              
              {/* Mock game area - replace with actual game */}
              <View style={styles.mockGameArea}>
                <Text style={styles.mockGameText}>🎮 Game Playing Area 🎮</Text>
                <Text style={styles.mockGameSubtext}>
                  This is where the actual game would be rendered
                </Text>
                
                <View style={styles.gameControls}>
                  <TouchableOpacity
                    style={styles.gameButton}
                    onPress={() => setGameScore(gameScore + 10)}
                  >
                    <Text style={styles.gameButtonText}>+10 Points</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.gameButton, styles.endGameButton]}
                    onPress={() => endGame(gameScore, gameScore > 50)}
                  >
                    <Text style={styles.gameButtonText}>End Game</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.gameInstructions}>
              <Text style={styles.instructionsTitle}>How to Play</Text>
              {selectedGame?.instructions.map((instruction, index) => (
                <Text key={index} style={styles.instructionText}>
                  {index + 1}. {instruction}
                </Text>
              ))}
              
              <TouchableOpacity
                style={styles.startGameButton}
                onPress={() => setIsPlaying(true)}
              >
                <Text style={styles.startGameButtonText}>Start Game</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const LeaderboardModal = () => (
    <Modal
      visible={showLeaderboard}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.leaderboardModal}>
        <View style={styles.leaderboardHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowLeaderboard(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.leaderboardTitle}>Leaderboard</Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={leaderboard}
          renderItem={({ item, index }) => (
            <View style={styles.leaderboardEntry}>
              <View style={styles.rankContainer}>
                <Text style={styles.rankText}>#{item.rank}</Text>
                {index < 3 && (
                  <Ionicons 
                    name={index === 0 ? 'trophy' : index === 1 ? 'medal' : 'ribbon'} 
                    size={16} 
                    color={index === 0 ? '#ffaa00' : index === 1 ? '#c0c0c0' : '#cd7f32'} 
                  />
                )}
              </View>
              
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.displayName}</Text>
                <Text style={styles.playerScore}>{item.score.toLocaleString()} points</Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.userId}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading games...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Games</Text>
          <Text style={styles.subtitle}>Play and earn coins</Text>
        </View>
        <View style={styles.coinsContainer}>
          <Ionicons name="diamond" size={20} color="#007AFF" />
          <Text style={styles.coinsText}>{coinsBalance?.availableCoins || 0}</Text>
        </View>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={20} 
              color={selectedCategory === category.id ? '#fff' : '#888'} 
            />
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Games List */}
      <FlatList
        data={filteredGames}
        renderItem={({ item }) => <GameCard game={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gamesList}
      />

      <GameModal />
      <LeaderboardModal />
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
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  coinsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    paddingVertical: 16,
    paddingLeft: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  gamesList: {
    padding: 20,
  },
  gameCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gameThumbnail: {
    width: '100%',
    height: 200,
  },
  gameInfo: {
    padding: 16,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  gameName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  gameBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  leaderboardBadge: {
    padding: 4,
  },
  gameDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 12,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#888',
    fontSize: 12,
  },
  gameModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  gameModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  gameModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  leaderboardButton: {
    padding: 4,
  },
  gameContent: {
    flex: 1,
    padding: 20,
  },
  gamePlayArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  mockGameArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  mockGameText: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 12,
  },
  mockGameSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  gameControls: {
    flexDirection: 'row',
    gap: 12,
  },
  gameButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  endGameButton: {
    backgroundColor: '#ff0000',
  },
  gameButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameInstructions: {
    flex: 1,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  startGameButton: {
    backgroundColor: '#00ff00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  startGameButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  leaderboardModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  leaderboardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    gap: 8,
  },
  rankText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerScore: {
    color: '#888',
    fontSize: 14,
  },
});
