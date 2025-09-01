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

const LiveRoomScreen: React.FC = () => {
  const navigation = useNavigation<LiveRoomNavigationProp>();
  const route = useRoute<LiveRoomRouteProp>();
  const user = useAppSelector(selectUser);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [showHaloThrone, setShowHaloThrone] = useState(false);
  const [isBattleActive, setIsBattleActive] = useState(false);
  const [battleProgress, setBattleProgress] = useState(0);
  const [viewerCount, setViewerCount] = useState(1247);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(8923);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    { id: '6', name: 'Rocket', icon: '🚀', price: 2000, animation: 'rocket', category: 'legendary' },
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
    {
      id: '3',
      userId: 'user3',
      username: 'GiftGiver',
      message: '',
      timestamp: new Date(),
      isGift: true,
      giftName: 'Rose',
      giftValue: 10,
      ogTier: 2,
      isVerified: false,
    },
  ];

  useEffect(() => {
    setChatMessages(mockMessages);
    
    // Simulate incoming messages
    const interval = setInterval(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        userId: `user${Math.floor(Math.random() * 100)}`,
        username: `User${Math.floor(Math.random() * 100)}`,
        message: 'Great stream! 👏',
        timestamp: new Date(),
        ogTier: Math.floor(Math.random() * 5) + 1,
        isVerified: Math.random() > 0.7,
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      chatListRef.current?.scrollToEnd();
    }, 3000);

    return () => clearInterval(interval);
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

  const handleBlessMe = () => {
    Alert.alert(
      'Bless Me',
      'Send a blessing to the streamer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Bless', onPress: () => {
          // Handle blessing logic
          setLikeCount(prev => prev + 1);
        }},
      ]
    );
  };

  const handleHaloThrone = () => {
    setShowHaloThrone(true);
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
        <NBText fontSize="3xl" mb={2}>{item.icon}</NBText>
        <NBText color={textColor} fontWeight="semibold" fontSize="sm" textAlign="center" mb={1}>
          {item.name}
        </NBText>
        <NBText color="text.secondary" fontSize="xs">
          {item.price} coins
        </NBText>
        <Badge
          size="xs"
          variant="solid"
          bg={
            item.category === 'legendary' ? 'yellow.500' :
            item.category === 'epic' ? 'purple.500' :
            item.category === 'rare' ? 'blue.500' : 'gray.500'
          }
          mt={1}
        >
          {item.category}
        </Badge>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg={backgroundColor}>
      {/* Video Player */}
      <Box position="relative" height={height * 0.4}>
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
              <Pressable onPress={() => setIsFullscreen(!isFullscreen)}>
                <Icon 
                  as={Ionicons} 
                  name={isFullscreen ? "contract" : "expand"} 
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

      {/* Battle Banner */}
      {isBattleActive && (
        <Box
          bg="linear-gradient(90deg, #FF6B6B, #4ECDC4)"
          p={3}
          alignItems="center"
        >
          <HStack alignItems="center" space={3}>
            <Icon as={Ionicons} name="flash" size="lg" color="white" />
            <VStack flex={1}>
              <NBText color="white" fontWeight="bold" fontSize="md">
                Live Battle in Progress!
              </NBText>
              <NBText color="white" fontSize="sm">
                Team A vs Team B
              </NBText>
            </VStack>
            <Box
              bg="rgba(255,255,255,0.2)"
              px={3}
              py={1}
              borderRadius="full"
            >
              <NBText color="white" fontWeight="bold">
                {battleProgress}%
              </NBText>
            </Box>
          </HStack>
        </Box>
      )}

      {/* Interactive Buttons */}
      <HStack
        position="absolute"
        right={4}
        top={height * 0.4 + 20}
        space={3}
        zIndex={10}
      >
        <VStack space={3}>
          <Pressable onPress={() => setIsLiked(!isLiked)}>
            <Box
              bg="rgba(0,0,0,0.7)"
              p={3}
              borderRadius="full"
              alignItems="center"
            >
              <Icon 
                as={Ionicons} 
                name={isLiked ? "heart" : "heart-outline"} 
                size="lg" 
                color={isLiked ? "red.500" : "white"} 
              />
              <NBText color="white" fontSize="xs" mt={1}>
                {likeCount.toLocaleString()}
              </NBText>
            </Box>
          </Pressable>

          <Pressable onPress={() => setShowGiftDrawer(true)}>
            <Box
              bg="rgba(0,0,0,0.7)"
              p={3}
              borderRadius="full"
              alignItems="center"
            >
              <Icon as={Ionicons} name="gift" size="lg" color="white" />
            </Box>
          </Pressable>

          <Pressable onPress={handleBlessMe}>
            <Box
              bg="rgba(0,0,0,0.7)"
              p={3}
              borderRadius="full"
              alignItems="center"
            >
              <Icon as={Ionicons} name="sparkles" size="lg" color="yellow.400" />
            </Box>
          </Pressable>

          <Pressable onPress={handleHaloThrone}>
            <Box
              bg="linear-gradient(45deg, #FFD700, #FFA500)"
              p={3}
              borderRadius="full"
              alignItems="center"
            >
              <Icon as={Ionicons} name="crown" size="lg" color="white" />
            </Box>
          </Pressable>
        </VStack>
      </HStack>

      {/* Chat Section */}
      <Box flex={1} bg={cardBackground} mt={4}>
        <Box
          bg={backgroundColor}
          px={4}
          py={2}
          borderBottomWidth={1}
          borderBottomColor="background.tertiary"
        >
          <NBText color={textColor} fontWeight="semibold">
            Live Chat ({chatMessages.length})
          </NBText>
        </Box>

        <FlatList
          ref={chatListRef}
          data={chatMessages}
          renderItem={renderChatMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        />

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
      </Box>

      {/* Gift Drawer Modal */}
      <Modal
        isOpen={showGiftDrawer}
        onClose={() => setShowGiftDrawer(false)}
        size="full"
      >
        <Modal.Content bg={backgroundColor} maxH="80%">
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

      {/* Halo Throne Modal */}
      <Modal
        isOpen={showHaloThrone}
        onClose={() => setShowHaloThrone(false)}
        size="lg"
      >
        <Modal.Content bg={backgroundColor}>
          <Modal.Header bg={cardBackground}>
            <HStack alignItems="center" space={3}>
              <Icon as={Ionicons} name="crown" size="lg" color="yellow.500" />
              <NBText color={textColor} fontSize="lg" fontWeight="bold">
                Halo Throne
              </NBText>
            </HStack>
          </Modal.Header>
          <Modal.Body>
            <VStack space={4} alignItems="center">
              <Icon as={Ionicons} name="crown" size="6xl" color="yellow.500" />
              <NBText color={textColor} fontSize="lg" fontWeight="bold" textAlign="center">
                Unlock the Halo Throne
              </NBText>
              <NBText color="text.secondary" textAlign="center">
                Get exclusive perks, custom badges, and special privileges
              </NBText>
              <Button
                size="lg"
                bg="linear-gradient(45deg, #FFD700, #FFA500)"
                _pressed={{ bg: 'yellow.600' }}
                width="100%"
              >
                <HStack alignItems="center" space={2}>
                  <Icon as={Ionicons} name="star" size="sm" color="white" />
                  <NBText color="white" fontWeight="bold">
                    Upgrade to OG5
                  </NBText>
                </HStack>
              </Button>
            </VStack>
          </Modal.Body>
        </Modal.Content>
      </Modal>
    </Box>
  );
};

export default LiveRoomScreen;
