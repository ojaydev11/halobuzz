/**
 * TriviaRoyale - 100-Player Multiplayer Trivia
 * CASUAL TIER - 50-500 coins entry, 3.5x multiplier
 *
 * Features:
 * - Live 100-player quiz battles via Socket.IO
 * - 10 questions per round (10 seconds each)
 * - Speed-based scoring (faster = more points)
 * - 4 categories: General, Sports, Entertainment, Science
 * - Live leaderboard during gameplay
 * - Server-validated timing
 * - Elimination rounds (top 50% advance)
 * - Real coin rewards distribution
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { gamesAPI } from '../Services/GamesAPI';
import { socketManager } from '../Services/SocketManager';
import { useUserStore } from '@/src/stores/userStore';

const { width, height } = Dimensions.get('window');

// Types
interface Question {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
}

interface Player {
  userId: string;
  username: string;
  score: number;
  rank: number;
  isEliminated: boolean;
  streak: number;
}

interface QuestionResult {
  correct: boolean;
  reactionTime: number;
  points: number;
}

type GameState =
  | 'lobby'
  | 'waiting_room'
  | 'playing'
  | 'question_result'
  | 'round_summary'
  | 'game_over';

export default function TriviaRoyale() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  // Game state
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [entryFee, setEntryFee] = useState<number>(100);
  const [selectedCategory, setSelectedCategory] = useState<string>('general');

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [totalQuestions] = useState<number>(10);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(10);
  const [questionResult, setQuestionResult] = useState<QuestionResult | null>(null);

  // Player state
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [playerRank, setPlayerRank] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);

  // Loading & errors
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Refs
  const questionStartTime = useRef<number>(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Categories
  const categories = [
    { id: 'general', name: 'General Knowledge', icon: 'bulb-outline', color: '#6A82FB' },
    { id: 'sports', name: 'Sports', icon: 'basketball-outline', color: '#F093FB' },
    { id: 'entertainment', name: 'Entertainment', icon: 'film-outline', color: '#4FACFE' },
    { id: 'science', name: 'Science & Tech', icon: 'flask-outline', color: '#43E97B' },
  ];

  // Entry fee options
  const entryFees = [50, 100, 250, 500];

  // Socket.IO event handlers
  useEffect(() => {
    if (gameState === 'waiting_room' || gameState === 'playing') {
      // Match found
      socketManager.on('matchmaking:match_found', handleMatchFound);

      // Game room events
      socketManager.on('game:joined', handleGameJoined);
      socketManager.on('game:start', handleGameStart);
      socketManager.on('trivia:question', handleNewQuestion);
      socketManager.on('trivia:question_result', handleQuestionResult);
      socketManager.on('trivia:leaderboard_update', handleLeaderboardUpdate);
      socketManager.on('trivia:round_summary', handleRoundSummary);
      socketManager.on('game:end', handleGameEnd);
      socketManager.on('game:error', handleGameError);

      return () => {
        socketManager.off('matchmaking:match_found', handleMatchFound);
        socketManager.off('game:joined', handleGameJoined);
        socketManager.off('game:start', handleGameStart);
        socketManager.off('trivia:question', handleNewQuestion);
        socketManager.off('trivia:question_result', handleQuestionResult);
        socketManager.off('trivia:leaderboard_update', handleLeaderboardUpdate);
        socketManager.off('trivia:round_summary', handleRoundSummary);
        socketManager.off('game:end', handleGameEnd);
        socketManager.off('game:error', handleGameError);
      };
    }
  }, [gameState]);

  // Timer countdown
  useEffect(() => {
    if (gameState === 'playing' && currentQuestion) {
      timerInterval.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            if (timerInterval.current) clearInterval(timerInterval.current);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
      };
    }
  }, [gameState, currentQuestion]);

  const handleMatchFound = (data: any) => {
    console.log('Match found:', data);
    setRoomId(data.roomId);
    socketManager.joinGameRoom({ roomId: data.roomId });
  };

  const handleGameJoined = (data: any) => {
    console.log('Joined trivia room:', data);
    setGameState('waiting_room');
    setTotalPlayers(data.playerCount || 1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleGameStart = (data: any) => {
    console.log('Trivia game starting:', data);
    setGameState('playing');
    setTotalPlayers(data.totalPlayers || 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleNewQuestion = (data: { question: Question; questionNumber: number }) => {
    console.log('New question:', data);
    setCurrentQuestion(data.question);
    setQuestionNumber(data.questionNumber);
    setSelectedAnswer(null);
    setQuestionResult(null);
    setTimeRemaining(data.question.timeLimit);
    questionStartTime.current = Date.now();
    setGameState('playing');
  };

  const handleQuestionResult = (data: QuestionResult) => {
    console.log('Question result:', data);
    setQuestionResult(data);
    setGameState('question_result');

    if (data.correct) {
      setStreak((prev) => prev + 1);
      setPlayerScore((prev) => prev + data.points);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleLeaderboardUpdate = (data: { players: Player[] }) => {
    setPlayers(data.players.slice(0, 10)); // Top 10
    const myPlayer = data.players.find((p) => p.userId === user?.id);
    if (myPlayer) {
      setPlayerRank(myPlayer.rank);
      setPlayerScore(myPlayer.score);
    }
  };

  const handleRoundSummary = (data: any) => {
    console.log('Round summary:', data);
    setGameState('round_summary');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Wait 5 seconds then continue
    setTimeout(() => {
      if (data.nextRound) {
        setGameState('playing');
      }
    }, 5000);
  };

  const handleGameEnd = async (data: any) => {
    console.log('Game ended:', data);
    setGameState('game_over');

    const myResult = data.results.playerResults.find((p: any) => p.userId === user?.id);
    if (myResult) {
      setPlayerRank(myResult.rank);
      setPlayerScore(myResult.finalScore);
    }

    // End session
    if (sessionId) {
      try {
        await gamesAPI.endSession(sessionId, playerScore, {
          category: selectedCategory,
          questionsAnswered: questionNumber,
          correctAnswers: streak,
          finalRank: playerRank,
        });
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    if (myResult && myResult.reward > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🎉 Victory!',
        `Rank #${myResult.rank}\nReward: ${myResult.reward} coins`,
        [{ text: 'Awesome!', onPress: () => router.back() }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleGameError = (data: any) => {
    console.error('Game error:', data);
    Alert.alert('Error', data.message || 'An error occurred');
    setGameState('lobby');
  };

  const handleTimeUp = () => {
    if (!roomId || selectedAnswer !== null) return;

    // Submit null answer (timeout)
    socketManager.sendPlayerAction({
      roomId,
      action: {
        type: 'answer',
        questionId: currentQuestion?.id,
        answer: null,
        reactionTime: currentQuestion?.timeLimit || 10,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  };

  const handleStartGame = async () => {
    if (!socketManager.isSocketConnected()) {
      Alert.alert('Connection Error', 'Connecting to server...');
      await socketManager.connect();
      setTimeout(handleStartGame, 1000);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Start session
      const response = await gamesAPI.startSession('trivia-royale', entryFee, 'multiplayer');
      setSessionId(response.data.sessionId);

      // Join matchmaking
      socketManager.joinMatchmaking({
        gameId: 'trivia-royale',
        mode: 'casual',
      });

      setGameState('waiting_room');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to start game:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to start game');
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null || !currentQuestion || !roomId) return;

    const reactionTime = (Date.now() - questionStartTime.current) / 1000;
    setSelectedAnswer(answerIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Submit answer via Socket.IO
    socketManager.sendPlayerAction({
      roomId,
      action: {
        type: 'answer',
        questionId: currentQuestion.id,
        answer: answerIndex,
        reactionTime,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  };

  const handleCancelMatchmaking = () => {
    socketManager.leaveMatchmaking({ gameId: 'trivia-royale' });
    if (roomId) {
      socketManager.leaveGameRoom({ roomId });
    }
    setGameState('lobby');
    setRoomId(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render functions
  const renderLobby = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <LinearGradient colors={['#FC5C7D', '#6A82FB']} style={styles.heroSection}>
        <Ionicons name="bulb-outline" size={80} color="#FFFFFF" />
        <Text style={styles.heroTitle}>🧠 Trivia Royale</Text>
        <Text style={styles.heroBadge}>CASUAL TIER</Text>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Category</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selectedCategory === cat.id && styles.categoryCardSelected,
              ]}
              onPress={() => {
                setSelectedCategory(cat.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons
                name={cat.icon as any}
                size={32}
                color={selectedCategory === cat.id ? cat.color : '#8B949E'}
              />
              <Text
                style={[
                  styles.categoryName,
                  selectedCategory === cat.id && { color: cat.color },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Entry Fee</Text>
        <View style={styles.entryFeesRow}>
          {entryFees.map((fee) => (
            <TouchableOpacity
              key={fee}
              style={[styles.feeButton, entryFee === fee && styles.feeButtonSelected]}
              onPress={() => {
                setEntryFee(fee);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.feeText, entryFee === fee && styles.feeTextSelected]}>
                {fee}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={20} color="#6A82FB" />
          <Text style={styles.infoText}>Up to 100 players per match</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="timer-outline" size={20} color="#6A82FB" />
          <Text style={styles.infoText}>10 questions, 10 seconds each</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="trophy-outline" size={20} color="#6A82FB" />
          <Text style={styles.infoText}>Top 10% win 3.5x their stake</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderWaitingRoom = () => (
    <View style={styles.centerContainer}>
      <LinearGradient
        colors={['#FC5C7D', '#6A82FB']}
        style={styles.waitingCard}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.waitingTitle}>Finding Players...</Text>
        <Text style={styles.waitingSubtitle}>
          {totalPlayers} / 100 players joined
        </Text>
        <Text style={styles.waitingText}>Game starts when enough players join</Text>
      </LinearGradient>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancelMatchmaking}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const progress = timeRemaining / currentQuestion.timeLimit;

    return (
      <View style={styles.questionContainer}>
        {/* Header */}
        <View style={styles.questionHeader}>
          <View style={styles.questionInfo}>
            <Text style={styles.questionNumberText}>
              Question {questionNumber}/{totalQuestions}
            </Text>
            <Text style={styles.categoryText}>{currentQuestion.category}</Text>
          </View>
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={24} color={timeRemaining <= 3 ? '#FF4444' : '#FFFFFF'} />
            <Text style={[styles.timerText, timeRemaining <= 3 && { color: '#FF4444' }]}>
              {timeRemaining}s
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={timeRemaining <= 3 ? ['#FF4444', '#FF6B6B'] : ['#6A82FB', '#FC5C7D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: `${progress * 100}%` }]}
          />
        </View>

        {/* Question text */}
        <View style={styles.questionTextContainer}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Answer options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === index && styles.optionButtonSelected,
              ]}
              onPress={() => handleAnswerSelect(index)}
              disabled={selectedAnswer !== null}
            >
              <View style={styles.optionLetterContainer}>
                <Text style={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </Text>
              </View>
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live stats */}
        <View style={styles.liveStatsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Your Score</Text>
            <Text style={styles.statValue}>{playerScore}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rank</Text>
            <Text style={styles.statValue}>#{playerRank || '-'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{streak}🔥</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderQuestionResult = () => {
    if (!currentQuestion || !questionResult) return null;

    const correctAnswer = currentQuestion.options[currentQuestion.correctAnswer];

    return (
      <View style={styles.resultContainer}>
        <LinearGradient
          colors={questionResult.correct ? ['#43E97B', '#38F9D7'] : ['#FF4444', '#FF6B6B']}
          style={styles.resultCard}
        >
          <Ionicons
            name={questionResult.correct ? 'checkmark-circle' : 'close-circle'}
            size={80}
            color="#FFFFFF"
          />
          <Text style={styles.resultTitle}>
            {questionResult.correct ? 'Correct!' : 'Incorrect'}
          </Text>
          {questionResult.correct ? (
            <>
              <Text style={styles.resultPoints}>+{questionResult.points} points</Text>
              <Text style={styles.resultTime}>
                {questionResult.reactionTime.toFixed(2)}s reaction time
              </Text>
            </>
          ) : (
            <Text style={styles.resultCorrectAnswer}>
              Correct answer: {correctAnswer}
            </Text>
          )}
        </LinearGradient>

        {/* Mini leaderboard */}
        <View style={styles.miniLeaderboard}>
          <Text style={styles.miniLeaderboardTitle}>Top 10 Players</Text>
          {players.slice(0, 10).map((player, index) => (
            <View
              key={player.userId}
              style={[
                styles.miniPlayerRow,
                player.userId === user?.id && styles.miniPlayerRowHighlight,
              ]}
            >
              <Text style={styles.miniPlayerRank}>#{index + 1}</Text>
              <Text style={styles.miniPlayerName} numberOfLines={1}>
                {player.username}
              </Text>
              <Text style={styles.miniPlayerScore}>{player.score}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRoundSummary = () => (
    <View style={styles.centerContainer}>
      <LinearGradient colors={['#6A82FB', '#FC5C7D']} style={styles.summaryCard}>
        <Ionicons name="stats-chart" size={60} color="#FFFFFF" />
        <Text style={styles.summaryTitle}>Round Complete!</Text>
        <Text style={styles.summaryScore}>Your Score: {playerScore}</Text>
        <Text style={styles.summaryRank}>Rank: #{playerRank}</Text>
        <Text style={styles.summaryText}>Next round starting soon...</Text>
      </LinearGradient>
    </View>
  );

  const renderGameOver = () => (
    <View style={styles.centerContainer}>
      <LinearGradient
        colors={playerRank <= totalPlayers * 0.1 ? ['#43E97B', '#38F9D7'] : ['#6A82FB', '#FC5C7D']}
        style={styles.gameOverCard}
      >
        <Ionicons
          name={playerRank <= totalPlayers * 0.1 ? 'trophy' : 'medal'}
          size={80}
          color="#FFFFFF"
        />
        <Text style={styles.gameOverTitle}>
          {playerRank <= totalPlayers * 0.1 ? '🎉 Victory!' : 'Game Over'}
        </Text>
        <Text style={styles.gameOverRank}>Rank #{playerRank}</Text>
        <Text style={styles.gameOverScore}>Final Score: {playerScore}</Text>
        <Text style={styles.gameOverPlayers}>
          Out of {totalPlayers} players
        </Text>
      </LinearGradient>

      <TouchableOpacity style={styles.playAgainButton} onPress={() => setGameState('lobby')}>
        <LinearGradient colors={['#FC5C7D', '#6A82FB']} style={styles.playAgainGradient}>
          <Text style={styles.playAgainText}>Play Again</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back to Games</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {gameState === 'lobby' && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧠 Trivia Royale</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {gameState === 'lobby' && renderLobby()}
      {gameState === 'waiting_room' && renderWaitingRoom()}
      {gameState === 'playing' && renderQuestion()}
      {gameState === 'question_result' && renderQuestionResult()}
      {gameState === 'round_summary' && renderRoundSummary()}
      {gameState === 'game_over' && renderGameOver()}

      {gameState === 'lobby' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartGame}
          disabled={isLoading}
        >
          <LinearGradient colors={['#FC5C7D', '#6A82FB']} style={styles.startGradient}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="play" size={24} color="#FFFFFF" />
                <Text style={styles.startText}>Start Game ({entryFee} coins)</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 24,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  heroBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 52) / 2,
    backgroundColor: '#1F1F1F',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#6A82FB',
    backgroundColor: 'rgba(106, 130, 251, 0.1)',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    marginTop: 12,
    textAlign: 'center',
  },
  entryFeesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feeButton: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  feeButtonSelected: {
    borderColor: '#FC5C7D',
    backgroundColor: 'rgba(252, 92, 125, 0.1)',
  },
  feeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B949E',
  },
  feeTextSelected: {
    color: '#FC5C7D',
  },
  infoBox: {
    backgroundColor: '#1F1F1F',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  waitingSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  waitingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  cancelButton: {
    marginTop: 20,
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: '#FF4444',
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionInfo: {
    flex: 1,
  },
  questionNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#1F1F1F',
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  questionTextContainer: {
    backgroundColor: '#1F1F1F',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#6A82FB',
    backgroundColor: 'rgba(106, 130, 251, 0.1)',
  },
  optionLetterContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  liveStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  resultCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  resultPoints: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  resultTime: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  resultCorrectAnswer: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 12,
    textAlign: 'center',
  },
  miniLeaderboard: {
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 16,
  },
  miniLeaderboardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  miniPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  miniPlayerRowHighlight: {
    backgroundColor: 'rgba(106, 130, 251, 0.2)',
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 8,
  },
  miniPlayerRank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B949E',
    width: 32,
  },
  miniPlayerName: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  miniPlayerScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A82FB',
  },
  summaryCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryScore: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryRank: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  gameOverCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  gameOverRank: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gameOverScore: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  gameOverPlayers: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  playAgainButton: {
    marginTop: 24,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  playAgainGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 16,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B949E',
  },
  startButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
