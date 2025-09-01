import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text as NBText,
  Input,
  Button,
  Icon,
  useColorModeValue,
  Pressable,
  Divider,
  Link,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { login, selectAuthLoading, selectAuthError } from '../../store/slices/authSlice';

type LoginNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const cardBackground = useColorModeValue('background.secondary', 'background.secondary');
  const textColor = useColorModeValue('text.primary', 'text.primary');
  const inputBackground = useColorModeValue('background.tertiary', 'background.tertiary');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
    } catch (error) {
      // Error is handled by the Redux slice
    }
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Password reset functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Box flex={1} bg={backgroundColor} safeArea>
        <VStack flex={1} justifyContent="center" px={8}>
          {/* Header */}
          <VStack alignItems="center" mb={12}>
            <Icon
              as={Ionicons}
              name="log-in"
              size="6xl"
              color="primary.500"
              mb={4}
            />
            <NBText fontSize="3xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
              Welcome Back
            </NBText>
            <NBText fontSize="lg" color="text.secondary" textAlign="center">
              Sign in to continue to HaloBuzz
            </NBText>
          </VStack>

          {/* Login Form */}
          <VStack space={4} mb={8}>
            <VStack space={2}>
              <NBText color={textColor} fontWeight="semibold" fontSize="md">
                Email
              </NBText>
              <Input
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                bg={inputBackground}
                borderColor="background.tertiary"
                _focus={{ borderColor: 'primary.500' }}
                color={textColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                InputLeftElement={
                  <Icon
                    as={Ionicons}
                    name="mail"
                    size="sm"
                    color="text.secondary"
                    ml={3}
                  />
                }
              />
            </VStack>

            <VStack space={2}>
              <NBText color={textColor} fontWeight="semibold" fontSize="md">
                Password
              </NBText>
              <Input
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                bg={inputBackground}
                borderColor="background.tertiary"
                _focus={{ borderColor: 'primary.500' }}
                color={textColor}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                InputLeftElement={
                  <Icon
                    as={Ionicons}
                    name="lock-closed"
                    size="sm"
                    color="text.secondary"
                    ml={3}
                  />
                }
                InputRightElement={
                  <Pressable onPress={() => setShowPassword(!showPassword)} mr={3}>
                    <Icon
                      as={Ionicons}
                      name={showPassword ? "eye-off" : "eye"}
                      size="sm"
                      color="text.secondary"
                    />
                  </Pressable>
                }
              />
            </VStack>

            {/* Error Message */}
            {error && (
              <Box
                bg="red.500"
                p={3}
                borderRadius="md"
                alignItems="center"
              >
                <NBText color="white" fontSize="sm" textAlign="center">
                  {error}
                </NBText>
              </Box>
            )}

            {/* Forgot Password */}
            <Box alignItems="flex-end">
              <Pressable onPress={handleForgotPassword}>
                <NBText color="primary.500" fontSize="sm" fontWeight="semibold">
                  Forgot Password?
                </NBText>
              </Pressable>
            </Box>
          </VStack>

          {/* Login Button */}
          <Button
            size="lg"
            bg="primary.500"
            _pressed={{ bg: 'primary.600' }}
            onPress={handleLogin}
            isLoading={loading}
            isDisabled={loading || !email.trim() || !password.trim()}
            mb={6}
          >
            <HStack alignItems="center" space={2}>
              <Icon as={Ionicons} name="log-in" size="sm" color="white" />
              <NBText color="white" fontWeight="semibold">
                Sign In
              </NBText>
            </HStack>
          </Button>

          {/* Divider */}
          <HStack alignItems="center" space={3} mb={6}>
            <Divider flex={1} bg="background.tertiary" />
            <NBText color="text.secondary" fontSize="sm">
              OR
            </NBText>
            <Divider flex={1} bg="background.tertiary" />
          </HStack>

          {/* Social Login Buttons */}
          <VStack space={3} mb={8}>
            <Button
              variant="outline"
              borderColor="background.tertiary"
              bg="transparent"
              _text={{ color: textColor }}
              leftIcon={<Icon as={Ionicons} name="logo-google" size="sm" />}
            >
              Continue with Google
            </Button>
            
            <Button
              variant="outline"
              borderColor="background.tertiary"
              bg="transparent"
              _text={{ color: textColor }}
              leftIcon={<Icon as={Ionicons} name="logo-apple" size="sm" />}
            >
              Continue with Apple
            </Button>
          </VStack>

          {/* Register Link */}
          <HStack justifyContent="center" space={1}>
            <NBText color="text.secondary" fontSize="md">
              Don't have an account?
            </NBText>
            <Pressable onPress={handleRegister}>
              <NBText color="primary.500" fontSize="md" fontWeight="semibold">
                Sign Up
              </NBText>
            </Pressable>
          </HStack>
        </VStack>
      </Box>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
