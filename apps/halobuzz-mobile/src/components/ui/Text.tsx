import React from 'react';
import { Text as RNText, StyleSheet, TextStyle } from 'react-native';
import { textStyles, TextVariant } from '@/theme/components';

interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  style?: TextStyle;
  numberOfLines?: number;
  onPress?: () => void;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  style,
  numberOfLines,
  onPress,
}) => {
  const textStyle = [
    textStyles[variant],
    style,
  ];

  return (
    <RNText
      style={textStyle}
      numberOfLines={numberOfLines}
      onPress={onPress}
    >
      {children}
    </RNText>
  );
};

export default Text;
