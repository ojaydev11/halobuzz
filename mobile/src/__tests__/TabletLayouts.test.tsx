import React from 'react';
import { render } from '@testing-library/react-native';
import { NativeBaseProvider } from 'native-base';
import { Dimensions } from 'react-native';
import { TabletLayout } from '../components/TabletLayout';
import LiveRoomTabletScreen from '../screens/live/LiveRoomTabletScreen';
import InboxTabletScreen from '../screens/inbox/InboxTabletScreen';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {
  params: {
    streamerName: 'TestStreamer',
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

// Mock Redux store
jest.mock('../store/hooks', () => ({
  useAppSelector: jest.fn(() => ({
    id: 'test-user',
    username: 'TestUser',
    ogTier: 2,
    isVerified: true,
  })),
}));

// Mock Dimensions for tablet size
const mockDimensions = (width: number, height: number) => {
  jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 1, fontScale: 1 });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NativeBaseProvider>{children}</NativeBaseProvider>
);

describe('Tablet Layouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TabletLayout Component', () => {
    it('renders single panel on mobile', () => {
      mockDimensions(375, 667); // iPhone size
      
      const { toJSON } = render(
        <TestWrapper>
          <TabletLayout>
            <div>Mobile Content</div>
          </TabletLayout>
        </TestWrapper>
      );
      
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders two-pane layout on tablet', () => {
      mockDimensions(1024, 768); // iPad size
      
      const { toJSON } = render(
        <TestWrapper>
          <TabletLayout
            leftPanel={<div>Left Panel</div>}
            rightPanel={<div>Right Panel</div>}
          />
        </TestWrapper>
      );
      
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('LiveRoomTabletScreen', () => {
    it('renders tablet layout correctly', () => {
      mockDimensions(1024, 768); // iPad size
      
      const { toJSON } = render(
        <TestWrapper>
          <LiveRoomTabletScreen />
        </TestWrapper>
      );
      
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders mobile fallback on small screens', () => {
      mockDimensions(375, 667); // iPhone size
      
      const { toJSON } = render(
        <TestWrapper>
          <LiveRoomTabletScreen />
        </TestWrapper>
      );
      
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('InboxTabletScreen', () => {
    it('renders tablet split view correctly', () => {
      mockDimensions(1024, 768); // iPad size
      
      const { toJSON } = render(
        <TestWrapper>
          <InboxTabletScreen />
        </TestWrapper>
      );
      
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders mobile list view on small screens', () => {
      mockDimensions(375, 667); // iPhone size
      
      const { toJSON } = render(
        <TestWrapper>
          <InboxTabletScreen />
        </TestWrapper>
      );
      
      expect(toJSON()).toMatchSnapshot();
    });
  });
});

describe('Responsive Breakpoints', () => {
  const testCases = [
    { name: 'iPhone SE', width: 320, height: 568, expectTablet: false },
    { name: 'iPhone 12', width: 390, height: 844, expectTablet: false },
    { name: 'iPad Mini', width: 768, height: 1024, expectTablet: true },
    { name: 'iPad Pro', width: 1024, height: 1366, expectTablet: true },
    { name: 'Desktop', width: 1920, height: 1080, expectTablet: true },
  ];

  testCases.forEach(({ name, width, height, expectTablet }) => {
    it(`correctly identifies ${name} as ${expectTablet ? 'tablet' : 'mobile'}`, () => {
      mockDimensions(width, height);
      
      const { toJSON } = render(
        <TestWrapper>
          <TabletLayout
            leftPanel={<div>Left</div>}
            rightPanel={<div>Right</div>}
          />
        </TestWrapper>
      );
      
      const snapshot = toJSON();
      if (expectTablet) {
        expect(snapshot).toMatchSnapshot(`${name}-tablet-layout`);
      } else {
        expect(snapshot).toMatchSnapshot(`${name}-mobile-layout`);
      }
    });
  });
});
