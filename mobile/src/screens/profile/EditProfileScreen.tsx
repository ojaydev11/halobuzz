import React from 'react';
import { Box, Text, VStack } from 'native-base';

const EditProfileScreen: React.FC = () => {
  return (
    <Box flex={1} bg="white" justifyContent="center" alignItems="center">
      <VStack space={4} alignItems="center">
        <Text fontSize="2xl" fontWeight="bold">Edit Profile</Text>
        <Text>Edit profile functionality coming soon!</Text>
      </VStack>
    </Box>
  );
};

export default EditProfileScreen;
