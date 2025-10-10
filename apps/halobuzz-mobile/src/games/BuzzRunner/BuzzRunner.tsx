import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function BuzzRunner() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏃 Buzz Runner</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#FC5C7D', '#6A82FB']}
          style={styles.heroSection}
        >
          <Ionicons name="rocket-outline" size={80} color="#FFFFFF" />
          <Text style={styles.comingSoonText}>COMING SOON</Text>
          <Text style={styles.casualBadge}>CASUAL TIER</Text>
        </LinearGradient>

        <View style={styles.description}>
          <Text style={styles.descriptionTitle}>Endless Runner Adventure</Text>
          <Text style={styles.descriptionText}>
            Dodge obstacles, collect power-ups, and run as far as you can!
            Physics-based gameplay with matter-js for realistic collisions.
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Game Features</Text>

          <View style={styles.feature}>
            <Ionicons name="speedometer-outline" size={24} color="#FC5C7D" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Progressive Speed</Text>
              <Text style={styles.featureDescription}>Game gets faster as you survive</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Ionicons name="magnet-outline" size={24} color="#FC5C7D" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Power-Ups</Text>
              <Text style={styles.featureDescription}>Magnets, shields, and coin multipliers</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Ionicons name="trophy-outline" size={24} color="#FC5C7D" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Daily Quests</Text>
              <Text style={styles.featureDescription}>Complete challenges for bonus coins</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Ionicons name="people-outline" size={24} color="#FC5C7D" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Tournaments</Text>
              <Text style={styles.featureDescription}>Compete for distance leaderboards</Text>
            </View>
          </View>
        </View>

        <View style={styles.stakes}>
          <Text style={styles.stakesTitle}>Entry Stakes</Text>
          <View style={styles.stakesRow}>
            <View style={styles.stakeItem}>
              <Text style={styles.stakeLabel}>Min</Text>
              <Text style={styles.stakeValue}>50 coins</Text>
            </View>
            <View style={styles.stakeItem}>
              <Text style={styles.stakeLabel}>Max</Text>
              <Text style={styles.stakeValue}>500 coins</Text>
            </View>
            <View style={styles.stakeItem}>
              <Text style={styles.stakeLabel}>Multiplier</Text>
              <Text style={styles.stakeValue}>3x</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.notifyButton} disabled>
        <LinearGradient
          colors={['#6B7280', '#4B5563']}
          style={styles.notifyGradient}
        >
          <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          <Text style={styles.notifyText}>Notify When Available</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 60,
    borderRadius: 24,
    marginBottom: 24,
  },
  comingSoonText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
  },
  casualBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  description: {
    marginBottom: 24,
  },
  descriptionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#8B949E',
    lineHeight: 24,
  },
  features: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8B949E',
  },
  stakes: {
    backgroundColor: '#1F1F1F',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  stakesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stakesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stakeItem: {
    alignItems: 'center',
  },
  stakeLabel: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 8,
  },
  stakeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FC5C7D',
  },
  notifyButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  notifyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  notifyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
