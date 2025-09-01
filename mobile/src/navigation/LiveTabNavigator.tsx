import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';

// Screens
import LiveFeedScreen from '../screens/live/LiveFeedScreen';
import LiveRoomScreen from '../screens/live/LiveRoomScreen';
import GoLiveScreen from '../screens/live/GoLiveScreen';
import LiveSettingsScreen from '../screens/live/LiveSettingsScreen';

export type LiveStackParamList = {
  LiveFeed: undefined;
  LiveRoom: {
    streamId: string;
    streamerId: string;
    streamerName: string;
    isAnonymous?: boolean;
  };
  GoLive: undefined;
  LiveSettings: undefined;
};

const Stack = createStackNavigator<LiveStackParamList>();

const LiveTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen 
        name="LiveFeed" 
        component={LiveFeedScreen}
        options={{
          title: 'Live',
        }}
      />
      <Stack.Screen 
        name="LiveRoom" 
        component={LiveRoomScreen}
        options={{
          title: 'Live Room',
          gestureEnabled: Platform.OS === 'ios',
        }}
      />
      <Stack.Screen 
        name="GoLive" 
        component={GoLiveScreen}
        options={{
          title: 'Go Live',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="LiveSettings" 
        component={LiveSettingsScreen}
        options={{
          title: 'Live Settings',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

export default LiveTabNavigator;
