import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function StackStorm() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 StackStorm</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={['#FA8BFF', '#2BD2FF']}
          style={styles.heroSection}
        >
          <Ionicons name="layers-outline" size={80} color="#FFFFFF" />
          <Text style={styles.comingSoonText}>COMING SOON</Text>
          <Text style={styles.coreBadge}>CORE TIER</Text>
        </LinearGradient>

        <View style={styles.description}>
          <Text style={styles.descriptionTitle}>Physics Block Stacker</Text>
          <Text style={styles.descriptionText}>
            Drop moving blocks to build the tallest tower possible!
            Powered by matter.js physics with wind modifiers and perfect stack bonuses.
          </Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Game Features</Text>

          <View style={styles.feature}>
            <Ionicons name="cube-outline" size={24} color="#FA8BFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Matter.js Physics</Text>
              <Text style={styles.featureDescription}>Real 2D physics simulation</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Ionicons name="flash-outline" size={24} color="#FA8BFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Wind Modifier</Text>
              <Text style={styles.featureDescription}>Progressive difficulty with wind gusts</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#FA8BFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Perfect Stack Bonus</Text>
              <Text style={styles.featureDescription}>Extra points for precision placement</Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Ionicons name="trending-up-outline" size={24} color="#FA8BFF" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Progressive Difficulty</Text>
              <Text style={styles.featureDescription}>Blocks move faster as tower grows</Text>
            </View>
          </View>
        </View>

        <View style={styles.stakes}>
          <Text style={styles.stakesTitle}>Entry Stakes & Rewards</Text>
          <View style={styles.stakesRow}>
            <View style={styles.stakeItem}>
              <Text style={styles.stakeLabel}>Min</Text>
              <Text style={styles.stakeValue}>100 coins</Text>
            </View>
            <View style={styles.stakeItem}>
              <Text style={styles.stakeLabel}>Max</Text>
              <Text style={styles.stakeValue}>1000 coins</Text>
            </View>
            <View style={styles.stakeItem}>
              <Text style={styles.stakeLabel}>Multiplier</Text>
              <Text style={styles.stakeValue}>5x</Text>
            </View>
          </View>
          <Text style={styles.ogPerk}>🎨 Unlock exclusive block skins with Royal Pass</Text>
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
  coreBadge: {
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
    marginBottom: 16,
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
    color: '#FA8BFF',
  },
  ogPerk: {
    fontSize: 14,
    color: '#2BD2FF',
    textAlign: 'center',
    fontWeight: '600',
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
