export { colors } from './colors';
export { spacing, spacingValues, default as spacingObj } from './spacing';
export { typography } from './typography';
export { radii } from './radii';
export { shadows } from './shadows';
// Components are exported separately to avoid circular dependencies

// Animation durations (150-250ms as specified)
export const animations = {
  fast: 150,
  normal: 200,
  slow: 250,
} as const;

// Layout styles
export const layoutStyles = {
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
} as const;
