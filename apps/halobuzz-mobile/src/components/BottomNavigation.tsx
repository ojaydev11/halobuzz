import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { hapticFeedback } from '../utils/haptics';

interface TabItem {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
  badge?: number;
}

const tabs: TabItem[] = [
  { id: 'Home', label: 'Home', icon: 'home' },
  { id: 'Reels', label: 'Reels', icon: 'play-circle-outline', activeIcon: 'play-circle-filled' },
  { id: 'GoLive', label: '', icon: 'videocam' }, // Special center button
  { id: 'Wallet', label: 'Wallet', icon: 'account-balance-wallet' },
  { id: 'Profile', label: 'Profile', icon: 'person' },
];

const BottomNavigation: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Animation values for each tab
  const scaleAnims = tabs.map(() => useRef(new Animated.Value(1)).current);
  const goLiveScaleAnim = useRef(new Animated.Value(1)).current;
  const goLivePulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation for Go Live button
    Animated.loop(
      Animated.sequence([
        Animated.timing(goLivePulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(goLivePulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePress = (tab: TabItem, index: number) => {
    hapticFeedback('light');

    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
    ]).start();

    // Special handling for Go Live button
    if (tab.id === 'GoLive') {
      hapticFeedback('medium');
      navigation.navigate('StartStream' as never);
    } else {
      navigation.navigate(tab.id as never);
    }
  };

  const isActive = (tabId: string) => {
    return route.name === tabId;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={['rgba(26, 26, 46, 0.95)', '#1a1a2e']}
        style={styles.gradient}
      >
        <View style={styles.tabBar}>
          {tabs.map((tab, index) => {
            const active = isActive(tab.id);
            
            // Special rendering for Go Live button
            if (tab.id === 'GoLive') {
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => handlePress(tab, index)}
                  style={styles.goLiveContainer}
                  activeOpacity={0.9}
                >
                  <Animated.View
                    style={[
                      styles.goLiveButton,
                      {
                        transform: [
                          { scale: scaleAnims[index] },
                          { scale: goLivePulseAnim },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#ff6b6b', '#ff4757']}
                      style={styles.goLiveGradient}
                    >
                      <Icon name={tab.icon} size={28} color="#fff" />
                      <View style={styles.goLiveDot} />
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              );
            }

            // Regular tab items
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handlePress(tab, index)}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.tabContent,
                    {
                      transform: [{ scale: scaleAnims[index] }],
                    },
                  ]}
                >
                  <View style={styles.iconContainer}>
                    <Icon
                      name={active && tab.activeIcon ? tab.activeIcon : tab.icon}
                      size={24}
                      color={active ? '#6a5acd' : '#999'}
                    />
                    {tab.badge && tab.badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tab.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.label,
                      active && styles.activeLabel,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {active && (
                    <View style={styles.activeIndicator} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  gradient: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(106, 90, 205, 0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#6a5acd',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ff4757',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6a5acd',
  },
  goLiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goLiveButton: {
    position: 'relative',
  },
  goLiveGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  goLiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});

export default BottomNavigation;