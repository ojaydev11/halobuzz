import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text as NBText,
  FlatList,
  Pressable,
  Avatar,
  Badge,
  Icon,
  Input,
  Button,
  useColorModeValue,
  Divider,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InboxStackParamList } from '../../navigation/InboxTabNavigator';
import { TabletLayout, useIsTablet } from '../../components/TabletLayout';

type InboxListNavigationProp = StackNavigationProp<InboxStackParamList, 'InboxList'>;

interface Conversation {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  ogTier: number;
  isVerified: boolean;
  isOnline: boolean;
}

interface Message {
  id: string;
  senderId: string;
  message: string;
  timestamp: Date;
  isOwn: boolean;
}

const InboxTabletScreen: React.FC = () => {
  const navigation = useNavigation<InboxListNavigationProp>();
  const isTablet = useIsTablet();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const cardBackground = useColorModeValue('background.secondary', 'background.secondary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  // Mock conversations
  const conversations: Conversation[] = [
    {
      id: '1',
      userId: 'user1',
      username: 'SarahLive',
      avatar: 'https://via.placeholder.com/50',
      lastMessage: 'Hey! Thanks for the gift 🎁',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      unreadCount: 2,
      ogTier: 3,
      isVerified: true,
      isOnline: true,
    },
    {
      id: '2',
      userId: 'user2',
      username: 'MusicLover',
      avatar: 'https://via.placeholder.com/50',
      lastMessage: 'Great stream today!',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      unreadCount: 0,
      ogTier: 1,
      isVerified: false,
      isOnline: false,
    },
    {
      id: '3',
      userId: 'user3',
      username: 'GameMaster',
      avatar: 'https://via.placeholder.com/50',
      lastMessage: 'Want to play together?',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      unreadCount: 1,
      ogTier: 4,
      isVerified: true,
      isOnline: true,
    },
  ];

  // Mock messages for selected conversation
  const messages: Message[] = selectedConversation ? [
    {
      id: '1',
      senderId: selectedConversation.userId,
      message: 'Hey there! Thanks for watching my stream!',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isOwn: false,
    },
    {
      id: '2',
      senderId: 'currentUser',
      message: 'You\'re amazing! Keep up the great content 🔥',
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      isOwn: true,
    },
    {
      id: '3',
      senderId: selectedConversation.userId,
      message: selectedConversation.lastMessage,
      timestamp: selectedConversation.timestamp,
      isOwn: false,
    },
  ] : [];

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <Pressable
      onPress={() => setSelectedConversation(item)}
      _pressed={{ opacity: 0.7 }}
      bg={selectedConversation?.id === item.id ? 'primary.100' : 'transparent'}
    >
      <HStack
        p={4}
        space={3}
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="background.tertiary"
      >
        <Box position="relative">
          <Avatar
            size="md"
            source={{ uri: item.avatar }}
          />
          {item.isOnline && (
            <Box
              position="absolute"
              bottom={0}
              right={0}
              w={3}
              h={3}
              bg="green.500"
              borderRadius="full"
              borderWidth={2}
              borderColor={backgroundColor}
            />
          )}
        </Box>
        
        <VStack flex={1} space={1}>
          <HStack justifyContent="space-between" alignItems="center">
            <HStack alignItems="center" space={2}>
              <NBText color={textColor} fontWeight="semibold" fontSize="md">
                {item.username}
              </NBText>
              {item.isVerified && (
                <Icon as={Ionicons} name="checkmark-circle" size="xs" color="blue.500" />
              )}
              <Badge size="xs" variant="solid" bg={`ogTier${item.ogTier}`}>
                OG{item.ogTier}
              </Badge>
            </HStack>
            <NBText color="text.secondary" fontSize="xs">
              {formatTime(item.timestamp)}
            </NBText>
          </HStack>
          
          <HStack justifyContent="space-between" alignItems="center">
            <NBText
              color="text.secondary"
              fontSize="sm"
              numberOfLines={1}
              flex={1}
            >
              {item.lastMessage}
            </NBText>
            {item.unreadCount > 0 && (
              <Badge
                size="sm"
                variant="solid"
                bg="primary.500"
                borderRadius="full"
                minW={6}
                h={6}
                alignItems="center"
                justifyContent="center"
              >
                <NBText color="white" fontSize="xs" fontWeight="bold">
                  {item.unreadCount}
                </NBText>
              </Badge>
            )}
          </HStack>
        </VStack>
      </HStack>
    </Pressable>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <Box
      mb={3}
      px={4}
      alignSelf={item.isOwn ? 'flex-end' : 'flex-start'}
      maxW="80%"
    >
      <Box
        bg={item.isOwn ? 'primary.500' : cardBackground}
        p={3}
        borderRadius="lg"
        borderBottomLeftRadius={item.isOwn ? 'lg' : 'sm'}
        borderBottomRightRadius={item.isOwn ? 'sm' : 'lg'}
      >
        <NBText
          color={item.isOwn ? 'white' : textColor}
          fontSize="sm"
        >
          {item.message}
        </NBText>
      </Box>
      <NBText
        color="text.secondary"
        fontSize="xs"
        textAlign={item.isOwn ? 'right' : 'left'}
        mt={1}
      >
        {formatTime(item.timestamp)}
      </NBText>
    </Box>
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      // Add message logic here
      setNewMessage('');
    }
  };

  // Conversations List Panel
  const ConversationsList = () => (
    <VStack flex={1} bg={backgroundColor}>
      <Box
        p={4}
        borderBottomWidth={1}
        borderBottomColor="background.tertiary"
      >
        <NBText color={textColor} fontSize="xl" fontWeight="bold">
          Messages
        </NBText>
      </Box>
      
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </VStack>
  );

  // Chat View Panel
  const ChatView = () => {
    if (!selectedConversation) {
      return (
        <VStack flex={1} justifyContent="center" alignItems="center" bg={cardBackground}>
          <Icon
            as={Ionicons}
            name="chatbubbles-outline"
            size="6xl"
            color="text.secondary"
            mb={4}
          />
          <NBText fontSize="lg" color="text.secondary" textAlign="center">
            Select a conversation to start chatting
          </NBText>
        </VStack>
      );
    }

    return (
      <VStack flex={1} bg={cardBackground}>
        {/* Chat Header */}
        <HStack
          p={4}
          space={3}
          alignItems="center"
          bg={backgroundColor}
          borderBottomWidth={1}
          borderBottomColor="background.tertiary"
        >
          <Avatar
            size="sm"
            source={{ uri: selectedConversation.avatar }}
          />
          <VStack flex={1}>
            <HStack alignItems="center" space={2}>
              <NBText color={textColor} fontWeight="semibold" fontSize="md">
                {selectedConversation.username}
              </NBText>
              {selectedConversation.isVerified && (
                <Icon as={Ionicons} name="checkmark-circle" size="xs" color="blue.500" />
              )}
              <Badge size="xs" variant="solid" bg={`ogTier${selectedConversation.ogTier}`}>
                OG{selectedConversation.ogTier}
              </Badge>
            </HStack>
            <NBText color="text.secondary" fontSize="sm">
              {selectedConversation.isOnline ? 'Online' : 'Offline'}
            </NBText>
          </VStack>
        </HStack>

        {/* Messages */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          flex={1}
        />

        {/* Message Input */}
        <HStack
          p={4}
          space={2}
          bg={backgroundColor}
          borderTopWidth={1}
          borderTopColor="background.tertiary"
        >
          <Input
            flex={1}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            bg={cardBackground}
            borderColor="background.tertiary"
            _focus={{ borderColor: 'primary.500' }}
            color={textColor}
          />
          <Button
            size="sm"
            bg="primary.500"
            _pressed={{ bg: 'primary.600' }}
            onPress={handleSendMessage}
            isDisabled={!newMessage.trim()}
          >
            <Icon as={Ionicons} name="send" size="sm" color="white" />
          </Button>
        </HStack>
      </VStack>
    );
  };

  if (!isTablet) {
    // Fallback to regular mobile layout
    return (
      <Box flex={1} bg={backgroundColor} safeArea>
        <ConversationsList />
      </Box>
    );
  }

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <TabletLayout
        leftPanel={<ConversationsList />}
        rightPanel={<ChatView />}
        leftPanelWidth={0.4}
        rightPanelWidth={0.6}
      />
    </Box>
  );
};

export default InboxTabletScreen;
