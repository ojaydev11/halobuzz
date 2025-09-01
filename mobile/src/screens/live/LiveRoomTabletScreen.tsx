import React, { useState, useEffect, useRef } from 'react';
import {
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  Alert,
} from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text as NBText,
  Button,
  Icon,
  useColorModeValue,
  Pressable,
  Input,
  Image,
  Badge,
  Modal,
  ScrollView,
  Divider,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LiveStackParamList } from '../../navigation/LiveTabNavigator';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { TabletLayout, useIsTablet } from '../../components/TabletLayout';

const { width, height } = Dimensions.get('window');

type LiveRoomRouteProp = RouteProp<LiveStackParamList, 'LiveRoom'>;
type LiveRoomNavigationProp = StackNavigationProp<LiveStackParamList, 'LiveRoom'>;

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  isGift?: boolean;
  giftName?: string;
  giftValue?: number;
  ogTier: number;
  isVerified: boolean;
}

interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
  animation: string;
  category: 'common' | 'rare' | 'epic' | 'legendary';
}

const LiveRoomTabletScreen: React.FC = () => {
  const navigation = useNavigation<LiveRoomNavigationProp>();
  const route = useRoute<LiveRoomRouteProp>();
  const user = useAppSelector(selectUser);
  const isTablet = useIsTablet();
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [viewerCount, setViewerCount] = useState(1247);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(8923);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<Video>(null);
  const chatListRef = useRef<FlatList>(null);

  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const cardBackground = useColorModeValue('background.secondary', 'background.secondary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  // Mock gifts
  const gifts: Gift[] = [
    { id: '1', name: 'Rose', icon: '🌹', price: 10, animation: 'rose', category: 'common' },
    { id: '2', name: 'Heart', icon: '❤️', price: 50, animation: 'heart', category: 'common' },
    { id: '3', name: 'Diamond', icon: '💎', price: 100, animation: 'diamond', category: 'rare' },
    { id: '4', name: 'Crown', icon: '👑', price: 500, animation: 'crown', category: 'epic' },
    { id: '5', name: 'Halo', icon: '😇', price: 1000, animation: 'halo', category: 'legendary' },
  ];

  // Mock chat messages
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      userId: 'user1',
      username: 'SarahLive',
      message: 'Welcome everyone! Thanks for joining!',
      timestamp: new Date(),
      ogTier: 3,
      isVerified: true,
    },
    {
      id: '2',
      userId: 'user2',
      username: 'MusicLover',
      message: 'Amazing stream! 🔥',
      timestamp: new Date(),
      ogTier: 1,
      isVerified: false,
    },
  ];

  useEffect(() => {
    setChatMessages(mockMessages);
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        userId: user?.id || 'currentUser',
        username: user?.username || 'You',
        message: newMessage.trim(),
        timestamp: new Date(),
        ogTier: user?.ogTier || 1,
        isVerified: user?.isVerified || false,
      };
      
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
      chatListRef.current?.scrollToEnd();
    }
  };

  const handleGiftSend = (gift: Gift) => {
    if (user) {
      const giftMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        message: '',
        timestamp: new Date(),
        isGift: true,
        giftName: gift.name,
        giftValue: gift.price,
        ogTier: user.ogTier,
        isVerified: user.isVerified,
      };
      
      setChatMessages(prev => [...prev, giftMessage]);
      setShowGiftDrawer(false);
      chatListRef.current?.scrollToEnd();
    }
  };

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <Box mb={2} px={2}>
      {item.isGift ? (
        <Box
          bg="rgba(255, 215, 0, 0.2)"
          borderRadius="lg"
          p={2}
          borderWidth={1}
          borderColor="yellow.500"
        >
          <HStack alignItems="center" space={2}>
            <NBText fontSize="2xl">{gifts.find(g => g.name === item.giftName)?.icon}</NBText>
            <VStack flex={1}>
              <HStack alignItems="center" space={1}>
                <NBText color="yellow.400" fontWeight="bold" fontSize="sm">
                  {item.username}
                </NBText>
                {item.isVerified && (
                  <Icon as={Ionicons} name="checkmark-circle" size="xs" color="blue.500" />
                )}
                <Badge size="xs" variant="solid" bg={`ogTier${item.ogTier}`}>
                  OG{item.ogTier}
                </Badge>
              </HStack>
              <NBText color="yellow.300" fontSize="sm">
                sent {item.giftName} ({item.giftValue} coins)
              </NBText>
            </VStack>
          </HStack>
        </Box>
      ) : (
        <HStack alignItems="flex-start" space={2}>
          <VStack alignItems="center" space={1}>
            <Box
              w={6}
              h={6}
              bg="primary.500"
              borderRadius="full"
              alignItems="center"
              justifyContent="center"
            >
              <NBText color="white" fontSize="xs" fontWeight="bold">
                {item.username.charAt(0).toUpperCase()}
              </NBText>
            </Box>
            <Badge size="xs" variant="solid" bg={`ogTier${item.ogTier}`}>
              OG{item.ogTier}
            </Badge>
          </VStack>
          <VStack flex={1}>
            <HStack alignItems="center" space={1}>
              <NBText color={textColor} fontWeight="semibold" fontSize="sm">
                {item.username}
              </NBText>
              {item.isVerified && (
                <Icon as={Ionicons} name="checkmark-circle" size="xs" color="blue.500" />
              )}
            </HStack>
            <NBText color="text.secondary" fontSize="sm">
              {item.message}
            </NBText>
          </VStack>
        </HStack>
      )}
    </Box>
  );

  const renderGift = ({ item }: { item: Gift }) => (
    <Pressable
      onPress={() => handleGiftSend(item)}
      _pressed={{ opacity: 0.7 }}
    >
      <Box
        bg={cardBackground}
        p={3}
        borderRadius="lg"
        borderWidth={1}
        borderColor="background.tertiary"
        alignItems="center"
        minW={80}
      >
        <NBText fontSize="2xl" mb={2}>{item.icon}</NBText>
        <NBText color={textColor} fontWeight="semibold" fontSize="sm" textAlign="center" mb={1}>
          {item.name}
        </NBText>
        <NBText color="text.secondary" fontSize="xs">
          {item.price} coins
        </NBText>
      </Box>
    </Pressable>
  );

  // Video Player Component
  const VideoPlayer = () => (
    <Box flex={1} position="relative">
      <Video
        ref={videoRef}
        source={{ uri: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4' }}
        style={{ width: '100%', height: '100%' }}
        useNativeControls={false}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
      />
      
      {/* Video Overlay */}
      <Box position="absolute" top={0} left={0} right={0} bottom={0}>
        {/* Top Controls */}
        <HStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          p={4}
          justifyContent="space-between"
          alignItems="center"
          bg="rgba(0,0,0,0.5)"
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Icon as={Ionicons} name="arrow-back" size="lg" color="white" />
          </Pressable>
          
          <HStack space={3}>
            <Pressable onPress={() => setIsMuted(!isMuted)}>
              <Icon 
                as={Ionicons} 
                name={isMuted ? "volume-mute" : "volume-high"} 
                size="lg" 
                color="white" 
              />
            </Pressable>
          </HStack>
        </HStack>

        {/* Streamer Info */}
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          p={4}
          bg="rgba(0,0,0,0.7)"
        >
          <HStack alignItems="center" space={3}>
            <Image
              source={{ uri: 'https://via.placeholder.com/40' }}
              alt="Streamer"
              width={10}
              height={10}
              borderRadius="full"
            />
            <VStack flex={1}>
              <HStack alignItems="center" space={2}>
                <NBText color="white" fontWeight="bold" fontSize="md">
                  {route.params.streamerName}
                </NBText>
                <Icon as={Ionicons} name="checkmark-circle" size="sm" color="blue.500" />
                <Badge size="xs" variant="solid" bg="purple.500">
                  OG4
                </Badge>
              </HStack>
              <NBText color="text.secondary" fontSize="sm">
                {viewerCount.toLocaleString()} viewers
              </NBText>
            </VStack>
            
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "solid"}
              bg={isFollowing ? "transparent" : "primary.500"}
              borderColor={isFollowing ? "primary.500" : "transparent"}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </HStack>
        </Box>
      </Box>
    </Box>
  );

  // Chat & Gifts Panel Component
  const ChatAndGiftsPanel = () => (
    <VStack flex={1} bg={cardBackground}>
      {/* Chat Header */}
      <Box
        bg={backgroundColor}
        px={4}
        py={3}
        borderBottomWidth={1}
        borderBottomColor="background.tertiary"
      >
        <HStack justifyContent="space-between" alignItems="center">
          <NBText color={textColor} fontWeight="semibold" fontSize="lg">
            Live Chat ({chatMessages.length})
          </NBText>
          <Pressable onPress={() => setShowGiftDrawer(true)}>
            <Icon as={Ionicons} name="gift" size="lg" color="primary.500" />
          </Pressable>
        </HStack>
      </Box>

      {/* Chat Messages */}
      <FlatList
        ref={chatListRef}
        data={chatMessages}
        renderItem={renderChatMessage}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        flex={1}
      />

      {/* Action Buttons */}
      <HStack p={3} space={2} justifyContent="space-around" bg={backgroundColor}>
        <Pressable onPress={() => setIsLiked(!isLiked)}>
          <VStack alignItems="center">
            <Icon 
              as={Ionicons} 
              name={isLiked ? "heart" : "heart-outline"} 
              size="lg" 
              color={isLiked ? "red.500" : "gray.500"} 
            />
            <NBText color="text.secondary" fontSize="xs">
              {likeCount.toLocaleString()}
            </NBText>
          </VStack>
        </Pressable>
        
        <Pressable onPress={() => setShowGiftDrawer(true)}>
          <VStack alignItems="center">
            <Icon as={Ionicons} name="gift" size="lg" color="primary.500" />
            <NBText color="text.secondary" fontSize="xs">Gifts</NBText>
          </VStack>
        </Pressable>
      </HStack>

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <HStack
          p={3}
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
      </KeyboardAvoidingView>
    </VStack>
  );

  if (!isTablet) {
    // Fallback to regular mobile layout
    return <VideoPlayer />;
  }

  return (
    <Box flex={1} bg={backgroundColor}>
      <TabletLayout
        leftPanel={<VideoPlayer />}
        rightPanel={<ChatAndGiftsPanel />}
        leftPanelWidth={0.65}
        rightPanelWidth={0.35}
      />

      {/* Gift Drawer Modal */}
      <Modal
        isOpen={showGiftDrawer}
        onClose={() => setShowGiftDrawer(false)}
        size="lg"
      >
        <Modal.Content bg={backgroundColor}>
          <Modal.Header bg={cardBackground}>
            <HStack alignItems="center" space={3}>
              <Icon as={Ionicons} name="gift" size="lg" color="primary.500" />
              <NBText color={textColor} fontSize="lg" fontWeight="bold">
                Send Gifts
              </NBText>
            </HStack>
          </Modal.Header>
          <Modal.Body>
            <FlatList
              data={gifts}
              renderItem={renderGift}
              keyExtractor={(item) => item.id}
              numColumns={3}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              showsVerticalScrollIndicator={false}
            />
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};

export default LiveRoomTabletScreen;
