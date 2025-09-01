import React from 'react';
import { Box, Text, VStack } from 'native-base';

const ReelsUploadScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">Reels Upload</Text>
        <Text>Reels upload functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default ReelsUploadScreen;
