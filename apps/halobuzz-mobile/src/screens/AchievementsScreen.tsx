import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';

interface Achievement {
  _id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
  rewards: {
    coins: number;
    xp: number;
  };
}

const AchievementsScreen: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      // Mock achievements data
      setAchievements([
        {
          _id: '1',
          title: 'First Steps',
          description: 'Complete your first game',
          icon: 'play-circle',
          isUnlocked: true,
          progress: 1,
          maxProgress: 1,
          rewards: { coins: 50, xp: 100 }
        },
        {
          _id: '2',
          title: 'Social Butterfly',
          description: 'Gain 100 followers',
          icon: 'people',
          isUnlocked: true,
          progress: 100,
          maxProgress: 100,
          rewards: { coins: 200, xp: 500 }
        },
        {
          _id: '3',
          title: 'Content Creator',
          description: 'Stream for 100 hours total',
          icon: 'videocam',
          isUnlocked: false,
          progress: 45,
          maxProgress: 100,
          rewards: { coins: 500, xp: 1000 }
        },
        {
          _id: '4',
          title: 'Gaming Master',
          description: 'Win 50 games in a row',
          icon: 'trophy',
          isUnlocked: false,
          progress: 12,
          maxProgress: 50,
          rewards: { coins: 1000, xp: 2000 }
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderAchievementCard = ({ item }: { item: Achievement }) => (
    <View style={[
      styles.achievementCard,
      item.isUnlocked && styles.unlockedCard
    ]}>
      <View style={styles.achievementHeader}>
        <View style={styles.achievementIcon}>
          <Ionicons
            name={item.icon as any}
            size={24}
            color={item.isUnlocked ? '#4CAF50' : '#8B949E'}
          />
        </View>
        <View style={styles.achievementInfo}>
          <Text style={[
            styles.achievementTitle,
            { color: item.isUnlocked ? '#FFFFFF' : '#8B949E' }
          ]}>
            {item.title}
          </Text>
          <Text style={styles.achievementDescription}>{item.description}</Text>
        </View>
        <View style={styles.achievementStatus}>
          {item.isUnlocked ? (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          ) : (
            <Ionicons name="lock-closed" size={20} color="#8B949E" />
          )}
        </View>
      </View>

      {!item.isUnlocked && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(item.progress / item.maxProgress) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {item.progress}/{item.maxProgress}
          </Text>
        </View>
      )}

      <View style={styles.rewardInfo}>
        <Text style={styles.rewardText}>💰 {item.rewards.coins}</Text>
        <Text style={styles.rewardText}>⭐ {item.rewards.xp} XP</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎖️ Achievements</Text>
        <Text style={styles.subtitle}>Unlock rewards & badges</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={achievements}
          renderItem={renderAchievementCard}
          keyExtractor={(item: Achievement) => item._id}
          contentContainerStyle={styles.achievementsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAchievements();
              }}
            />
          }
        />
      )}
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  achievementsList: {
    padding: 15
  },
  achievementCard: {
    backgroundColor: '#1A1F29',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  unlockedCard: {
    borderColor: '#4CAF50'
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  achievementInfo: {
    flex: 1
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  achievementDescription: {
    fontSize: 14,
    color: '#8B949E',
    lineHeight: 18
  },
  achievementStatus: {
    alignItems: 'center'
  },
  progressContainer: {
    marginBottom: 15
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2A3441',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 5
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667EEA',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    color: '#8B949E',
    textAlign: 'center'
  },
  rewardInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rewardText: {
    fontSize: 12,
    color: '#8B949E'
  }
});

export default AchievementsScreen;