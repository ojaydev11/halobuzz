import React from 'react';
import { View } from 'react-native';
import { render, RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Mock AuthProvider for testing
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View testID="mock-auth-provider">{children}</View>;
};

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <MockAuthProvider>
        {children}
      </MockAuthProvider>
    </SafeAreaProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };

