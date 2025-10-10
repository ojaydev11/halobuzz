/**
 * BuzzArena - 1v1 Competitive Arena
 * PRO TIER - 500-5000 coins entry, 10x multiplier
 *
 * Features:
 * - MMR-based 1v1 matchmaking
 * - Best of 3 rounds
 * - Lane control + timing mechanics
 * - Server-adjudicated results
 * - Real-time Socket.IO multiplayer
 * - Skill-based gameplay
 * - Ranked progression
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Canvas, Group, Circle, Rect, Line, vec } from '@shopify/react-native-skia';
import { gamesAPI } from '../Services/GamesAPI';
import { socketManager } from '../Services/SocketManager';
import { useUserStore } from '@/src/stores/userStore';
import { audioManager } from '../Services/AudioManager';
import { hapticFeedback } from '../Components/HapticFeedback';
import { economyClient } from '../Services/EconomyClient';
import { ConfettiParticles, ExplosionParticles } from '../Components/ParticleSystem';
import { prefetchGameAssets } from '../Services/assetsMap';

const { width, height } = Dimensions.get('window');

// Game constants
const GAME_WIDTH = width;
const GAME_HEIGHT = height - 300;
const LANE_HEIGHT = GAME_HEIGHT / 3;
const PLAYER_SIZE = 40;
const PROJECTILE_SIZE = 20;
const PROJECTILE_SPEED = 8;
const ROUND_DURATION = 60; // seconds

interface Player {
  userId: string;
  username: string;
  lane: number; // 0, 1, or 2
  health: number;
  score: number;
  mmr: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  lane: number;
  playerId: string;
  speed: number;
}

type GameState = 'menu' | 'finding_match' | 'match_found' | 'playing' | 'round_over' | 'game_over';

export default function BuzzArena() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [entryFee, setEntryFee] = useState<number>(500);

  // Match data
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [playerData, setPlayerData] = useState<Player>({
    userId: user?.id || '',
    username: user?.username || 'Player',
    lane: 1,
    health: 3,
    score: 0,
    mmr: 1000,
  });

  // Round data
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsWon, setRoundsWon] = useState<{ player: number; opponent: number }>({
    player: 0,
    opponent: 0,
  });
  const [timeRemaining, setTimeRemaining] = useState<number>(ROUND_DURATION);

  // Gameplay
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
  const fpsFrameCount = useRef(0);
  const fpsLastTime = useRef(Date.now());

  // Refs
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showModal = (type: 'error' | 'info' | 'success', title: string, message: string) => {
    setModalState({ visible: true, type, title, message });
  };

  // Preload assets and audio
  useEffect(() => {
    prefetchGameAssets('buzz-arena');
    audioManager.preloadGameSounds('buzz-arena');
    return () => audioManager.unloadGameSounds('buzz-arena');
  }, []);

  // FPS monitoring
  useEffect(() => {
    const measureFPS = () => {
      fpsFrameCount.current++;
      const now = Date.now();
      const elapsed = now - fpsLastTime.current;
      if (elapsed >= 1000) {
        const currentFPS = Math.round((fpsFrameCount.current * 1000) / elapsed);
        setFps(currentFPS);
        fpsFrameCount.current = 0;
        fpsLastTime.current = now;
      }
      requestAnimationFrame(measureFPS);
    };
    const rafId = requestAnimationFrame(measureFPS);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Entry fee options
  const entryFees = [500, 1000, 2500, 5000];

  // Socket.IO event handlers
  useEffect(() => {
    if (gameState === 'finding_match' || gameState === 'playing') {
      socketManager.on('matchmaking:match_found', handleMatchFound);
      socketManager.on('game:joined', handleGameJoined);
      socketManager.on('game:start', handleGameStart);
      socketManager.on('game:action_broadcast', handleOpponentAction);
      socketManager.on('arena:round_end', handleRoundEnd);
      socketManager.on('game:end', handleGameEnd);
      socketManager.on('game:error', handleGameError);

      return () => {
        socketManager.off('matchmaking:match_found', handleMatchFound);
        socketManager.off('game:joined', handleGameJoined);
        socketManager.off('game:start', handleGameStart);
        socketManager.off('game:action_broadcast', handleOpponentAction);
        socketManager.off('arena:round_end', handleRoundEnd);
        socketManager.off('game:end', handleGameEnd);
        socketManager.off('game:error', handleGameError);
      };
    }
  }, [gameState]);

  // Game loop for projectiles
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        // Update projectiles
        setProjectiles((prev) => {
          const updated = prev
            .map((proj) => {
              const direction = proj.playerId === user?.id ? 1 : -1;
              return {
                ...proj,
                x: proj.x + proj.speed * direction,
              };
            })
            .filter((proj) => proj.x > 0 && proj.x < GAME_WIDTH);

          // Check collisions
          updated.forEach((proj) => {
            if (proj.playerId !== user?.id && proj.x < 80) {
              // Hit player
              if (Math.abs(proj.lane - playerData.lane) < 0.5) {
                setPlayerData((prev) => ({ ...prev, health: Math.max(0, prev.health - 1) }));
                hapticFeedback.trigger('error');
              }
            } else if (proj.playerId === user?.id && proj.x > GAME_WIDTH - 80) {
              // Hit opponent
              if (opponent && Math.abs(proj.lane - opponent.lane) < 0.5) {
                setOpponent((prev) =>
                  prev ? { ...prev, health: Math.max(0, prev.health - 1) } : null
                );
                setPlayerData((prev) => ({ ...prev, score: prev.score + 10 }));
                hapticFeedback.trigger('success');
              }
            }
          });

          return updated.filter(
            (proj) => !(proj.x < 0 || proj.x > GAME_WIDTH)
          );
        });
      }, 1000 / 60);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      };
    }
  }, [gameState, playerData.lane, opponent]);

  // Round timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            endRound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [gameState]);

  const handleMatchFound = (data: any) => {
    console.log('Match found:', data);
    setRoomId(data.roomId);
    setGameState('match_found');
    socketManager.joinGameRoom({ roomId: data.roomId });
  };

  const handleGameJoined = (data: any) => {
    console.log('Joined arena:', data);
    if (data.opponent) {
      setOpponent({
        userId: data.opponent.userId,
        username: data.opponent.username,
        lane: 1,
        health: 3,
        score: 0,
        mmr: data.opponent.mmr || 1000,
      });
    }
    hapticFeedback.trigger('success');
  };

  const handleGameStart = (data: any) => {
    console.log('Arena battle starting:', data);
    setGameState('playing');
    setTimeRemaining(ROUND_DURATION);
    hapticFeedback.trigger('heavy');
  };

  const handleOpponentAction = (data: any) => {
    if (data.playerId === opponent?.userId) {
      if (data.action.type === 'move_lane') {
        setOpponent((prev) => (prev ? { ...prev, lane: data.action.lane } : null));
      } else if (data.action.type === 'shoot') {
        // Add opponent projectile
        setProjectiles((prev) => [
          ...prev,
          {
            id: `proj-${Date.now()}-${Math.random()}`,
            x: GAME_WIDTH - 60,
            y: data.action.lane * LANE_HEIGHT + LANE_HEIGHT / 2,
            lane: data.action.lane,
            playerId: data.playerId,
            speed: PROJECTILE_SPEED,
          },
        ]);
      }
    }
  };

  const handleRoundEnd = (data: any) => {
    console.log('Round ended:', data);
    setGameState('round_over');

    const playerWon = playerData.score > (opponent?.score || 0);
    if (playerWon) {
      setRoundsWon((prev) => ({ ...prev, player: prev.player + 1 }));
      hapticFeedback.trigger('success');
    } else {
      setRoundsWon((prev) => ({ ...prev, opponent: prev.opponent + 1 }));
      hapticFeedback.trigger('error'); // Using error for warning
    }

    // Check if match is over (best of 3)
    if (roundsWon.player === 2 || roundsWon.opponent === 2) {
      setTimeout(() => endMatch(), 3000);
    } else {
      setTimeout(() => startNextRound(), 5000);
    }
  };

  const handleGameEnd = async (data: any) => {
    console.log('Game ended:', data);
    setGameState('game_over');

    // End session
    if (sessionId) {
      try {
        await gamesAPI.endSession(sessionId, playerData.score, {
          roundsWon: roundsWon.player,
          roundsLost: roundsWon.opponent,
          finalHealth: playerData.health,
        });
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
  };

  const handleGameError = (data: any) => {
    console.error('Game error:', data);
    showModal('error', 'Error', data.message || 'An error occurred');
    setGameState('menu');
  };

  const handleStartMatchmaking = async () => {
    if (!socketManager.isSocketConnected()) {
      showModal('error', 'Connection Error', 'Connecting to server...');
      await socketManager.connect();
      setTimeout(handleStartMatchmaking, 1000);
      return;
    }

    setIsLoading(true);
    hapticFeedback.trigger('medium');

    try {
      const response = await gamesAPI.startSession('buzz-arena', entryFee, 'multiplayer');
      setSessionId(response.data.sessionId);

      socketManager.joinMatchmaking({
        gameId: 'buzz-arena',
        mode: 'ranked',
      });

      setGameState('finding_match');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to start matchmaking:', error);
      showModal('error', 'Error', error.response?.data?.error || 'Failed to start matchmaking');
      setIsLoading(false);
    }
  };

  const handleCancelMatchmaking = () => {
    socketManager.leaveMatchmaking({ gameId: 'buzz-arena' });
    if (roomId) {
      socketManager.leaveGameRoom({ roomId });
    }
    setGameState('menu');
    hapticFeedback.trigger('light');
  };

  const handleMoveLane = (newLane: number) => {
    if (gameState !== 'playing' || !roomId) return;

    setPlayerData((prev) => ({ ...prev, lane: newLane }));
    hapticFeedback.trigger('light');

    // Broadcast move
    socketManager.sendPlayerAction({
      roomId,
      action: {
        type: 'move_lane',
        lane: newLane,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  };

  const handleShoot = () => {
    if (gameState !== 'playing' || !roomId) return;

    hapticFeedback.trigger('medium');

    // Add projectile
    setProjectiles((prev) => [
      ...prev,
      {
        id: `proj-${Date.now()}`,
        x: 60,
        y: playerData.lane * LANE_HEIGHT + LANE_HEIGHT / 2,
        lane: playerData.lane,
        playerId: user?.id || '',
        speed: PROJECTILE_SPEED,
      },
    ]);

    // Broadcast shoot
    socketManager.sendPlayerAction({
      roomId,
      action: {
        type: 'shoot',
        lane: playerData.lane,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  };

  const endRound = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    // Notify server
    if (roomId) {
      socketManager.sendPlayerAction({
        roomId,
        action: {
          type: 'round_complete',
          score: playerData.score,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }
  };

  const startNextRound = () => {
    setCurrentRound((prev) => prev + 1);
    setPlayerData((prev) => ({ ...prev, health: 3, score: 0 }));
    setOpponent((prev) => (prev ? { ...prev, health: 3, score: 0 } : null));
    setProjectiles([]);
    setTimeRemaining(ROUND_DURATION);
    setGameState('playing');
  };

  const endMatch = () => {
    if (roomId && socketManager) {
      socketManager.endGame({
        roomId,
        results: {
          winnerId: roundsWon.player > roundsWon.opponent ? user?.id : opponent?.userId,
          loserId: roundsWon.player > roundsWon.opponent ? opponent?.userId : user?.id,
          scores: {
            [user?.id || '']: playerData.score,
            [opponent?.userId || '']: opponent?.score || 0,
          },
        },
      });
    }
    setGameState('game_over');
  };

  // Render functions
  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <LinearGradient colors={['#FDC830', '#F37335']} style={styles.heroSection}>
        <Ionicons name="trophy-outline" size={80} color="#FFFFFF" />
        <Text style={styles.heroTitle}>⚔️ Buzz Arena</Text>
        <Text style={styles.heroBadge}>PRO TIER</Text>
        <Text style={styles.mmrText}>Your MMR: {playerData.mmr}</Text>
      </LinearGradient>

      <View style={styles.menuSection}>
        <Text style={styles.menuTitle}>Select Entry Fee</Text>
        <View style={styles.entryFeesGrid}>
          {entryFees.map((fee) => (
            <TouchableOpacity
              key={fee}
              style={[styles.feeButton, entryFee === fee && styles.feeButtonSelected]}
              onPress={() => {
                setEntryFee(fee);
                hapticFeedback.trigger('light');
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
          <Ionicons name="people-outline" size={20} color="#FDC830" />
          <Text style={styles.infoText}>1v1 competitive battles</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="trophy-outline" size={20} color="#FDC830" />
          <Text style={styles.infoText}>Best of 3 rounds format</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="podium-outline" size={20} color="#FDC830" />
          <Text style={styles.infoText}>MMR-based matchmaking</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="star-outline" size={20} color="#FDC830" />
          <Text style={styles.infoText}>Winner takes 10x multiplier</Text>
        </View>
      </View>
    </View>
  );

  const renderFindingMatch = () => (
    <View style={styles.centerContainer}>
      <LinearGradient colors={['#FDC830', '#F37335']} style={styles.findingCard}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.findingTitle}>Finding Opponent...</Text>
        <Text style={styles.findingText}>Matching based on your MMR: {playerData.mmr}</Text>
      </LinearGradient>

      <TouchableOpacity style={styles.cancelButton} onPress={handleCancelMatchmaking}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMatchFound = () => (
    <View style={styles.centerContainer}>
      <LinearGradient colors={['#FDC830', '#F37335']} style={styles.matchFoundCard}>
        <Ionicons name="flash" size={60} color="#FFFFFF" />
        <Text style={styles.matchFoundTitle}>Match Found!</Text>
        {opponent && (
          <>
            <Text style={styles.opponentName}>{opponent.username}</Text>
            <Text style={styles.opponentMMR}>MMR: {opponent.mmr}</Text>
          </>
        )}
        <Text style={styles.matchFoundText}>Starting soon...</Text>
      </LinearGradient>
    </View>
  );

  const renderGame = () => (
    <View style={styles.gameContainer}>
      {/* Match Header */}
      <View style={styles.matchHeader}>
        <View style={styles.playerCard}>
          <Text style={styles.playerName}>{playerData.username}</Text>
          <Text style={styles.playerHealth}>❤️ {playerData.health}</Text>
          <Text style={styles.playerScore}>{playerData.score}</Text>
        </View>

        <View style={styles.centerInfo}>
          <Text style={styles.roundText}>
            Round {currentRound}/3
          </Text>
          <Text style={styles.timerText}>{timeRemaining}s</Text>
          <Text style={styles.scoreText}>
            {roundsWon.player} - {roundsWon.opponent}
          </Text>
        </View>

        <View style={styles.playerCard}>
          <Text style={styles.playerName}>{opponent?.username || 'Opponent'}</Text>
          <Text style={styles.playerHealth}>❤️ {opponent?.health || 3}</Text>
          <Text style={styles.playerScore}>{opponent?.score || 0}</Text>
        </View>
      </View>

      {/* Game Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <Group>
            {/* Lane dividers */}
            <Line
              p1={vec(0, LANE_HEIGHT)}
              p2={vec(GAME_WIDTH, LANE_HEIGHT)}
              color="rgba(255,255,255,0.2)"
              style="stroke"
              strokeWidth={2}
            />
            <Line
              p1={vec(0, LANE_HEIGHT * 2)}
              p2={vec(GAME_WIDTH, LANE_HEIGHT * 2)}
              color="rgba(255,255,255,0.2)"
              style="stroke"
              strokeWidth={2}
            />

            {/* Player */}
            <Circle
              cx={60}
              cy={playerData.lane * LANE_HEIGHT + LANE_HEIGHT / 2}
              r={PLAYER_SIZE / 2}
              color="#4FACFE"
            />

            {/* Opponent */}
            {opponent && (
              <Circle
                cx={GAME_WIDTH - 60}
                cy={opponent.lane * LANE_HEIGHT + LANE_HEIGHT / 2}
                r={PLAYER_SIZE / 2}
                color="#F37335"
              />
            )}

            {/* Projectiles */}
            {projectiles.map((proj) => (
              <Circle
                key={proj.id}
                cx={proj.x}
                cy={proj.y}
                r={PROJECTILE_SIZE / 2}
                color={proj.playerId === user?.id ? '#4FACFE' : '#F37335'}
              />
            ))}
          </Group>
        </Canvas>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.laneButtons}>
          {[0, 1, 2].map((lane) => (
            <TouchableOpacity
              key={lane}
              style={[styles.laneButton, playerData.lane === lane && styles.laneButtonActive]}
              onPress={() => handleMoveLane(lane)}
            >
              <Text style={styles.laneButtonText}>Lane {lane + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.shootButton} onPress={handleShoot}>
          <LinearGradient colors={['#FDC830', '#F37335']} style={styles.shootGradient}>
            <Ionicons name="flash" size={32} color="#FFFFFF" />
            <Text style={styles.shootText}>SHOOT</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRoundOver = () => {
    const won = playerData.score > (opponent?.score || 0);
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={won ? ['#43E97B', '#38F9D7'] : ['#FF4444', '#FF6B6B']}
          style={styles.roundOverCard}
        >
          <Ionicons name={won ? 'checkmark-circle' : 'close-circle'} size={80} color="#FFFFFF" />
          <Text style={styles.roundOverTitle}>
            Round {currentRound} {won ? 'Won!' : 'Lost'}
          </Text>
          <Text style={styles.roundOverScore}>
            {playerData.score} - {opponent?.score || 0}
          </Text>
          <Text style={styles.roundOverText}>
            Series: {roundsWon.player} - {roundsWon.opponent}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderGameOver = () => {
    const won = roundsWon.player > roundsWon.opponent;
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={won ? ['#43E97B', '#38F9D7'] : ['#FDC830', '#F37335']}
          style={styles.gameOverCard}
        >
          <Ionicons name={won ? 'trophy' : 'medal'} size={80} color="#FFFFFF" />
          <Text style={styles.gameOverTitle}>{won ? '🎉 Victory!' : 'Defeat'}</Text>
          <Text style={styles.gameOverSeries}>
            Series Result: {roundsWon.player} - {roundsWon.opponent}
          </Text>
          <Text style={styles.gameOverReward}>
            {won ? `Reward: ${entryFee * 10} coins` : 'Better luck next time!'}
          </Text>
        </LinearGradient>

        <TouchableOpacity style={styles.playAgainButton} onPress={() => setGameState('menu')}>
          <LinearGradient colors={['#FDC830', '#F37335']} style={styles.playAgainGradient}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Back to Games</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {gameState === 'menu' && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚔️ Buzz Arena</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {gameState === 'menu' && renderMenu()}
      {gameState === 'finding_match' && renderFindingMatch()}
      {gameState === 'match_found' && renderMatchFound()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'round_over' && renderRoundOver()}
      {gameState === 'game_over' && renderGameOver()}

      {gameState === 'menu' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartMatchmaking}
          disabled={isLoading}
        >
          <LinearGradient colors={['#FDC830', '#F37335']} style={styles.startGradient}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="flash" size={24} color="#FFFFFF" />
                <Text style={styles.startText}>Find Match ({entryFee} coins)</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )}

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
            <Text style={[styles.modalMessage, { textAlign: 'center', marginBottom: 24 }]}>{modalState.message}</Text>
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
  menuContainer: {
    flex: 1,
    padding: 20,
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
  mmrText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  menuSection: {
    marginBottom: 24,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  entryFeesGrid: {
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
    borderColor: '#FDC830',
    backgroundColor: 'rgba(253, 200, 48, 0.1)',
  },
  feeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B949E',
  },
  feeTextSelected: {
    color: '#FDC830',
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
  findingCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  findingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  findingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
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
  matchFoundCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
  },
  matchFoundTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  opponentName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  opponentMMR: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  matchFoundText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  gameContainer: {
    flex: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerCard: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerHealth: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4444',
    marginTop: 4,
  },
  playerScore: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4FACFE',
    marginTop: 4,
  },
  centerInfo: {
    alignItems: 'center',
    flex: 1,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FDC830',
    marginTop: 4,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B949E',
    marginTop: 4,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  controlsContainer: {
    padding: 20,
    gap: 12,
  },
  laneButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  laneButton: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  laneButtonActive: {
    borderColor: '#4FACFE',
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  laneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shootButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  shootGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  shootText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roundOverCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
  },
  roundOverTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  roundOverScore: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roundOverText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
  gameOverSeries: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gameOverReward: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
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
  modalMessage: {
    fontSize: 16,
    color: '#8B949E',
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
