export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

export type RadiiKey = keyof typeof radii;
