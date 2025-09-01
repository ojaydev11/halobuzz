import React from 'react';
import { Box, Text, VStack } from 'native-base';

const OGStoreScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">OG Store</Text>
        <Text>OG Store functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default OGStoreScreen;
