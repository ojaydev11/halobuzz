import React from 'react';
import { Box, Text, VStack } from 'native-base';

const GamePlayScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">Game Play</Text>
        <Text>Game play functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default GamePlayScreen;
