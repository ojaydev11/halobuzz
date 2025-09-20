import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import StreamChat from '@/components/StreamChat';
import { apiClient } from '@/lib/api';
import { Stream } from '@/types/stream';
import { useRouter } from 'expo-router';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
}

interface Chat {
  id: string;
  participants: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    verified: boolean;
    isOnline: boolean;
    lastSeen?: string;
  }[];
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  isTyping: boolean;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  isOnline: boolean;
  lastSeen?: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chats');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [activeLive, setActiveLive] = useState<{ streamId: string; hostId?: string } | null>(null);

  useEffect(() => {
    loadChats();
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'live') {
      loadLiveStreams();
    }
  }, [activeTab]);

  const loadChats = async () => {
    try {
      setLoading(true);
      
      // Mock chats data
      const mockChats: Chat[] = [
        {
          id: '1',
          participants: [
            {
              id: '1',
              username: 'gamingpro',
              displayName: 'Gaming Pro',
              verified: true,
              isOnline: true,
            },
            {
              id: user?.id || 'current',
              username: user?.username || 'you',
              displayName: user?.displayName || 'You',
              verified: false,
              isOnline: true,
            },
          ],
          lastMessage: {
            text: 'Hey! Did you see that new game update?',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            senderId: '1',
          },
          unreadCount: 2,
          isTyping: false,
        },
        {
          id: '2',
          participants: [
            {
              id: '2',
              username: 'dancequeen',
              displayName: 'Dance Queen',
              verified: true,
              isOnline: false,
              lastSeen: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: user?.id || 'current',
              username: user?.username || 'you',
              displayName: user?.displayName || 'You',
              verified: false,
              isOnline: true,
            },
          ],
          lastMessage: {
            text: 'Thanks for the follow! 🎉',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            senderId: '2',
          },
          unreadCount: 0,
          isTyping: false,
        },
        {
          id: '3',
          participants: [
            {
              id: '3',
              username: 'chefmaster',
              displayName: 'Chef Master',
              verified: false,
              isOnline: true,
            },
            {
              id: user?.id || 'current',
              username: user?.username || 'you',
              displayName: user?.displayName || 'You',
              verified: false,
              isOnline: true,
            },
          ],
          lastMessage: {
            text: 'Check out my new recipe video!',
            timestamp: new Date(Date.now() - 10800000).toISOString(),
            senderId: '3',
          },
          unreadCount: 1,
          isTyping: true,
        },
      ];

      setChats(mockChats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Mock users data
      const mockUsers: User[] = [
        {
          id: '4',
          username: 'newcreator',
          displayName: 'New Creator',
          verified: false,
          isOnline: true,
        },
        {
          id: '5',
          username: 'gaminglegend',
          displayName: 'Gaming Legend',
          verified: true,
          isOnline: false,
          lastSeen: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: '6',
          username: 'artmaster',
          displayName: 'Art Master',
          verified: false,
          isOnline: true,
        },
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      // Mock messages data
      const mockMessages: Message[] = [
        {
          id: '1',
          senderId: '1',
          receiverId: user?.id || 'current',
          text: 'Hey! Did you see that new game update?',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isRead: true,
          type: 'text',
        },
        {
          id: '2',
          senderId: user?.id || 'current',
          receiverId: '1',
          text: 'Yes! The graphics are amazing!',
          timestamp: new Date(Date.now() - 1700000).toISOString(),
          isRead: true,
          type: 'text',
        },
        {
          id: '3',
          senderId: '1',
          receiverId: user?.id || 'current',
          text: 'Want to play together later?',
          timestamp: new Date(Date.now() - 1600000).toISOString(),
          isRead: false,
          type: 'text',
        },
        {
          id: '4',
          senderId: '1',
          receiverId: user?.id || 'current',
          text: 'I found this awesome combo move!',
          timestamp: new Date(Date.now() - 1500000).toISOString(),
          isRead: false,
          type: 'text',
        },
      ];

      setMessages(mockMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadLiveStreams = async () => {
    try {
      setLiveLoading(true);
      const res = await apiClient.get('/streams', { params: { limit: 20, page: 1 } });
      const list = res?.data?.streams || res?.data?.data?.streams || res?.streams || [];
      const mapped: Stream[] = list.map((s: any) => ({
        id: s.id || s._id,
        channelName: s.agoraChannel || s.channelName || (s.id || s._id),
        hostId: s.host?.id || s.hostId || s.host?._id,
        hostName: s.host?.username,
        hostAvatar: s.host?.avatar,
        host: {
          id: s.host?.id || s.host?._id || s.hostId,
          username: s.host?.username || s.hostName || 'host',
          avatar: s.host?.avatar,
          ogLevel: s.host?.ogLevel,
          followers: s.host?.followers,
        },
        thumb: s.thumbnail || s.thumb || 'https://picsum.photos/400/300',
        viewers: s.currentViewers || s.viewerCount || 0,
        country: s.country || 'NP',
        startedAt: s.startedAt || s.startTime || new Date().toISOString(),
        tags: s.tags || [],
        title: s.title,
        category: s.category,
        description: s.description,
        isLive: s.status ? s.status === 'live' : true,
        data: s,
      }));
      setLiveStreams(mapped);
    } catch (e) {
      console.error('Failed to load live streams:', e);
      setLiveStreams([]);
    } finally {
      setLiveLoading(false);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && selectedChat) {
      const message: Message = {
        id: Date.now().toString(),
        senderId: user?.id || 'current',
        receiverId: selectedChat.participants.find(p => p.id !== user?.id)?.id || '',
        text: newMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
        type: 'text',
      };

      setMessages([...messages, message]);
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const startChat = (userId: string) => {
    const existingChat = chats.find((chat: Chat) => 
      chat.participants.some((p: any) => p.id === userId)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      loadMessages(existingChat.id);
      setActiveTab('chat');
    } else {
      // Create new chat
      const newChat: Chat = {
        id: Date.now().toString(),
        participants: [
          users.find(u => u.id === userId)!,
          {
            id: user?.id || 'current',
            username: user?.username || 'you',
            displayName: user?.displayName || 'You',
            verified: false,
            isOnline: true,
          },
        ],
        lastMessage: {
          text: 'Chat started',
          timestamp: new Date().toISOString(),
          senderId: user?.id || 'current',
        },
        unreadCount: 0,
        isTyping: false,
      };

      setChats([newChat, ...chats]);
      setSelectedChat(newChat);
      setMessages([]);
      setActiveTab('chat');
    }
  };

  const getOtherParticipant = (chat: Chat): any => {
    return chat.participants.find((p: any) => p.id !== user?.id);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  };

  const TabButton = ({ id, title, isActive, onPress }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  const ChatItem = ({ chat }: { chat: Chat }) => {
    const otherParticipant = getOtherParticipant(chat);
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          setSelectedChat(chat);
          loadMessages(chat.id);
          setActiveTab('chat');
        }}
      >
        <View style={styles.chatAvatar}>
          <Image 
            source={{ uri: otherParticipant?.avatar || `https://via.placeholder.com/50x50/007AFF/ffffff?text=${otherParticipant?.username?.charAt(0).toUpperCase()}` }} 
            style={styles.avatarImage}
          />
          {otherParticipant?.isOnline && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{otherParticipant?.displayName}</Text>
            {otherParticipant?.verified && (
              <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
            )}
            <Text style={styles.chatTime}>{formatTime(chat.lastMessage.timestamp)}</Text>
          </View>
          
          <View style={styles.chatMessage}>
            <Text style={styles.chatMessageText} numberOfLines={1}>
              {chat.lastMessage.text}
            </Text>
            {chat.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{chat.unreadCount}</Text>
              </View>
            )}
          </View>
          
          {chat.isTyping && (
            <Text style={styles.typingText}>typing...</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const MessageItem = ({ message }: { message: Message }) => {
    const isOwn = message.senderId === user?.id;
    
    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessage]}>
        <View style={[styles.messageBubble, isOwn && styles.ownMessageBubble]}>
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {message.text}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const UserItem = ({ user: userItem }: { user: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => startChat(userItem.id)}
    >
      <View style={styles.userAvatar}>
        <Image 
          source={{ uri: userItem.avatar || `https://via.placeholder.com/50x50/007AFF/ffffff?text=${userItem.username.charAt(0).toUpperCase()}` }} 
          style={styles.avatarImage}
        />
        {userItem.isOnline && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.userContent}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{userItem.displayName}</Text>
          {userItem.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
          )}
        </View>
        
        <Text style={styles.userUsername}>@{userItem.username}</Text>
        
        <Text style={styles.userStatus}>
          {userItem.isOnline ? 'Online' : 
           userItem.lastSeen ? `Last seen ${formatTime(userItem.lastSeen)}` : 'Offline'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.messageUserButton}
        onPress={() => startChat(userItem.id)}
      >
        <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const ChatsList = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      <FlatList
        data={chats.filter(chat => 
          getOtherParticipant(chat)?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getOtherParticipant(chat)?.username.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={({ item }) => <ChatItem chat={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const UsersList = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      <FlatList
        data={users.filter(userItem => 
          userItem.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          userItem.username.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={({ item }) => <UserItem user={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const LiveList = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search live streams..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {liveLoading ? (
        <View style={styles.loadingContainer}><ActivityIndicator color="#007AFF" /></View>
      ) : (
        <FlatList
          data={liveStreams.filter((s: Stream) => (s.title || s.host?.username || '').toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Stream }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => setActiveLive({ streamId: item.id, hostId: item.host?.id })}
            >
              <View style={styles.chatAvatar}>
                <Image
                  source={{ uri: item.thumb }}
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{item.title || item.host?.username}</Text>
                  <Text style={styles.chatTime}>{(item.viewers || 0)} live</Text>
                </View>
                <View style={styles.chatMessage}>
                  <Text style={styles.chatMessageText} numberOfLines={1}>
                    Tap to join live chat
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const ChatView = () => {
    const otherParticipant = selectedChat ? getOtherParticipant(selectedChat) : null;
    
    return (
      <View style={styles.chatView}>
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setActiveTab('chats')}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>{otherParticipant?.displayName}</Text>
            <Text style={styles.chatHeaderStatus}>
              {otherParticipant?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.chatHeaderActions}>
            <Ionicons name="videocam" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageItem message={item} />}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.messageInputContainer}
        >
          <View style={styles.messageInput}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add" size={24} color="#888" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.messageTextInput}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity 
              style={[styles.sendButton, newMessage.trim() && styles.sendButtonActive]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons name="send" size={20} color={newMessage.trim() ? "#fff" : "#888"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {activeTab === 'chat' ? (
        <ChatView />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Messages</Text>
              <Text style={styles.subtitle}>Stay connected</Text>
            </View>
            <TouchableOpacity 
              style={styles.newMessageButton}
              onPress={() => setActiveTab('users')}
            >
              <Ionicons name="create-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TabButton
              id="chats"
              title="Chats"
              isActive={activeTab === 'chats'}
              onPress={() => setActiveTab('chats')}
            />
            <TabButton
              id="users"
              title="Users"
              isActive={activeTab === 'users'}
              onPress={() => setActiveTab('users')}
            />
            <TabButton
              id="live"
              title="Live"
              isActive={activeTab === 'live'}
              onPress={() => setActiveTab('live')}
            />
          </View>

          {/* Content */}
          {activeTab === 'chats' ? <ChatsList /> : activeTab === 'users' ? <UsersList /> : <LiveList />}
        </>
      )}

      {/* Embedded Live Stream Chat */}
      {activeLive && (
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0 }}>
          <StreamChat
            streamId={activeLive.streamId}
            hostId={activeLive.hostId || ''}
            onGift={() => {}}
            onFollow={() => {}}
            isVisible={true}
            onToggleVisibility={() => setActiveLive(null)}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  newMessageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  chatAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff00',
    borderWidth: 2,
    borderColor: '#000',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatTime: {
    color: '#888',
    fontSize: 12,
    marginLeft: 'auto',
  },
  chatMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatMessageText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  typingText: {
    color: '#007AFF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  userAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  userContent: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userUsername: {
    color: '#888',
    fontSize: 14,
    marginBottom: 2,
  },
  userStatus: {
    color: '#888',
    fontSize: 12,
  },
  messageUserButton: {
    padding: 8,
  },
  chatView: {
    flex: 1,
  },
  chatHeaderMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  chatHeaderStatus: {
    color: '#888',
    fontSize: 14,
  },
  chatHeaderActions: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messageContainer: {
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    color: '#888',
    fontSize: 12,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  messageInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  attachButton: {
    padding: 4,
  },
  messageTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#333',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
});
