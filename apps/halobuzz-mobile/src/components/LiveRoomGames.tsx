import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

interface LiveRoomGamesProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  userBalance: number;
  onBalanceUpdate: () => void;
}

const quickGames = [
  { code: 'coin-flip', name: 'Coin Flip', icon: '🪙', color: ['#FF6B6B', '#FF8787'] },
  { code: 'dice-duel', name: 'Dice Duel', icon: '🎲', color: ['#4ECDC4', '#44A3AA'] },
  { code: 'wheel-fortune', name: 'Wheel', icon: '🎡', color: ['#95E1D3', '#3FC1C9'] },
  { code: 'color-rush', name: 'Colors', icon: '🌈', color: ['#A8E6CF', '#7FD8BE'] }
];

const LiveRoomGames: React.FC<LiveRoomGamesProps> = ({
  visible,
  onClose,
  roomId,
  userBalance,
  onBalanceUpdate
}) => {
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState('50');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);

  useEffect(() => {
    if (selectedGame) {
      fetchCurrentRound(selectedGame.code);
      const interval = setInterval(() => {
        fetchCurrentRound(selectedGame.code);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedGame]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining]);

  const fetchCurrentRound = async (gameCode: string) => {
    try {
      const response = await api.get(`/api/v1/games/v2/${gameCode}/current-round`);
      setCurrentRound(response.data.data);
      setTimeRemaining(response.data.data.timeRemaining);
    } catch (error) {
      console.error('Failed to fetch round:', error);
    }
  };

  const quickStake = async (gameCode: string, amount: number, option?: number) => {
    setLoading(true);
    try {
      const payload: any = { amount };
      if (option !== undefined) {
        payload.selectedOption = option;
      }

      const response = await api.post(`/api/v1/games/v2/${gameCode}/stake`, payload);
      
      if (response.data.success) {
        Alert.alert('🎯 Staked!', `${amount} coins staked successfully!`);
        onBalanceUpdate();
        
        // Wait for round to end and check result
        setTimeout(async () => {
          try {
            const resultResponse = await api.get(
              `/api/v1/games/v2/${gameCode}/round/${response.data.data.roundId}/result`
            );
            
            if (resultResponse.data.data.userStake?.result === 'won') {
              Alert.alert(
                '🎉 You Won!',
                `Congratulations! You won ${resultResponse.data.data.userStake.winAmount} coins!`
              );
            } else {
              Alert.alert('😔 Better Luck Next Time!', 'Try again in the next round!');
            }
            onBalanceUpdate();
          } catch (error) {
            console.error('Failed to get result:', error);
          }
        }, timeRemaining * 1000 + 2000);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to place stake');
    } finally {
      setLoading(false);
    }
  };

  const renderQuickGame = (game: any) => (
    <TouchableOpacity
      key={game.code}
      style={styles.quickGameCard}
      onPress={() => setSelectedGame(game)}
    >
      <LinearGradient
        colors={game.color}
        style={styles.quickGameGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.quickGameIcon}>{game.icon}</Text>
        <Text style={styles.quickGameName}>{game.name}</Text>
        <TouchableOpacity
          style={styles.quickPlayButton}
          onPress={(e) => {
            e.stopPropagation();
            if (game.code === 'coin-flip') {
              quickStake(game.code, 50, Math.floor(Math.random() * 2));
            } else {
              quickStake(game.code, 50);
            }
          }}
        >
          <Text style={styles.quickPlayText}>Quick 50 🪙</Text>
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderSelectedGame = () => {
    if (!selectedGame) return null;

    return (
      <View style={styles.selectedGameContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setSelectedGame(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>

        <Text style={styles.selectedGameTitle}>{selectedGame.name}</Text>

        {currentRound && (
          <View style={styles.roundInfo}>
            <Text style={styles.roundTimer}>
              Next round in: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </Text>
            <Text style={styles.roundPool}>Pool: {currentRound.totalStake} 🪙</Text>
          </View>
        )}

        {selectedGame.code === 'coin-flip' && (
          <View style={styles.coinOptions}>
            <TouchableOpacity
              style={[styles.coinOption, selectedOption === 0 && styles.selectedCoinOption]}
              onPress={() => setSelectedOption(0)}
            >
              <Text style={styles.coinOptionText}>HEADS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.coinOption, selectedOption === 1 && styles.selectedCoinOption]}
              onPress={() => setSelectedOption(1)}
            >
              <Text style={styles.coinOptionText}>TAILS</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.stakeSection}>
          <Text style={styles.stakeLabel}>Stake Amount:</Text>
          <View style={styles.stakeButtons}>
            {['25', '50', '100', '500'].map(amount => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.stakeButton,
                  stakeAmount === amount && styles.selectedStakeButton
                ]}
                onPress={() => setStakeAmount(amount)}
              >
                <Text style={styles.stakeButtonText}>{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.playButton, loading && styles.disabledButton]}
          onPress={() => quickStake(selectedGame.code, parseInt(stakeAmount), selectedOption || undefined)}
          disabled={loading || (selectedGame.code === 'coin-flip' && selectedOption === null)}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.playButtonText}>Stake {stakeAmount} Coins</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>🎮 Quick Games</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#4A5568" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceBar}>
            <Text style={styles.balanceLabel}>Your Balance:</Text>
            <Text style={styles.balanceValue}>{userBalance} 🪙</Text>
          </View>

          {!selectedGame ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gamesScroll}
              >
                {quickGames.map(renderQuickGame)}
              </ScrollView>

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>🏆 How to Win</Text>
                <Text style={styles.infoText}>
                  • Pick a game and stake coins{'\n'}
                  • Global results - everyone sees the same{'\n'}
                  • 60% returns to players, 40% house edge{'\n'}
                  • Quick rounds for instant results!
                </Text>
              </View>

              {recentWinners.length > 0 && (
                <View style={styles.winnersSection}>
                  <Text style={styles.winnersTitle}>Recent Winners</Text>
                  {recentWinners.map((winner, index) => (
                    <View key={index} style={styles.winnerItem}>
                      <Text style={styles.winnerName}>{winner.username}</Text>
                      <Text style={styles.winnerAmount}>+{winner.amount} 🪙</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            renderSelectedGame()
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  content: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '70%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748'
  },
  balanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20
  },
  balanceLabel: {
    fontSize: 14,
    color: '#718096'
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748'
  },
  gamesScroll: {
    marginBottom: 20
  },
  quickGameCard: {
    marginRight: 12,
    borderRadius: 15,
    overflow: 'hidden',
    width: 140
  },
  quickGameGradient: {
    padding: 15,
    alignItems: 'center',
    height: 160
  },
  quickGameIcon: {
    fontSize: 40,
    marginBottom: 8
  },
  quickGameName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 15
  },
  quickPlayButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  quickPlayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF'
  },
  selectedGameContainer: {
    paddingVertical: 10
  },
  backButton: {
    marginBottom: 15
  },
  selectedGameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 15
  },
  roundInfo: {
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20
  },
  roundTimer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
    marginBottom: 5
  },
  roundPool: {
    fontSize: 14,
    color: '#4A5568'
  },
  coinOptions: {
    flexDirection: 'row',
    marginBottom: 20
  },
  coinOption: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedCoinOption: {
    borderColor: '#667EEA',
    backgroundColor: '#EBF4FF'
  },
  coinOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D3748'
  },
  stakeSection: {
    marginBottom: 20
  },
  stakeLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 10
  },
  stakeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  stakeButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedStakeButton: {
    borderColor: '#667EEA',
    backgroundColor: '#EBF4FF'
  },
  stakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748'
  },
  playButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: '#CBD5E0'
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF'
  },
  infoSection: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 20
  },
  winnersSection: {
    marginTop: 10
  },
  winnersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 10
  },
  winnerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  winnerName: {
    fontSize: 13,
    color: '#4A5568'
  },
  winnerAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#48BB78'
  }
});

export default LiveRoomGames;
