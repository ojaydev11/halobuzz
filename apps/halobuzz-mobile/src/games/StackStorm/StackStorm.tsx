/**
 * StackStorm - Physics-Based Block Stacker
 * CORE TIER - 100-1000 coins entry, 5x multiplier
 *
 * Features:
 * - Real 2D physics simulation with matter.js
 * - Progressive difficulty (speed + wind)
 * - Perfect stack bonus system
 * - Tower stability detection
 * - Combo multipliers for streaks
 * - Real-time height tracking
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
import { Canvas, Group, Rect, vec, RoundedRect } from '@shopify/react-native-skia';
import Matter from 'matter-js';
import { gamesAPI } from '../Services/GamesAPI';
import { useUserStore } from '@/src/stores/userStore';
import { audioManager } from '../Services/AudioManager';
import { hapticFeedback } from '../Components/HapticFeedback';
import { economyClient } from '../Services/EconomyClient';
import { ConfettiParticles, SparkleParticles, ExplosionParticles } from '../Components/ParticleSystem';
import { prefetchGameAssets } from '../Services/assetsMap';

const { width, height } = Dimensions.get('window');

// Game constants
const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 30;
const GROUND_HEIGHT = 100;
const GAME_WIDTH = width;
const GAME_HEIGHT = height - 200;
const INITIAL_SPEED = 2;
const MAX_SPEED = 8;
const PERFECT_THRESHOLD = 5; // pixels
const WIND_MIN = -0.5;
const WIND_MAX = 0.5;

interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isStatic: boolean;
  rotation: number;
  body?: Matter.Body;
}

type GameState = 'menu' | 'playing' | 'game_over';

export default function StackStorm() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  // Game state
  const [gameState, setGameState] = useState<GameState>('menu');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [entryFee, setEntryFee] = useState<number>(100);

  // Game data
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [currentBlock, setCurrentBlock] = useState<Block | null>(null);
  const [score, setScore] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(INITIAL_SPEED);
  const [windForce, setWindForce] = useState<number>(0);
  const [perfectStacks, setPerfectStacks] = useState<number>(0);

  // Loading
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
    type: 'confetti' | 'sparkle' | 'explosion';
    x: number;
    y: number;
  } | null>(null);

  // FPS tracking
  const [fps, setFps] = useState(60);
  const fpsFrameCount = useRef(0);
  const fpsLastTime = useRef(Date.now());

  // Refs
  const engineRef = useRef<Matter.Engine | null>(null);
  const worldRef = useRef<Matter.World | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const directionRef = useRef<number>(1); // 1 = right, -1 = left
  const stackedBlocksRef = useRef<Block[]>([]);
  const lastPlacedYRef = useRef<number>(GAME_HEIGHT - GROUND_HEIGHT);

  const showModal = (type: 'error' | 'info' | 'success', title: string, message: string) => {
    setModalState({ visible: true, type, title, message });
  };

  // Preload assets and audio
  useEffect(() => {
    prefetchGameAssets('stack-storm');
    audioManager.preloadGameSounds('stack-storm');
    return () => audioManager.unloadGameSounds('stack-storm');
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
  const entryFees = [100, 250, 500, 1000];

  // Block colors
  const blockColors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
  ];

  // Initialize matter.js physics engine
  useEffect(() => {
    if (gameState === 'playing') {
      // Create engine and world
      engineRef.current = Matter.Engine.create({
        gravity: { x: 0, y: 1 },
      });
      worldRef.current = engineRef.current.world;

      // Create ground
      const ground = Matter.Bodies.rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT - GROUND_HEIGHT / 2,
        GAME_WIDTH,
        GROUND_HEIGHT,
        {
          isStatic: true,
          label: 'ground',
        }
      );
      Matter.World.add(worldRef.current, ground);

      // Add walls
      const leftWall = Matter.Bodies.rectangle(-10, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
        isStatic: true,
      });
      const rightWall = Matter.Bodies.rectangle(
        GAME_WIDTH + 10,
        GAME_HEIGHT / 2,
        20,
        GAME_HEIGHT,
        { isStatic: true }
      );
      Matter.World.add(worldRef.current, [leftWall, rightWall]);

      // Start with first block
      spawnMovingBlock();

      // Physics update loop
      gameLoopRef.current = setInterval(() => {
        if (engineRef.current) {
          Matter.Engine.update(engineRef.current, 1000 / 60);

          // Apply wind force to non-static blocks
          if (windForce !== 0) {
            stackedBlocksRef.current.forEach((block) => {
              if (block.body && !block.isStatic) {
                Matter.Body.applyForce(block.body, block.body.position, {
                  x: windForce * 0.001,
                  y: 0,
                });
              }
            });
          }

          // Update block positions from physics bodies
          setBlocks((prev) => {
            return prev.map((block) => {
              if (block.body && !block.isStatic) {
                return {
                  ...block,
                  x: block.body.position.x,
                  y: block.body.position.y,
                  rotation: block.body.angle,
                };
              }
              return block;
            });
          });

          // Check for tower collapse (any block falls too far)
          const collapsed = stackedBlocksRef.current.some((block) => {
            if (block.body) {
              return block.body.position.y > GAME_HEIGHT || block.body.position.x < -50 || block.body.position.x > GAME_WIDTH + 50;
            }
            return false;
          });

          if (collapsed) {
            endGame();
          }
        }
      }, 1000 / 60);

      return () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        if (engineRef.current) Matter.Engine.clear(engineRef.current);
      };
    }
  }, [gameState, windForce]);

  // Move current block
  useEffect(() => {
    if (gameState === 'playing' && currentBlock && !currentBlock.isStatic) {
      const moveInterval = setInterval(() => {
        setCurrentBlock((prev) => {
          if (!prev) return prev;

          let newX = prev.x + speed * directionRef.current;

          // Bounce at edges
          if (newX <= BLOCK_WIDTH / 2) {
            newX = BLOCK_WIDTH / 2;
            directionRef.current = 1;
          } else if (newX >= GAME_WIDTH - BLOCK_WIDTH / 2) {
            newX = GAME_WIDTH - BLOCK_WIDTH / 2;
            directionRef.current = -1;
          }

          return { ...prev, x: newX };
        });
      }, 16); // ~60 FPS

      return () => clearInterval(moveInterval);
    }
  }, [gameState, currentBlock, speed]);

  const spawnMovingBlock = () => {
    const newY = lastPlacedYRef.current - BLOCK_HEIGHT - 10;
    const colorIndex = stackedBlocksRef.current.length % blockColors.length;

    const block: Block = {
      id: `block-${Date.now()}`,
      x: GAME_WIDTH / 2,
      y: newY,
      width: BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      color: blockColors[colorIndex],
      isStatic: false,
      rotation: 0,
    };

    setCurrentBlock(block);
    setBlocks((prev) => [...prev, block]);
  };

  const handleDrop = () => {
    if (!currentBlock || !worldRef.current) return;

    hapticFeedback.trigger('medium');

    // Create physics body for dropped block
    const body = Matter.Bodies.rectangle(
      currentBlock.x,
      currentBlock.y,
      BLOCK_WIDTH,
      BLOCK_HEIGHT,
      {
        restitution: 0.3,
        friction: 0.8,
        density: 0.01,
        label: currentBlock.id,
      }
    );

    Matter.World.add(worldRef.current, body);

    // Update block with physics body
    const droppedBlock: Block = {
      ...currentBlock,
      body,
      isStatic: false,
    };

    stackedBlocksRef.current.push(droppedBlock);
    setCurrentBlock(null);

    // Check placement accuracy
    const lastBlock = stackedBlocksRef.current[stackedBlocksRef.current.length - 2];
    if (lastBlock) {
      const offset = Math.abs(droppedBlock.x - lastBlock.x);
      const isPerfect = offset <= PERFECT_THRESHOLD;

      if (isPerfect) {
        setPerfectStacks((prev) => prev + 1);
        setCombo((prev) => prev + 1);
        setScore((prev) => prev + 100 * (combo + 1));
        hapticFeedback.trigger('success');
      } else {
        setCombo(0);
        setScore((prev) => prev + 50);
      }
    } else {
      setScore((prev) => prev + 50);
    }

    // Update height
    lastPlacedYRef.current = droppedBlock.y;
    const towerHeight = GAME_HEIGHT - GROUND_HEIGHT - droppedBlock.y;
    setHeight(Math.max(height, Math.floor(towerHeight)));

    // Increase difficulty
    const blocksPlaced = stackedBlocksRef.current.length;
    if (blocksPlaced % 5 === 0) {
      setSpeed((prev) => Math.min(prev + 0.5, MAX_SPEED));
      // Add wind after 10 blocks
      if (blocksPlaced >= 10) {
        setWindForce(Math.random() * (WIND_MAX - WIND_MIN) + WIND_MIN);
      }
    }

    // Spawn next block after delay
    setTimeout(() => {
      if (gameState === 'playing') {
        spawnMovingBlock();
      }
    }, 800);
  };

  const endGame = () => {
    if (gameState !== 'playing') return;

    setGameState('game_over');
    hapticFeedback.trigger('error'); // Using error for warning

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    // End session
    if (sessionId) {
      gamesAPI
        .endSession(sessionId, score, {
          height,
          blocksPlaced: stackedBlocksRef.current.length,
          perfectStacks,
          maxCombo: combo,
        })
        .catch((error) => {
          console.error('Failed to end session:', error);
        });
    }
  };

  const handleStartGame = async () => {
    setIsLoading(true);
    hapticFeedback.trigger('medium');

    try {
      const response = await gamesAPI.startSession('stack-storm', entryFee, 'solo');
      setSessionId(response.data.sessionId);

      // Reset game state
      setBlocks([]);
      setCurrentBlock(null);
      setScore(0);
      setHeight(0);
      setCombo(0);
      setSpeed(INITIAL_SPEED);
      setWindForce(0);
      setPerfectStacks(0);
      stackedBlocksRef.current = [];
      lastPlacedYRef.current = GAME_HEIGHT - GROUND_HEIGHT;
      directionRef.current = 1;

      setGameState('playing');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to start game:', error);
      showModal('error', 'Error', error.response?.data?.error || 'Failed to start game');
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setGameState('menu');
    setBlocks([]);
    setCurrentBlock(null);
    stackedBlocksRef.current = [];
  };

  // Render menu
  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <LinearGradient colors={['#FA8BFF', '#2BD2FF']} style={styles.heroSection}>
        <Ionicons name="layers-outline" size={80} color="#FFFFFF" />
        <Text style={styles.heroTitle}>📦 StackStorm</Text>
        <Text style={styles.heroBadge}>CORE TIER</Text>
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
          <Ionicons name="cube-outline" size={20} color="#FA8BFF" />
          <Text style={styles.infoText}>Stack blocks to build the tallest tower</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="flash-outline" size={20} color="#FA8BFF" />
          <Text style={styles.infoText}>Wind increases after 10 blocks</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="star-outline" size={20} color="#FA8BFF" />
          <Text style={styles.infoText}>Perfect placement = combo bonus</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="trophy-outline" size={20} color="#FA8BFF" />
          <Text style={styles.infoText}>5x multiplier on entry fee</Text>
        </View>
      </View>
    </View>
  );

  // Render game
  const renderGame = () => (
    <View style={styles.gameContainer}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Height</Text>
          <Text style={styles.statValue}>{height}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Combo</Text>
          <Text style={[styles.statValue, combo > 0 && { color: '#FFD700' }]}>
            {combo > 0 ? `${combo}x 🔥` : '0'}
          </Text>
        </View>
      </View>

      {/* Wind Indicator */}
      {windForce !== 0 && (
        <View style={styles.windIndicator}>
          <Ionicons
            name={windForce > 0 ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color="#2BD2FF"
          />
          <Text style={styles.windText}>
            Wind: {Math.abs(windForce).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Game Canvas */}
      <View style={styles.canvasContainer}>
        <Canvas style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}>
          <Group>
            {/* Ground */}
            <Rect
              x={0}
              y={GAME_HEIGHT - GROUND_HEIGHT}
              width={GAME_WIDTH}
              height={GROUND_HEIGHT}
              color="#2A2A2A"
            />

            {/* Blocks */}
            {blocks.map((block) => {
              const isCurrentBlock = currentBlock?.id === block.id;
              return (
                <Group key={block.id} transform={[{ translateX: block.x }, { translateY: block.y }, { rotate: block.rotation }]}>
                  <RoundedRect
                    x={-block.width / 2}
                    y={-block.height / 2}
                    width={block.width}
                    height={block.height}
                    r={4}
                    color={block.color}
                    opacity={isCurrentBlock ? 0.8 : 1}
                  />
                </Group>
              );
            })}

            {/* Target line (below current block) */}
            {currentBlock && (
              <Rect
                x={0}
                y={currentBlock.y + BLOCK_HEIGHT / 2 + 5}
                width={GAME_WIDTH}
                height={2}
                color="rgba(43, 210, 255, 0.5)"
              />
            )}
          </Group>
        </Canvas>
      </View>

      {/* Drop Button */}
      <TouchableOpacity
        style={styles.dropButton}
        onPress={handleDrop}
        disabled={!currentBlock || currentBlock.isStatic}
      >
        <LinearGradient colors={['#FA8BFF', '#2BD2FF']} style={styles.dropGradient}>
          <Ionicons name="arrow-down-circle" size={32} color="#FFFFFF" />
          <Text style={styles.dropText}>DROP</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Render game over
  const renderGameOver = () => (
    <View style={styles.gameOverContainer}>
      <LinearGradient
        colors={score > 500 ? ['#43E97B', '#38F9D7'] : ['#FA8BFF', '#2BD2FF']}
        style={styles.gameOverCard}
      >
        <Ionicons
          name={score > 500 ? 'trophy' : 'medal'}
          size={80}
          color="#FFFFFF"
        />
        <Text style={styles.gameOverTitle}>Tower Collapsed!</Text>
        <Text style={styles.gameOverScore}>Score: {score}</Text>
        <Text style={styles.gameOverStat}>Height: {height} units</Text>
        <Text style={styles.gameOverStat}>Perfect Stacks: {perfectStacks}</Text>
        <Text style={styles.gameOverStat}>Blocks Placed: {stackedBlocksRef.current.length}</Text>
      </LinearGradient>

      <TouchableOpacity style={styles.playAgainButton} onPress={handleRestart}>
        <LinearGradient colors={['#FA8BFF', '#2BD2FF']} style={styles.playAgainGradient}>
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
      {gameState === 'menu' && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📦 StackStorm</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {gameState === 'menu' && renderMenu()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'game_over' && renderGameOver()}

      {gameState === 'menu' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartGame}
          disabled={isLoading}
        >
          <LinearGradient colors={['#FA8BFF', '#2BD2FF']} style={styles.startGradient}>
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
      {particleState?.show && particleState.type === 'sparkle' && (
        <SparkleParticles 
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
    borderColor: '#FA8BFF',
    backgroundColor: 'rgba(250, 139, 255, 0.1)',
  },
  feeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B949E',
  },
  feeTextSelected: {
    color: '#FA8BFF',
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
  gameContainer: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    padding: 12,
    borderRadius: 12,
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
  windIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(43, 210, 255, 0.2)',
  },
  windText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2BD2FF',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  dropButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  dropText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverCard: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  gameOverScore: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  gameOverStat: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
