import React from 'react';
import {
  Box,
  VStack,
  Text as NBText,
  Button,
  Icon,
  useColorModeValue,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { InboxStackParamList } from '../../navigation/InboxTabNavigator';

type InboxListNavigationProp = StackNavigationProp<InboxStackParamList, 'InboxList'>;

const InboxListScreen: React.FC = () => {
  const navigation = useNavigation<InboxListNavigationProp>();
  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1} justifyContent="center" alignItems="center" px={8}>
        <Icon
          as={Ionicons}
          name="mail"
          size="6xl"
          color="primary.500"
          mb={4}
        />
        <NBText fontSize="2xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
          Inbox
        </NBText>
        <NBText fontSize="md" color="text.secondary" textAlign="center" mb={8}>
          Direct messaging with 3-message rule coming soon
        </NBText>
        
        <Button
          size="lg"
          bg="primary.500"
          _pressed={{ bg: 'primary.600' }}
          onPress={() => navigation.navigate('DMChat', {
            userId: 'demo',
            username: 'Demo User',
            userAvatar: 'https://via.placeholder.com/50',
            ogTier: 2,
            isVerified: false
          })}
        >
          Open Demo Chat
        </Button>
      </VStack>
    </Box>
  );
};

export default InboxListScreen;
