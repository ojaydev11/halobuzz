import React from 'react';
import {
  Box,
  VStack,
  Text as NBText,
  Button,
  Icon,
  useColorModeValue,
  HStack,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/ProfileTabNavigator';

type ProfileNavigationProp = StackNavigationProp<ProfileStackParamList, 'Profile'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavigationProp>();
  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1} justifyContent="center" alignItems="center" px={8}>
        <Icon
          as={Ionicons}
          name="person"
          size="6xl"
          color="primary.500"
          mb={4}
        />
        <NBText fontSize="2xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
          Profile
        </NBText>
        <NBText fontSize="md" color="text.secondary" textAlign="center" mb={8}>
          User profile with OG badge and live history coming soon
        </NBText>
        
        <VStack space={4} width="100%">
          <Button
            size="lg"
            bg="primary.500"
            _pressed={{ bg: 'primary.600' }}
            onPress={() => navigation.navigate('Wallet')}
            leftIcon={<Icon as={Ionicons} name="wallet" size="sm" />}
          >
            Wallet
          </Button>
          
          <Button
            size="lg"
            bg="yellow.500"
            _pressed={{ bg: 'yellow.600' }}
            onPress={() => navigation.navigate('OGStore')}
            leftIcon={<Icon as={Ionicons} name="crown" size="sm" />}
          >
            OG Store
          </Button>
          
          <Button
            size="lg"
            bg="gray.500"
            _pressed={{ bg: 'gray.600' }}
            onPress={() => navigation.navigate('Settings')}
            leftIcon={<Icon as={Ionicons} name="settings" size="sm" />}
          >
            Settings
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
};

export default ProfileScreen;
