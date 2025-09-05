export const spacing = (n: number) => 4 * n;

export const spacingValues = {
  xs: spacing(1),   // 4px
  sm: spacing(2),   // 8px
  md: spacing(3),   // 12px
  lg: spacing(4),   // 16px
  xl: spacing(6),   // 24px
  '2xl': spacing(8), // 32px
  '3xl': spacing(12), // 48px
  '4xl': spacing(16), // 64px
} as const;

export type SpacingKey = keyof typeof spacingValues;
