import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface AIOpponent {
  _id: string;
  name: string;
  code: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'master';
  aiLevel: number;
  personality: string;
  speciality: string;
  winRate: number;
  gamesPlayed: number;
  minStake: number;
  maxStake: number;
  rewardMultiplier: number;
}

const AIOpponentsScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [opponents, setOpponents] = useState<AIOpponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<AIOpponent | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [gameInProgress, setGameInProgress] = useState(false);

  useEffect(() => {
    fetchAIOpponents();
    fetchUserBalance();
  }, []);

  const fetchAIOpponents = async () => {
    try {
      const response = await apiClient.get('/games/ai-opponents/list');
      if (response.data && response.data.opponents) {
        setOpponents(response.data.opponents);
      } else {
        // Fallback AI opponents data
        setOpponents([
          {
            _id: '1',
            name: 'Novice Bot',
            code: 'novice-bot',
            description: 'Perfect for beginners. Makes occasional mistakes and plays conservatively.',
            difficulty: 'easy',
            aiLevel: 1,
            personality: 'Cautious',
            speciality: 'Basic Strategy',
            winRate: 0.35,
            gamesPlayed: 10352,
            minStake: 10,
            maxStake: 100,
            rewardMultiplier: 1.5
          },
          {
            _id: '2',
            name: 'Smart Sarah',
            code: 'smart-sarah',
            description: 'Intermediate AI with good decision-making skills. Adapts to your playstyle.',
            difficulty: 'medium',
            aiLevel: 3,
            personality: 'Adaptive',
            speciality: 'Pattern Recognition',
            winRate: 0.55,
            gamesPlayed: 8924,
            minStake: 25,
            maxStake: 500,
            rewardMultiplier: 2.0
          },
          {
            _id: '3',
            name: 'Tactical Tom',
            code: 'tactical-tom',
            description: 'Advanced AI with strategic thinking. Uses complex tactics and mind games.',
            difficulty: 'hard',
            aiLevel: 5,
            personality: 'Aggressive',
            speciality: 'Strategic Planning',
            winRate: 0.68,
            gamesPlayed: 6543,
            minStake: 50,
            maxStake: 1000,
            rewardMultiplier: 2.5
          },
          {
            _id: '4',
            name: 'Expert Emma',
            code: 'expert-emma',
            description: 'Expert-level AI with near-perfect gameplay. Rarely makes mistakes.',
            difficulty: 'expert',
            aiLevel: 7,
            personality: 'Calculated',
            speciality: 'Probability Master',
            winRate: 0.78,
            gamesPlayed: 4231,
            minStake: 100,
            maxStake: 2500,
            rewardMultiplier: 3.0
          },
          {
            _id: '5',
            name: 'Master Mind',
            code: 'master-mind',
            description: 'The ultimate AI challenge. Uses advanced machine learning and psychological tactics.',
            difficulty: 'master',
            aiLevel: 10,
            personality: 'Unpredictable',
            speciality: 'Deep Learning',
            winRate: 0.88,
            gamesPlayed: 2156,
            minStake: 500,
            maxStake: 10000,
            rewardMultiplier: 5.0
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch AI opponents:', error);
      setOpponents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await apiClient.get('/wallet');
      if (response.data?.wallet?.balance) {
        setUserBalance(response.data.wallet.balance);
      } else {
        setUserBalance(5000); // Fallback
      }
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
      setUserBalance(5000);
    }
  };

  const challengeOpponent = (opponent: AIOpponent) => {
    if (userBalance < opponent.minStake) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least ${opponent.minStake} coins to challenge this opponent.`
      );
      return;
    }

    setSelectedOpponent(opponent);
    setModalVisible(true);
  };

  const startGame = async (stakeAmount: number) => {
    if (!selectedOpponent) return;

    try {
      setGameInProgress(true);

      const response = await apiClient.post(`/games/ai-opponents/${selectedOpponent.code}/challenge`, {
        stake: stakeAmount
      });

      if (response.data?.gameSession) {
        setModalVisible(false);
        Alert.alert(
          'Game Started!',
          `Good luck against ${selectedOpponent.name}!`,
          [{ text: 'Play', onPress: () => navigateToGame(response.data.gameSession) }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start game');
    } finally {
      setGameInProgress(false);
    }
  };

  const navigateToGame = (gameSession: any) => {
    // Navigate to actual game screen (to be implemented)
    console.log('Navigate to game:', gameSession);
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: ['#4CAF50', '#66BB6A'],
      medium: ['#2196F3', '#42A5F5'],
      hard: ['#FF9800', '#FFB74D'],
      expert: ['#F44336', '#EF5350'],
      master: ['#9C27B0', '#BA68C8']
    };
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  const renderOpponentCard = ({ item }: { item: AIOpponent }) => {
    return (
      <TouchableOpacity onPress={() => challengeOpponent(item)}>
        <LinearGradient
          colors={getDifficultyColor(item.difficulty)}
          style={styles.opponentCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.opponentName}>{item.name}</Text>
              <Text style={styles.opponentPersonality}>{item.personality} • {item.speciality}</Text>
            </View>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{item.difficulty.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.opponentDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>{(item.winRate * 100).toFixed(0)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="game-controller" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>{item.gamesPlayed.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>{item.minStake}-{item.maxStake}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="rocket" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statText}>{item.rewardMultiplier}x</Text>
            </View>
          </View>

          <View style={styles.aiLevelBar}>
            <Text style={styles.aiLevelText}>AI Level: {item.aiLevel}/10</Text>
            <View style={styles.levelBarContainer}>
              <View style={[styles.levelBarFill, { width: `${item.aiLevel * 10}%` }]} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderStakeModal = () => {
    const [stakeAmount, setStakeAmount] = useState(selectedOpponent?.minStake.toString() || '');

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
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            {selectedOpponent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Challenge {selectedOpponent.name}</Text>
                <Text style={styles.modalDescription}>{selectedOpponent.description}</Text>

                <View style={styles.modalStatsContainer}>
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>Difficulty:</Text>
                    <Text style={styles.modalStatValue}>{selectedOpponent.difficulty.toUpperCase()}</Text>
                  </View>
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>Win Rate:</Text>
                    <Text style={styles.modalStatValue}>{(selectedOpponent.winRate * 100).toFixed(0)}%</Text>
                  </View>
                  <View style={styles.modalStatRow}>
                    <Text style={styles.modalStatLabel}>Reward Multiplier:</Text>
                    <Text style={styles.modalStatValue}>{selectedOpponent.rewardMultiplier}x</Text>
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
                      placeholder={`${selectedOpponent.minStake} - ${selectedOpponent.maxStake}`}
                      placeholderTextColor="#666"
                    />
                    <Text style={styles.coinSymbol}>🪙</Text>
                  </View>
                  <View style={styles.quickStakes}>
                    {[selectedOpponent.minStake, selectedOpponent.minStake * 2, selectedOpponent.minStake * 5, selectedOpponent.maxStake].map(amount => (
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

                <View style={styles.potentialReward}>
                  <Text style={styles.potentialRewardLabel}>Potential Win:</Text>
                  <Text style={styles.potentialRewardValue}>
                    {parseInt(stakeAmount || '0') * selectedOpponent.rewardMultiplier} 🪙
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.startButton, (gameInProgress || !stakeAmount) && styles.disabledButton]}
                  onPress={() => startGame(parseInt(stakeAmount))}
                  disabled={gameInProgress || !stakeAmount}
                >
                  <Text style={styles.startButtonText}>
                    {gameInProgress ? 'Starting Game...' : 'Start Game'}
                  </Text>
                </TouchableOpacity>
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
          <Text style={styles.title}>🤖 AI Opponents</Text>
          <Text style={styles.subtitle}>Challenge Advanced AI</Text>
        </View>
        <View>
          <Text style={styles.balanceText}>{userBalance} 🪙</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={opponents}
          renderItem={renderOpponentCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAIOpponents();
                fetchUserBalance();
              }}
            />
          }
        />
      )}

      {renderStakeModal()}
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
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0D90A'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 15
  },
  opponentCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  opponentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  opponentPersonality: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500'
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  opponentDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    lineHeight: 16
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)'
  },
  aiLevelBar: {
    marginTop: 8
  },
  aiLevelText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4
  },
  levelBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3
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
  modalStatsContainer: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#8B949E'
  },
  modalStatValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  stakeContainer: {
    marginBottom: 15
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
  potentialReward: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)'
  },
  potentialRewardLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600'
  },
  potentialRewardValue: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold'
  },
  startButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: '#2A3441',
    opacity: 0.6
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

export default AIOpponentsScreen;

