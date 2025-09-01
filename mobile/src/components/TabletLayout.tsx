import React from 'react';
import { Dimensions } from 'react-native';
import { Box, HStack, VStack } from 'native-base';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface TabletLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftPanelWidth?: number;
  rightPanelWidth?: number;
}

export const TabletLayout: React.FC<TabletLayoutProps> = ({
  children,
  leftPanel,
  rightPanel,
  leftPanelWidth = 0.6,
  rightPanelWidth = 0.4,
}) => {
  if (!isTablet) {
    return <Box flex={1}>{children}</Box>;
  }

  if (leftPanel && rightPanel) {
    return (
      <HStack flex={1}>
        <Box flex={leftPanelWidth}>
          {leftPanel}
        </Box>
        <Box flex={rightPanelWidth}>
          {rightPanel}
        </Box>
      </HStack>
    );
  }

  return <Box flex={1}>{children}</Box>;
};

export const useIsTablet = () => {
  return isTablet;
};
