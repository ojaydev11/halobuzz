import React, { useState, useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  Dimensions,
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
  Badge,
  Image,
  ScrollView,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LiveStackParamList } from '../../navigation/LiveTabNavigator';
import { useAppSelector } from '../../store/hooks';
import { selectCountrySelected } from '../../store/slices/authSlice';

const { width } = Dimensions.get('window');

interface LiveStream {
  id: string;
  streamerId: string;
  streamerName: string;
  streamerAvatar: string;
  title: string;
  thumbnail: string;
  viewerCount: number;
  isLive: boolean;
  category: string;
  tags: string[];
  country: string;
  ogTier: number;
  isVerified: boolean;
}

type LiveFeedNavigationProp = StackNavigationProp<LiveStackParamList, 'LiveFeed'>;

const LiveFeedScreen: React.FC = () => {
  const navigation = useNavigation<LiveFeedNavigationProp>();
  const countrySelected = useAppSelector(selectCountrySelected);
  const [selectedCountry, setSelectedCountry] = useState(countrySelected || 'All');
  const [refreshing, setRefreshing] = useState(false);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);

  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const cardBackground = useColorModeValue('background.secondary', 'background.secondary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  // Mock data - replace with API call
  const mockLiveStreams: LiveStream[] = [
    {
      id: '1',
      streamerId: 'user1',
      streamerName: 'SarahLive',
      streamerAvatar: 'https://via.placeholder.com/50',
      title: 'Late Night Gaming Session! 🎮',
      thumbnail: 'https://via.placeholder.com/300x200',
      viewerCount: 1247,
      isLive: true,
      category: 'Gaming',
      tags: ['gaming', 'fun', 'interactive'],
      country: 'NP',
      ogTier: 3,
      isVerified: true,
    },
    {
      id: '2',
      streamerId: 'user2',
      streamerName: 'MusicMaster',
      streamerAvatar: 'https://via.placeholder.com/50',
      title: 'Acoustic Guitar Covers 🎸',
      thumbnail: 'https://via.placeholder.com/300x200',
      viewerCount: 892,
      isLive: true,
      category: 'Music',
      tags: ['music', 'acoustic', 'covers'],
      country: 'IN',
      ogTier: 2,
      isVerified: false,
    },
    {
      id: '3',
      streamerId: 'user3',
      streamerName: 'TechTalk',
      streamerAvatar: 'https://via.placeholder.com/50',
      title: 'Coding Live: Building a Mobile App 💻',
      thumbnail: 'https://via.placeholder.com/300x200',
      viewerCount: 567,
      isLive: true,
      category: 'Technology',
      tags: ['coding', 'mobile', 'development'],
      country: 'US',
      ogTier: 4,
      isVerified: true,
    },
    {
      id: '4',
      streamerId: 'user4',
      streamerName: 'FitnessGuru',
      streamerAvatar: 'https://via.placeholder.com/50',
      title: 'Morning Workout Routine 💪',
      thumbnail: 'https://via.placeholder.com/300x200',
      viewerCount: 1234,
      isLive: true,
      category: 'Fitness',
      tags: ['fitness', 'workout', 'health'],
      country: 'NP',
      ogTier: 1,
      isVerified: false,
    },
    {
      id: '5',
      streamerId: 'user5',
      streamerName: 'ArtCreator',
      streamerAvatar: 'https://via.placeholder.com/50',
      title: 'Digital Art Drawing 🎨',
      thumbnail: 'https://via.placeholder.com/300x200',
      viewerCount: 756,
      isLive: true,
      category: 'Art',
      tags: ['art', 'digital', 'drawing'],
      country: 'IN',
      ogTier: 5,
      isVerified: true,
    },
  ];

  useEffect(() => {
    loadLiveStreams();
  }, [selectedCountry]);

  const loadLiveStreams = async () => {
    // Filter streams by selected country
    const filtered = selectedCountry === 'All' 
      ? mockLiveStreams 
      : mockLiveStreams.filter(stream => stream.country === selectedCountry);
    
    setLiveStreams(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLiveStreams();
    setRefreshing(false);
  };

  const handleStreamPress = (stream: LiveStream) => {
    navigation.navigate('LiveRoom', {
      streamId: stream.id,
      streamerId: stream.streamerId,
      streamerName: stream.streamerName,
    });
  };

  const handleGoLive = () => {
    navigation.navigate('GoLive');
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getOGTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'gray.500';
      case 2: return 'green.500';
      case 3: return 'blue.500';
      case 4: return 'purple.500';
      case 5: return 'yellow.500';
      default: return 'gray.500';
    }
  };

  const renderLiveStreamCard = ({ item }: { item: LiveStream }) => (
    <Pressable
      onPress={() => handleStreamPress(item)}
      _pressed={{ opacity: 0.7 }}
    >
      <Box
        bg={cardBackground}
        borderRadius="xl"
        mb={4}
        overflow="hidden"
      >
        {/* Thumbnail */}
        <Box position="relative">
          <Image
            source={{ uri: item.thumbnail }}
            alt={item.title}
            width="100%"
            height={200}
            resizeMode="cover"
          />
          
          {/* Live Badge */}
          <Box
            position="absolute"
            top={3}
            left={3}
            bg="red.500"
            px={2}
            py={1}
            borderRadius="full"
          >
            <HStack alignItems="center" space={1}>
              <Box w={2} h={2} bg="white" borderRadius="full" />
              <NBText color="white" fontSize="xs" fontWeight="bold">
                LIVE
              </NBText>
            </HStack>
          </Box>

          {/* Viewer Count */}
          <Box
            position="absolute"
            top={3}
            right={3}
            bg="rgba(0,0,0,0.7)"
            px={2}
            py={1}
            borderRadius="full"
          >
            <HStack alignItems="center" space={1}>
              <Icon as={Ionicons} name="eye" size="xs" color="white" />
              <NBText color="white" fontSize="xs" fontWeight="semibold">
                {formatViewerCount(item.viewerCount)}
              </NBText>
            </HStack>
          </Box>

          {/* OG Tier Badge */}
          <Box
            position="absolute"
            bottom={3}
            right={3}
          >
            <Badge
              colorScheme="primary"
              variant="solid"
              bg={getOGTierColor(item.ogTier)}
            >
              OG{item.ogTier}
            </Badge>
          </Box>
        </Box>

        {/* Content */}
        <Box p={4}>
          <HStack alignItems="center" space={3} mb={3}>
            <Image
              source={{ uri: item.streamerAvatar }}
              alt={item.streamerName}
              width={10}
              height={10}
              borderRadius="full"
            />
            <VStack flex={1}>
              <HStack alignItems="center" space={2}>
                <NBText color={textColor} fontWeight="semibold" fontSize="md">
                  {item.streamerName}
                </NBText>
                {item.isVerified && (
                  <Icon as={Ionicons} name="checkmark-circle" size="sm" color="blue.500" />
                )}
              </HStack>
              <NBText color="text.secondary" fontSize="sm">
                {item.category}
              </NBText>
            </VStack>
          </HStack>

          <NBText color={textColor} fontWeight="bold" fontSize="lg" mb={2}>
            {item.title}
          </NBText>

          {/* Tags */}
          <HStack flexWrap="wrap" space={1}>
            {item.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="subtle"
                colorScheme="primary"
                size="sm"
              >
                #{tag}
              </Badge>
            ))}
          </HStack>
        </Box>
      </Box>
    </Pressable>
  );

  const countries = [
    { code: 'All', name: 'All Countries', flag: '🌍' },
    { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
  ];

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1}>
        {/* Header */}
        <Box
          bg={cardBackground}
          px={4}
          py={3}
          borderBottomWidth={1}
          borderBottomColor="background.tertiary"
        >
          <HStack alignItems="center" justifyContent="space-between">
            <VStack>
              <NBText color={textColor} fontSize="2xl" fontWeight="bold">
                Live
              </NBText>
              <NBText color="text.secondary" fontSize="sm">
                {liveStreams.length} streams live now
              </NBText>
            </VStack>
            
            <Button
              size="sm"
              bg="primary.500"
              _pressed={{ bg: 'primary.600' }}
              onPress={handleGoLive}
              leftIcon={<Icon as={Ionicons} name="radio" size="sm" />}
            >
              Go Live
            </Button>
          </HStack>
        </Box>

        {/* Country Filter */}
        <Box bg={cardBackground} px={4} py={3}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HStack space={2}>
              {countries.map((country) => (
                <Pressable
                  key={country.code}
                  onPress={() => setSelectedCountry(country.code)}
                >
                  <Box
                    bg={selectedCountry === country.code ? 'primary.500' : 'background.tertiary'}
                    px={3}
                    py={2}
                    borderRadius="full"
                    borderWidth={1}
                    borderColor={selectedCountry === country.code ? 'primary.500' : 'background.tertiary'}
                  >
                    <HStack alignItems="center" space={2}>
                      <NBText fontSize="lg">{country.flag}</NBText>
                      <NBText
                        color={selectedCountry === country.code ? 'white' : 'text.secondary'}
                        fontSize="sm"
                        fontWeight="semibold"
                      >
                        {country.name}
                      </NBText>
                    </HStack>
                  </Box>
                </Pressable>
              ))}
            </HStack>
          </ScrollView>
        </Box>

        {/* Live Streams List */}
        <FlatList
          data={liveStreams}
          renderItem={renderLiveStreamCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2196F3"
            />
          }
          ListEmptyComponent={
            <Box alignItems="center" py={20}>
              <Icon
                as={Ionicons}
                name="radio-outline"
                size="6xl"
                color="text.secondary"
                mb={4}
              />
              <NBText color="text.secondary" fontSize="lg" textAlign="center" mb={2}>
                No live streams available
              </NBText>
              <NBText color="text.tertiary" fontSize="sm" textAlign="center">
                Try changing the country filter or check back later
              </NBText>
            </Box>
          }
        />
      </VStack>
    </Box>
  );
};

export default LiveFeedScreen;
