/**
 * Tap Duel - 1v1 Reaction Time Multiplayer
 * Real-time Socket.IO matchmaking with server-side validation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGamesStore } from '../Services/GamesStore';
import { useAuth } from '@/store/AuthContext';
import { socketManager } from '../Services/SocketManager';
import { gamesAPI } from '../Services/GamesAPI';
import { audioManager } from '../Services/AudioManager';
import { hapticFeedback } from '../Components/HapticFeedback';
import { economyClient } from '../Services/EconomyClient';
import { ConfettiParticles, ExplosionParticles } from '../Components/ParticleSystem';
import { prefetchGameAssets } from '../Services/assetsMap';

const { width, height } = Dimensions.get('window');

type GameMode = 'solo' | 'multiplayer';
type GameState = 'idle' | 'finding_match' | 'match_found' | 'in_game' | 'results';
type RoundState = 'waiting' | 'countdown' | 'ready' | 'tapped';

interface OpponentData {
  userId: string;
  username?: string;
  mmr?: number;
}

interface MatchData {
  matchId: string;
  roomId: string;
  opponent: OpponentData;
}

interface RoundResult {
  playerId: string;
  reactionTime: number;
  timestamp: number;
  isValid: boolean;
}

export default function TapDuel() {
  const router = useRouter();
  const { user } = useAuth();

  // Game Mode
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [gameState, setGameState] = useState<GameState>('idle');

  // Solo Mode State
  const [countdown, setCountdown] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  // Multiplayer State
  const [isSearching, setIsSearching] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [opponent, setOpponent] = useState<OpponentData | null>(null);
  const [opponentReady, setOpponentReady] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundState, setRoundState] = useState<RoundState>('waiting');
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Modal state (replaces Alert.alert)
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'error' | 'info' | 'success';
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  // Particle state
  const [particleState, setParticleState] = useState<{
    show: boolean;
    type: 'confetti' | 'explosion';
    x: number;
    y: number;
  } | null>(null);

  // FPS tracking
  const [fps, setFps] = useState(60);
  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());

  // Refs
  const startTimeRef = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const showModal = (type: 'error' | 'info' | 'success', title: string, message: string) => {
    setModalState({ visible: true, type, title, message });
  };

  // Preload assets and audio
  useEffect(() => {
    prefetchGameAssets('tap-duel');
    audioManager.preloadGameSounds('tap-duel');
    return () => audioManager.unloadGameSounds('tap-duel');
  }, []);

  // FPS monitoring
  useEffect(() => {
    const measureFPS = () => {
      frameCount.current++;
      const now = Date.now();
      const elapsed = now - lastTime.current;
      if (elapsed >= 1000) {
        const currentFPS = Math.round((frameCount.current * 1000) / elapsed);
        setFps(currentFPS);
        frameCount.current = 0;
        lastTime.current = now;
      }
      requestAnimationFrame(measureFPS);
    };
    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Initialize socket connection
  useEffect(() => {
    socketManager.connect();

    return () => {
      if (gameMode === 'multiplayer' && matchData) {
        socketManager.leaveGameRoom({ roomId: matchData.roomId });
      }
    };
  }, []);

  // Setup multiplayer event listeners
  useEffect(() => {
    if (gameMode !== 'multiplayer') return;

    // Match found
    socketManager.on('matchmaking:match_found', handleMatchFound);

    // Game room joined
    socketManager.on('game:joined', handleGameJoined);

    // Player joined room
    socketManager.on('game:player_joined', handlePlayerJoined);

    // Game start
    socketManager.on('game:start', handleGameStart);

    // Opponent action
    socketManager.on('game:action_broadcast', handleOpponentAction);

    // Game end
    socketManager.on('game:end', handleGameEnd);

    // Errors
    socketManager.on('game:error', handleGameError);

    return () => {
      socketManager.off('matchmaking:match_found', handleMatchFound);
      socketManager.off('game:joined', handleGameJoined);
      socketManager.off('game:player_joined', handlePlayerJoined);
      socketManager.off('game:start', handleGameStart);
      socketManager.off('game:action_broadcast', handleOpponentAction);
      socketManager.off('game:end', handleGameEnd);
      socketManager.off('game:error', handleGameError);
    };
  }, [gameMode, matchData]);

  // Multiplayer Event Handlers
  const handleMatchFound = (data: any) => {
    console.log('Match found:', data);
    setMatchData(data);
    setOpponent(data.opponent);
    setGameState('match_found');
    hapticFeedback.trigger('success');

    // Auto-join game room
    setTimeout(() => {
      socketManager.joinGameRoom({ roomId: data.roomId });
    }, 1000);
  };

  const handleGameJoined = (data: any) => {
    console.log('Joined game room:', data);
    setGameState('in_game');
    // Mark as ready
    setTimeout(() => {
      socketManager.setPlayerReady({ roomId: matchData!.roomId });
    }, 500);
  };

  const handlePlayerJoined = (data: any) => {
    console.log('Player joined:', data);
  };

  const handleGameStart = (data: any) => {
    console.log('Game starting:', data);
    setCurrentRound(1);
    setMyScore(0);
    setOpponentScore(0);
    setOpponentReady(true);
    startMultiplayerRound();
  };

  const handleOpponentAction = (data: any) => {
    console.log('Opponent action:', data);
    if (data.action.type === 'tap' && data.playerId !== user?.id) {
      // Opponent tapped
      const result: RoundResult = {
        playerId: data.playerId,
        reactionTime: data.action.reactionTime,
        timestamp: data.action.timestamp,
        isValid: data.action.isValid,
      };
      setRoundResults(prev => [...prev, result]);

      // Check if round is complete
      if (roundState === 'tapped') {
        evaluateRound(result);
      }
    }
  };

  const handleGameEnd = (data: any) => {
    console.log('Game ended:', data);
    setGameState('results');

    // Determine winner
    const winnerId = data.results.winnerId;
    const isDraw = data.results.isDraw;

    if (isDraw) {
      showModal('info', 'Draw!', 'Both players had equal reaction times!');
    } else if (winnerId === user?.id) {
      showModal('success', 'Victory!', 'You win! Faster reflexes!');
      hapticFeedback.gameVictory();
      audioManager.playSound('tap-duel', 'win');
      setParticleState({ show: true, type: 'confetti', x: width / 2, y: height / 2 });
    } else {
      showModal('error', 'Defeat', 'Opponent was faster this time!');
      hapticFeedback.gameDefeat();
      audioManager.playSound('tap-duel', 'lose');
    }

    // Reset after delay
    setTimeout(() => {
      resetGame();
    }, 5000);
  };

  const handleGameError = (data: any) => {
    console.error('Game error:', data);
    showModal('error', 'Error', data.error || 'An error occurred');
    setIsSearching(false);
    setGameState('idle');
  };

  // Start matchmaking
  const startMatchmaking = async () => {
    if (!socketManager.isSocketConnected()) {
      showModal('error', 'Connection Error', 'Not connected to game server');
      await socketManager.connect();
      return;
    }

    try {
      setIsSearching(true);
      setGameState('finding_match');

      // Start game session
      const response = await gamesAPI.startSession('tap-duel', 50, 'multiplayer');
      setSessionId(response.data.sessionId);

      // Join matchmaking
      socketManager.joinMatchmaking({
        gameId: 'tap-duel',
        mode: 'casual',
      });

      hapticFeedback.trigger('light');
    } catch (error: any) {
      console.error('Failed to start matchmaking:', error);
      showModal('error', 'Error', error.response?.data?.error || 'Failed to start matchmaking');
      setIsSearching(false);
      setGameState('idle');
    }
  };

  // Cancel matchmaking
  const cancelMatchmaking = () => {
    socketManager.leaveMatchmaking({ gameId: 'tap-duel' });
    setIsSearching(false);
    setGameState('idle');
    hapticFeedback.trigger('light');
  };

  // Start multiplayer round
  const startMultiplayerRound = () => {
    setRoundState('countdown');
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Random delay before GO (1-3 seconds)
          const delay = Math.random() * 2000 + 1000;
          setTimeout(() => {
            setRoundState('ready');
            startTimeRef.current = Date.now();
            hapticFeedback.trigger('success');
          }, delay);
          return 0;
        }
        hapticFeedback.trigger('light');
        return prev - 1;
      });
    }, 1000);
  };

  // Handle multiplayer tap
  const handleMultiplayerTap = () => {
    if (roundState !== 'ready') {
      // Early tap
      setReactionTime(-1);
      setRoundState('tapped');
      hapticFeedback.trigger('error');

      // Send action to server
      socketManager.sendPlayerAction({
        roomId: matchData!.roomId,
        action: {
          type: 'tap',
          reactionTime: -1,
          timestamp: Date.now(),
          isValid: false,
        },
        timestamp: Date.now(),
      });

      return;
    }

    // Valid tap
    const time = Date.now() - startTimeRef.current;
    setReactionTime(time);
    setRoundState('tapped');
    hapticFeedback.trigger('success');

    // Send action to server
    const myResult: RoundResult = {
      playerId: user!.id,
      reactionTime: time,
      timestamp: Date.now(),
      isValid: true,
    };

    socketManager.sendPlayerAction({
      roomId: matchData!.roomId,
      action: {
        type: 'tap',
        reactionTime: time,
        timestamp: Date.now(),
        isValid: true,
      },
      timestamp: Date.now(),
    });

    setRoundResults(prev => [...prev, myResult]);
  };

  // Evaluate round results
  const evaluateRound = (opponentResult: RoundResult) => {
    const myResult = roundResults.find(r => r.playerId === user?.id);

    if (!myResult) return;

    // Compare reaction times
    let roundWinner: 'me' | 'opponent' | 'draw';

    if (!myResult.isValid && !opponentResult.isValid) {
      roundWinner = 'draw';
    } else if (!myResult.isValid) {
      roundWinner = 'opponent';
    } else if (!opponentResult.isValid) {
      roundWinner = 'me';
    } else if (myResult.reactionTime < opponentResult.reactionTime) {
      roundWinner = 'me';
    } else if (myResult.reactionTime > opponentResult.reactionTime) {
      roundWinner = 'opponent';
    } else {
      roundWinner = 'draw';
    }

    // Update scores
    if (roundWinner === 'me') {
      setMyScore(prev => prev + 1);
    } else if (roundWinner === 'opponent') {
      setOpponentScore(prev => prev + 1);
    }

    // Check if game is over (best of 3)
    if (currentRound >= 3) {
      // Game over
      setTimeout(() => {
        endMultiplayerGame();
      }, 2000);
    } else {
      // Next round
      setTimeout(() => {
        setCurrentRound(prev => prev + 1);
        setRoundResults([]);
        setReactionTime(null);
        startMultiplayerRound();
      }, 3000);
    }
  };

  // End multiplayer game
  const endMultiplayerGame = () => {
    const winnerId = myScore > opponentScore ? user!.id : opponent!.userId;
    const isDraw = myScore === opponentScore;

    socketManager.endGame({
      roomId: matchData!.roomId,
      results: {
        winnerId: isDraw ? undefined : winnerId,
        loserId: isDraw ? undefined : (winnerId === user!.id ? opponent!.userId : user!.id),
        isDraw,
        scores: {
          [user!.id]: myScore,
          [opponent!.userId]: opponentScore,
        },
      },
    });

    // Submit to backend
    if (sessionId) {
      gamesAPI.endSession(
        sessionId,
        myScore > opponentScore ? 1 : 0,
        {
          mode: 'multiplayer',
          rounds: currentRound,
          myScore,
          opponentScore,
          won: myScore > opponentScore,
        },
        undefined,
        []
      );
    }
  };

  // Solo mode game
  const startSoloGame = () => {
    setGameStarted(true);
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Random delay before GO
          setTimeout(() => {
            setShowGo(true);
            startTimeRef.current = Date.now();
            hapticFeedback.trigger('success');
          }, Math.random() * 2000 + 1000);
          return 0;
        }
        hapticFeedback.trigger('light');
        return prev - 1;
      });
    }, 1000);
  };

  const handleSoloTap = () => {
    if (!showGo) {
      // Early tap - penalty
      setReactionTime(-1);
      hapticFeedback.trigger('error');
      return;
    }

    const time = Date.now() - startTimeRef.current;
    setReactionTime(time);
    hapticFeedback.trigger('success');

    // Update personal best
    if (!personalBest || time < personalBest) {
      setPersonalBest(time);
    }

    // Reset for next round
    setTimeout(() => {
      setGameStarted(false);
      setShowGo(false);
      setReactionTime(null);
      setCountdown(3);
    }, 3000);
  };

  const resetGame = () => {
    setGameState('idle');
    setMatchData(null);
    setOpponent(null);
    setOpponentReady(false);
    setCurrentRound(1);
    setMyScore(0);
    setOpponentScore(0);
    setRoundResults([]);
    setReactionTime(null);
    setRoundState('waiting');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚡ Tap Duel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Mode Selector */}
      {gameState === 'idle' && (
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, gameMode === 'solo' && styles.modeButtonActive]}
            onPress={() => setGameMode('solo')}
          >
            <Text style={[styles.modeText, gameMode === 'solo' && styles.modeTextActive]}>
              SOLO
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, gameMode === 'multiplayer' && styles.modeButtonActive]}
            onPress={() => setGameMode('multiplayer')}
          >
            <Text style={[styles.modeText, gameMode === 'multiplayer' && styles.modeTextActive]}>
              1v1
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Finding Match */}
        {gameState === 'finding_match' && (
          <View style={styles.matchmaking}>
            <ActivityIndicator size="large" color="#667EEA" />
            <Text style={styles.matchmakingText}>Finding opponent...</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelMatchmaking}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Match Found */}
        {gameState === 'match_found' && opponent && (
          <View style={styles.matchFound}>
            <Text style={styles.matchFoundTitle}>Match Found!</Text>
            <Text style={styles.opponentName}>
              {opponent.username || 'Anonymous'}
            </Text>
            {opponent.mmr && (
              <Text style={styles.opponentMMR}>MMR: {opponent.mmr}</Text>
            )}
            <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 20 }} />
            <Text style={styles.joiningText}>Joining game...</Text>
          </View>
        )}

        {/* In Game - Multiplayer */}
        {gameState === 'in_game' && gameMode === 'multiplayer' && (
          <>
            {/* Scoreboard */}
            <View style={styles.scoreboard}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>You</Text>
                <Text style={styles.scoreValue}>{myScore}</Text>
              </View>
              <Text style={styles.roundIndicator}>Round {currentRound}/3</Text>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>{opponent?.username || 'Opponent'}</Text>
                <Text style={styles.scoreValue}>{opponentScore}</Text>
              </View>
            </View>

            {/* Countdown */}
            {roundState === 'countdown' && countdown > 0 && (
              <Animated.View style={[styles.countdown, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </Animated.View>
            )}

            {/* Ready to Tap */}
            {roundState === 'ready' && (
              <TouchableOpacity style={styles.tapArea} onPress={handleMultiplayerTap} activeOpacity={1}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.goGradient}>
                  <Text style={styles.goText}>GO!</Text>
                  <Text style={styles.tapHint}>TAP NOW!</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Round Result */}
            {roundState === 'tapped' && reactionTime !== null && (
              <View style={styles.result}>
                {reactionTime === -1 ? (
                  <>
                    <Text style={styles.resultTextBad}>TOO EARLY!</Text>
                    <Text style={styles.resultSubtext}>Wait for GO signal</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.resultTextGood}>{reactionTime}ms</Text>
                    <Text style={styles.resultSubtext}>Waiting for opponent...</Text>
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* Solo Mode */}
        {gameState === 'idle' && gameMode === 'solo' && (
          <>
            {!gameStarted && !reactionTime && (
              <TouchableOpacity style={styles.startButton} onPress={startSoloGame}>
                <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.startGradient}>
                  <Text style={styles.startText}>START GAME</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {countdown > 0 && gameStarted && (
              <Animated.View style={[styles.countdown, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </Animated.View>
            )}

            {showGo && (
              <TouchableOpacity style={styles.tapArea} onPress={handleSoloTap} activeOpacity={1}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.goGradient}>
                  <Text style={styles.goText}>GO!</Text>
                  <Text style={styles.tapHint}>TAP NOW!</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {reactionTime !== null && (
              <View style={styles.result}>
                {reactionTime === -1 ? (
                  <>
                    <Text style={styles.resultTextBad}>TOO EARLY!</Text>
                    <Text style={styles.resultSubtext}>Wait for GO signal</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.resultTextGood}>{reactionTime}ms</Text>
                    <Text style={styles.resultSubtext}>
                      {reactionTime < 200 ? 'Lightning Fast! ⚡' :
                       reactionTime < 300 ? 'Great Reaction! 👍' :
                       'Good Try! 👌'}
                    </Text>
                    {personalBest && reactionTime <= personalBest && (
                      <Text style={styles.personalBest}>🏆 New Personal Best!</Text>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        )}

        {/* Start Multiplayer Button */}
        {gameState === 'idle' && gameMode === 'multiplayer' && (
          <TouchableOpacity style={styles.startButton} onPress={startMatchmaking}>
            <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.startGradient}>
              <Text style={styles.startText}>FIND MATCH</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>
          {gameMode === 'solo' ? 'Solo Mode:' : 'Multiplayer Mode:'}
        </Text>
        {gameMode === 'solo' ? (
          <>
            <Text style={styles.instructionText}>• Wait for countdown (3, 2, 1)</Text>
            <Text style={styles.instructionText}>• Tap immediately when you see "GO!"</Text>
            <Text style={styles.instructionText}>• Fastest reaction time wins!</Text>
            <Text style={styles.instructionText}>• Early tap = penalty</Text>
            {personalBest && (
              <Text style={styles.personalBestDisplay}>
                Personal Best: {personalBest}ms
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.instructionText}>• Best of 3 rounds</Text>
            <Text style={styles.instructionText}>• Synchronized countdown</Text>
            <Text style={styles.instructionText}>• Server validates timing</Text>
            <Text style={styles.instructionText}>• Entry fee: 50 coins</Text>
          </>
        )}
      </View>

      {/* Custom Modal (replaces Alert.alert) */}
      <Modal visible={modalState.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name={modalState.type === 'error' ? 'alert-circle' : modalState.type === 'success' ? 'checkmark-circle' : 'information-circle'} 
              size={48} 
              color={modalState.type === 'error' ? '#FF6B6B' : modalState.type === 'success' ? '#4ECDC4' : '#667EEA'} 
              style={{ alignSelf: 'center', marginBottom: 16 }}
            />
            <Text style={styles.modalTitle}>{modalState.title}</Text>
            <Text style={[styles.resultSubtext, { textAlign: 'center', marginBottom: 24 }]}>{modalState.message}</Text>
            <TouchableOpacity 
              onPress={() => setModalState(prev => ({ ...prev, visible: false }))} 
              style={styles.confirmButton}
            >
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Particle Effects */}
      {particleState?.show && particleState.type === 'confetti' && (
        <ConfettiParticles 
          x={particleState.x} 
          y={particleState.y} 
          onComplete={() => setParticleState(null)} 
        />
      )}

      {/* FPS Counter (dev only) */}
      {__DEV__ && (
        <View style={{ position: 'absolute', top: 100, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 8, borderRadius: 8 }}>
          <Text style={{ color: fps >= 55 ? '#10B981' : fps >= 30 ? '#F59E0B' : '#EF4444', fontSize: 14, fontWeight: '600' }}>
            FPS: {fps}
          </Text>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#667EEA',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  matchmaking: {
    alignItems: 'center',
  },
  matchmakingText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  matchFound: {
    alignItems: 'center',
  },
  matchFoundTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 20,
  },
  opponentName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  opponentMMR: {
    fontSize: 16,
    color: '#8B949E',
    marginTop: 8,
  },
  joiningText: {
    fontSize: 14,
    color: '#8B949E',
    marginTop: 8,
  },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roundIndicator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA',
  },
  startButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  startGradient: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  startText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  countdown: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 80,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tapArea: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  goGradient: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  goText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  tapHint: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  result: {
    alignItems: 'center',
  },
  resultTextGood: {
    fontSize: 64,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 16,
  },
  resultTextBad: {
    fontSize: 48,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 16,
  },
  resultSubtext: {
    fontSize: 20,
    color: '#8B949E',
  },
  personalBest: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: 12,
  },
  instructions: {
    backgroundColor: '#1F1F1F',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 8,
  },
  personalBestDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
