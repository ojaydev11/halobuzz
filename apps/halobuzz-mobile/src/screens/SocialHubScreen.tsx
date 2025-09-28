import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Animated,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

const { width } = Dimensions.get('window');

interface Friend {
  id: string;
  username: string;
  avatar: string;
  level: number;
  status: 'online' | 'offline' | 'in-game';
  lastSeen: string;
  winRate: number;
  totalGames: number;
  favoriteGame: string;
  isPlaying?: string;
  mutualFriends: number;
}

interface Guild {
  id: string;
  name: string;
  tag: string;
  description: string;
  memberCount: number;
  maxMembers: number;
  level: number;
  xp: number;
  avatar: string;
  requirements: {
    minLevel: number;
    minWinRate?: number;
  };
  activities: string[];
  perks: string[];
  isJoined: boolean;
  role?: 'member' | 'officer' | 'leader';
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'game-invite' | 'achievement' | 'system';
  gameData?: any;
}

interface GameInvite {
  id: string;
  fromUser: Friend;
  gameCode: string;
  gameName: string;
  message: string;
  timestamp: Date;
  stake?: number;
}

const SocialHubScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'friends' | 'guilds' | 'chat'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animations
  const tabAnimation = useRef(new Animated.Value(0)).current;
  const notificationBadge = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchSocialData();
    startNotificationAnimation();
  }, []);

  useEffect(() => {
    animateTabChange();
  }, [activeTab]);

  const fetchSocialData = async () => {
    try {
      const [friendsRes, guildsRes, chatRes, invitesRes] = await Promise.all([
        fetchFriends(),
        fetchGuilds(),
        fetchChatHistory(),
        fetchGameInvites()
      ]);
    } catch (error) {
      console.error('Error fetching social data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const response = await apiClient.get('/social/friends');
      if (response.data?.friends) {
        setFriends(response.data.friends);
      } else {
        // Mock friends data
        setFriends([
          {
            id: '1',
            username: 'GamerPro',
            avatar: '🎮',
            level: 25,
            status: 'online',
            lastSeen: '2 minutes ago',
            winRate: 0.75,
            totalGames: 150,
            favoriteGame: 'Battle Royale',
            isPlaying: 'crypto-battle-royale',
            mutualFriends: 5
          },
          {
            id: '2',
            username: 'ChessWizard',
            avatar: '♟️',
            level: 30,
            status: 'in-game',
            lastSeen: 'Now',
            winRate: 0.82,
            totalGames: 200,
            favoriteGame: 'Speed Chess',
            isPlaying: 'speed-chess',
            mutualFriends: 3
          },
          {
            id: '3',
            username: 'PokerFace',
            avatar: '🃏',
            level: 20,
            status: 'offline',
            lastSeen: '1 hour ago',
            winRate: 0.68,
            totalGames: 120,
            favoriteGame: 'AI Poker',
            mutualFriends: 8
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchGuilds = async () => {
    try {
      const response = await apiClient.get('/social/guilds');
      if (response.data?.guilds) {
        setGuilds(response.data.guilds);
      } else {
        // Mock guilds data
        setGuilds([
          {
            id: '1',
            name: 'Elite Gamers',
            tag: 'ELITE',
            description: 'Top-tier competitive gaming guild. Only the best players.',
            memberCount: 45,
            maxMembers: 50,
            level: 15,
            xp: 125000,
            avatar: '⚔️',
            requirements: {
              minLevel: 20,
              minWinRate: 0.70
            },
            activities: ['Daily tournaments', 'Strategy sessions', 'Skill training'],
            perks: ['10% bonus XP', 'Exclusive tournaments', 'Priority matchmaking'],
            isJoined: true,
            role: 'member'
          },
          {
            id: '2',
            name: 'Casual Legends',
            tag: 'CASU',
            description: 'Friendly community for casual gamers who love to have fun!',
            memberCount: 38,
            maxMembers: 40,
            level: 8,
            xp: 65000,
            avatar: '🎯',
            requirements: {
              minLevel: 5
            },
            activities: ['Friendly matches', 'Social events', 'Beginner guides'],
            perks: ['Weekly rewards', 'Mentorship program', 'Social events'],
            isJoined: false
          },
          {
            id: '3',
            name: 'Strategy Masters',
            tag: 'STRT',
            description: 'Guild focused on strategic games and intellectual challenges.',
            memberCount: 32,
            maxMembers: 35,
            level: 12,
            xp: 98000,
            avatar: '🧠',
            requirements: {
              minLevel: 15,
              minWinRate: 0.65
            },
            activities: ['Strategy discussions', 'Analysis sessions', 'Chess tournaments'],
            perks: ['Strategy guides', 'Expert analysis', 'Advanced tutorials'],
            isJoined: false
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching guilds:', error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await apiClient.get('/social/chat/history');
      if (response.data?.messages) {
        setChatMessages(response.data.messages);
      } else {
        // Mock chat data
        setChatMessages([
          {
            id: '1',
            senderId: '1',
            senderName: 'GamerPro',
            senderAvatar: '🎮',
            message: 'Anyone up for a quick battle royale match?',
            timestamp: new Date(Date.now() - 300000), // 5 minutes ago
            type: 'text'
          },
          {
            id: '2',
            senderId: '2',
            senderName: 'ChessWizard',
            senderAvatar: '♟️',
            message: 'Just won a chess tournament! 🏆',
            timestamp: new Date(Date.now() - 600000), // 10 minutes ago
            type: 'achievement'
          },
          {
            id: '3',
            senderId: 'system',
            senderName: 'System',
            senderAvatar: '🤖',
            message: 'New tournament starting in 1 hour: Speed Chess Grand Prix!',
            timestamp: new Date(Date.now() - 900000), // 15 minutes ago
            type: 'system'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const fetchGameInvites = async () => {
    try {
      const response = await apiClient.get('/social/invites');
      if (response.data?.invites) {
        setGameInvites(response.data.invites);
      } else {
        // Mock invites data
        setGameInvites([
          {
            id: '1',
            fromUser: {
              id: '1',
              username: 'GamerPro',
              avatar: '🎮',
              level: 25,
              status: 'online',
              lastSeen: 'Now',
              winRate: 0.75,
              totalGames: 150,
              favoriteGame: 'Battle Royale',
              mutualFriends: 5
            },
            gameCode: 'crypto-battle-royale',
            gameName: 'Crypto Battle Royale',
            message: 'Join me for an epic battle! Let\'s dominate together!',
            timestamp: new Date(Date.now() - 180000), // 3 minutes ago
            stake: 100
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const animateTabChange = () => {
    Animated.spring(tabAnimation, {
      toValue: activeTab === 'friends' ? 0 : activeTab === 'guilds' ? 1 : 2,
      useNativeDriver: true,
    }).start();
  };

  const startNotificationAnimation = () => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(notificationBadge, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(notificationBadge, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(animate, 3000);
      });
    };
    animate();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const message: ChatMessage = {
        id: Date.now().toString(),
        senderId: user?.id || 'currentUser',
        senderName: user?.username || 'You',
        senderAvatar: '👤',
        message: newMessage.trim(),
        timestamp: new Date(),
        type: 'text'
      };

      setChatMessages(prev => [...prev, message]);
      setNewMessage('');

      // In production, send to API
      await apiClient.post('/social/chat/send', {
        message: newMessage.trim()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendGameInvite = async (friendId: string, gameCode: string) => {
    try {
      await apiClient.post('/social/invites/send', {
        friendId,
        gameCode,
        message: `Let's play ${gameCode}!`
      });

      Alert.alert('Invite Sent', 'Your game invitation has been sent!');
    } catch (error) {
      console.error('Error sending invite:', error);
      Alert.alert('Error', 'Failed to send game invitation');
    }
  };

  const acceptGameInvite = async (inviteId: string) => {
    try {
      await apiClient.post(`/social/invites/${inviteId}/accept`);
      setGameInvites(prev => prev.filter(invite => invite.id !== inviteId));
      Alert.alert('Invite Accepted', 'Joining game...');
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const joinGuild = async (guildId: string) => {
    try {
      await apiClient.post(`/social/guilds/${guildId}/join`);

      setGuilds(prev => prev.map(guild =>
        guild.id === guildId
          ? { ...guild, isJoined: true, memberCount: guild.memberCount + 1, role: 'member' }
          : guild
      ));

      Alert.alert('Joined Guild', 'Welcome to the guild!');
      setModalVisible(false);
    } catch (error) {
      console.error('Error joining guild:', error);
      Alert.alert('Error', 'Failed to join guild');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'in-game': return '#FF9800';
      case 'offline': return '#757575';
      default: return '#757575';
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={styles.friendCard}
      onPress={() => {
        setSelectedFriend(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.friendHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{item.avatar}</Text>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.username}</Text>
          <Text style={styles.friendLevel}>Level {item.level}</Text>
        </View>
        <View style={styles.friendStats}>
          <Text style={styles.winRate}>{(item.winRate * 100).toFixed(0)}% WR</Text>
          <Text style={styles.lastSeen}>{item.lastSeen}</Text>
        </View>
      </View>
      {item.isPlaying && (
        <View style={styles.playingBanner}>
          <Text style={styles.playingText}>🎮 Playing {item.favoriteGame}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderGuildItem = ({ item }: { item: Guild }) => (
    <TouchableOpacity
      style={styles.guildCard}
      onPress={() => {
        setSelectedGuild(item);
        setModalVisible(true);
      }}
    >
      <LinearGradient
        colors={item.isJoined ? ['#4CAF50', '#66BB6A'] : ['#424242', '#616161']}
        style={styles.guildGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.guildHeader}>
          <Text style={styles.guildAvatar}>{item.avatar}</Text>
          <View style={styles.guildInfo}>
            <View style={styles.guildNameRow}>
              <Text style={styles.guildName}>{item.name}</Text>
              <Text style={styles.guildTag}>[{item.tag}]</Text>
            </View>
            <Text style={styles.guildLevel}>Level {item.level} • {item.memberCount}/{item.maxMembers} members</Text>
          </View>
        </View>
        <Text style={styles.guildDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.guildFooter}>
          <View style={styles.guildPerks}>
            <Text style={styles.guildPerk}>🎁 {item.perks[0]}</Text>
          </View>
          <Text style={styles.joinStatus}>
            {item.isJoined ? `${item.role?.toUpperCase()}` : 'TAP TO JOIN'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.senderId === user?.id ? styles.ownMessage : styles.otherMessage
    ]}>
      {item.senderId !== user?.id && (
        <Text style={styles.messageAvatar}>{item.senderAvatar}</Text>
      )}
      <View style={[
        styles.messageBubble,
        item.senderId === user?.id ? styles.ownBubble : styles.otherBubble,
        item.type === 'system' && styles.systemBubble
      ]}>
        {item.senderId !== user?.id && item.type !== 'system' && (
          <Text style={styles.messageSender}>{item.senderName}</Text>
        )}
        <Text style={[
          styles.messageText,
          item.senderId === user?.id ? styles.ownMessageText : styles.otherMessageText,
          item.type === 'system' && styles.systemMessageText
        ]}>
          {item.message}
        </Text>
        <Text style={styles.messageTime}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  const renderGameInvite = ({ item }: { item: GameInvite }) => (
    <View style={styles.inviteCard}>
      <LinearGradient
        colors={['#667EEA', '#764BA2']}
        style={styles.inviteGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.inviteHeader}>
          <Text style={styles.inviteAvatar}>{item.fromUser.avatar}</Text>
          <View style={styles.inviteInfo}>
            <Text style={styles.inviteFrom}>{item.fromUser.username} invited you!</Text>
            <Text style={styles.inviteGame}>{item.gameName}</Text>
          </View>
        </View>
        <Text style={styles.inviteMessage}>"{item.message}"</Text>
        {item.stake && (
          <Text style={styles.inviteStake}>💰 Stake: {item.stake} coins</Text>
        )}
        <View style={styles.inviteActions}>
          <TouchableOpacity
            style={[styles.inviteButton, styles.acceptButton]}
            onPress={() => acceptGameInvite(item.id)}
          >
            <Text style={styles.inviteButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inviteButton, styles.declineButton]}
            onPress={() => setGameInvites(prev => prev.filter(inv => inv.id !== item.id))}
          >
            <Text style={styles.inviteButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends':
        return (
          <FlatList
            data={friends.filter(friend =>
              friend.username.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                fetchSocialData();
              }} />
            }
          />
        );

      case 'guilds':
        return (
          <FlatList
            data={guilds.filter(guild =>
              guild.name.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={renderGuildItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                fetchSocialData();
              }} />
            }
          />
        );

      case 'chat':
        return (
          <View style={styles.chatContainer}>
            <FlatList
              data={chatMessages}
              renderItem={renderChatMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatList}
              inverted
            />
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#8B949E"
                multiline
                maxLength={200}
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🌟 Social Hub</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setChatModalVisible(true)}
          >
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {gameInvites.length > 0 && (
              <Animated.View
                style={[styles.notificationBadge, { transform: [{ scale: notificationBadge }] }]}
              >
                <Text style={styles.badgeText}>{gameInvites.length}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8B949E" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends, guilds..."
          placeholderTextColor="#8B949E"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'friends', label: 'Friends', icon: 'people' },
          { key: 'guilds', label: 'Guilds', icon: 'shield' },
          { key: 'chat', label: 'Chat', icon: 'chatbubbles' }
        ].map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.key ? '#667EEA' : '#8B949E'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Friend/Guild Detail Modal */}
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

            {selectedFriend && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalAvatar}>{selectedFriend.avatar}</Text>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalName}>{selectedFriend.username}</Text>
                    <Text style={styles.modalLevel}>Level {selectedFriend.level}</Text>
                  </View>
                  <View style={[styles.modalStatusDot, { backgroundColor: getStatusColor(selectedFriend.status) }]} />
                </View>

                <View style={styles.modalStats}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{selectedFriend.totalGames}</Text>
                    <Text style={styles.statLabel}>Games Played</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{(selectedFriend.winRate * 100).toFixed(0)}%</Text>
                    <Text style={styles.statLabel}>Win Rate</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{selectedFriend.mutualFriends}</Text>
                    <Text style={styles.statLabel}>Mutual Friends</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.inviteButton]}
                    onPress={() => sendGameInvite(selectedFriend.id, 'crypto-battle-royale')}
                  >
                    <Text style={styles.actionButtonText}>🎮 Invite to Game</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.messageButton]}>
                    <Text style={styles.actionButtonText}>💬 Send Message</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {selectedGuild && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalAvatar}>{selectedGuild.avatar}</Text>
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalName}>{selectedGuild.name}</Text>
                    <Text style={styles.modalLevel}>[{selectedGuild.tag}] Level {selectedGuild.level}</Text>
                  </View>
                </View>

                <Text style={styles.guildModalDescription}>{selectedGuild.description}</Text>

                <View style={styles.guildRequirements}>
                  <Text style={styles.requirementsTitle}>Requirements:</Text>
                  <Text style={styles.requirement}>• Minimum level: {selectedGuild.requirements.minLevel}</Text>
                  {selectedGuild.requirements.minWinRate && (
                    <Text style={styles.requirement}>• Win rate: {(selectedGuild.requirements.minWinRate * 100).toFixed(0)}%+</Text>
                  )}
                </View>

                <View style={styles.guildPerksSection}>
                  <Text style={styles.perksTitle}>Guild Perks:</Text>
                  {selectedGuild.perks.map((perk, index) => (
                    <Text key={index} style={styles.perk}>• {perk}</Text>
                  ))}
                </View>

                {!selectedGuild.isJoined && (
                  <TouchableOpacity
                    style={styles.joinGuildButton}
                    onPress={() => joinGuild(selectedGuild.id)}
                  >
                    <Text style={styles.joinGuildButtonText}>Join Guild</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Game Invites Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setChatModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Game Invitations</Text>

            {gameInvites.length > 0 ? (
              <FlatList
                data={gameInvites}
                renderItem={renderGameInvite}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyInvites}>
                <Text style={styles.emptyText}>No game invitations</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  notificationButton: {
    position: 'relative',
    marginRight: 15
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  searchButton: {
    // Base styles
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFFFFF'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1F29',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 5
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10
  },
  activeTab: {
    backgroundColor: '#2A3441'
  },
  tabText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B949E'
  },
  activeTabText: {
    color: '#667EEA'
  },
  listContainer: {
    padding: 15
  },
  friendCard: {
    backgroundColor: '#1A1F29',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative'
  },
  avatar: {
    fontSize: 40,
    marginRight: 15
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1A1F29'
  },
  friendInfo: {
    flex: 1
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  friendLevel: {
    fontSize: 12,
    color: '#8B949E'
  },
  friendStats: {
    alignItems: 'flex-end'
  },
  winRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  },
  lastSeen: {
    fontSize: 11,
    color: '#8B949E',
    marginTop: 2
  },
  playingBanner: {
    marginTop: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)'
  },
  playingText: {
    fontSize: 12,
    color: '#667EEA',
    textAlign: 'center'
  },
  guildCard: {
    borderRadius: 15,
    marginBottom: 10,
    overflow: 'hidden'
  },
  guildGradient: {
    padding: 15
  },
  guildHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  guildAvatar: {
    fontSize: 35,
    marginRight: 15
  },
  guildInfo: {
    flex: 1
  },
  guildNameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  guildName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 5
  },
  guildTag: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)'
  },
  guildLevel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2
  },
  guildDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    lineHeight: 18
  },
  guildFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  guildPerks: {
    flex: 1
  },
  guildPerk: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)'
  },
  joinStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  chatContainer: {
    flex: 1,
    padding: 15
  },
  chatList: {
    flexGrow: 1,
    justifyContent: 'flex-end'
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end'
  },
  ownMessage: {
    justifyContent: 'flex-end'
  },
  otherMessage: {
    justifyContent: 'flex-start'
  },
  messageAvatar: {
    fontSize: 24,
    marginRight: 8,
    marginBottom: 2
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 10,
    borderRadius: 18,
    marginHorizontal: 5
  },
  ownBubble: {
    backgroundColor: '#667EEA'
  },
  otherBubble: {
    backgroundColor: '#2A3441'
  },
  systemBubble: {
    backgroundColor: '#1A1F29',
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  messageSender: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B949E',
    marginBottom: 2
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  ownMessageText: {
    color: '#FFFFFF'
  },
  otherMessageText: {
    color: '#FFFFFF'
  },
  systemMessageText: {
    color: '#8B949E'
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    alignSelf: 'flex-end'
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1A1F29',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  chatInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    paddingVertical: 8
  },
  sendButton: {
    backgroundColor: '#667EEA',
    borderRadius: 20,
    padding: 8,
    marginLeft: 10
  },
  inviteCard: {
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden'
  },
  inviteGradient: {
    padding: 15
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  inviteAvatar: {
    fontSize: 35,
    marginRight: 15
  },
  inviteInfo: {
    flex: 1
  },
  inviteFrom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  inviteGame: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)'
  },
  inviteMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
    marginBottom: 8
  },
  inviteStake: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 10
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  inviteButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5
  },
  acceptButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)'
  },
  declineButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)'
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 15
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
  modalLevel: {
    fontSize: 14,
    color: '#8B949E'
  },
  modalStatusDot: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  modalStats: {
    flexDirection: 'row',
    backgroundColor: '#0F1419',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20
  },
  statBox: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#8B949E'
  },
  modalActions: {
    gap: 10
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center'
  },
  inviteButton: {
    backgroundColor: '#667EEA'
  },
  messageButton: {
    backgroundColor: '#2A3441',
    borderWidth: 1,
    borderColor: '#667EEA'
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  guildModalDescription: {
    fontSize: 14,
    color: '#8B949E',
    marginBottom: 20,
    lineHeight: 20
  },
  guildRequirements: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  requirement: {
    fontSize: 12,
    color: '#8B949E',
    marginBottom: 4
  },
  guildPerksSection: {
    backgroundColor: '#0F1419',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20
  },
  perksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8
  },
  perk: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4
  },
  joinGuildButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center'
  },
  joinGuildButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  emptyInvites: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyText: {
    fontSize: 16,
    color: '#8B949E'
  }
});

export default SocialHubScreen;