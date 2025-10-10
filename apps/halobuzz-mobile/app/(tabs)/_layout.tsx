import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedNavigator } from '@/components/OptimizedNavigator';

export default function TabLayout() {
  return (
    <OptimizedNavigator>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#888',
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopColor: '#333',
            elevation: 0,
            shadowOpacity: 0,
          },
          lazy: true,
          animationEnabled: true,
        }}
      >
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages-section"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden tabs - accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
          title: 'Discover',
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          href: null, // Hide from tab bar
          title: 'Games',
        }}
      />
      <Tabs.Screen
        name="privacy"
        options={{
          href: null, // Hide from tab bar
          title: 'Privacy Policy',
        }}
      />
      <Tabs.Screen
        name="terms"
        options={{
          href: null, // Hide from tab bar
          title: 'Terms & Conditions',
        }}
      />
      </Tabs>
    </OptimizedNavigator>
  );
}
