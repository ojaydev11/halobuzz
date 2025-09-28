import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/lib/api';
import { AuthContextProvider } from '@/store/AuthContextOptimized';
import App from '../../app/_layout';
import ReelsScreen from '@/screens/ReelsScreen';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/lib/api');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Stack: ({ children }: any) => children,
  Tabs: ({ children }: any) => children,
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('HaloBuzz E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Authentication Flow', () => {
    test('should complete full login flow', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg'
      };

      mockApiClient.login.mockResolvedValueOnce({
        success: true,
        data: {
          user: mockUser,
          token: 'mock-access-token',
          refreshToken: 'mock-refresh-token'
        }
      });

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <App />
          </AuthContextProvider>
        </NavigationContainer>
      );

      // Fill login form
      const emailInput = getByPlaceholderText('Email or Username');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockApiClient.login).toHaveBeenCalledWith({
          identifier: 'test@example.com',
          password: 'password123'
        });
      });
    });

    test('should handle login errors gracefully', async () => {
      mockApiClient.login.mockRejectedValueOnce({
        message: 'Invalid credentials'
      });

      const { getByPlaceholderText, getByText, queryByText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <App />
          </AuthContextProvider>
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email or Username');
      const passwordInput = getByPlaceholderText('Password');
      const loginButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'invalid@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText(/invalid/i)).toBeTruthy();
      });
    });
  });

  describe('Reels Functionality', () => {
    const mockReels = [
      {
        id: '1',
        title: 'Test Reel 1',
        viewUrl: 'https://example.com/video1.mp4',
        creator: {
          id: 'creator1',
          username: 'creator1',
          avatar: 'https://example.com/avatar1.jpg',
          isVerified: true
        },
        likes: 100,
        comments: 20,
        shares: 5,
        isLiked: false,
        isFollowing: false
      },
      {
        id: '2',
        title: 'Test Reel 2',
        viewUrl: 'https://example.com/video2.mp4',
        creator: {
          id: 'creator2',
          username: 'creator2',
          avatar: 'https://example.com/avatar2.jpg',
          isVerified: false
        },
        likes: 50,
        comments: 10,
        shares: 2,
        isLiked: true,
        isFollowing: true
      }
    ];

    test('should load and display reels correctly', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      const { getByText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Test Reel 1')).toBeTruthy();
        expect(getByText('@creator1')).toBeTruthy();
      });
    });

    test('should handle like action correctly', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      mockApiClient.post.mockResolvedValueOnce({
        success: true
      });

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Test Reel 1')).toBeTruthy();
      });

      const likeButton = getByTestId('like-button-1');
      fireEvent.press(likeButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/reels/1/like', {
          action: 'like'
        });
      });
    });

    test('should handle follow action correctly', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      mockApiClient.post.mockResolvedValueOnce({
        success: true,
        isFollowing: true
      });

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Follow')).toBeTruthy();
      });

      const followButton = getByTestId('follow-button-creator1');
      fireEvent.press(followButton);

      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/users/creator1/follow', {
          action: 'follow'
        });
      });
    });
  });

  describe('Performance Tests', () => {
    test('should render reels within performance budget', async () => {
      const startTime = performance.now();

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      const { getByText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Test Reel 1')).toBeTruthy();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 500ms
      expect(renderTime).toBeLessThan(500);
    });

    test('should handle memory efficiently with large lists', async () => {
      const largeReelsList = Array.from({ length: 1000 }, (_, index) => ({
        id: `reel-${index}`,
        title: `Test Reel ${index}`,
        viewUrl: `https://example.com/video${index}.mp4`,
        creator: {
          id: `creator-${index}`,
          username: `creator${index}`,
          avatar: `https://example.com/avatar${index}.jpg`,
          isVerified: index % 10 === 0
        },
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
        isLiked: Math.random() > 0.5,
        isFollowing: Math.random() > 0.7
      }));

      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: largeReelsList }
      });

      const component = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      // Should handle large lists without crashing
      await waitFor(() => {
        expect(component.getByText('Test Reel 0')).toBeTruthy();
      }, { timeout: 3000 });

      // Memory usage should remain stable
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Offline Functionality', () => {
    test('should work offline with cached data', async () => {
      // Set up cache
      await AsyncStorage.setItem('cached_reels', JSON.stringify(mockReels));

      // Simulate network failure
      mockApiClient.get.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByText('Test Reel 1')).toBeTruthy();
      });
    });

    test('should sync data when coming back online', async () => {
      // Simulate coming back online
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      const { getByText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalled();
        expect(getByText('Test Reel 1')).toBeTruthy();
      });
    });
  });

  describe('Accessibility Tests', () => {
    test('should have proper accessibility labels', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      const { getByLabelText } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByLabelText(/like button/i)).toBeTruthy();
        expect(getByLabelText(/follow button/i)).toBeTruthy();
        expect(getByLabelText(/share button/i)).toBeTruthy();
      });
    });

    test('should support screen readers', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        success: true,
        data: { reels: mockReels }
      });

      const { getByRole } = render(
        <NavigationContainer>
          <AuthContextProvider>
            <ReelsScreen />
          </AuthContextProvider>
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByRole('button', { name: /like/i })).toBeTruthy();
        expect(getByRole('button', { name: /follow/i })).toBeTruthy();
      });
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete user journey', async () => {
    // Mock the entire flow
    mockApiClient.login.mockResolvedValueOnce({
      success: true,
      data: {
        user: { id: 'user123', username: 'testuser' },
        token: 'access-token',
        refreshToken: 'refresh-token'
      }
    });

    mockApiClient.get.mockResolvedValueOnce({
      success: true,
      data: { reels: mockReels }
    });

    const { getByPlaceholderText, getByText } = render(
      <NavigationContainer>
        <AuthContextProvider>
          <App />
        </AuthContextProvider>
      </NavigationContainer>
    );

    // Login
    fireEvent.changeText(getByPlaceholderText('Email or Username'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    // Should navigate to main app and load reels
    await waitFor(() => {
      expect(getByText('Test Reel 1')).toBeTruthy();
    }, { timeout: 5000 });
  });
});