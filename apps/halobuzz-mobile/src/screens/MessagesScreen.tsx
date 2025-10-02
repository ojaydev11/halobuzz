import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'game_invite' | 'system';
  read: boolean;
  gameInvite?: {
    gameId: string;
    gameName: string;
    stake: number;
  };
}

interface Conversation {
  _id: string;
  participants: Array<{
    _id: string;
    username: string;
    avatar: string;
    online: boolean;
  }>;
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

const MessagesScreen: React.FC = ({ navigation }: any) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await apiClient.get('/messages/conversations');

      if (response.data && response.data.conversations) {
        setConversations(response.data.conversations);
      } else {
        // Fallback conversations data
        setConversations([
          {
            _id: '1',
            participants: [
              {
                _id: 'user1',
                username: 'ProGamer_X',
                avatar: '',
                online: true
              },
              {
                _id: user?.id || 'current_user',
                username: user?.username || 'You',
                avatar: '',
                online: true
              }
            ],
            lastMessage: {
              _id: 'msg1',
              sender: {
                _id: 'user1',
                username: 'ProGamer_X',
                avatar: ''
              },
              content: 'Hey! Ready for that tournament?',
              timestamp: new Date(Date.now() - 300000).toISOString(),
              type: 'text',
              read: false
            },
            unreadCount: 2,
            updatedAt: new Date(Date.now() - 300000).toISOString()
          },
          {
            _id: '2',
            participants: [
              {
                _id: 'user2',
                username: 'MusicMaven',
                avatar: '',
                online: false
              },
              {
                _id: user?.id || 'current_user',
                username: user?.username || 'You',
                avatar: '',
                online: true
              }
            ],
            lastMessage: {
              _id: 'msg2',
              sender: {
                _id: user?.id || 'current_user',
                username: user?.username || 'You',
                avatar: ''
              },
              content: 'Thanks for the stream!',
              timestamp: new Date(Date.now() - 1800000).toISOString(),
              type: 'text',
              read: true
            },
            unreadCount: 0,
            updatedAt: new Date(Date.now() - 1800000).toISOString()
          },
          {
            _id: '3',
            participants: [
              {
                _id: 'user3',
                username: 'ChefMarco',
                avatar: '',
                online: true
              },
              {
                _id: user?.id || 'current_user',
                username: user?.username || 'You',
                avatar: '',
                online: true
              }
            ],
            lastMessage: {
              _id: 'msg3',
              sender: {
                _id: 'user3',
                username: 'ChefMarco',
                avatar: ''
              },
              content: 'Want to play Cooking Master?',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              type: 'game_invite',
              read: false,
              gameInvite: {
                gameId: 'cooking-master',
                gameName: 'Cooking Master',
                stake: 100
              }
            },
            unreadCount: 1,
            updatedAt: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openConversation = (conversation: Conversation) => {
    // Navigate to chat screen
    console.log('Opening conversation:', conversation._id);
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now.getTime() - messageTime.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p._id !== user?.id);
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherUser = getOtherParticipant(item);
    if (!otherUser) return null;

    return (
      <TouchableOpacity onPress={() => openConversation(item)}>
        <View style={styles.conversationItem}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{otherUser.username[0].toUpperCase()}</Text>
            </View>
            {otherUser.online && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text style={styles.username}>{otherUser.username}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.lastMessage.timestamp)}</Text>
            </View>

            <View style={styles.messagePreview}>
              {item.lastMessage.type === 'game_invite' ? (
                <View style={styles.gameInvitePreview}>
                  <Ionicons name="game-controller" size={14} color="#667EEA" />
                  <Text style={styles.gameInviteText}>
                    Game invite: {item.lastMessage.gameInvite?.gameName}
                  </Text>
                </View>
              ) : (
                <Text style={styles.messageText} numberOfLines={1}>
                  {item.lastMessage.content}
                </Text>
              )}
            </View>
          </View>

          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#8B949E" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#8B949E"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8B949E" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true;
    const otherUser = getOtherParticipant(conversation);
    return otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Messages</Text>
        <Text style={styles.subtitle}>Stay connected</Text>
      </View>

      {renderSearchBar()}

      {loading ? (
        <ActivityIndicator size="large" color="#667EEA" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
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
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1A1F29',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3441',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 15
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F29',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3441'
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A3441',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#1A1F29'
  },
  conversationInfo: {
    flex: 1
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  timestamp: {
    fontSize: 11,
    color: '#8B949E'
  },
  messagePreview: {
    marginTop: 2
  },
  messageText: {
    fontSize: 13,
    color: '#8B949E',
    lineHeight: 16
  },
  gameInvitePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  gameInviteText: {
    fontSize: 12,
    color: '#667EEA',
    fontWeight: '500'
  },
  unreadBadge: {
    backgroundColor: '#667EEA',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF'
  }
});

export default MessagesScreen;





