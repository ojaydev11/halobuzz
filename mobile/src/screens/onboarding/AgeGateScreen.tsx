import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text as NBText,
  Button,
  Icon,
  useColorModeValue,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppDispatch } from '../../store/hooks';
import { verifyAge } from '../../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

const AgeGateScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const textColor = useColorModeValue('text.primary', 'text.primary');
  const cardBackground = useColorModeValue('background.secondary', 'background.secondary');

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleContinue = () => {
    const age = calculateAge(birthDate);
    
    if (age < 13) {
      Alert.alert(
        'Age Restriction',
        'You must be at least 13 years old to use this app.',
        [{ text: 'OK' }]
      );
      return;
    }

    dispatch(verifyAge(age));
  };

  const age = calculateAge(birthDate);

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1} justifyContent="center" alignItems="center" px={8}>
        {/* Header */}
        <VStack alignItems="center" mb={12}>
          <Icon
            as={Ionicons}
            name="shield-checkmark"
            size="6xl"
            color="primary.500"
            mb={4}
          />
          <NBText fontSize="3xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
            Welcome to HaloBuzz
          </NBText>
          <NBText fontSize="lg" color="text.secondary" textAlign="center">
            Please verify your age to continue
          </NBText>
        </VStack>

        {/* Age Verification Card */}
        <Box
          bg={cardBackground}
          borderRadius="xl"
          p={6}
          width="100%"
          maxWidth={400}
          mb={8}
        >
          <VStack space={4}>
            <NBText fontSize="lg" fontWeight="semibold" color={textColor} textAlign="center">
              When were you born?
            </NBText>
            
            <Button
              variant="outline"
              borderColor="primary.500"
              borderWidth={2}
              bg="transparent"
              _text={{ color: 'primary.500', fontWeight: 'semibold' }}
              onPress={() => setShowDatePicker(true)}
              leftIcon={<Icon as={Ionicons} name="calendar" size="sm" />}
            >
              {birthDate.toLocaleDateString()}
            </Button>

            {age > 0 && (
              <Box
                bg={age >= 13 ? 'green.500' : 'red.500'}
                borderRadius="md"
                p={3}
                alignItems="center"
              >
                <NBText color="white" fontWeight="semibold">
                  Age: {age} years old
                </NBText>
                <NBText color="white" fontSize="sm">
                  {age >= 13 ? 'You can continue!' : 'Must be 13 or older'}
                </NBText>
              </Box>
            )}
          </VStack>
        </Box>

        {/* Continue Button */}
        <Button
          size="lg"
          bg="primary.500"
          _pressed={{ bg: 'primary.600' }}
          width="100%"
          maxWidth={400}
          onPress={handleContinue}
          isDisabled={age < 13}
          _disabled={{ bg: 'gray.500' }}
        >
          <HStack alignItems="center" space={2}>
            <Icon as={Ionicons} name="arrow-forward" size="sm" color="white" />
            <NBText color="white" fontWeight="semibold">
              Continue
            </NBText>
          </HStack>
        </Button>

        {/* Privacy Notice */}
        <Box mt={8} px={4}>
          <NBText fontSize="sm" color="text.tertiary" textAlign="center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            We collect your age to ensure compliance with our platform guidelines.
          </NBText>
        </Box>
      </VStack>

      {showDatePicker && (
        <DateTimePicker
          value={birthDate}
          mode="date"
          display="spinner"
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </Box>
  );
};

export default AgeGateScreen;
