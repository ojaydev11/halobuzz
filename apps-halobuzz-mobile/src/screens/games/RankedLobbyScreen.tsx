import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface PlayerRanking {
  tier: string;
  division: number;
  leaguePoints: number;
  mmr: number;
  displayMmr: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
  total: number;
  streak: {
    current: number;
    longestWin: number;
  };
  stats: {
    averageKills: number;
    averageDeaths: number;
    averageAssists: number;
    kda: number;
  };
}

const TIER_COLORS: Record<string, string[]> = {
  'Bronze': ['#CD7F32', '#8B4513'],
  'Silver': ['#C0C0C0', '#808080'],
  'Gold': ['#FFD700', '#DAA520'],
  'Platinum': ['#E5E4E2', '#87CEEB'],
  'Diamond': ['#B9F2FF', '#00CED1'],
  'Master': ['#DA70D6', '#9370DB'],
  'Champion': ['#FF6347', '#FF4500'],
  'Legend': ['#FFD700', '#FFA500']
};

const TIER_ICONS: Record<string, string> = {
  'Bronze': 'shield',
  'Silver': 'shield-outline',
  'Gold': 'trophy',
  'Platinum': 'star',
  'Diamond': 'diamond',
  'Master': 'flame',
  'Champion': 'crown',
  'Legend': 'flash'
};

export default function RankedLobbyScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);
  const [ranking, setRanking] = useState<PlayerRanking | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('assault');
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(45);

  const roles = [
    { id: 'assault', name: 'Assault', icon: 'rifle', color: '#FF6B6B' },
    { id: 'support', name: 'Support', icon: 'medical', color: '#4ECDC4' },
    { id: 'tank', name: 'Tank', icon: 'shield-checkmark', color: '#95E1D3' },
    { id: 'sniper', name: 'Sniper', icon: 'telescope', color: '#F38181' },
    { id: 'specialist', name: 'Specialist', icon: 'sparkles', color: '#AA96DA' }
  ];

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      setLoading(true);
      // TODO: Call API to get player ranking
      // const response = await api.getRanking();

      // Mock data
      const mockRanking: PlayerRanking = {
        tier: 'Platinum',
        division: 3,
        leaguePoints: 67,
        mmr: 2150,
        displayMmr: 2150,
        wins: 127,
        losses: 98,
        winRate: 56.4,
        rank: 1847,
        total: 45230,
        streak: { current: 3, longestWin: 8 },
        stats: {
          averageKills: 8.4,
          averageDeaths: 5.2,
          averageAssists: 6.7,
          kda: 2.9
        }
      };

      setRanking(mockRanking);
    } catch (error) {
      Alert.alert('Error', 'Failed to load ranking');
    } finally {
      setLoading(false);
    }
  };

  const handleQueueUp = () => {
    if (!ranking) return;

    setQueueing(true);

    // TODO: Call API to join ranked queue
    // await api.joinRankedQueue({ role: selectedRole, mmr: ranking.mmr });

    Alert.alert(
      'Finding Match',
      `Searching for players in ${ranking.tier} tier...\nEstimated wait: ${estimatedWaitTime}s`,
      [
        {
          text: 'Cancel Queue',
          onPress: () => setQueueing(false),
          style: 'cancel'
        }
      ]
    );

    // Mock: Find match after wait time
    setTimeout(() => {
      setQueueing(false);
      Alert.alert('Match Found!', 'Entering champion select...');
      // navigation.navigate('ChampionSelect');
    }, estimatedWaitTime * 1000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Loading your rank...</Text>
      </View>
    );
  }

  if (!ranking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#E74C3C" />
        <Text style={styles.errorText}>Failed to load ranking</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRanking}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tierColors = TIER_COLORS[ranking.tier];
  const tierIcon = TIER_ICONS[ranking.tier];

  return (
    <ScrollView style={styles.container}>
      {/* Rank Display Card */}
      <LinearGradient
        colors={tierColors}
        style={styles.rankCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.rankHeader}>
          <View style={styles.rankIconContainer}>
            <Ionicons name={tierIcon as any} size={48} color="#FFF" />
          </View>
          <View style={styles.rankInfo}>
            <Text style={styles.tierText}>{ranking.tier}</Text>
            <Text style={styles.divisionText}>Division {ranking.division}</Text>
            <View style={styles.lpBar}>
              <View style={[styles.lpFill, { width: `${ranking.leaguePoints}%` }]} />
            </View>
            <Text style={styles.lpText}>{ranking.leaguePoints} LP</Text>
          </View>
          <View style={styles.mmrContainer}>
            <Text style={styles.mmrLabel}>MMR</Text>
            <Text style={styles.mmrValue}>{ranking.displayMmr}</Text>
          </View>
        </View>

        {/* Rank Position */}
        <View style={styles.rankPosition}>
          <Ionicons name="people" size={20} color="#FFF" />
          <Text style={styles.rankPositionText}>
            #{ranking.rank.toLocaleString()} of {ranking.total.toLocaleString()}
          </Text>
          <Text style={styles.percentileText}>
            (Top {((ranking.rank / ranking.total) * 100).toFixed(1)}%)
          </Text>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{ranking.wins}W / {ranking.losses}L</Text>
          <Text style={styles.statLabel}>Record</Text>
          <Text style={[styles.statValue, { fontSize: 16, color: '#27AE60' }]}>
            {ranking.winRate.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statValue}>{ranking.stats.kda.toFixed(2)}</Text>
          <Text style={styles.statLabel}>KDA</Text>
          <Text style={styles.statSubtext}>
            {ranking.stats.averageKills.toFixed(1)} / {ranking.stats.averageDeaths.toFixed(1)} / {ranking.stats.averageAssists.toFixed(1)}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons
            name={ranking.streak.current >= 0 ? "trending-up" : "trending-down"}
            size={32}
            color={ranking.streak.current >= 0 ? "#27AE60" : "#E74C3C"}
          />
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={[styles.statValue, { fontSize: 20, color: ranking.streak.current >= 0 ? "#27AE60" : "#E74C3C" }]}>
            {ranking.streak.current >= 0 ? `+${ranking.streak.current}` : ranking.streak.current}
          </Text>
        </View>
      </View>

      {/* Role Selection */}
      <View style={styles.roleContainer}>
        <Text style={styles.sectionTitle}>Select Your Role</Text>
        <View style={styles.roleGrid}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleButton,
                selectedRole === role.id && styles.roleButtonSelected
              ]}
              onPress={() => setSelectedRole(role.id)}
            >
              <Ionicons
                name={role.icon as any}
                size={32}
                color={selectedRole === role.id ? role.color : '#95A5A6'}
              />
              <Text style={[
                styles.roleText,
                selectedRole === role.id && styles.roleTextSelected
              ]}>
                {role.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Queue Info */}
      <View style={styles.queueInfoContainer}>
        <View style={styles.queueInfoRow}>
          <Ionicons name="time" size={20} color="#95A5A6" />
          <Text style={styles.queueInfoText}>
            Est. Queue Time: ~{estimatedWaitTime}s
          </Text>
        </View>
        <View style={styles.queueInfoRow}>
          <Ionicons name="people" size={20} color="#95A5A6" />
          <Text style={styles.queueInfoText}>
            1,247 players in queue
          </Text>
        </View>
      </View>

      {/* Queue Button */}
      <TouchableOpacity
        style={[styles.queueButton, queueing && styles.queueButtonActive]}
        onPress={handleQueueUp}
        disabled={queueing}
      >
        <LinearGradient
          colors={queueing ? ['#E74C3C', '#C0392B'] : ['#6C5CE7', '#5F27CD']}
          style={styles.queueButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {queueing ? (
            <>
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.queueButtonText}>SEARCHING...</Text>
            </>
          ) : (
            <>
              <Ionicons name="game-controller" size={24} color="#FFF" />
              <Text style={styles.queueButtonText}>FIND MATCH</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('Leaderboard' as never)}
        >
          <Ionicons name="trophy" size={24} color="#6C5CE7" />
          <Text style={styles.quickActionText}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('MatchHistory' as never)}
        >
          <Ionicons name="list" size={24} color="#6C5CE7" />
          <Text style={styles.quickActionText}>Match History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('TierRewards' as never)}
        >
          <Ionicons name="gift" size={24} color="#6C5CE7" />
          <Text style={styles.quickActionText}>Tier Rewards</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#95A5A6'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    padding: 20
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#E74C3C',
    fontWeight: 'bold'
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#6C5CE7',
    borderRadius: 8
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  rankCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  rankIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rankInfo: {
    flex: 1,
    marginLeft: 16
  },
  tierText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF'
  },
  divisionText: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9
  },
  lpBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden'
  },
  lpFill: {
    height: '100%',
    backgroundColor: '#FFF'
  },
  lpText: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 4,
    fontWeight: 'bold'
  },
  mmrContainer: {
    alignItems: 'center'
  },
  mmrLabel: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8
  },
  mmrValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF'
  },
  rankPosition: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 8
  },
  rankPositionText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8
  },
  percentileText: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginLeft: 8
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16
  },
  statBox: {
    flex: 1,
    backgroundColor: '#16213E',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF'
  },
  statLabel: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4
  },
  statSubtext: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4
  },
  roleContainer: {
    margin: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  roleButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: '#16213E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  roleButtonSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#1E2749'
  },
  roleText: {
    fontSize: 10,
    color: '#95A5A6',
    marginTop: 4,
    textAlign: 'center'
  },
  roleTextSelected: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  queueInfoContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#16213E',
    borderRadius: 12
  },
  queueInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  queueInfoText: {
    fontSize: 14,
    color: '#95A5A6',
    marginLeft: 8
  },
  queueButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4
  },
  queueButtonActive: {
    elevation: 2
  },
  queueButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20
  },
  queueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8
  },
  quickActions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 32,
    justifyContent: 'space-between'
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#16213E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4
  },
  quickActionText: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 8,
    textAlign: 'center'
  }
});
