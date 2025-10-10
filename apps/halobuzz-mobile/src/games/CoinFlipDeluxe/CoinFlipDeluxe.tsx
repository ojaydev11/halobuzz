/**
 * 3D Coin Flip Deluxe - E-Sports Grade
 * Full 3D rendering with React Three Fiber
 * Real backend integration with coin transactions
 * Performance optimized for 60 FPS
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as Haptics from 'expo-haptics';
import { useGamesStore } from '../Services/GamesStore';
import { useAuth } from '@/store/AuthContext';
import { gamesAPI } from '../Services/GamesAPI';
import Coin3DModel from './Coin3DModel';
import ParticleEffects from './ParticleEffects';
import { useFlipAnimation } from './useFlipAnimation';

const { width, height } = Dimensions.get('window');

type CoinSide = 'heads' | 'tails';
type GameMode = 'solo' | 'sprint' | 'rush';
type ParticleType = 'trail' | 'landing' | 'win' | 'loss' | null;

export default function CoinFlipDeluxe() {
  const router = useRouter();
  const { user } = useAuth();
  const { triggerHaptic, soundEnabled, hapticsEnabled } = useGamesStore();
  const { animationState, startFlip, resetFlip, getFPSMetrics } = useFlipAnimation();

  // Game State
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [stake, setStake] = useState('100');
  const [balance, setBalance] = useState(0);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [score, setScore] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [particleEffect, setParticleEffect] = useState<ParticleType>(null);
  const [coinPosition, setCoinPosition] = useState({ x: width / 2, y: height / 2 - 100 });

  // Backend State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);

  // Load user balance on mount
  useEffect(() => {
    if (user?.coinBalance !== undefined) {
      setBalance(user.coinBalance);
    }
  }, [user]);

  // Load session history
  useEffect(() => {
    loadSessionHistory();
  }, []);

  const loadSessionHistory = async () => {
    try {
      const response = await gamesAPI.getPlayerSessions(10);
      if (response.success) {
        const coinFlipSessions = response.data.sessions.filter(
          (s: any) => s.gameId === 'coin-flip-deluxe'
        );
        setSessionHistory(coinFlipSessions.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load session history:', err);
    }
  };

  const handleStartGame = async () => {
    if (!selectedSide) {
      Alert.alert('Select a side', 'Please choose Heads or Tails before flipping');
      return;
    }

    const stakeAmount = parseInt(stake) || 100;

    if (stakeAmount > balance) {
      Alert.alert('Insufficient Balance', 'You don\'t have enough coins to play this stake');
      return;
    }

    if (stakeAmount < 25) {
      Alert.alert('Minimum Stake', 'Minimum stake is 25 coins');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Start session on backend
      const response = await gamesAPI.startSession('coin-flip-deluxe', stakeAmount, gameMode);

      if (response.success) {
        setSessionId(response.data.sessionId);

        // Deduct stake from balance immediately
        setBalance(prev => prev - stakeAmount);

        // Start flip animation
        triggerHaptic('medium');

        // Random result (fair 50/50)
        const flipResult: CoinSide = Math.random() > 0.5 ? 'heads' : 'tails';
        setResult(flipResult);
        startFlip(flipResult);

        // Show trail particles during flip
        setParticleEffect('trail');

        // Landing particles after 1 second
        setTimeout(() => {
          setParticleEffect('landing');
          triggerHaptic('heavy');
        }, 1000);

        // Result after 2.5 seconds
        setTimeout(async () => {
          await handleFlipComplete(flipResult, stakeAmount, response.data.sessionId);
        }, 2500);
      }
    } catch (err: any) {
      console.error('Failed to start game:', err);
      setError(err.response?.data?.error || 'Failed to start game');
      Alert.alert('Error', err.response?.data?.error || 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlipComplete = async (flipResult: CoinSide, stakeAmount: number, currentSessionId: string) => {
    const won = flipResult === selectedSide;
    const gameScore = won ? 1 : 0;

    // Show result particles
    setParticleEffect(won ? 'win' : 'loss');

    // Haptic feedback
    if (won) {
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
    }

    // Update local stats
    setScore(prev => prev + gameScore);
    if (won) {
      setWins(prev => prev + 1);
    } else {
      setLosses(prev => prev + 1);
    }

    // Submit to backend
    try {
      const fpsMetrics = getFPSMetrics();
      const metadata = {
        selectedSide,
        result: flipResult,
        won,
        stake: stakeAmount,
      };

      const response = await gamesAPI.endSession(
        currentSessionId,
        gameScore,
        metadata,
        fpsMetrics,
        []
      );

      if (response.success) {
        // Update balance with reward (backend already deducted stake and calculated reward)
        setBalance(response.data.newBalance);

        // Refresh session history
        await loadSessionHistory();
      }
    } catch (err: any) {
      console.error('Failed to end session:', err);
      // Don't show error to user - session is already complete
    }

    // Reset after delay
    setTimeout(() => {
      setParticleEffect(null);
      setResult(null);
      setSelectedSide(null);
      resetFlip();
    }, 3000);
  };

  const renderStakeModal = () => (
    <Modal
      visible={showStakeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowStakeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Set Your Stake</Text>

          <TextInput
            style={styles.stakeInput}
            value={stake}
            onChangeText={setStake}
            keyboardType="numeric"
            placeholder="Enter stake amount"
            placeholderTextColor="#8B949E"
          />

          <View style={styles.quickStakes}>
            {[25, 50, 100, 250].map(amount => (
              <TouchableOpacity
                key={amount}
                style={styles.quickStakeButton}
                onPress={() => setStake(amount.toString())}
              >
                <Text style={styles.quickStakeText}>{amount}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => {
              setShowStakeModal(false);
              triggerHaptic('light');
            }}
          >
            <Text style={styles.confirmButtonText}>Confirm Stake</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>3D Coin Flip Deluxe</Text>
        <TouchableOpacity onPress={() => setShowStakeModal(true)} style={styles.settingsButton}>
          <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
          <Text style={styles.balanceText}>{balance.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      {/* 3D Coin Display */}
      <View style={styles.coinContainer}>
        <Canvas>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} />
            <Environment preset="sunset" />

            <Coin3DModel
              isFlipping={animationState.isFlipping}
              result={result}
              selectedSide={selectedSide}
              onFlipComplete={() => {}}
            />

            <OrbitControls enableZoom={false} enablePan={false} />
          </Suspense>
        </Canvas>

        {/* Particle Effects Overlay */}
        {particleEffect && (
          <ParticleEffects type={particleEffect} coinPosition={coinPosition} />
        )}

        {/* Result Overlay */}
        {result && !animationState.isFlipping && (
          <View style={styles.resultOverlay}>
            <Text
              style={[
                styles.resultText,
                { color: result === selectedSide ? '#10B981' : '#EF4444' },
              ]}
            >
              {result === selectedSide ? '🎉 YOU WIN!' : '😢 YOU LOSE'}
            </Text>
            <Text style={styles.resultSubtext}>{result.toUpperCase()}</Text>
            <Text style={styles.resultAmount}>
              {result === selectedSide
                ? `+${parseInt(stake) * 2} coins`
                : `-${stake} coins`}
            </Text>
          </View>
        )}
      </View>

      {/* Side Selection */}
      <View style={styles.sideSelection}>
        <TouchableOpacity
          style={[
            styles.sideButton,
            selectedSide === 'heads' && styles.sideButtonSelected,
          ]}
          onPress={() => {
            setSelectedSide('heads');
            triggerHaptic('light');
          }}
          disabled={animationState.isFlipping || isLoading}
        >
          <LinearGradient
            colors={
              selectedSide === 'heads'
                ? ['#FFD700', '#FFA500']
                : ['#1F1F1F', '#2F2F2F']
            }
            style={styles.sideButtonGradient}
          >
            <Ionicons name="sunny" size={32} color="#FFFFFF" />
            <Text style={styles.sideButtonText}>HEADS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sideButton,
            selectedSide === 'tails' && styles.sideButtonSelected,
          ]}
          onPress={() => {
            setSelectedSide('tails');
            triggerHaptic('light');
          }}
          disabled={animationState.isFlipping || isLoading}
        >
          <LinearGradient
            colors={
              selectedSide === 'tails'
                ? ['#C0C0C0', '#808080']
                : ['#1F1F1F', '#2F2F2F']
            }
            style={styles.sideButtonGradient}
          >
            <Ionicons name="moon" size={32} color="#FFFFFF" />
            <Text style={styles.sideButtonText}>TAILS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Flip Button */}
      <TouchableOpacity
        style={[
          styles.flipButton,
          (!selectedSide || animationState.isFlipping || isLoading) &&
            styles.flipButtonDisabled,
        ]}
        onPress={handleStartGame}
        disabled={!selectedSide || animationState.isFlipping || isLoading}
      >
        <LinearGradient
          colors={
            selectedSide && !animationState.isFlipping && !isLoading
              ? ['#667EEA', '#764BA2']
              : ['#4B5563', '#6B7280']
          }
          style={styles.flipButtonGradient}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sync" size={24} color="#FFFFFF" />
              <Text style={styles.flipButtonText}>
                {animationState.isFlipping ? 'FLIPPING...' : 'FLIP COIN'}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Game Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Wins</Text>
          <Text style={styles.statValue}>{wins}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Losses</Text>
          <Text style={styles.statValue}>{losses}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Stake</Text>
          <Text style={styles.statValue}>{stake}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Win Rate</Text>
          <Text style={styles.statValue}>
            {wins + losses > 0
              ? `${Math.round((wins / (wins + losses)) * 100)}%`
              : '-'}
          </Text>
        </View>
      </View>

      {/* Session History */}
      {sessionHistory.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>Recent Flips</Text>
          <View style={styles.historyItems}>
            {sessionHistory.map((session, index) => (
              <View
                key={index}
                style={[
                  styles.historyItem,
                  { backgroundColor: session.result === 'win' ? '#10B98120' : '#EF444420' },
                ]}
              >
                <Text style={styles.historyResult}>
                  {session.result === 'win' ? '✓' : '✗'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {renderStakeModal()}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  coinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  resultOverlay: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 24,
    borderRadius: 16,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 18,
    color: '#8B949E',
    marginBottom: 4,
  },
  resultAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sideSelection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  sideButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sideButtonSelected: {
    transform: [{ scale: 1.05 }],
  },
  sideButtonGradient: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  sideButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  flipButton: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  flipButtonDisabled: {
    opacity: 0.5,
  },
  flipButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  flipButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#8B949E',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  history: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E',
    marginBottom: 8,
  },
  historyItems: {
    flexDirection: 'row',
    gap: 8,
  },
  historyItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyResult: {
    fontSize: 18,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  stakeInput: {
    backgroundColor: '#0B0B10',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickStakes: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickStakeButton: {
    flex: 1,
    backgroundColor: '#0B0B10',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickStakeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
