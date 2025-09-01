import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import ReelsFeedScreen from '../screens/reels/ReelsFeedScreen';
import ReelsUploadScreen from '../screens/reels/ReelsUploadScreen';
import ReelDetailScreen from '../screens/reels/ReelDetailScreen';

export type ReelsStackParamList = {
  ReelsFeed: undefined;
  ReelsUpload: undefined;
  ReelDetail: {
    reelId: string;
    userId: string;
  };
};

const Stack = createStackNavigator<ReelsStackParamList>();

const ReelsTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="ReelsFeed" 
        component={ReelsFeedScreen}
        options={{
          title: 'Reels',
        }}
      />
      <Stack.Screen 
        name="ReelsUpload" 
        component={ReelsUploadScreen}
        options={{
          title: 'Upload Reel',
          presentation: 'modal',
        }}
      />
      <Stack.Screen 
        name="ReelDetail" 
        component={ReelDetailScreen}
        options={{
          title: 'Reel Detail',
        }}
      />
    </Stack.Navigator>
  );
};

export default ReelsTabNavigator;
