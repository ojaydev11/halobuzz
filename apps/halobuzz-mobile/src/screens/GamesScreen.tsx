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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import api from '../services/api';

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

const GamesScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [stakeAmount, setStakeAmount] = useState('100');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [userBalance, setUserBalance] = useState(0);
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchGames();
    fetchUserBalance();
    fetchGameHistory();
  }, []);

  useEffect(() => {
    if (currentRound && currentRound.timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentRound]);

  const fetchGames = async () => {
    try {
      const response = await api.get('/api/v1/games/v2/list');
      setGames(response.data.data.games);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await api.get(`/api/v1/wallet/balance`);
      setUserBalance(response.data.data.coins || 0);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const fetchGameHistory = async () => {
    try {
      const response = await api.get('/api/v1/games/v2/history');
      setGameHistory(response.data.data.history || []);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  const fetchCurrentRound = async (gameCode: string) => {
    try {
      const response = await api.get(`/api/v1/games/v2/${gameCode}/current-round`);
      setCurrentRound(response.data.data);
      setTimeRemaining(response.data.data.timeRemaining);
    } catch (error) {
      console.error('Failed to fetch current round:', error);
    }
  };

  const openGameModal = async (game: Game) => {
    setSelectedGame(game);
    setModalVisible(true);
    await fetchCurrentRound(game.code);
  };

  const placeStake = async () => {
    if (!selectedGame || !stakeAmount) return;

    const amount = parseInt(stakeAmount);
    if (amount < selectedGame.minStake || amount > selectedGame.maxStake) {
      Alert.alert('Invalid Stake', `Stake must be between ${selectedGame.minStake} and ${selectedGame.maxStake} coins`);
      return;
    }

    if (amount > userBalance) {
      Alert.alert('Insufficient Balance', 'You do not have enough coins for this stake');
      return;
    }

    try {
      const payload: any = { amount };
      
      // Add game-specific data
      if (selectedGame.category === 'coin-flip' || selectedGame.category === 'color' || selectedGame.category === 'rps') {
        if (selectedOption === null) {
          Alert.alert('Selection Required', 'Please make a selection before staking');
          return;
        }
        payload.selectedOption = selectedOption;
      }

      const response = await api.post(`/api/v1/games/v2/${selectedGame.code}/stake`, payload);
      
      if (response.data.success) {
        Alert.alert('Success', 'Stake placed successfully!', [
          { text: 'OK', onPress: () => {
            setModalVisible(false);
            fetchUserBalance();
            setSelectedOption(null);
            setStakeAmount('100');
          }}
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to place stake');
    }
  };

  const getGameIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'coin-flip': '🪙',
      'dice': '🎲',
      'wheel': '🎡',
      'predictor': '🔮',
      'color': '🌈',
      'rps': '✂️',
      'treasure': '💎',
      'clicker': '⚡'
    };
    return icons[category] || '🎮';
  };

  const getGameColor = (type: string) => {
    const colors: { [key: string]: string[] } = {
      'instant': ['#FF6B6B', '#FF8787'],
      'luck': ['#4ECDC4', '#44A3AA'],
      'skill': ['#95E1D3', '#3FC1C9'],
      'multiplayer': ['#A8E6CF', '#7FD8BE'],
      'timed': ['#FFD93D', '#FCB69F']
    };
    return colors[type] || ['#667EEA', '#764BA2'];
  };

  const renderGameCard = ({ item }: { item: Game }) => (
    <TouchableOpacity onPress={() => openGameModal(item)} style={styles.gameCard}>
      <LinearGradient
        colors={getGameColor(item.type)}
        style={styles.gameGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.gameHeader}>
          <Text style={styles.gameIcon}>{getGameIcon(item.category)}</Text>
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
            <Text style={styles.statValue}>{Math.max(...(item.config.multipliers || [1]))}x</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Round</Text>
            <Text style={styles.statValue}>{item.roundDuration}s</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderGameOptions = () => {
    if (!selectedGame) return null;

    switch (selectedGame.category) {
      case 'coin-flip':
        return (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionTitle}>Choose Your Side:</Text>
            <View style={styles.coinOptions}>
              <TouchableOpacity
                style={[styles.coinOption, selectedOption === 0 && styles.selectedOption]}
                onPress={() => setSelectedOption(0)}
              >
                <Text style={styles.coinText}>HEADS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.coinOption, selectedOption === 1 && styles.selectedOption]}
                onPress={() => setSelectedOption(1)}
              >
                <Text style={styles.coinText}>TAILS</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'color':
        const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
        return (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionTitle}>Pick a Color:</Text>
            <View style={styles.colorGrid}>
              {colors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.toLowerCase() },
                    selectedOption === index && styles.selectedColorOption
                  ]}
                  onPress={() => setSelectedOption(index)}
                >
                  <Text style={styles.colorText}>{color}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'rps':
        const choices = ['Rock', 'Paper', 'Scissors'];
        const icons = ['🪨', '📄', '✂️'];
        return (
          <View style={styles.optionsContainer}>
            <Text style={styles.optionTitle}>Make Your Move:</Text>
            <View style={styles.rpsOptions}>
              {choices.map((choice, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.rpsOption, selectedOption === index && styles.selectedOption]}
                  onPress={() => setSelectedOption(index)}
                >
                  <Text style={styles.rpsIcon}>{icons[index]}</Text>
                  <Text style={styles.rpsText}>{choice}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
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
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.gamesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchGames();
            }} />
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
                  style={[styles.stakeButton, (!stakeAmount || timeRemaining === 0) && styles.disabledButton]}
                  onPress={placeStake}
                  disabled={!stakeAmount || timeRemaining === 0}
                >
                  <Text style={styles.stakeButtonText}>
                    {timeRemaining === 0 ? 'Round Ended' : `Stake ${stakeAmount || 0} Coins`}
                  </Text>
                </TouchableOpacity>

                <View style={styles.rulesContainer}>
                  <Text style={styles.rulesTitle}>Rules:</Text>
                  {selectedGame.rules.map((rule, index) => (
                    <Text key={index} style={styles.ruleText}>• {rule}</Text>
                  ))}
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
  coinOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  coinOption: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedOption: {
    borderColor: '#667EEA',
    backgroundColor: '#EBF4FF'
  },
  coinText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748'
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  colorOption: {
    width: '30%',
    aspectRatio: 1,
    marginBottom: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent'
  },
  selectedColorOption: {
    borderColor: '#2D3748'
  },
  colorText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12
  },
  rpsOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rpsOption: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  rpsIcon: {
    fontSize: 30,
    marginBottom: 5
  },
  rpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748'
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