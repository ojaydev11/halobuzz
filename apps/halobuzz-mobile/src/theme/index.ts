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

// Shadow presets
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;
