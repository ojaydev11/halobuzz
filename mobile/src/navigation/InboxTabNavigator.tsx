import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import InboxListScreen from '../screens/inbox/InboxListScreen';
import DMChatScreen from '../screens/inbox/DMChatScreen';

export type InboxStackParamList = {
  InboxList: undefined;
  DMChat: {
    userId: string;
    username: string;
    userAvatar: string;
    ogTier: number;
    isVerified: boolean;
  };
};

const Stack = createStackNavigator<InboxStackParamList>();

const InboxTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="InboxList" 
        component={InboxListScreen}
        options={{
          title: 'Inbox',
        }}
      />
      <Stack.Screen 
        name="DMChat" 
        component={DMChatScreen}
        options={{
          title: 'Direct Message',
        }}
      />
    </Stack.Navigator>
  );
};

export default InboxTabNavigator;
