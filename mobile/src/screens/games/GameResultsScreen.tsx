import React from 'react';
import { Box, Text, VStack } from 'native-base';

const GameResultsScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">Game Results</Text>
        <Text>Game results functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default GameResultsScreen;
