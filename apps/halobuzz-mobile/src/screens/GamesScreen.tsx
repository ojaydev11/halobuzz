import React, { useState, useEffect } from 'react';
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
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';
import GameEngine, { GameConfig, GameRound } from '../services/GameEngine';
import GameMonetizationService from '../services/GameMonetizationService';

interface Game {
  _id: string;
  name: string;
  code: string;
  description: string;
  type: string;
  category: string;
  minStake: number;
  maxStake: number;
  roundDuration: number;
  rules: string[];
  config: {
    options?: number;
    multipliers?: number[];
    targetRTP?: number;
  };
}

interface GameRound {
  roundId: string;
  startAt: string;
  endAt: string;
  timeRemaining: number;
  totalStake: number;
  status: string;
  optionsCount: number;
}

const GamesScreen: React.FC = ({ navigation, router }: any) => {
  const { user } = useAuth();
  const [games, setGames] = useState<GameConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [stakeAmount, setStakeAmount] = useState('100');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [placingStake, setPlacingStake] = useState(false);
  const [gameEngine] = useState(() => GameEngine);
  const [monetizationService] = useState(() => GameMonetizationService);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    initializeGameSystem();
    startAnimations();
  }, []);

  useEffect(() => {
    if (currentRound && currentRound.timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev: number) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentRound]);

  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const initializeGameSystem = async () => {
    try {
      setLoading(true);
      
      // Initialize monetization service
      await monetizationService.initialize(user?.id || 'temp_user');
      
      // Load games from engine
      const gameConfigs = gameEngine.getAllGameConfigs();
      setGames(gameConfigs);
      
      // Load user balance
      const balance = await monetizationService.getBalance();
      setUserBalance(balance);
      
      // Load game history
      const history = await monetizationService.getGameHistory();
      setGameHistory(history);
      
    } catch (error) {
      console.error('Failed to initialize game system:', error);
      // Fallback to basic games
      setGames(gameEngine.getAllGameConfigs());
      setUserBalance(1000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshGames = async () => {
    setRefreshing(true);
    await initializeGameSystem();
  };

  const openGameModal = async (game: GameConfig) => {
    setSelectedGame(game);
    setModalVisible(true);
    
    // Get or create current round
    let round = gameEngine.getCurrentRound(game.id);
    if (!round) {
      round = gameEngine.createGameRound(game.id, 30);
    }
    
    setCurrentRound(round);
    setTimeRemaining(round.timeRemaining);
    
    // Update balance
    const balance = await monetizationService.getBalance();
    setUserBalance(balance);
  };


  const placeStake = async () => {
    if (!selectedGame || !stakeAmount || !currentRound || selectedOption === null) return;

    try {
      setPlacingStake(true);
      Vibration.vibrate([0, 50]);

      const amount = parseInt(stakeAmount);
      const result = await gameEngine.placeStake(
        currentRound.roundId,
        user?.id || 'temp_user',
        amount,
        selectedOption
      );

      if (result.success) {
        // Update balance immediately
        const newBalance = await monetizationService.getBalance();
        setUserBalance(newBalance);

        // Show success message
        Alert.alert(
          'Stake Placed!',
          `You've placed ${amount} coins on ${selectedGame.options[selectedOption]}`,
          [{ text: 'OK' }]
        );

        // Reset form
        setSelectedOption(null);
        setStakeAmount('100');
      } else {
        Alert.alert('Error', result.message || 'Failed to place stake');
      }
    } catch (error) {
      console.error('Failed to place stake:', error);
      Alert.alert('Error', 'Failed to place stake. Please try again.');
    } finally {
      setPlacingStake(false);
    }
  };

  const getGameIcon = (gameId: string) => {
    const icons: { [key: string]: string } = {
      'coin-flip': '🪙',
      'dice': '🎲',
      'color': '🌈',
      'rps': '✂️',
      'number-guess': '🔢'
    };
    return icons[gameId] || '🎮';
  };

  const getGameColor = (gameId: string): [string, string] => {
    const colors: { [key: string]: [string, string] } = {
      'coin-flip': ['#FF6B6B', '#FF8787'],
      'color': ['#4ECDC4', '#44A3AA'],
      'rps': ['#95E1D3', '#3FC1C9'],
      'dice': ['#A8E6CF', '#7FD8BE'],
      'number-guess': ['#FFD93D', '#FCB69F']
    };
    return colors[gameId] || ['#667EEA', '#764BA2'];
  };

  const renderGameCard = ({ item }: { item: GameConfig }) => (
    <Animated.View style={[styles.gameCard, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={() => openGameModal(item)} style={styles.gameCard}>
        <LinearGradient
          colors={getGameColor(item.id)}
          style={styles.gameGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.gameHeader}>
            <Text style={styles.gameIcon}>{getGameIcon(item.id)}</Text>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{item.name}</Text>
              <Text style={styles.gameType}>{item.type.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.gameDescription} numberOfLines={2}>{item.description}</Text>
          <View style={styles.gameStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Min Stake</Text>
              <Text style={styles.statValue}>{item.minStake} 🪙</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Max Win</Text>
              <Text style={styles.statValue}>{item.multiplier.toFixed(1)}x</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>RTP</Text>
              <Text style={styles.statValue}>{((1 - item.houseEdge) * 100).toFixed(0)}%</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderGameOptions = () => {
    if (!selectedGame) return null;

    return (
      <View style={styles.optionsContainer}>
        <Text style={styles.optionTitle}>Choose Your Option:</Text>
        <View style={styles.optionsGrid}>
          {selectedGame.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.gameOption,
                selectedOption === index && styles.selectedOption
              ]}
              onPress={() => setSelectedOption(index)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎮 Games Arena</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>{userBalance} 🪙</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={games}
          renderItem={renderGameCard}
          keyExtractor={(item: GameConfig) => item.id}
          contentContainerStyle={styles.gamesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshGames} />
          }
        />
      )}

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

                {currentRound && (
                  <View style={styles.roundInfo}>
                    <Text style={styles.roundTitle}>Current Round</Text>
                    <Text style={styles.roundId}>#{currentRound.roundId.split('-').pop()}</Text>
                    <Text style={styles.timeRemaining}>
                      Ends in: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </Text>
                    <Text style={styles.totalStake}>Pool: {currentRound.totalStake} 🪙</Text>
                  </View>
                )}

                {renderGameOptions()}

                <View style={styles.stakeContainer}>
                  <Text style={styles.stakeLabel}>Stake Amount:</Text>
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
                    {[50, 100, 500, 1000].map(amount => (
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
                  style={[
                    styles.stakeButton, 
                    (!stakeAmount || timeRemaining === 0 || selectedOption === null || placingStake) && styles.disabledButton
                  ]}
                  onPress={placeStake}
                  disabled={!stakeAmount || timeRemaining === 0 || selectedOption === null || placingStake}
                >
                  <Text style={styles.stakeButtonText}>
                    {placingStake ? 'Placing Stake...' : 
                     timeRemaining === 0 ? 'Round Ended' : 
                     selectedOption === null ? 'Select Option First' :
                     `Stake ${stakeAmount || 0} Coins`}
                  </Text>
                </TouchableOpacity>

                <View style={styles.rulesContainer}>
                  <Text style={styles.rulesTitle}>Game Info:</Text>
                  <Text style={styles.ruleText}>• Choose your option and place your stake</Text>
                  <Text style={styles.ruleText}>• Win {selectedGame.multiplier.toFixed(1)}x your stake if you're correct</Text>
                  <Text style={styles.ruleText}>• RTP: {((1 - selectedGame.houseEdge) * 100).toFixed(0)}%</Text>
                  <Text style={styles.ruleText}>• Minimum stake: {selectedGame.minStake} coins</Text>
                  <Text style={styles.ruleText}>• Maximum stake: {selectedGame.maxStake} coins</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748'
  },
  balanceContainer: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  },
  gameGradient: {
    padding: 20
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  gameIcon: {
    fontSize: 40,
    marginRight: 15
  },
  gameInfo: {
    flex: 1
  },
  gameName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2
  },
  gameType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600'
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
    lineHeight: 20
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#FFF',
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
    zIndex: 1
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
    marginTop: 10
  },
  modalDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    lineHeight: 20
  },
  roundInfo: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  roundTitle: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 5
  },
  roundId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 5
  },
  timeRemaining: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '600',
    marginBottom: 5
  },
  totalStake: {
    fontSize: 14,
    color: '#4A5568'
  },
  optionsContainer: {
    marginBottom: 20
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 10
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gameOption: {
    width: '30%',
    backgroundColor: '#F7FAFC',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center'
  },
  stakeContainer: {
    marginBottom: 20
  },
  stakeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 10
  },
  stakeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10
  },
  stakeInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    paddingVertical: 15
  },
  coinSymbol: {
    fontSize: 20,
    marginLeft: 10
  },
  quickStakes: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  quickStakeButton: {
    flex: 1,
    backgroundColor: '#EDF2F7',
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center'
  },
  quickStakeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568'
  },
  stakeButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20
  },
  disabledButton: {
    backgroundColor: '#CBD5E0'
  },
  stakeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF'
  },
  rulesContainer: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 12
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 10
  },
  ruleText: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 5,
    lineHeight: 18
  }
});

export default GamesScreen;
