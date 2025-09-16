import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'gift' | 'system' | 'moderator';
  giftData?: {
    giftId: string;
    giftName: string;
    giftValue: number;
    giftImage: string;
  };
  isModerator?: boolean;
  isVIP?: boolean;
  isHost?: boolean;
}

interface StreamChatProps {
  streamId: string;
  hostId: string;
  onGift: (giftId: string) => void;
  onFollow: (userId: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function StreamChat({
  streamId,
  hostId,
  onGift,
  onFollow,
  isVisible,
  onToggleVisibility,
}: StreamChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slideAnimation = useRef(new Animated.Value(isVisible ? 0 : 300)).current;

  const gifts = [
    { id: '1', name: 'Rose', value: 10, image: '🌹', color: '#ff4757' },
    { id: '2', name: 'Heart', value: 50, image: '❤️', color: '#ff4757' },
    { id: '3', name: 'Crown', value: 100, image: '👑', color: '#ffd700' },
    { id: '4', name: 'Diamond', value: 500, image: '💎', color: '#00d2d3' },
    { id: '5', name: 'Rocket', value: 1000, image: '🚀', color: '#ff9ff3' },
    { id: '6', name: 'Super Gift', value: 5000, image: '🎁', color: '#ff6b6b' },
  ];

  useEffect(() => {
    initializeSocket();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: isVisible ? 0 : 300,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  useEffect(() => {
    if (isConnected && socket) {
      // Join stream chat room
      socket.emit('join-stream-chat', { streamId, userId: user?.id });
      
      // Listen for messages
      socket.on('stream-message', handleNewMessage);
      socket.on('stream-gift', handleGiftMessage);
      socket.on('stream-system', handleSystemMessage);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);
      socket.on('moderator-action', handleModeratorAction);
      
      // Check if user is moderator
      socket.emit('check-moderator-status', { streamId, userId: user?.id });
      socket.on('moderator-status', (data) => {
        setIsModerator(data.isModerator);
      });
    }
  }, [isConnected, socket]);

  const initializeSocket = () => {
    const newSocket = io(process.env.EXPO_PUBLIC_API_BASE_URL || 'https://halo-api-production.up.railway.app', {
      transports: ['websocket'],
      auth: {
        token: user?.token,
      },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to chat server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from chat server');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Chat connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to chat. Please try again.');
    });

    setSocket(newSocket);
  };

  const handleNewMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    scrollToBottom();
  };

  const handleGiftMessage = (giftMessage: ChatMessage) => {
    setMessages(prev => [...prev, giftMessage]);
    scrollToBottom();
  };

  const handleSystemMessage = (systemMessage: ChatMessage) => {
    setMessages(prev => [...prev, systemMessage]);
    scrollToBottom();
  };

  const handleUserTyping = (data: { userId: string; username: string }) => {
    setTypingUsers(prev => {
      if (!prev.includes(data.username)) {
        return [...prev, data.username];
      }
      return prev;
    });
  };

  const handleUserStoppedTyping = (data: { userId: string; username: string }) => {
    setTypingUsers(prev => prev.filter(username => username !== data.username));
  };

  const handleModeratorAction = (action: { type: string; targetUser: string; reason?: string }) => {
    const moderatorMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: 'system',
      username: 'Moderator',
      message: `User ${action.targetUser} has been ${action.type}${action.reason ? ` for: ${action.reason}` : ''}`,
      timestamp: new Date(),
      type: 'moderator',
      isModerator: true,
    };
    setMessages(prev => [...prev, moderatorMessage]);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !isConnected) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      username: user?.username || 'Anonymous',
      avatar: user?.avatar,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'message',
      isVIP: user?.ogLevel && user.ogLevel > 0,
    };

    socket.emit('send-stream-message', {
      streamId,
      message: message.message,
      userId: message.userId,
      username: message.username,
    });

    setNewMessage('');
    stopTyping();
  };

  const sendGift = (gift: typeof gifts[0]) => {
    if (!socket || !isConnected) return;

    const giftMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      username: user?.username || 'Anonymous',
      avatar: user?.avatar,
      message: `sent a ${gift.name}!`,
      timestamp: new Date(),
      type: 'gift',
      giftData: {
        giftId: gift.id,
        giftName: gift.name,
        giftValue: gift.value,
        giftImage: gift.image,
      },
    };

    socket.emit('send-stream-gift', {
      streamId,
      giftId: gift.id,
      giftName: gift.name,
      giftValue: gift.value,
      userId: user?.id,
      username: user?.username,
    });

    setShowGiftMenu(false);
    onGift(gift.id);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    
    if (socket && isConnected) {
      socket.emit('typing', { streamId, userId: user?.id, username: user?.username });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { streamId, userId: user?.id, username: user?.username });
      }, 1000);
    }
  };

  const stopTyping = () => {
    if (socket && isConnected) {
      socket.emit('stop-typing', { streamId, userId: user?.id, username: user?.username });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.userId === user?.id;
    const isGift = item.type === 'gift';
    const isSystem = item.type === 'system';
    const isModeratorMsg = item.type === 'moderator';

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage && styles.ownMessage,
        isSystem && styles.systemMessage,
        isModeratorMsg && styles.moderatorMessage,
      ]}>
        {!isSystem && !isModeratorMsg && (
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => onFollow(item.userId)}
          >
            {item.avatar ? (
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{item.avatar}</Text>
              </View>
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.defaultAvatarText}>
                  {item.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={[
                styles.username,
                item.isVIP && styles.vipUsername,
                item.isHost && styles.hostUsername,
                item.isModerator && styles.moderatorUsername,
              ]}>
                {item.username}
                {item.isVIP && ' 👑'}
                {item.isHost && ' 🎯'}
                {item.isModerator && ' 🛡️'}
              </Text>
              <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.messageContent}>
          {isGift && item.giftData ? (
            <View style={styles.giftMessage}>
              <Text style={styles.giftImage}>{item.giftData.giftImage}</Text>
              <Text style={styles.giftText}>
                {item.username} {item.message} ({item.giftData.giftValue} coins)
              </Text>
            </View>
          ) : (
            <Text style={[
              styles.messageText,
              isSystem && styles.systemText,
              isModeratorMsg && styles.moderatorText,
            ]}>
              {item.message}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {typingUsers.length === 1 
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.join(', ')} are typing...`
          }
        </Text>
      </View>
    );
  };

  if (!isVisible) {
    return (
      <TouchableOpacity style={styles.chatToggle} onPress={onToggleVisibility}>
        <Ionicons name="chatbubbles" size={24} color="#fff" />
        <Text style={styles.chatToggleText}>Chat</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[
      styles.container,
      { transform: [{ translateX: slideAnimation }] }
    ]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Chat</Text>
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={styles.giftButton}
              onPress={() => setShowGiftMenu(!showGiftMenu)}
            >
              <Ionicons name="gift" size={20} color="#ffd700" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onToggleVisibility}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gift Menu */}
        {showGiftMenu && (
          <View style={styles.giftMenu}>
            <Text style={styles.giftMenuTitle}>Send a Gift</Text>
            <View style={styles.giftGrid}>
              {gifts.map((gift) => (
                <TouchableOpacity
                  key={gift.id}
                  style={[styles.giftItem, { borderColor: gift.color }]}
                  onPress={() => sendGift(gift)}
                >
                  <Text style={styles.giftEmoji}>{gift.image}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  <Text style={styles.giftValue}>{gift.value} coins</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={renderTypingIndicator}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={handleTyping}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionText}>Connecting to chat...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatToggle: {
    position: 'absolute',
    right: 16,
    top: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatToggleText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 12,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftButton: {
    padding: 8,
    marginRight: 8,
  },
  closeButton: {
    padding: 8,
  },
  giftMenu: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  giftMenuTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  giftItem: {
    width: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  giftEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  giftName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  giftValue: {
    color: '#ffd700',
    fontSize: 8,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
    paddingVertical: 8,
  },
  ownMessage: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  systemMessage: {
    alignItems: 'center',
  },
  moderatorMessage: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
  },
  defaultAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  defaultAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vipUsername: {
    color: '#ffd700',
  },
  hostUsername: {
    color: '#ff4757',
  },
  moderatorUsername: {
    color: '#00d2d3',
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
  },
  messageContent: {
    marginLeft: 32,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  systemText: {
    color: '#ccc',
    fontSize: 12,
    fontStyle: 'italic',
  },
  moderatorText: {
    color: '#00d2d3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  giftMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftImage: {
    fontSize: 20,
    marginRight: 8,
  },
  giftText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  typingContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  typingText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#ff4757',
    borderRadius: 20,
    padding: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 71, 87, 0.3)',
  },
  connectionStatus: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
  },
});
