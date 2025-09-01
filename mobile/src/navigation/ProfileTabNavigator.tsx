import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import WalletScreen from '../screens/profile/WalletScreen';
import OGStoreScreen from '../screens/profile/OGStoreScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import LiveHistoryScreen from '../screens/profile/LiveHistoryScreen';

export type ProfileStackParamList = {
  Profile: undefined;
  Wallet: undefined;
  OGStore: undefined;
  Settings: undefined;
  EditProfile: undefined;
  LiveHistory: undefined;
};

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          title: 'Wallet',
        }}
      />
      <Stack.Screen 
        name="OGStore" 
        component={OGStoreScreen}
        options={{
          title: 'OG Store',
        }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
        }}
      />
      <Stack.Screen 
        name="LiveHistory" 
        component={LiveHistoryScreen}
        options={{
          title: 'Live History',
        }}
      />
    </Stack.Navigator>
  );
};

export default ProfileTabNavigator;
