import React from 'react';
import { Box, Text, VStack } from 'native-base';

const WalletScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">Wallet</Text>
        <Text>Wallet functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default WalletScreen;
