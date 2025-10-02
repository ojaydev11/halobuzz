import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width, height } = Dimensions.get('window');

interface GameSession {
  _id: string;
  gameId: string;
  gameName: string;
  players: Array<{
    _id: string;
    username: string;
    avatar: string;
    score: number;
    isCurrentUser: boolean;
  }>;
  status: 'waiting' | 'active' | 'finished';
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  stake: number;
}

const GamePlayScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = async () => {
    try {
      // Simulate loading game session
      setTimeout(() => {
        setGameSession({
          _id: 'session_1',
          gameId: 'speed-chess',
          gameName: 'Speed Chess Tournament',
          players: [
            {
              _id: user?.id || 'user1',
              username: user?.username || 'You',
              avatar: '',
              score: 0,
              isCurrentUser: true
            },
            {
              _id: 'user2',
              username: 'ChessMaster',
              avatar: '',
              score: 0,
              isCurrentUser: false
            },
            {
              _id: 'user3',
              username: 'QuickPlayer',
              avatar: '',
              score: 0,
              isCurrentUser: false
            }
          ],
          status: 'waiting',
          currentRound: 1,
          totalRounds: 3,
          timeRemaining: 300,
          stake: 100
        });
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to initialize game:', error);
      setLoading(false);
    }
  };

  const startGame = () => {
    if (!gameSession) return;
    
    setGameStarted(true);
    setGameSession(prev => prev ? { ...prev, status: 'active' } : null);
    
    // Start game timer
    const timer = setInterval(() => {
      setGameSession(prev => {
        if (!prev || prev.timeRemaining <= 0) {
          clearInterval(timer);
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
  };

  const makeMove = (move: string) => {
    // Simulate making a move
    console.log('Making move:', move);
  };

  const surrender = () => {
    Alert.alert(
      'Surrender Game',
      'Are you sure you want to surrender? You will lose your stake.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Surrender', style: 'destructive', onPress: () => {
          // Handle surrender
          console.log('Game surrendered');
        }}
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderGameBoard = () => (
    <View style={styles.gameBoard}>
      <View style={styles.boardContainer}>
        {/* Simplified chess board representation */}
        {Array.from({ length: 64 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.boardSquare,
              {
                backgroundColor: (Math.floor(index / 8) + index) % 2 === 0 ? '#F0D9B5' : '#B58863'
              }
            ]}
          />
        ))}
      </View>
      
      <View style={styles.gameControls}>
        <TouchableOpacity style={styles.moveButton} onPress={() => makeMove('e4')}>
          <Text style={styles.moveText}>e4</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moveButton} onPress={() => makeMove('d4')}>
          <Text style={styles.moveText}>d4</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moveButton} onPress={() => makeMove('Nf3')}>
          <Text style={styles.moveText}>Nf3</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlayerList = () => (
    <View style={styles.playerList}>
      <Text style={styles.sectionTitle}>Players</Text>
      {gameSession?.players.map((player, index) => (
        <View key={player._id} style={styles.playerItem}>
          <View style={styles.playerAvatar}>
            <Text style={styles.avatarText}>{player.username[0].toUpperCase()}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={[
              styles.playerName,
              player.isCurrentUser && styles.currentPlayerName
            ]}>
              {player.username} {player.isCurrentUser && '(You)'}
            </Text>
            <Text style={styles.playerScore}>Score: {player.score}</Text>
          </View>
          {index === 0 && <Text style={styles.leaderText}>👑</Text>}
        </View>
      ))}
    </View>
  );

  const renderGameInfo = () => (
    <View style={styles.gameInfo}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Game:</Text>
        <Text style={styles.infoValue}>{gameSession?.gameName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Round:</Text>
        <Text style={styles.infoValue}>
          {gameSession?.currentRound}/{gameSession?.totalRounds}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Stake:</Text>
        <Text style={styles.infoValue}>{gameSession?.stake} 🪙</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Time:</Text>
        <Text style={[
          styles.infoValue,
          gameSession && gameSession.timeRemaining < 60 && styles.timeWarning
        ]}>
          {gameSession ? formatTime(gameSession.timeRemaining) : '0:00'}
        </Text>
      </View>
    </View>
  );

  const renderWaitingRoom = () => (
    <View style={styles.waitingRoom}>
      <Text style={styles.waitingTitle}>Waiting for Players...</Text>
      <Text style={styles.waitingSubtitle}>
        {gameSession?.players.length} players joined
      </Text>
      
      {renderPlayerList()}
      
      <TouchableOpacity
        style={styles.startButton}
        onPress={startGame}
      >
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667EEA" />
          <Text style={styles.loadingText}>Loading Game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!gameSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load game</Text>
          <TouchableOpacity style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gameSession.gameName}</Text>
        <TouchableOpacity onPress={surrender}>
          <Ionicons name="flag" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      {gameSession.status === 'waiting' ? (
        renderWaitingRoom()
      ) : (
        <View style={styles.gameContainer}>
          {renderGameInfo()}
          {renderGameBoard()}
          {renderPlayerList()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#8B949E',
    marginTop: 10
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#667EEA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center'
  },
  waitingRoom: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8
  },
  waitingSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    textAlign: 'center',
    marginBottom: 30
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  gameContainer: {
    flex: 1,
    padding: 15
  },
  gameInfo: {
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 12,
    color: '#8B949E'
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  timeWarning: {
    color: '#F44336'
  },
  gameBoard: {
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  boardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    height: 280,
    alignSelf: 'center',
    marginBottom: 15
  },
  boardSquare: {
    width: 35,
    height: 35,
    borderWidth: 0.5,
    borderColor: '#8B949E'
  },
  gameControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10
  },
  moveButton: {
    backgroundColor: '#2A3441',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  moveText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  playerList: {
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  playerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  playerInfo: {
    flex: 1
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2
  },
  currentPlayerName: {
    color: '#667EEA'
  },
  playerScore: {
    fontSize: 10,
    color: '#8B949E'
  },
  leaderText: {
    fontSize: 16
  }
});

export default GamePlayScreen;