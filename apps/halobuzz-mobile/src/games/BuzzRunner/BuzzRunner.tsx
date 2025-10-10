/**
 * Buzz Runner - Endless Runner with Matter.js Physics
 * Progressive difficulty with power-ups and obstacles
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Canvas, Circle, Rect, useValue, runTiming } from '@shopify/react-native-skia';
import Matter from 'matter-js';
import { useGamesStore } from '../Services/GamesStore';
import { useAuth } from '@/store/AuthContext';
import { gamesAPI } from '../Services/GamesAPI';

const { width, height } = Dimensions.get('window');
const GROUND_HEIGHT = 100;
const PLAYER_SIZE = 40;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_HEIGHT = 80;
const COIN_SIZE = 20;
const POWERUP_SIZE = 30;

type GameState = 'idle' | 'playing' | 'paused' | 'gameover';
type PowerUpType = 'magnet' | 'shield' | 'multiplier';

interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'obstacle' | 'coin' | 'powerup';
  powerupType?: PowerUpType;
}

export default function BuzzRunner() {
  const router = useRouter();
  const { user } = useAuth();
  const { triggerHaptic } = useGamesStore();

  // Game State
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(5);
  const [lives, setLives] = useState(3);

  // Player State
  const [playerY, setPlayerY] = useState(height - GROUND_HEIGHT - PLAYER_SIZE);
  const [isJumping, setIsJumping] = useState(false);
  const [velocity, setVelocity] = useState(0);

  // Power-ups
  const [activePowerups, setActivePowerups] = useState<PowerUpType[]>([]);
  const [magnetActive, setMagnetActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [multiplierActive, setMultiplierActive] = useState(false);

  // Game Objects
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);

  // Session
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stake, setStake] = useState(50);

  // Refs
  const gameLoop = useRef<number | null>(null);
  const lastSpawnTime = useRef(0);
  const spawnInterval = useRef(1500);
  const frameCount = useRef(0);

  // Physics Constants
  const GRAVITY = 1.2;
  const JUMP_FORCE = -20;
  const MAX_VELOCITY = 20;

  // Start game
  const startGame = async () => {
    try {
      const response = await gamesAPI.startSession('buzz-runner', stake, 'solo');
      setSessionId(response.data.sessionId);

      // Reset game state
      setGameState('playing');
      setScore(0);
      setDistance(0);
      setCoins(0);
      setSpeed(5);
      setLives(3);
      setPlayerY(height - GROUND_HEIGHT - PLAYER_SIZE);
      setIsJumping(false);
      setVelocity(0);
      setGameObjects([]);
      setActivePowerups([]);
      setMagnetActive(false);
      setShieldActive(false);
      setMultiplierActive(false);
      frameCount.current = 0;
      lastSpawnTime.current = Date.now();

      triggerHaptic('light');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to start game');
    }
  };

  // Jump
  const handleJump = () => {
    if (gameState !== 'playing' || isJumping) return;
    setIsJumping(true);
    setVelocity(JUMP_FORCE);
    triggerHaptic('light');
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    gameLoop.current = setInterval(() => {
      frameCount.current++;

      // Update player physics
      setVelocity(prev => {
        const newVel = Math.min(prev + GRAVITY, MAX_VELOCITY);
        return newVel;
      });

      setPlayerY(prev => {
        const newY = prev + velocity;
        const groundY = height - GROUND_HEIGHT - PLAYER_SIZE;

        if (newY >= groundY) {
          setIsJumping(false);
          return groundY;
        }
        return newY;
      });

      // Move objects
      setGameObjects(prev => {
        const moved = prev.map(obj => ({
          ...obj,
          x: obj.x - speed,
        })).filter(obj => obj.x > -100);

        // Collect coins with magnet
        if (magnetActive) {
          moved.forEach(obj => {
            if (obj.type === 'coin') {
              const dx = (width * 0.2) - obj.x;
              const dy = playerY - obj.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 150) {
                obj.x += dx * 0.1;
                obj.y += dy * 0.1;
              }
            }
          });
        }

        return moved;
      });

      // Spawn new objects
      const now = Date.now();
      if (now - lastSpawnTime.current > spawnInterval.current) {
        spawnObject();
        lastSpawnTime.current = now;

        // Adjust spawn rate based on distance
        if (distance > 500) {
          spawnInterval.current = Math.max(800, 1500 - distance / 10);
        }
      }

      // Check collisions
      checkCollisions();

      // Update score
      setDistance(prev => prev + 1);
      setScore(prev => prev + (multiplierActive ? 2 : 1));

      // Increase speed gradually
      if (frameCount.current % 300 === 0) {
        setSpeed(prev => Math.min(prev + 0.5, 15));
      }
    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoop.current) {
        clearInterval(gameLoop.current);
      }
    };
  }, [gameState, velocity, playerY, speed, distance, magnetActive, multiplierActive]);

  // Spawn objects
  const spawnObject = () => {
    const rand = Math.random();
    const id = Date.now().toString() + Math.random();

    if (rand < 0.5) {
      // Spawn obstacle
      setGameObjects(prev => [...prev, {
        id,
        x: width,
        y: height - GROUND_HEIGHT - OBSTACLE_HEIGHT,
        width: OBSTACLE_WIDTH,
        height: OBSTACLE_HEIGHT,
        type: 'obstacle',
      }]);
    } else if (rand < 0.85) {
      // Spawn coins
      const coinY = height - GROUND_HEIGHT - OBSTACLE_HEIGHT - Math.random() * 100 - 50;
      setGameObjects(prev => [...prev, {
        id,
        x: width,
        y: coinY,
        width: COIN_SIZE,
        height: COIN_SIZE,
        type: 'coin',
      }]);
    } else {
      // Spawn power-up
      const powerups: PowerUpType[] = ['magnet', 'shield', 'multiplier'];
      const powerupType = powerups[Math.floor(Math.random() * powerups.length)];
      setGameObjects(prev => [...prev, {
        id,
        x: width,
        y: height - GROUND_HEIGHT - OBSTACLE_HEIGHT - 80,
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        type: 'powerup',
        powerupType,
      }]);
    }
  };

  // Collision detection
  const checkCollisions = () => {
    const playerBox = {
      x: width * 0.2,
      y: playerY,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
    };

    setGameObjects(prev => {
      const remaining: GameObject[] = [];
      let collected = false;

      prev.forEach(obj => {
        const collides =
          playerBox.x < obj.x + obj.width &&
          playerBox.x + playerBox.width > obj.x &&
          playerBox.y < obj.y + obj.height &&
          playerBox.y + playerBox.height > obj.y;

        if (collides) {
          if (obj.type === 'coin') {
            setCoins(c => c + 1);
            setScore(s => s + 10 * (multiplierActive ? 2 : 1));
            triggerHaptic('light');
            collected = true;
            return; // Don't add to remaining
          } else if (obj.type === 'powerup') {
            activatePowerup(obj.powerupType!);
            triggerHaptic('success');
            collected = true;
            return;
          } else if (obj.type === 'obstacle') {
            if (!shieldActive) {
              setLives(l => {
                const newLives = l - 1;
                if (newLives <= 0) {
                  endGame();
                }
                return newLives;
              });
              triggerHaptic('error');
            } else {
              triggerHaptic('light');
            }
            return; // Remove obstacle
          }
        }

        remaining.push(obj);
      });

      return remaining;
    });
  };

  // Activate power-up
  const activatePowerup = (type: PowerUpType) => {
    setActivePowerups(prev => [...prev, type]);

    if (type === 'magnet') {
      setMagnetActive(true);
      setTimeout(() => {
        setMagnetActive(false);
        setActivePowerups(prev => prev.filter(p => p !== 'magnet'));
      }, 5000);
    } else if (type === 'shield') {
      setShieldActive(true);
      setTimeout(() => {
        setShieldActive(false);
        setActivePowerups(prev => prev.filter(p => p !== 'shield'));
      }, 8000);
    } else if (type === 'multiplier') {
      setMultiplierActive(true);
      setTimeout(() => {
        setMultiplierActive(false);
        setActivePowerups(prev => prev.filter(p => p !== 'multiplier'));
      }, 10000);
    }
  };

  // End game
  const endGame = async () => {
    setGameState('gameover');
    if (gameLoop.current) {
      clearInterval(gameLoop.current);
    }

    if (score > highScore) {
      setHighScore(score);
    }

    // Submit to backend
    if (sessionId) {
      try {
        await gamesAPI.endSession(
          sessionId,
          score,
          {
            distance,
            coins,
            finalSpeed: speed,
            powerupsUsed: activePowerups.length,
          },
          undefined,
          []
        );
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    triggerHaptic('error');
  };

  // Pause game
  const pauseGame = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      if (gameLoop.current) {
        clearInterval(gameLoop.current);
      }
    }
  };

  // Resume game
  const resumeGame = () => {
    if (gameState === 'paused') {
      setGameState('playing');
      lastSpawnTime.current = Date.now();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏃 Buzz Runner</Text>
        {gameState === 'playing' && (
          <TouchableOpacity onPress={pauseGame}>
            <Ionicons name="pause" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {gameState !== 'playing' && <View style={{ width: 40 }} />}
      </View>

      {/* Game Canvas */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <>
          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={styles.statValue}>{score}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{Math.floor(distance / 10)}m</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Coins</Text>
              <Text style={styles.statValue}>{coins}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lives</Text>
              <Text style={styles.statValue}>{'❤️'.repeat(lives)}</Text>
            </View>
          </View>

          {/* Power-ups Active */}
          {activePowerups.length > 0 && (
            <View style={styles.powerupsBar}>
              {magnetActive && (
                <View style={[styles.powerupBadge, { backgroundColor: '#6A82FB' }]}>
                  <Ionicons name="magnet" size={16} color="#FFFFFF" />
                  <Text style={styles.powerupText}>Magnet</Text>
                </View>
              )}
              {shieldActive && (
                <View style={[styles.powerupBadge, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="shield" size={16} color="#FFFFFF" />
                  <Text style={styles.powerupText}>Shield</Text>
                </View>
              )}
              {multiplierActive && (
                <View style={[styles.powerupBadge, { backgroundColor: '#FFD700' }]}>
                  <Ionicons name="star" size={16} color="#000000" />
                  <Text style={[styles.powerupText, { color: '#000000' }]}>2x</Text>
                </View>
              )}
            </View>
          )}

          {/* Game View */}
          <TouchableOpacity
            style={styles.gameView}
            onPress={handleJump}
            activeOpacity={1}
          >
            <Canvas style={styles.canvas}>
              {/* Ground */}
              <Rect
                x={0}
                y={height - GROUND_HEIGHT}
                width={width}
                height={GROUND_HEIGHT}
                color="#2F2F2F"
              />

              {/* Player */}
              <Circle
                cx={width * 0.2 + PLAYER_SIZE / 2}
                cy={playerY + PLAYER_SIZE / 2}
                r={PLAYER_SIZE / 2}
                color={shieldActive ? '#10B981' : '#FC5C7D'}
              />

              {/* Game Objects */}
              {gameObjects.map(obj => {
                if (obj.type === 'obstacle') {
                  return (
                    <Rect
                      key={obj.id}
                      x={obj.x}
                      y={obj.y}
                      width={obj.width}
                      height={obj.height}
                      color="#EF4444"
                    />
                  );
                } else if (obj.type === 'coin') {
                  return (
                    <Circle
                      key={obj.id}
                      cx={obj.x + obj.width / 2}
                      cy={obj.y + obj.height / 2}
                      r={obj.width / 2}
                      color="#FFD700"
                    />
                  );
                } else if (obj.type === 'powerup') {
                  const color =
                    obj.powerupType === 'magnet' ? '#6A82FB' :
                    obj.powerupType === 'shield' ? '#10B981' : '#FFD700';
                  return (
                    <Circle
                      key={obj.id}
                      cx={obj.x + obj.width / 2}
                      cy={obj.y + obj.height / 2}
                      r={obj.width / 2}
                      color={color}
                    />
                  );
                }
                return null;
              })}
            </Canvas>
          </TouchableOpacity>

          {/* Paused Overlay */}
          {gameState === 'paused' && (
            <View style={styles.pausedOverlay}>
              <Text style={styles.pausedText}>PAUSED</Text>
              <TouchableOpacity style={styles.resumeButton} onPress={resumeGame}>
                <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.resumeGradient}>
                  <Ionicons name="play" size={24} color="#FFFFFF" />
                  <Text style={styles.resumeText}>Resume</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Start Screen */}
      {gameState === 'idle' && (
        <View style={styles.startScreen}>
          <LinearGradient colors={['#FC5C7D', '#6A82FB']} style={styles.heroSection}>
            <Ionicons name="rocket" size={80} color="#FFFFFF" />
            <Text style={styles.title}>Buzz Runner</Text>
            <Text style={styles.subtitle}>Endless Adventure</Text>
          </LinearGradient>

          {highScore > 0 && (
            <View style={styles.highScoreBox}>
              <Text style={styles.highScoreLabel}>High Score</Text>
              <Text style={styles.highScoreValue}>{highScore}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.startGradient}>
              <Text style={styles.startText}>START GAME</Text>
              <Text style={styles.startSubtext}>Entry: {stake} coins</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>How to Play:</Text>
            <Text style={styles.instructionText}>• Tap anywhere to jump</Text>
            <Text style={styles.instructionText}>• Avoid red obstacles</Text>
            <Text style={styles.instructionText}>• Collect gold coins</Text>
            <Text style={styles.instructionText}>• Grab power-ups for boosts</Text>
          </View>
        </View>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <View style={styles.gameoverScreen}>
          <Text style={styles.gameoverText}>GAME OVER</Text>
          <View style={styles.finalStats}>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Score</Text>
              <Text style={styles.finalStatValue}>{score}</Text>
            </View>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Distance</Text>
              <Text style={styles.finalStatValue}>{Math.floor(distance / 10)}m</Text>
            </View>
            <View style={styles.finalStatItem}>
              <Text style={styles.finalStatLabel}>Coins</Text>
              <Text style={styles.finalStatValue}>{coins}</Text>
            </View>
          </View>

          {score > highScore && (
            <Text style={styles.newHighScore}>🏆 New High Score!</Text>
          )}

          <TouchableOpacity style={styles.playAgainButton} onPress={() => setGameState('idle')}>
            <LinearGradient colors={['#667EEA', '#764BA2']} style={styles.playAgainGradient}>
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.playAgainText}>Play Again</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1F1F1F',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#8B949E',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  powerupsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  powerupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  powerupText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gameView: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 40,
  },
  resumeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resumeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    gap: 12,
  },
  resumeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startScreen: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 60,
    borderRadius: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  highScoreBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  highScoreLabel: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 8,
  },
  highScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFD700',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  startGradient: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  startText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  instructions: {
    backgroundColor: '#1F1F1F',
    padding: 20,
    borderRadius: 16,
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
  gameoverScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameoverText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 40,
  },
  finalStats: {
    flexDirection: 'row',
    gap: 30,
    marginBottom: 30,
  },
  finalStatItem: {
    alignItems: 'center',
  },
  finalStatLabel: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 8,
  },
  finalStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  newHighScore: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 30,
  },
  playAgainButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  playAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    gap: 12,
  },
  playAgainText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
