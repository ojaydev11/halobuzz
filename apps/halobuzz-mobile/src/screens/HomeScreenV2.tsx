import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchActiveStreams, setStreamFilter } from '../store/slices/streamSlice';
import { checkDailyBonus } from '../store/slices/walletSlice';
import { fetchCurrentEvents } from '../store/slices/eventSlice';
import LiveCard from '../components/LiveCard';
import FeaturedBanner from '../components/FeaturedBanner';
import DailyRewardBanner from '../components/DailyRewardBanner';
import FirstFlameZone from '../components/FirstFlameZone';
import SearchBar from '../components/SearchBar';
import SkeletonLoader from '../components/SkeletonLoader';
import { hapticFeedback } from '../utils/haptics';
import { logger } from '../utils/logger';
import { metricsService } from '../services/MetricsService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Filter options
const FILTER_TABS = [
  { id: 'all', label: '🌍 All', region: null },
  { id: 'nepal', label: '🇳🇵 Nepal', region: 'NP' },
  { id: 'asia', label: '🌏 Asia', region: 'ASIA' },
  { id: 'global', label: '🌐 Global', region: 'GLOBAL' },
];

const HomeScreenV2: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  // Redux state
  const { streams, loading, filter, hasMore } = useAppSelector(state => state.streams);
  const { currentEvent } = useAppSelector(state => state.events);
  const { user, dailyBonusAvailable } = useAppSelector(state => state.auth);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showFirstFlame, setShowFirstFlame] = useState(false);
  
  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
    metricsService.trackImpression('homepage');
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        dispatch(fetchActiveStreams({ page: 1, filter: selectedFilter })),
        dispatch(fetchCurrentEvents()),
        dispatch(checkDailyBonus()),
      ]);
      
      // Check if should show First Flame Zone
      const newHostsCount = streams.filter(s => s.isNewHost).length;
      setShowFirstFlame(newHostsCount > 0);
    } catch (error) {
      logger.error('Failed to load homepage data', error);
    }
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticFeedback('light');
    
    try {
      await loadInitialData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load more streams (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchActiveStreams({ 
        page: streams.length / 10 + 1, 
        filter: selectedFilter 
      }));
    }
  }, [loading, hasMore, streams.length, selectedFilter]);

  // Filter change
  const handleFilterChange = (filterId: string) => {
    hapticFeedback('light');
    setSelectedFilter(filterId);
    dispatch(setStreamFilter(filterId));
    dispatch(fetchActiveStreams({ page: 1, filter: filterId }));
    metricsService.trackEvent('filter_changed', { filter: filterId });
  };

  // Search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      dispatch(fetchActiveStreams({ page: 1, search: query }));
      metricsService.trackEvent('search', { query });
    }
  };

  // Navigate to stream
  const handleStreamPress = (stream: any) => {
    hapticFeedback('medium');
    navigation.navigate('LiveRoom', { streamId: stream.id });
    metricsService.trackEvent('stream_clicked', { 
      streamId: stream.id,
      source: 'homepage' 
    });
  };

  // Render live stream card
  const renderLiveCard = ({ item, index }: { item: any; index: number }) => (
    <LiveCard
      stream={item}
      onPress={() => handleStreamPress(item)}
      index={index}
      style={styles.liveCard}
    />
  );

  // Header component
  const renderHeader = () => (
    <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
      <LinearGradient
        colors={['#1a1a2e', '#0f0f1e']}
        style={styles.headerGradient}
      >
        {/* Logo and Search Bar */}
        <View style={styles.headerTop}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Search')}
              style={styles.iconButton}
            >
              <Icon name="search" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconButton}
            >
              <Icon name="notifications" size={24} color="#fff" />
              {user?.unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{user.unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search hosts, reels, tags..."
          style={styles.searchBar}
        />
      </LinearGradient>
    </Animated.View>
  );

  // Filter tabs
  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {FILTER_TABS.map(tab => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => handleFilterChange(tab.id)}
          style={[
            styles.filterTab,
            selectedFilter === tab.id && styles.filterTabActive
          ]}
        >
          <LinearGradient
            colors={
              selectedFilter === tab.id
                ? ['#6a5acd', '#4a3d9d']
                : ['transparent', 'transparent']
            }
            style={styles.filterGradient}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === tab.id && styles.filterTextActive
            ]}>
              {tab.label}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="live-tv" size={80} color="#666" />
      <Text style={styles.emptyTitle}>No Live Streams</Text>
      <Text style={styles.emptySubtitle}>Be the first to go live!</Text>
      <TouchableOpacity
        style={styles.goLiveButton}
        onPress={() => navigation.navigate('StartStream')}
      >
        <LinearGradient
          colors={['#ff6b6b', '#ee5a6f']}
          style={styles.goLiveGradient}
        >
          <Icon name="videocam" size={20} color="#fff" />
          <Text style={styles.goLiveText}>Go Live Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // List header component (banners + filters)
  const ListHeaderComponent = () => (
    <View style={styles.listHeader}>
      {/* Featured Banner */}
      {currentEvent && (
        <FeaturedBanner
          event={currentEvent}
          onPress={() => navigation.navigate('Event', { eventId: currentEvent.id })}
        />
      )}

      {/* Daily Reward Banner */}
      {dailyBonusAvailable && (
        <DailyRewardBanner
          onClaim={() => {
            dispatch(checkDailyBonus());
            hapticFeedback('success');
          }}
        />
      )}

      {/* First Flame Zone for new hosts */}
      {showFirstFlame && (
        <FirstFlameZone
          streams={streams.filter(s => s.isNewHost).slice(0, 5)}
          onPress={handleStreamPress}
        />
      )}

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Live Now Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.sectionTitle}>Live Now</Text>
        </View>
        <Text style={styles.viewerCount}>
          {streams.length} streams • {streams.reduce((sum, s) => sum + s.viewers, 0)} watching
        </Text>
      </View>
    </View>
  );

  // Loading state
  if (loading && streams.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <SkeletonLoader type="grid" count={6} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {renderHeader()}
      
      <FlatList
        data={streams}
        renderItem={renderLiveCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          loading && streams.length > 0 ? (
            <ActivityIndicator size="large" color="#6a5acd" style={styles.loader} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6a5acd"
            colors={['#6a5acd']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 120,
    height: 32,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchBar: {
    marginBottom: 0,
  },
  listHeader: {
    paddingBottom: 8,
  },
  filterContainer: {
    maxHeight: 48,
    marginVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    marginRight: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterTabActive: {
    transform: [{ scale: 1.05 }],
  },
  filterGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(106, 90, 205, 0.3)',
  },
  filterText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
    animation: 'pulse 2s infinite',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  viewerCount: {
    fontSize: 12,
    color: '#999',
  },
  row: {
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  liveCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  loader: {
    paddingVertical: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  goLiveButton: {
    marginTop: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  goLiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  goLiveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreenV2;