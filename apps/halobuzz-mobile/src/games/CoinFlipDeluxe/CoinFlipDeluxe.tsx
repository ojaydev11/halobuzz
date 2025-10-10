import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Canvas, Circle, Group, useValue, runTiming } from '@shopify/react-native-skia';
import { useGamesStore } from '../Services/GamesStore';
import { useAuth } from '@/store/AuthContext';

const { width, height } = Dimensions.get('window');
const COIN_SIZE = 120;

type CoinSide = 'heads' | 'tails';
type GameMode = 'solo' | 'sprint' | 'rush';

export default function CoinFlipDeluxe() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    startSession,
    endSession,
    updateSessionScore,
    triggerHaptic,
    soundEnabled,
    hapticsEnabled,
  } = useGamesStore();

  // Game State
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [selectedSide, setSelectedSide] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [stake, setStake] = useState('100');
  const [balance, setBalance] = useState(5000);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [score, setScore] = useState(0);
  const [flipsRemaining, setFlipsRemaining] = useState(gameMode === 'sprint' ? 5 : 1);

  // Animations
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Skia animation values
  const coinY = useValue(height / 2 - 100);
  const coinRotation = useValue(0);

  useEffect(() => {
    // Initialize game session
    if (user) {
      startSession('coin-flip-deluxe', parseInt(stake) || 100, user.id);
    }

    return () => {
      // Cleanup on unmount
    };
  }, []);

  const flipCoin = async () => {
    if (!selectedSide || isFlipping) return;

    setIsFlipping(true);
    triggerHaptic('medium');

    // Animate coin flip (Skia)
    runTiming(coinY, height / 4, { duration: 500 });
    runTiming(coinRotation, Math.random() * 10 + 10, { duration: 1000 });

    // Simulate coin flip with weighted randomness
    const randomResult: CoinSide = Math.random() > 0.5 ? 'heads' : 'tails';

    // Delay to show animation
    setTimeout(async () => {
      setResult(randomResult);

      const won = randomResult === selectedSide;
      const stakeAmount = parseInt(stake) || 100;

      if (won) {
        const payout = stakeAmount * 2;
        setBalance(prev => prev + payout);
        setScore(prev => prev + 1);
        triggerHaptic('success');
        updateSessionScore(score + 1);
      } else {
        setBalance(prev => prev - stakeAmount);
        triggerHaptic('error');
      }

      // Reset for next flip
      setTimeout(() => {
        setIsFlipping(false);
        setResult(null);
        setSelectedSide(null);

        if (gameMode === 'sprint') {
          setFlipsRemaining(prev => prev - 1);
          if (flipsRemaining <= 1) {
            endGame();
          }
        } else if (gameMode === 'rush') {
          // Auto-restart in rush mode
          setSelectedSide(Math.random() > 0.5 ? 'heads' : 'tails');
        }

        // Reset animations
        runTiming(coinY, height / 2 - 100, { duration: 500 });
        runTiming(coinRotation, 0, { duration: 500 });
      }, 2000);
    }, 1000);
  };

  const endGame = () => {
    const stakeAmount = parseInt(stake) || 100;
    const payout = balance - 5000; // Calculate profit/loss
    endSession(score, payout);

    // Show results modal or navigate back
    router.back();
  };

  const renderCoin = () => (
    <Canvas style={styles.canvas}>
      <Group transform={[{ translateY: coinY }]}>
        <Circle cx={width / 2} cy={0} r={COIN_SIZE / 2} color="#FFD700" />
        {result && (
          <Circle
            cx={width / 2}
            cy={0}
            r={COIN_SIZE / 2 - 10}
            color={result === 'heads' ? '#FFA500' : '#C0C0C0'}
          />
        )}
      </Group>
    </Canvas>
  );

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
          <Text style={styles.balanceText}>{balance}</Text>
        </TouchableOpacity>
      </View>

      {/* Game Mode Selector */}
      <View style={styles.modeSelector}>
        {(['solo', 'sprint', 'rush'] as GameMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.modeButton, gameMode === mode && styles.modeButtonActive]}
            onPress={() => setGameMode(mode)}
          >
            <Text style={[styles.modeText, gameMode === mode && styles.modeTextActive]}>
              {mode.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Coin Display */}
      <View style={styles.coinContainer}>
        {renderCoin()}

        {result && (
          <View style={styles.resultOverlay}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={[
                styles.resultText,
                { color: result === selectedSide ? '#10B981' : '#EF4444' }
              ]}>
                {result === selectedSide ? '🎉 YOU WIN!' : '😢 YOU LOSE'}
              </Text>
              <Text style={styles.resultSubtext}>
                {result.toUpperCase()}
              </Text>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Side Selection */}
      <View style={styles.sideSelection}>
        <TouchableOpacity
          style={[
            styles.sideButton,
            selectedSide === 'heads' && styles.sideButtonSelected
          ]}
          onPress={() => {
            setSelectedSide('heads');
            triggerHaptic('light');
          }}
          disabled={isFlipping}
        >
          <LinearGradient
            colors={selectedSide === 'heads' ? ['#FFD700', '#FFA500'] : ['#1F1F1F', '#2F2F2F']}
            style={styles.sideButtonGradient}
          >
            <Ionicons name="sunny" size={32} color="#FFFFFF" />
            <Text style={styles.sideButtonText}>HEADS</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sideButton,
            selectedSide === 'tails' && styles.sideButtonSelected
          ]}
          onPress={() => {
            setSelectedSide('tails');
            triggerHaptic('light');
          }}
          disabled={isFlipping}
        >
          <LinearGradient
            colors={selectedSide === 'tails' ? ['#C0C0C0', '#808080'] : ['#1F1F1F', '#2F2F2F']}
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
          (!selectedSide || isFlipping) && styles.flipButtonDisabled
        ]}
        onPress={flipCoin}
        disabled={!selectedSide || isFlipping}
      >
        <LinearGradient
          colors={selectedSide && !isFlipping ? ['#667EEA', '#764BA2'] : ['#4B5563', '#6B7280']}
          style={styles.flipButtonGradient}
        >
          <Ionicons name="sync" size={24} color="#FFFFFF" />
          <Text style={styles.flipButtonText}>
            {isFlipping ? 'FLIPPING...' : 'FLIP COIN'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Game Stats */}
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Stake</Text>
          <Text style={styles.statValue}>{stake}</Text>
        </View>
        {gameMode === 'sprint' && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Flips Left</Text>
            <Text style={styles.statValue}>{flipsRemaining}</Text>
          </View>
        )}
      </View>

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
  coinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  canvas: {
    width: width,
    height: height * 0.4,
  },
  resultOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 18,
    color: '#8B949E',
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
    paddingBottom: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
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
