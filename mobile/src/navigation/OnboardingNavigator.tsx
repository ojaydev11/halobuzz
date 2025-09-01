import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { selectAgeVerified, selectCountrySelected } from '../store/slices/authSlice';

// Screens
import AgeGateScreen from '../screens/onboarding/AgeGateScreen';
import CountrySelectionScreen from '../screens/onboarding/CountrySelectionScreen';
import LoginScreen from '../screens/onboarding/LoginScreen';
import RegisterScreen from '../screens/onboarding/RegisterScreen';

export type OnboardingStackParamList = {
  AgeGate: undefined;
  CountrySelection: undefined;
  Login: undefined;
  Register: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => {
  const ageVerified = useAppSelector(selectAgeVerified);
  const countrySelected = useAppSelector(selectCountrySelected);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      {!ageVerified ? (
        <Stack.Screen name="AgeGate" component={AgeGateScreen} />
      ) : !countrySelected ? (
        <Stack.Screen name="CountrySelection" component={CountrySelectionScreen} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
