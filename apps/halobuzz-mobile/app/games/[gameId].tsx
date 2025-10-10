import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import CoinFlipDeluxe from '@/games/CoinFlipDeluxe/CoinFlipDeluxe';
import TapDuel from '@/games/TapDuel/TapDuel';
import BuzzRunner from '@/games/BuzzRunner/BuzzRunner';
import TriviaRoyale from '@/games/TriviaRoyale/TriviaRoyale';
import StackStorm from '@/games/StackStorm/StackStorm';
import BuzzArena from '@/games/BuzzArena/BuzzArena';
import { View, Text, StyleSheet } from 'react-native';

export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();

  // Route to appropriate game component
  switch (gameId) {
    case 'coin-flip-deluxe':
      return <CoinFlipDeluxe />;
    case 'tap-duel':
      return <TapDuel />;
    case 'buzz-runner':
      return <BuzzRunner />;
    case 'trivia-royale':
      return <TriviaRoyale />;
    case 'stack-storm':
      return <StackStorm />;
    case 'buzz-arena':
      return <BuzzArena />;
    default:
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>Game not found: {gameId}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0B10',
  },
  errorText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});
