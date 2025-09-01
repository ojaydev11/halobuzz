import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorModeValue } from 'native-base';

// Screens
import LiveTabNavigator from './LiveTabNavigator';
import ReelsTabNavigator from './ReelsTabNavigator';
import GamesTabNavigator from './GamesTabNavigator';
import InboxTabNavigator from './InboxTabNavigator';
import ProfileTabNavigator from './ProfileTabNavigator';

export type MainTabParamList = {
  Live: undefined;
  Reels: undefined;
  Games: undefined;
  Inbox: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const tabBarBackgroundColor = useColorModeValue('background.primary', 'background.primary');
  const tabBarActiveTintColor = useColorModeValue('primary.500', 'primary.500');
  const tabBarInactiveTintColor = useColorModeValue('text.secondary', 'text.secondary');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Live':
              iconName = focused ? 'radio' : 'radio-outline';
              break;
            case 'Reels':
              iconName = focused ? 'play-circle' : 'play-circle-outline';
              break;
            case 'Games':
              iconName = focused ? 'game-controller' : 'game-controller-outline';
              break;
            case 'Inbox':
              iconName = focused ? 'mail' : 'mail-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor,
        tabBarInactiveTintColor,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopColor: 'background.secondary',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Live" 
        component={LiveTabNavigator}
        options={{
          tabBarLabel: 'Live',
        }}
      />
      <Tab.Screen 
        name="Reels" 
        component={ReelsTabNavigator}
        options={{
          tabBarLabel: 'Reels',
        }}
      />
      <Tab.Screen 
        name="Games" 
        component={GamesTabNavigator}
        options={{
          tabBarLabel: 'Games',
        }}
      />
      <Tab.Screen 
        name="Inbox" 
        component={InboxTabNavigator}
        options={{
          tabBarLabel: 'Inbox',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileTabNavigator}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
