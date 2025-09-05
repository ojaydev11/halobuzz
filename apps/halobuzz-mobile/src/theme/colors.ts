export const colors = {
  // Base colors
  bg: '#0B0B10',
  card: '#14141B',
  surface: '#1A1A23',
  
  // Text colors
  text: '#EDEDF2',
  sub: '#9A9AAF',
  muted: '#6B6B7A',
  
  // Accent colors (single accent as specified)
  accent: '#8E7CFF',
  accentLight: '#A594FF',
  accentDark: '#7A6BCC',
  
  // Status colors
  live: '#FF4D6D',
  success: '#21C07A',
  warning: '#FFB800',
  error: '#FF4757',
  
  // Interactive states
  pressed: 'rgba(142, 124, 255, 0.1)',
  hover: 'rgba(142, 124, 255, 0.05)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  backdrop: 'rgba(0, 0, 0, 0.8)',
  
  // Gradients
  gradientStart: '#8E7CFF',
  gradientEnd: '#A594FF',
  
  // System colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
