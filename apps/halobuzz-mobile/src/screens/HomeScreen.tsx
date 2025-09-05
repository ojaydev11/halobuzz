import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useStreamsStore } from '../store/useStreamsStore';
import { Stream, FeaturedItem, ContinueWatchingItem } from '../types/stream';

// Components
import TopBar from '../components/TopBar';
import FeaturedBanner from '../components/FeaturedBanner';
import FilterTabs from '../components/FilterTabs';
import LiveGrid from '../components/LiveGrid';
import ContinueWatching from '../components/ContinueWatching';
import DailyCheckin from '../components/DailyCheckin';

interface HomeScreenProps {
  navigation: any; // Replace with proper navigation type
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    streams,
    featuredItems,
    continueWatching,
    activeFilter,
    loading,
    refreshing,
    error,
    hasMore,
    checkinReward,
    checkinLoading,
    fetchActiveStreams,
    fetchFeaturedItems,
    fetchContinueWatching,
    claimCheckin,
    setFilter,
    refresh,
    loadMore,
    clearError,
  } = useStreamsStore();

  // Load data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchActiveStreams(),
          fetchFeaturedItems(),
          fetchContinueWatching(),
        ]);
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, []);

  // Handle stream press
  const handleStreamPress = useCallback((stream: Stream) => {
    // Track analytics
    console.log('home_livecard_tap', { streamId: stream.id, position: 'grid' });
    
    // Navigate to live room
    navigation.navigate('LiveRoom', {
      streamId: stream.id,
      channelName: stream.channelName,
    });
  }, [navigation]);

  // Handle featured item press
  const handleFeaturedPress = useCallback((item: FeaturedItem) => {
    // Track analytics
    console.log('home_banner_tap', { itemId: item.id });
    
    // Handle deeplink or navigation
    if (item.deeplink) {
      // Handle deeplink
      console.log('Navigate to:', item.deeplink);
    } else {
      // Default navigation
      navigation.navigate('LiveRoom', { streamId: item.id });
    }
  }, [navigation]);

  // Handle continue watching press
  const handleContinueWatchingPress = useCallback((item: ContinueWatchingItem) => {
    // Track analytics
    console.log('home_continue_tap', { streamId: item.streamId });
    
    navigation.navigate('LiveRoom', {
      streamId: item.streamId,
      channelName: item.streamId, // This should be the actual channel name
    });
  }, [navigation]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: string) => {
    // Track analytics
    console.log('home_filter_change', { filter });
    
    setFilter(filter as any);
  }, [setFilter]);

  // Handle search press
  const handleSearchPress = useCallback(() => {
    navigation.navigate('Search');
  }, [navigation]);

  // Handle notification press
  const handleNotificationPress = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  // Handle check-in claim
  const handleCheckinClaim = useCallback(async () => {
    try {
      await claimCheckin();
      // Track analytics
      console.log('home_checkin_claim', { 
        streak: checkinReward?.streak || 1 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to claim check-in reward');
    }
  }, [claimCheckin, checkinReward]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <TopBar
        onSearchPress={handleSearchPress}
        onNotificationPress={handleNotificationPress}
        notificationCount={0} // This should come from notifications store
      />

      {/* Featured Banner */}
      {featuredItems.length > 0 && (
        <FeaturedBanner
          items={featuredItems}
          onItemPress={handleFeaturedPress}
          loading={loading}
        />
      )}

      {/* Filter Tabs */}
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        followingCount={0} // This should come from following store
      />

      {/* Daily Check-in */}
      <DailyCheckin
        reward={checkinReward}
        loading={checkinLoading}
        onClaim={handleCheckinClaim}
        onDismiss={() => {
          // Track analytics
          console.log('home_checkin_dismiss');
        }}
      />

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <ContinueWatching
          items={continueWatching}
          onItemPress={handleContinueWatchingPress}
          onViewAllPress={() => {
            // Track analytics
            console.log('home_continue_view_all');
            navigation.navigate('ContinueWatching');
          }}
          loading={loading}
        />
      )}

      {/* Live Grid */}
      <LiveGrid
        streams={streams}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        onStreamPress={handleStreamPress}
        hasMore={hasMore}
        error={error}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10', // Using theme color directly for now
  },
});
