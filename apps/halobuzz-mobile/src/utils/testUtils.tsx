import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/store/AuthContext';

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SafeAreaProvider>
    <AuthProvider>
      {children}
    </AuthProvider>
  </SafeAreaProvider>
);

export const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
