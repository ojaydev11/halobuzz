// Centralized lazy screen exports for better tree-shaking
import { createLazyScreen } from '@/components/LazyScreen';

// Tab Screens (critical - preload with minimal delay)
export const ProfileScreen = createLazyScreen(
  () => import('./ProfileScreen'),
  'ProfileScreen',
  500 // Preload after 500ms
);

export const GamesScreen = createLazyScreen(
  () => import('./GamesScreen'),
  'GamesScreen',
  800
);

export const LiveScreen = createLazyScreen(
  () => import('./LiveScreen'),
  'LiveScreen',
  1000
);

export const SearchScreen = createLazyScreen(
  () => import('./SearchScreen'),
  'SearchScreen',
  1200
);

export const MessagesScreen = createLazyScreen(
  () => import('./MessagesScreen'),
  'MessagesScreen',
  1500
);

// Secondary Screens (load on-demand)
export const SettingsScreen = createLazyScreen(
  () => import('./SettingsScreen'),
  'SettingsScreen'
);

export const WalletScreen = createLazyScreen(
  () => import('./WalletScreen'),
  'WalletScreen'
);

export const NotificationScreen = createLazyScreen(
  () => import('./NotificationScreen'),
  'NotificationScreen'
);

// Heavy Screens (defer completely until needed)
export const StreamingScreen = createLazyScreen(
  () => import('./StreamingScreen'),
  'StreamingScreen'
);

export const GamePlayScreen = createLazyScreen(
  () => import('./GamePlayScreen'),
  'GamePlayScreen'
);

export const VideoCallScreen = createLazyScreen(
  () => import('./VideoCallScreen'),
  'VideoCallScreen'
);

// Admin Screens (admin-only, heaviest defer)
export const AdminModerationScreen = createLazyScreen(
  () => import('./AdminModerationScreen'),
  'AdminModerationScreen'
);

export const AdvancedGamesScreen = createLazyScreen(
  () => import('./AdvancedGamesScreen'),
  'AdvancedGamesScreen'
);

export const AIOpponentsScreen = createLazyScreen(
  () => import('./AIOpponentsScreen'),
  'AIOpponentsScreen'
);

export const LeaderboardsScreen = createLazyScreen(
  () => import('./LeaderboardsScreen'),
  'LeaderboardsScreen'
);

export const TournamentsScreen = createLazyScreen(
  () => import('./TournamentsScreen'),
  'TournamentsScreen'
);

export const MonetizationScreen = createLazyScreen(
  () => import('./MonetizationScreen'),
  'MonetizationScreen'
);

export const SocialHubScreen = createLazyScreen(
  () => import('./SocialHubScreen'),
  'SocialHubScreen'
);