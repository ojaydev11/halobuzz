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
import { GamesStackParamList } from '../../navigation/GamesTabNavigator';

type GamesLobbyNavigationProp = StackNavigationProp<GamesStackParamList, 'GamesLobby'>;

const GamesLobbyScreen: React.FC = () => {
  const navigation = useNavigation<GamesLobbyNavigationProp>();
  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1} justifyContent="center" alignItems="center" px={8}>
        <Icon
          as={Ionicons}
          name="game-controller"
          size="6xl"
          color="primary.500"
          mb={4}
        />
        <NBText fontSize="2xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
          Games Lobby
        </NBText>
        <NBText fontSize="md" color="text.secondary" textAlign="center" mb={8}>
          Interactive gaming with coin economy coming soon
        </NBText>
        
        <Button
          size="lg"
          bg="primary.500"
          _pressed={{ bg: 'primary.600' }}
          onPress={() => navigation.navigate('GamePlay', {
            gameId: 'demo',
            gameName: 'Demo Game',
            entryFee: 100
          })}
        >
          Play Demo Game
        </Button>
      </VStack>
    </Box>
  );
};

export default GamesLobbyScreen;
