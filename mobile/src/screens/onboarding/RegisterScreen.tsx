import React from 'react';
import {
  Box,
  VStack,
  Text as NBText,
  Button,
  Icon,
  useColorModeValue,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type RegisterNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterNavigationProp>();
  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const textColor = useColorModeValue('text.primary', 'text.primary');

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1} justifyContent="center" alignItems="center" px={8}>
        <Icon
          as={Ionicons}
          name="person-add"
          size="6xl"
          color="primary.500"
          mb={4}
        />
        <NBText fontSize="2xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
          Create Account
        </NBText>
        <NBText fontSize="md" color="text.secondary" textAlign="center" mb={8}>
          Registration screen coming soon
        </NBText>
        
        <Button
          size="lg"
          bg="primary.500"
          _pressed={{ bg: 'primary.600' }}
          onPress={() => navigation.navigate('Login')}
        >
          Back to Login
        </Button>
      </VStack>
    </Box>
  );
};

export default RegisterScreen;
