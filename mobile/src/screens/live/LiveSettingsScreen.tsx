import React from 'react';
import { Box, Text, VStack } from 'native-base';

const LiveSettingsScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">Live Settings</Text>
        <Text>Live streaming settings functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default LiveSettingsScreen;
