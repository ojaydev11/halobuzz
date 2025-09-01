import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import GamesLobbyScreen from '../screens/games/GamesLobbyScreen';
import GamePlayScreen from '../screens/games/GamePlayScreen';
import GameResultsScreen from '../screens/games/GameResultsScreen';

export type GamesStackParamList = {
  GamesLobby: undefined;
  GamePlay: {
    gameId: string;
    gameName: string;
    entryFee: number;
  };
  GameResults: {
    gameId: string;
    result: 'win' | 'lose' | 'draw';
    coinsWon: number;
    coinsLost: number;
  };
};

const Stack = createStackNavigator<GamesStackParamList>();

const GamesTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="GamesLobby" 
        component={GamesLobbyScreen}
        options={{
          title: 'Games',
        }}
      />
      <Stack.Screen 
        name="GamePlay" 
        component={GamePlayScreen}
        options={{
          title: 'Game Play',
        }}
      />
      <Stack.Screen 
        name="GameResults" 
        component={GameResultsScreen}
        options={{
          title: 'Game Results',
        }}
      />
    </Stack.Navigator>
  );
};

export default GamesTabNavigator;
