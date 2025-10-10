import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGamesStore } from '../Services/GamesStore';

export default function TapDuel() {
  const router = useRouter();
  const { triggerHaptic } = useGamesStore();

  const [countdown, setCountdown] = useState(3);
  const [showGo, setShowGo] = useState(false);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);

  const startTimeRef = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const startGame = () => {
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
            triggerHaptic('success');
          }, Math.random() * 2000 + 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (!showGo) {
      // Early tap - penalty
      setReactionTime(-1);
      triggerHaptic('error');
      return;
    }

    const time = Date.now() - startTimeRef.current;
    setReactionTime(time);
    triggerHaptic('success');

    // Reset for next round
    setTimeout(() => {
      setGameStarted(false);
      setShowGo(false);
      setReactionTime(null);
      setCountdown(3);
    }, 3000);
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

      <View style={styles.gameArea}>
        {!gameStarted && !reactionTime && (
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              style={styles.startGradient}
            >
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
          <TouchableOpacity style={styles.tapArea} onPress={handleTap} activeOpacity={1}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.goGradient}
            >
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
              </>
            )}
          </View>
        )}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>How to Play:</Text>
        <Text style={styles.instructionText}>• Wait for countdown (3, 2, 1)</Text>
        <Text style={styles.instructionText}>• Tap immediately when you see "GO!"</Text>
        <Text style={styles.instructionText}>• Fastest reaction time wins!</Text>
        <Text style={styles.instructionText}>• Early tap = penalty</Text>
      </View>
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
  gameArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
});
