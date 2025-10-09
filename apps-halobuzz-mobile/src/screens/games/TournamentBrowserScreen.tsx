import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Tournament interface matching backend model
interface Tournament {
  _id: string;
  name: string;
  code: string;
  gameMode: 'halo-arena' | 'halo-royale' | 'halo-clash' | 'halo-rally' | 'halo-raids' | 'halo-tactics';
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'special';
  format: 'single-elimination' | 'double-elimination' | 'swiss' | 'round-robin' | 'battle-royale';
  status: 'scheduled' | 'registration' | 'check-in' | 'in-progress' | 'completed' | 'cancelled';
  participants: {
    minPlayers: number;
    maxPlayers: number;
    registeredPlayers: Array<{
      userId: string;
      mmr: number;
      checkedIn: boolean;
      registeredAt: Date;
    }>;
  };
  schedule: {
    registrationStart: Date;
    registrationEnd: Date;
    checkInStart: Date;
    checkInEnd: Date;
    tournamentStart: Date;
    tournamentEnd?: Date;
  };
  prizes: {
    type: 'coins' | 'mixed';
    totalPrizePool: number;
    distribution: Array<{
      placement: string;
      coins: number;
      items?: Array<{ type: string; itemId: string; quantity: number }>;
    }>;
  };
  restrictions: {
    minMMR?: number;
    maxMMR?: number;
    minLevel?: number;
    regionsAllowed?: string[];
  };
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
}

// Tournament type colors
const tournamentTypeColors: Record<string, string[]> = {
  daily: ['#4A90E2', '#357ABD'],
  weekly: ['#9B59B6', '#8E44AD'],
  monthly: ['#E67E22', '#D35400'],
  seasonal: ['#E74C3C', '#C0392B'],
  special: ['#F39C12', '#E67E22'],
};

// Format icons
const formatIcons: Record<string, string> = {
  'single-elimination': 'trophy',
  'double-elimination': 'trophy-outline',
  'swiss': 'grid',
  'round-robin': 'repeat',
  'battle-royale': 'flame',
};

export default function TournamentBrowserScreen() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'registration' | 'in-progress' | 'upcoming'>('all');
  const [selectedGameMode, setSelectedGameMode] = useState<string>('all');

  useEffect(() => {
    fetchTournaments();
  }, [filter, selectedGameMode]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/tournaments?status=${filter}&gameMode=${selectedGameMode}`);
      // const data = await response.json();

      // Mock data for now
      const mockTournaments: Tournament[] = [
        {
          _id: '1',
          name: 'Daily Clash Championship',
          code: 'DCC001',
          gameMode: 'halo-clash',
          type: 'daily',
          format: 'single-elimination',
          status: 'registration',
          participants: {
            minPlayers: 8,
            maxPlayers: 64,
            registeredPlayers: new Array(32).fill(null).map((_, i) => ({
              userId: `user${i}`,
              mmr: 1500 + Math.random() * 500,
              checkedIn: false,
              registeredAt: new Date(),
            })),
          },
          schedule: {
            registrationStart: new Date(Date.now() - 1000 * 60 * 60),
            registrationEnd: new Date(Date.now() + 1000 * 60 * 30),
            checkInStart: new Date(Date.now() + 1000 * 60 * 30),
            checkInEnd: new Date(Date.now() + 1000 * 60 * 45),
            tournamentStart: new Date(Date.now() + 1000 * 60 * 60),
          },
          prizes: {
            type: 'coins',
            totalPrizePool: 10000,
            distribution: [
              { placement: '1st', coins: 5000 },
              { placement: '2nd', coins: 3000 },
              { placement: '3rd-4th', coins: 1000 },
            ],
          },
          restrictions: {
            minMMR: 1200,
          },
        },
        {
          _id: '2',
          name: 'Weekly Arena Masters',
          code: 'WAM012',
          gameMode: 'halo-arena',
          type: 'weekly',
          format: 'double-elimination',
          status: 'in-progress',
          participants: {
            minPlayers: 16,
            maxPlayers: 128,
            registeredPlayers: new Array(64).fill(null).map((_, i) => ({
              userId: `user${i}`,
              mmr: 1800 + Math.random() * 400,
              checkedIn: true,
              registeredAt: new Date(),
            })),
          },
          schedule: {
            registrationStart: new Date(Date.now() - 1000 * 60 * 60 * 48),
            registrationEnd: new Date(Date.now() - 1000 * 60 * 60 * 2),
            checkInStart: new Date(Date.now() - 1000 * 60 * 60 * 2),
            checkInEnd: new Date(Date.now() - 1000 * 60 * 60),
            tournamentStart: new Date(Date.now() - 1000 * 60 * 30),
          },
          prizes: {
            type: 'mixed',
            totalPrizePool: 50000,
            distribution: [
              { placement: '1st', coins: 25000, items: [{ type: 'skin', itemId: 'legendary-spartan', quantity: 1 }] },
              { placement: '2nd', coins: 15000 },
              { placement: '3rd-4th', coins: 5000 },
            ],
          },
          restrictions: {
            minMMR: 1500,
          },
        },
        {
          _id: '3',
          name: 'Monthly Royale Showdown',
          code: 'MRS003',
          gameMode: 'halo-royale',
          type: 'monthly',
          format: 'battle-royale',
          status: 'scheduled',
          participants: {
            minPlayers: 50,
            maxPlayers: 200,
            registeredPlayers: [],
          },
          schedule: {
            registrationStart: new Date(Date.now() + 1000 * 60 * 60 * 24),
            registrationEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
            checkInStart: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
            checkInEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 30),
            tournamentStart: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60),
          },
          prizes: {
            type: 'coins',
            totalPrizePool: 100000,
            distribution: [
              { placement: '1st', coins: 50000 },
              { placement: '2nd', coins: 25000 },
              { placement: '3rd', coins: 15000 },
              { placement: '4th-10th', coins: 1500 },
            ],
          },
          restrictions: {
            minMMR: 1800,
            minLevel: 30,
          },
        },
      ];

      setTournaments(mockTournaments);
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const handleRegister = async (tournament: Tournament) => {
    try {
      // Check if already registered
      const isRegistered = tournament.participants.registeredPlayers.some(
        (p) => p.userId === 'current-user-id' // TODO: Replace with actual user ID
      );

      if (isRegistered) {
        Alert.alert('Already Registered', 'You are already registered for this tournament');
        return;
      }

      // Check restrictions
      if (tournament.restrictions.minMMR && tournament.restrictions.minMMR > 1500) {
        Alert.alert(
          'MMR Requirement',
          `This tournament requires a minimum MMR of ${tournament.restrictions.minMMR}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Register Anyway', onPress: () => confirmRegister(tournament) },
          ]
        );
        return;
      }

      confirmRegister(tournament);
    } catch (error) {
      console.error('Registration failed:', error);
      Alert.alert('Error', 'Failed to register for tournament');
    }
  };

  const confirmRegister = async (tournament: Tournament) => {
    // TODO: Replace with actual API call
    // await fetch(`/api/tournaments/${tournament._id}/register`, { method: 'POST' });
    Alert.alert('Success', `Registered for ${tournament.name}!`);
    fetchTournaments();
  };

  const handleCheckIn = async (tournament: Tournament) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/tournaments/${tournament._id}/check-in`, { method: 'POST' });
      Alert.alert('Success', 'Checked in successfully!');
      fetchTournaments();
    } catch (error) {
      console.error('Check-in failed:', error);
      Alert.alert('Error', 'Failed to check in');
    }
  };

  const formatTimeRemaining = (date: Date): string => {
    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();

    if (diff < 0) return 'Started';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'registration': return '#2ECC71';
      case 'check-in': return '#F39C12';
      case 'in-progress': return '#E74C3C';
      case 'scheduled': return '#3498DB';
      case 'completed': return '#95A5A6';
      default: return '#BDC3C7';
    }
  };

  const renderTournamentCard = (tournament: Tournament) => {
    const colors = tournamentTypeColors[tournament.type];
    const icon = formatIcons[tournament.format];
    const registrationProgress = tournament.participants.registeredPlayers.length / tournament.participants.maxPlayers;

    return (
      <View key={tournament._id} style={styles.tournamentCard}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tournamentHeader}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Ionicons name={icon as any} size={24} color="#FFFFFF" />
              <View style={styles.headerInfo}>
                <Text style={styles.tournamentName}>{tournament.name}</Text>
                <Text style={styles.tournamentCode}>Code: {tournament.code}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tournament.status) }]}>
              <Text style={styles.statusText}>{tournament.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.infoChip}>
              <Ionicons name="people" size={14} color="#FFFFFF" />
              <Text style={styles.chipText}>
                {tournament.participants.registeredPlayers.length}/{tournament.participants.maxPlayers}
              </Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="game-controller" size={14} color="#FFFFFF" />
              <Text style={styles.chipText}>{tournament.gameMode}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="trophy" size={14} color="#FFFFFF" />
              <Text style={styles.chipText}>{tournament.format}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.tournamentBody}>
          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${registrationProgress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(registrationProgress * 100)}% Full
            </Text>
          </View>

          {/* Schedule info */}
          <View style={styles.scheduleSection}>
            {tournament.status === 'registration' && (
              <View style={styles.scheduleRow}>
                <Ionicons name="time-outline" size={16} color="#BDC3C7" />
                <Text style={styles.scheduleText}>
                  Registration ends in {formatTimeRemaining(tournament.schedule.registrationEnd)}
                </Text>
              </View>
            )}
            {tournament.status === 'check-in' && (
              <View style={styles.scheduleRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#F39C12" />
                <Text style={styles.scheduleText}>
                  Check-in ends in {formatTimeRemaining(tournament.schedule.checkInEnd)}
                </Text>
              </View>
            )}
            {tournament.status === 'scheduled' && (
              <View style={styles.scheduleRow}>
                <Ionicons name="calendar-outline" size={16} color="#3498DB" />
                <Text style={styles.scheduleText}>
                  Starts in {formatTimeRemaining(tournament.schedule.registrationStart)}
                </Text>
              </View>
            )}
            {tournament.status === 'in-progress' && (
              <View style={styles.scheduleRow}>
                <Ionicons name="play-circle-outline" size={16} color="#E74C3C" />
                <Text style={styles.scheduleText}>Tournament in progress</Text>
              </View>
            )}

            <View style={styles.scheduleRow}>
              <Ionicons name="ribbon-outline" size={16} color="#F39C12" />
              <Text style={styles.scheduleText}>
                Prize Pool: {tournament.prizes.totalPrizePool.toLocaleString()} coins
              </Text>
            </View>
          </View>

          {/* Prize distribution */}
          <View style={styles.prizesSection}>
            <Text style={styles.prizesTitle}>Prize Distribution:</Text>
            <View style={styles.prizesGrid}>
              {tournament.prizes.distribution.slice(0, 3).map((prize, index) => (
                <View key={index} style={styles.prizeItem}>
                  <Text style={styles.prizePlacement}>{prize.placement}</Text>
                  <Text style={styles.prizeAmount}>{prize.coins.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Restrictions */}
          {(tournament.restrictions.minMMR || tournament.restrictions.minLevel) && (
            <View style={styles.restrictionsSection}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#95A5A6" />
              <Text style={styles.restrictionsText}>
                Requirements:
                {tournament.restrictions.minMMR && ` ${tournament.restrictions.minMMR}+ MMR`}
                {tournament.restrictions.minLevel && ` Level ${tournament.restrictions.minLevel}+`}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsSection}>
            {tournament.status === 'registration' && (
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => handleRegister(tournament)}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.registerButtonText}>Register</Text>
              </TouchableOpacity>
            )}

            {tournament.status === 'check-in' && (
              <TouchableOpacity
                style={styles.checkInButton}
                onPress={() => handleCheckIn(tournament)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.checkInButtonText}>Check In</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#3498DB" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <TouchableOpacity style={styles.myTournamentsButton}>
          <Ionicons name="list" size={20} color="#3498DB" />
          <Text style={styles.myTournamentsText}>My Tournaments</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {['all', 'registration', 'in-progress', 'upcoming'].map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterChip,
              filter === filterOption && styles.filterChipActive,
            ]}
            onPress={() => setFilter(filterOption as any)}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === filterOption && styles.filterChipTextActive,
              ]}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tournament list */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3498DB"
          />
        }
      >
        {tournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color="#95A5A6" />
            <Text style={styles.emptyText}>No tournaments available</Text>
            <Text style={styles.emptySubtext}>Check back later for new tournaments</Text>
          </View>
        ) : (
          tournaments.map(renderTournamentCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  myTournamentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  myTournamentsText: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C3E',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2C2C3E',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3498DB',
  },
  filterChipText: {
    color: '#95A5A6',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  tournamentCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#16213E',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tournamentHeader: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  tournamentName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tournamentCode: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerBottom: {
    flexDirection: 'row',
    gap: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tournamentBody: {
    padding: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2C2C3E',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 3,
  },
  progressText: {
    color: '#95A5A6',
    fontSize: 12,
    textAlign: 'right',
  },
  scheduleSection: {
    marginBottom: 16,
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  prizesSection: {
    marginBottom: 16,
  },
  prizesTitle: {
    color: '#95A5A6',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  prizesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  prizeItem: {
    flex: 1,
    backgroundColor: '#2C2C3E',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  prizePlacement: {
    color: '#F39C12',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  prizeAmount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  restrictionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#2C2C3E',
    borderRadius: 8,
  },
  restrictionsText: {
    color: '#95A5A6',
    fontSize: 12,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
  },
  registerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2ECC71',
    paddingVertical: 12,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F39C12',
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498DB',
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#95A5A6',
    fontSize: 14,
    marginTop: 8,
  },
});
