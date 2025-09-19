import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/store/AuthContext';

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock secure storage
jest.mock('@/lib/security', () => ({
  SecureStorageManager: jest.fn().mockImplementation(() => ({
    getAuthToken: jest.fn().mockResolvedValue(null),
    setAuthToken: jest.fn().mockResolvedValue(undefined),
    getRefreshToken: jest.fn().mockResolvedValue(null),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    clearAuthTokens: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Agora
jest.mock('react-native-agora', () => ({
  createAgoraRtcEngine: jest.fn().mockResolvedValue({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    joinChannel: jest.fn(),
    leaveChannel: jest.fn(),
    muteLocalAudioStream: jest.fn(),
    muteLocalVideoStream: jest.fn(),
    release: jest.fn(),
  }),
  IRtcEngine: jest.fn(),
  ChannelProfileType: {},
  ClientRoleType: {},
  AudioProfileType: {},
  AudioScenarioType: {},
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      agoraAppId: 'test-app-id',
    },
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('expo-av', () => ({
  Video: 'Video',
  Audio: 'Audio',
}));

// Custom render function with providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  bio: 'Test bio',
  country: 'US',
  language: 'en',
  isVerified: true,
  isPremium: false,
  kycStatus: 'approved',
  ageVerified: true,
  ogLevel: 1,
  coins: 1000,
  totalCoinsEarned: 1500,
  token: 'test-token',
  refreshToken: 'test-refresh-token',
  trust: {
    score: 85,
    factors: {
      totalStreams: 10,
      totalViews: 1000,
      totalLikes: 500,
      totalGifts: 100,
    },
  },
  followers: 50,
  following: 25,
  totalLikes: 500,
  totalViews: 1000,
  preferences: {
    notifications: true,
    privacy: 'public',
  },
  lastActiveAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockStream = (overrides = {}) => ({
  id: 'test-stream-id',
  channelName: 'test-channel',
  title: 'Test Stream',
  description: 'Test stream description',
  hostId: 'test-host-id',
  hostName: 'Test Host',
  hostAvatar: 'https://example.com/host-avatar.jpg',
  host: {
    id: 'test-host-id',
    username: 'testhost',
    avatar: 'https://example.com/host-avatar.jpg',
    ogLevel: 2,
    followers: 1000,
  },
  category: 'gaming',
  thumbnail: 'https://example.com/thumbnail.jpg',
  thumb: 'https://example.com/thumbnail.jpg',
  isLive: true,
  viewers: 100,
  viewerCount: 100,
  likes: 50,
  comments: 25,
  startTime: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  duration: 3600,
  tags: ['gaming', 'fun'],
  country: 'US',
  quality: '1080p',
  language: 'en',
  isPublic: true,
  allowComments: true,
  allowGifts: true,
  minLevel: 1,
  maxViewers: 1000,
  ...overrides,
});

export const createMockApiResponse = <T>(data: T, overrides = {}): any => ({
  success: true,
  data,
  message: 'Success',
  ...overrides,
});

// Test utilities
export const waitFor = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiCall = <T>(data: T, delay = 0): jest.Mock => 
  jest.fn().mockImplementation(() => 
    new Promise(resolve => 
      setTimeout(() => resolve(createMockApiResponse(data)), delay)
    )
  );

export const mockApiError = (message = 'Test error', status = 500): jest.Mock =>
  jest.fn().mockRejectedValue({
    response: {
      status,
      data: { message },
    },
    message,
  });

// Re-export everything from testing library
export * from '@testing-library/react-native';
export { customRender as render };
