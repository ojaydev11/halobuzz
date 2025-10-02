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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width } = Dimensions.get('window');

interface LeaderboardEntry {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  rank: number;
  score: number;
  level: number;
  winRate: number;
  totalGames: number;
  streak: number;
  isCurrentUser?: boolean;
  badge?: string;
}

interface LeaderboardCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  totalPlayers: number;
}

const LeaderboardsScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntry[]>([]);
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('overall');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchLeaderboards();
    fetchCategories();
    startAnimations();
  }, [selectedCategory]);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchLeaderboards = async () => {
    try {
      const response = await apiClient.get(`/leaderboards/${selectedCategory}`);
      if (response.data && response.data.leaderboard) {
        setLeaderboards(response.data.leaderboard);
      } else {
        // Mock leaderboard data
        setLeaderboards([
          {
            _id: '1',
            username: 'GamerPro',
            displayName: 'Gamer Pro',
            avatar: '🎮',
            rank: 1,
            score: 125000,
            level: 50,
            winRate: 0.85,
            totalGames: 500,
            streak: 15,
            badge: '👑'
          },
          {
            _id: '2',
            username: 'ChessWizard',
            displayName: 'Chess Wizard',
            avatar: '♟️',
            rank: 2,
            score: 118000,
            level: 48,
            winRate: 0.82,
            totalGames: 450,
            streak: 12,
            badge: '🥈'
          },
          {
            _id: '3',
            username: 'PokerFace',
            displayName: 'Poker Face',
            avatar: '🃏',
            rank: 3,
            score: 110000,
            level: 45,
            winRate: 0.78,
            totalGames: 400,
            streak: 8,
            badge: '🥉'
          },
          {
            _id: user?.id || 'current',
            username: user?.username || 'You',
            displayName: user?.displayName || 'You',
            avatar: '👤',
            rank: 247,
            score: 25000,
            level: 8,
            winRate: 0.6,
            totalGames: 25,
            streak: 3,
            isCurrentUser: true
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboards:', error);
      setLeaderboards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/leaderboards/categories');
      if (response.data && response.data.categories) {
        setCategories(response.data.categories);
      } else {
        // Mock categories data
        setCategories([
          {
            id: 'overall',
            name: 'Overall',
            icon: 'trophy',
            description: 'All-time best players',
            totalPlayers: 12500
          },
          {
            id: 'weekly',
            name: 'Weekly',
            icon: 'calendar',
            description: 'This week\'s top performers',
            totalPlayers: 8500
          },
          {
            id: 'monthly',
            name: 'Monthly',
            icon: 'time',
            description: 'Monthly champions',
            totalPlayers: 9200
          },
          {
            id: 'gaming',
            name: 'Gaming',
            icon: 'game-controller',
            description: 'Gaming specialists',
            totalPlayers: 6800
          },
          {
            id: 'strategy',
            name: 'Strategy',
            icon: 'bulb',
            description: 'Strategic masterminds',
            totalPlayers: 4200
          },
          {
            id: 'casual',
            name: 'Casual',
            icon: 'happy',
            description: 'Casual game experts',
            totalPlayers: 5600
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#FFFFFF';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <Animated.View
      style={[
        styles.leaderboardEntry,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50],
              })
            }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.entryCard,
          item.isCurrentUser && styles.currentUserCard
        ]}
        onPress={() => {
          setSelectedPlayer(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: getRankColor(item.rank) }]}>
            {getRankIcon(item.rank)}
          </Text>
          <Text style={[styles.rankNumber, { color: getRankColor(item.rank) }]}>
            #{item.rank}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.playerHeader}>
            <Text style={styles.playerAvatar}>{item.avatar}</Text>
            <View style={styles.playerDetails}>
              <View style={styles.playerNameRow}>
                <Text style={styles.playerName}>{item.displayName}</Text>
                {item.badge && <Text style={styles.badge}>{item.badge}</Text>}
                {item.isCurrentUser && (
                  <View style={styles.currentUserBadge}>
                    <Text style={styles.currentUserText}>YOU</Text>
                  </View>
                )}
              </View>
              <Text style={styles.playerUsername}>@{item.username}</Text>
            </View>
          </View>

          <View style={styles.playerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.score.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Lv.{item.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(item.winRate * 100).toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCategoryTab = ({ item }: { item: LeaderboardCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.id && styles.activeCategoryTab
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons
        name={item.icon as any}
        size={20}
        color={selectedCategory === item.id ? '#FFFFFF' : '#8B949E'}
      />
      <Text style={[
        styles.categoryTabText,
        selectedCategory === item.id && styles.activeCategoryTabText
      ]}>
        {item.name}
      </Text>
      <Text style={styles.categoryCount}>{item.totalPlayers}</Text>
    </TouchableOpacity>
  );

  const renderPlayerModal = () => {
    if (!selectedPlayer) return null;

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
              <View style={styles.modalHeader}>
                <Text style={styles.modalAvatar}>{selectedPlayer.avatar}</Text>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalName}>{selectedPlayer.displayName}</Text>
                  <Text style={styles.modalUsername}>@{selectedPlayer.username}</Text>
                  <Text style={styles.modalRank}>Rank #{selectedPlayer.rank}</Text>
                </View>
              </View>

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{selectedPlayer.score.toLocaleString()}</Text>
                  <Text style={styles.modalStatLabel}>Total Score</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>Level {selectedPlayer.level}</Text>
                  <Text style={styles.modalStatLabel}>Level</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{(selectedPlayer.winRate * 100).toFixed(0)}%</Text>
                  <Text style={styles.modalStatLabel}>Win Rate</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{selectedPlayer.totalGames}</Text>
                  <Text style={styles.modalStatLabel}>Games Played</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatValue}>{selectedPlayer.streak}</Text>
                  <Text style={styles.modalStatLabel}>Current Streak</Text>
                </View>
              </View>

              {!selectedPlayer.isCurrentUser && (
                <TouchableOpacity style={styles.challengeButton}>
                  <Text style={styles.challengeButtonText}>🎮 Challenge Player</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Leaderboards</Text>
        <Text style={styles.subtitle}>Global rankings & stats</Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryTab}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Leaderboard */}
      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={leaderboards}
          renderItem={renderLeaderboardEntry}
          keyExtractor={(item: LeaderboardEntry) => item._id}
          contentContainerStyle={styles.leaderboardList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchLeaderboards();
              }}
            />
          }
        />
      )}

      {renderPlayerModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419'
  },
  header: {
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
  categoriesContainer: {
    backgroundColor: '#1A1F29',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  categoriesList: {
    paddingHorizontal: 15
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3441',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10
  },
  activeCategoryTab: {
    backgroundColor: '#667EEA'
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B949E',
    marginLeft: 6
  },
  activeCategoryTabText: {
    color: '#FFFFFF'
  },
  categoryCount: {
    fontSize: 10,
    color: '#8B949E',
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  leaderboardList: {
    padding: 15
  },
  leaderboardEntry: {
    marginBottom: 10
  },
  entryCard: {
    backgroundColor: '#1A1F29',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  currentUserCard: {
    borderColor: '#667EEA',
    borderWidth: 2
  },
  rankContainer: {
    alignItems: 'center',
    marginBottom: 10
  },
  rankText: {
    fontSize: 24,
    marginBottom: 2
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  playerInfo: {
    flex: 1
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  playerAvatar: {
    fontSize: 30,
    marginRight: 12
  },
  playerDetails: {
    flex: 1
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8
  },
  badge: {
    fontSize: 16,
    marginRight: 8
  },
  currentUserBadge: {
    backgroundColor: '#667EEA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  currentUserText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  playerUsername: {
    fontSize: 12,
    color: '#8B949E'
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 10,
    color: '#8B949E'
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 15
  },
  modalAvatar: {
    fontSize: 50,
    marginRight: 20
  },
  modalInfo: {
    flex: 1
  },
  modalName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  modalUsername: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 4
  },
  modalRank: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667EEA'
  },
  modalStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#0F1419',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20
  },
  modalStatItem: {
    width: '50%',
    alignItems: 'center',
    marginBottom: 15
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#8B949E'
  },
  challengeButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center'
  },
  challengeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

export default LeaderboardsScreen;