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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { useRouter } from 'expo-router';
import SecurityService, { SecurityLevel } from '@/services/SecurityService';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  encryptedText: string;
  timestamp: string;
  isRead: boolean;
  isEncrypted: boolean;
  securityLevel: SecurityLevel;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  hash: string; // For integrity verification
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
    publicKey?: string; // For end-to-end encryption
  }[];
  lastMessage: {
    text: string;
    timestamp: string;
    senderId: string;
    isEncrypted: boolean;
  };
  unreadCount: number;
  isTyping: boolean;
  isSecure: boolean; // End-to-end encrypted
  securityLevel: SecurityLevel;
}

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  isOnline: boolean;
  lastSeen?: string;
  publicKey?: string;
  securityStatus: 'verified' | 'unverified' | 'suspicious';
}

export default function MessagesSectionScreen() {
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
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityAudit, setSecurityAudit] = useState<any>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const securityService = SecurityService.getInstance();

  useEffect(() => {
    initializeSecurity();
    loadChats();
    loadUsers();
  }, []);

  const initializeSecurity = async () => {
    try {
      const audit = await securityService.performSecurityAudit();
      setSecurityAudit(audit);
      
      if (!audit.isSecure) {
        console.warn('Security issues detected:', audit.issues);
      }
    } catch (error) {
      console.error('Failed to initialize security:', error);
    }
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      
      // Mock encrypted chats data
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
              publicKey: 'encrypted_public_key_1',
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
            isEncrypted: true,
          },
          unreadCount: 2,
          isTyping: false,
          isSecure: true,
          securityLevel: SecurityLevel.TOP_SECRET,
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
              publicKey: 'encrypted_public_key_2',
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
            isEncrypted: true,
          },
          unreadCount: 0,
          isTyping: false,
          isSecure: true,
          securityLevel: SecurityLevel.TOP_SECRET,
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
              publicKey: 'encrypted_public_key_3',
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
            isEncrypted: false,
          },
          unreadCount: 1,
          isTyping: true,
          isSecure: false,
          securityLevel: SecurityLevel.SENSITIVE,
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
      // Mock users data with security status
      const mockUsers: User[] = [
        {
          id: '4',
          username: 'newcreator',
          displayName: 'New Creator',
          verified: false,
          isOnline: true,
          publicKey: 'encrypted_public_key_4',
          securityStatus: 'verified',
        },
        {
          id: '5',
          username: 'gaminglegend',
          displayName: 'Gaming Legend',
          verified: true,
          isOnline: false,
          lastSeen: new Date(Date.now() - 1800000).toISOString(),
          publicKey: 'encrypted_public_key_5',
          securityStatus: 'verified',
        },
        {
          id: '6',
          username: 'artmaster',
          displayName: 'Art Master',
          verified: false,
          isOnline: true,
          publicKey: 'encrypted_public_key_6',
          securityStatus: 'unverified',
        },
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      // Mock encrypted messages data
      const mockMessages: Message[] = [
        {
          id: '1',
          senderId: '1',
          receiverId: user?.id || 'current',
          text: 'Hey! Did you see that new game update?',
          encryptedText: 'encrypted_message_1',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isRead: true,
          isEncrypted: true,
          securityLevel: SecurityLevel.TOP_SECRET,
          type: 'text',
          hash: 'message_hash_1',
        },
        {
          id: '2',
          senderId: user?.id || 'current',
          receiverId: '1',
          text: 'Yes! The graphics are amazing!',
          encryptedText: 'encrypted_message_2',
          timestamp: new Date(Date.now() - 1700000).toISOString(),
          isRead: true,
          isEncrypted: true,
          securityLevel: SecurityLevel.TOP_SECRET,
          type: 'text',
          hash: 'message_hash_2',
        },
        {
          id: '3',
          senderId: '1',
          receiverId: user?.id || 'current',
          text: 'Want to play together later?',
          encryptedText: 'encrypted_message_3',
          timestamp: new Date(Date.now() - 1600000).toISOString(),
          isRead: false,
          isEncrypted: true,
          securityLevel: SecurityLevel.TOP_SECRET,
          type: 'text',
          hash: 'message_hash_3',
        },
      ];

      setMessages(mockMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() && selectedChat) {
      setIsEncrypting(true);
      
      try {
        // Encrypt the message
        const encryptedText = await securityService.encryptMessage(
          newMessage, 
          selectedChat.id
        );
        
        // Generate hash for integrity verification
        const hash = securityService.generateHash(newMessage);
        
        const message: Message = {
          id: Date.now().toString(),
          senderId: user?.id || 'current',
          receiverId: selectedChat.participants.find(p => p.id !== user?.id)?.id || '',
          text: newMessage,
          encryptedText: encryptedText,
          timestamp: new Date().toISOString(),
          isRead: false,
          isEncrypted: true,
          securityLevel: selectedChat.securityLevel,
          type: 'text',
          hash: hash,
        };

        setMessages([...messages, message]);
        setNewMessage('');
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Failed to send encrypted message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      } finally {
        setIsEncrypting(false);
      }
    }
  };

  const startChat = async (userId: string) => {
    const existingChat = chats.find(chat => 
      chat.participants.some(p => p.id === userId)
    );

    if (existingChat) {
      setSelectedChat(existingChat);
      await loadMessages(existingChat.id);
      setActiveTab('chat');
    } else {
      // Create new secure chat
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
          isEncrypted: true,
        },
        unreadCount: 0,
        isTyping: false,
        isSecure: true,
        securityLevel: SecurityLevel.TOP_SECRET,
      };

      setChats([newChat, ...chats]);
      setSelectedChat(newChat);
      setMessages([]);
      setActiveTab('chat');
    }
  };

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find(p => p.id !== user?.id);
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

  const getSecurityIcon = (securityLevel: SecurityLevel) => {
    switch (securityLevel) {
      case SecurityLevel.TOP_SECRET:
        return 'shield-checkmark';
      case SecurityLevel.CONFIDENTIAL:
        return 'shield';
      case SecurityLevel.SENSITIVE:
        return 'lock-closed';
      default:
        return 'lock-open';
    }
  };

  const getSecurityColor = (securityLevel: SecurityLevel) => {
    switch (securityLevel) {
      case SecurityLevel.TOP_SECRET:
        return '#00ff00';
      case SecurityLevel.CONFIDENTIAL:
        return '#007AFF';
      case SecurityLevel.SENSITIVE:
        return '#ffaa00';
      default:
        return '#888';
    }
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
            <View style={styles.securityIndicator}>
              <Ionicons 
                name={getSecurityIcon(chat.securityLevel)} 
                size={14} 
                color={getSecurityColor(chat.securityLevel)} 
              />
            </View>
            <Text style={styles.chatTime}>{formatTime(chat.lastMessage.timestamp)}</Text>
          </View>
          
          <View style={styles.chatMessage}>
            <View style={styles.messageInfo}>
              {chat.lastMessage.isEncrypted && (
                <Ionicons name="lock-closed" size={12} color="#00ff00" />
              )}
              <Text style={styles.chatMessageText} numberOfLines={1}>
                {chat.lastMessage.isEncrypted ? '🔒 Encrypted message' : chat.lastMessage.text}
              </Text>
            </View>
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
          <View style={styles.messageHeader}>
            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
              {message.text}
            </Text>
            {message.isEncrypted && (
              <Ionicons 
                name="lock-closed" 
                size={12} 
                color={isOwn ? "rgba(255,255,255,0.7)" : "#00ff00"} 
              />
            )}
          </View>
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
          <View style={styles.securityStatus}>
            <Ionicons 
              name={userItem.securityStatus === 'verified' ? 'shield-checkmark' : 
                    userItem.securityStatus === 'unverified' ? 'shield' : 'warning'} 
              size={14} 
              color={userItem.securityStatus === 'verified' ? '#00ff00' : 
                     userItem.securityStatus === 'unverified' ? '#ffaa00' : '#ff0000'} 
            />
          </View>
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

  const SecurityModal = () => (
    <Modal
      visible={showSecurityModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.securityModal}>
        <View style={styles.securityHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowSecurityModal(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.securityTitle}>Security Status</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.securityContent}>
          <View style={styles.securityStatus}>
            <Ionicons 
              name={securityAudit?.isSecure ? "shield-checkmark" : "warning"} 
              size={48} 
              color={securityAudit?.isSecure ? "#00ff00" : "#ff0000"} 
            />
            <Text style={styles.securityStatusText}>
              {securityAudit?.isSecure ? 'Security Verified' : 'Security Issues Detected'}
            </Text>
          </View>

          {securityAudit?.issues && securityAudit.issues.length > 0 && (
            <View style={styles.issuesSection}>
              <Text style={styles.sectionTitle}>Security Issues</Text>
              {securityAudit.issues.map((issue: string, index: number) => (
                <View key={index} style={styles.issueItem}>
                  <Ionicons name="warning" size={16} color="#ff0000" />
                  <Text style={styles.issueText}>{issue}</Text>
                </View>
              ))}
            </View>
          )}

          {securityAudit?.recommendations && securityAudit.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {securityAudit.recommendations.map((recommendation: string, index: number) => (
                <View key={index} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#00ff00" />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.encryptionInfo}>
            <Text style={styles.sectionTitle}>Encryption Details</Text>
            <View style={styles.encryptionItem}>
              <Text style={styles.encryptionLabel}>Algorithm:</Text>
              <Text style={styles.encryptionValue}>AES-256-GCM</Text>
            </View>
            <View style={styles.encryptionItem}>
              <Text style={styles.encryptionLabel}>Key Size:</Text>
              <Text style={styles.encryptionValue}>256-bit</Text>
            </View>
            <View style={styles.encryptionItem}>
              <Text style={styles.encryptionLabel}>PBKDF2 Iterations:</Text>
              <Text style={styles.encryptionValue}>100,000</Text>
            </View>
            <View style={styles.encryptionItem}>
              <Text style={styles.encryptionLabel}>Security Level:</Text>
              <Text style={styles.encryptionValue}>Military Grade</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
        <TouchableOpacity 
          style={styles.securityButton}
          onPress={() => setShowSecurityModal(true)}
        >
          <Ionicons name="shield-checkmark" size={20} color="#00ff00" />
        </TouchableOpacity>
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
        <TouchableOpacity 
          style={styles.securityButton}
          onPress={() => setShowSecurityModal(true)}
        >
          <Ionicons name="shield-checkmark" size={20} color="#00ff00" />
        </TouchableOpacity>
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
            <View style={styles.chatSecurityInfo}>
              <Ionicons 
                name={getSecurityIcon(selectedChat?.securityLevel || SecurityLevel.SENSITIVE)} 
                size={16} 
                color={getSecurityColor(selectedChat?.securityLevel || SecurityLevel.SENSITIVE)} 
              />
              <Text style={styles.chatSecurityText}>
                {selectedChat?.isSecure ? 'End-to-End Encrypted' : 'Standard Security'}
              </Text>
            </View>
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
              disabled={!newMessage.trim() || isEncrypting}
            >
              {isEncrypting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color={newMessage.trim() ? "#fff" : "#888"} />
              )}
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
          <Text style={styles.loadingText}>Loading secure messages...</Text>
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
              <Text style={styles.title}>Secure Messages</Text>
              <Text style={styles.subtitle}>Military-grade encryption</Text>
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
          </View>

          {/* Content */}
          {activeTab === 'chats' ? <ChatsList /> : <UsersList />}
        </>
      )}

      <SecurityModal />
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
    color: '#00ff00',
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  searchBar: {
    flex: 1,
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
  securityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
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
  securityIndicator: {
    marginLeft: 4,
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
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
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
  securityStatus: {
    marginLeft: 4,
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
  chatSecurityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  chatSecurityText: {
    color: '#00ff00',
    fontSize: 12,
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
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
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
  securityModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  securityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  securityTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  securityContent: {
    flex: 1,
    padding: 20,
  },
  securityStatusContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  securityStatusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  issuesSection: {
    marginBottom: 20,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  issueText: {
    color: '#ff0000',
    fontSize: 14,
    flex: 1,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  recommendationText: {
    color: '#00ff00',
    fontSize: 14,
    flex: 1,
  },
  encryptionInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  encryptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  encryptionLabel: {
    color: '#888',
    fontSize: 14,
  },
  encryptionValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
