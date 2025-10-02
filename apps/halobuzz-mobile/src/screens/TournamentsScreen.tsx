import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width, height } = Dimensions.get('window');

interface Tournament {
  _id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  status: 'upcoming' | 'active' | 'finished';
  startDate: string;
  endDate: string;
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  currentParticipants: number;
  gameType: string;
  rules: string[];
  rewards: {
    first: number;
    second: number;
    third: number;
    participation: number;
  };
  isJoined: boolean;
  requirements: {
    minLevel: number;
    minWinRate?: number;
  };
}

const TournamentsScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [userLevel, setUserLevel] = useState(1);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchTournaments();
    fetchUserProfile();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Pulse animation for active tournaments
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);
    Animated.loop(pulseSequence).start();
  };

  const fetchTournaments = async () => {
    try {
      const response = await apiClient.get('/tournaments');
      if (response.data && response.data.tournaments) {
        setTournaments(response.data.tournaments);
      } else {
        // Mock tournaments data
        setTournaments([
          {
            _id: '1',
            name: 'Daily Quick Play',
            description: 'Fast-paced daily tournament with quick rounds',
            type: 'daily',
            status: 'active',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            entryFee: 50,
            prizePool: 2000,
            maxParticipants: 100,
            currentParticipants: 67,
            gameType: 'Mixed Games',
            rules: ['Best of 3 rounds', 'No cheating', 'Respect other players'],
            rewards: {
              first: 1000,
              second: 600,
              third: 300,
              participation: 10
            },
            isJoined: false,
            requirements: {
              minLevel: 1
            }
          },
          {
            _id: '2',
            name: 'Weekly Championship',
            description: 'The ultimate weekly tournament with massive prizes',
            type: 'weekly',
            status: 'upcoming',
            startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
            entryFee: 200,
            prizePool: 10000,
            maxParticipants: 500,
            currentParticipants: 234,
            gameType: 'Strategy Games',
            rules: ['Best of 5 rounds', 'Single elimination', 'Fair play required'],
            rewards: {
              first: 5000,
              second: 3000,
              third: 1500,
              participation: 50
            },
            isJoined: true,
            requirements: {
              minLevel: 5,
              minWinRate: 0.6
            }
          },
          {
            _id: '3',
            name: 'Monthly Grand Prix',
            description: 'The most prestigious monthly tournament',
            type: 'monthly',
            status: 'upcoming',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
            entryFee: 500,
            prizePool: 50000,
            maxParticipants: 1000,
            currentParticipants: 456,
            gameType: 'All Games',
            rules: ['Multiple game types', 'Swiss system', 'Professional conduct'],
            rewards: {
              first: 25000,
              second: 15000,
              third: 7500,
              participation: 250
            },
            isJoined: false,
            requirements: {
              minLevel: 10,
              minWinRate: 0.7
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch tournaments:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const [balanceResponse, profileResponse] = await Promise.all([
        apiClient.get('/wallet'),
        apiClient.get('/profile/gaming-stats')
      ]);

      if (balanceResponse.data?.wallet?.balance) {
        setUserBalance(balanceResponse.data.wallet.balance);
      } else {
        setUserBalance(5000); // Fallback
      }

      if (profileResponse.data?.level) {
        setUserLevel(profileResponse.data.level);
      } else {
        setUserLevel(8);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUserBalance(5000);
      setUserLevel(8);
    }
  };

  const joinTournament = async (tournament: Tournament) => {
    // Check requirements
    if (userLevel < tournament.requirements.minLevel) {
      Alert.alert(
        'Level Required',
        `You need to be level ${tournament.requirements.minLevel} to join this tournament. You are currently level ${userLevel}.`
      );
      return;
    }

    if (tournament.requirements.minWinRate && userLevel < 10) {
      Alert.alert(
        'Experience Required',
        `You need more experience to join this tournament.`
      );
      return;
    }

    if (userBalance < tournament.entryFee) {
      Alert.alert(
        'Insufficient Balance',
        `You need at least ${tournament.entryFee} coins to join this tournament.`
      );
      return;
    }

    if (tournament.currentParticipants >= tournament.maxParticipants) {
      Alert.alert(
        'Tournament Full',
        'This tournament has reached maximum participants.'
      );
      return;
    }

    setSelectedTournament(tournament);
    setModalVisible(true);
  };

  const confirmJoinTournament = async () => {
    if (!selectedTournament) return;

    try {
      Vibration.vibrate([0, 100, 50, 100]);

      const response = await apiClient.post(`/tournaments/${selectedTournament._id}/join`, {
        entryFee: selectedTournament.entryFee
      });

      if (response.success) {
        Alert.alert(
          'Tournament Joined!',
          `You have successfully joined ${selectedTournament.name}. Good luck!`,
          [{ text: 'OK' }]
        );

        // Update tournament state
        setTournaments(prev => prev.map(t =>
          t._id === selectedTournament._id
            ? { ...t, isJoined: true, currentParticipants: t.currentParticipants + 1 }
            : t
        ));
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to join tournament');
    } finally {
      setModalVisible(false);
      setSelectedTournament(null);
    }
  };

  const getTournamentTypeColor = (type: string) => {
    const colors = {
      daily: ['#4CAF50', '#66BB6A'],
      weekly: ['#FF9800', '#FFB74D'],
      monthly: ['#9C27B0', '#BA68C8'],
      special: ['#F44336', '#EF5350']
    };
    return colors[type as keyof typeof colors] || colors.daily;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'upcoming': return '#FF9800';
      case 'finished': return '#757575';
      default: return '#757575';
    }
  };

  const renderTournamentCard = ({ item }: { item: Tournament }) => {
    const canJoin = userLevel >= item.requirements.level &&
      (!item.requirements.minWinRate || userLevel >= 10) &&
      userBalance >= item.entryFee &&
      item.currentParticipants < item.maxParticipants &&
      !item.isJoined;

    return (
      <Animated.View style={[styles.tournamentCard, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => joinTournament(item)} disabled={!canJoin}>
          <LinearGradient
            colors={getTournamentTypeColor(item.type)}
            style={[styles.tournamentGradient, !canJoin && styles.disabledTournament]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tournamentHeader}>
              <View style={styles.tournamentInfo}>
                <Text style={styles.tournamentName}>{item.name}</Text>
                <Text style={styles.tournamentType}>{item.type.toUpperCase()}</Text>
              </View>
              <View style={styles.tournamentStatus}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.tournamentDescription} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.tournamentStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Prize Pool</Text>
                <Text style={styles.statValue}>{item.prizePool.toLocaleString()} 🪙</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Entry Fee</Text>
                <Text style={styles.statValue}>{item.entryFee} 🪙</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Participants</Text>
                <Text style={styles.statValue}>{item.currentParticipants}/{item.maxParticipants}</Text>
              </View>
            </View>

            {item.isJoined && (
              <View style={styles.joinedBanner}>
                <Text style={styles.joinedText}>✅ You're in this tournament!</Text>
              </View>
            )}

            {!canJoin && !item.isJoined && (
              <View style={styles.requirementsBanner}>
                <Text style={styles.requirementsText}>
                  {userLevel < item.requirements.minLevel ? `Level ${item.requirements.minLevel} Required` :
                   item.requirements.minWinRate && userLevel < 10 ? 'More Experience Required' :
                   userBalance < item.entryFee ? 'Insufficient Balance' :
                   'Tournament Full'}
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderJoinModal = () => {
    if (!selectedTournament) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{selectedTournament.name}</Text>
              <Text style={styles.modalDescription}>{selectedTournament.description}</Text>

              <View style={styles.tournamentDetailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedTournament.type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Game Type:</Text>
                  <Text style={styles.detailValue}>{selectedTournament.gameType}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Prize Pool:</Text>
                  <Text style={styles.detailValue}>{selectedTournament.prizePool.toLocaleString()} 🪙</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Entry Fee:</Text>
                  <Text style={styles.detailValue}>{selectedTournament.entryFee} 🪙</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Participants:</Text>
                  <Text style={styles.detailValue}>{selectedTournament.currentParticipants}/{selectedTournament.maxParticipants}</Text>
                </View>
              </View>

              <View style={styles.rewardsContainer}>
                <Text style={styles.rewardsTitle}>Prize Distribution:</Text>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardPosition}>1st Place:</Text>
                  <Text style={styles.rewardAmount}>{selectedTournament.rewards.first.toLocaleString()} 🪙</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardPosition}>2nd Place:</Text>
                  <Text style={styles.rewardAmount}>{selectedTournament.rewards.second.toLocaleString()} 🪙</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardPosition}>3rd Place:</Text>
                  <Text style={styles.rewardAmount}>{selectedTournament.rewards.third.toLocaleString()} 🪙</Text>
                </View>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardPosition}>Participation:</Text>
                  <Text style={styles.rewardAmount}>{selectedTournament.rewards.participation} 🪙</Text>
                </View>
              </View>

              <View style={styles.rulesContainer}>
                <Text style={styles.rulesTitle}>Tournament Rules:</Text>
                {selectedTournament.rules.map((rule, index) => (
                  <Text key={index} style={styles.ruleItem}>• {rule}</Text>
                ))}
              </View>

              <TouchableOpacity
                style={styles.joinButton}
                onPress={confirmJoinTournament}
              >
                <Text style={styles.joinButtonText}>
                  Join Tournament - {selectedTournament.entryFee} 🪙
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🏆 Tournaments</Text>
          <Text style={styles.subtitle}>Compete for massive prizes</Text>
        </View>
        <View style={styles.userStats}>
          <Text style={styles.balanceText}>{userBalance} 🪙</Text>
          <Text style={styles.levelText}>Level {userLevel}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={tournaments}
          renderItem={renderTournamentCard}
          keyExtractor={(item: Tournament) => item._id}
          contentContainerStyle={styles.tournamentsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchTournaments();
              }}
            />
          }
        />
      )}

      {renderJoinModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  subtitle: {
    fontSize: 12,
    color: '#8B949E',
    marginTop: 2
  },
  userStats: {
    alignItems: 'flex-end'
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0D90A'
  },
  levelText: {
    fontSize: 12,
    color: '#58A6FF',
    marginTop: 2
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tournamentsList: {
    padding: 15
  },
  tournamentCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden'
  },
  tournamentGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  disabledTournament: {
    opacity: 0.6
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  tournamentInfo: {
    flex: 1
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  tournamentType: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600'
  },
  tournamentStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  tournamentDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 15,
    lineHeight: 18
  },
  tournamentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  statItem: {
    alignItems: 'center'
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2
  },
  statValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  joinedBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)'
  },
  joinedText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600'
  },
  requirementsBanner: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)'
  },
  requirementsText: {
    fontSize: 10,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)'
  },
  modalContent: {
    backgroundColor: '#1A1F29',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '85%'
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 15
  },
  modalDescription: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 20,
    lineHeight: 18
  },
  tournamentDetailsContainer: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 12,
    color: '#8B949E'
  },
  detailValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  rewardsContainer: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  rewardPosition: {
    fontSize: 12,
    color: '#8B949E'
  },
  rewardAmount: {
    fontSize: 12,
    color: '#F0D90A',
    fontWeight: '600'
  },
  rulesContainer: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10
  },
  ruleItem: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4,
    lineHeight: 16
  },
  joinButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

export default TournamentsScreen;