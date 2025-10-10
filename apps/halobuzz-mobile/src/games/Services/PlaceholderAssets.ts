/**
 * Placeholder Asset Generator using Skia
 * Generates temporary assets until final art is ready
 */

import { Skia, Canvas, Circle, Rect, LinearGradient, vec } from '@shopify/react-native-skia';

export interface PlaceholderConfig {
  width: number;
  height: number;
  colors: string[];
  shape?: 'rect' | 'circle';
}

/**
 * Generate placeholder cover images as Skia components
 */
export const SkiaPlaceholders = {
  coinFlipCover: {
    width: 512,
    height: 512,
    colors: ['#FFD700', '#FFA500', '#FF8C00'],
    shape: 'circle' as const,
  },
  tapDuelCover: {
    width: 512,
    height: 512,
    colors: ['#667EEA', '#764BA2'],
    shape: 'rect' as const,
  },
  buzzRunnerCover: {
    width: 512,
    height: 512,
    colors: ['#FC5C7D', '#6A82FB'],
    shape: 'rect' as const,
  },
  triviaRoyaleCover: {
    width: 512,
    height: 512,
    colors: ['#FA8BFF', '#2BD2FF', '#2BFF88'],
    shape: 'rect' as const,
  },
  stackStormCover: {
    width: 512,
    height: 512,
    colors: ['#FDC830', '#F37335'],
    shape: 'rect' as const,
  },
  buzzArenaCover: {
    width: 512,
    height: 512,
    colors: ['#FF416C', '#FF4B2B'],
    shape: 'rect' as const,
  },
};

/**
 * Fallback for missing images - use Skia rendering
 */
export const getPlaceholderImage = (gameId: string) => {
  const placeholderMap: Record<string, PlaceholderConfig> = {
    'coin-flip-deluxe': SkiaPlaceholders.coinFlipCover,
    'tap-duel': SkiaPlaceholders.tapDuelCover,
    'buzz-runner': SkiaPlaceholders.buzzRunnerCover,
    'trivia-royale': SkiaPlaceholders.triviaRoyaleCover,
    'stack-storm': SkiaPlaceholders.stackStormCover,
    'buzz-arena': SkiaPlaceholders.buzzArenaCover,
  };

  return placeholderMap[gameId] || SkiaPlaceholders.coinFlipCover;
};

/**
 * Skia-based cover image component
 */
export function SkiaCoverPlaceholder({ config }: { config: PlaceholderConfig }) {
  const { width, height, colors, shape } = config;

  return (
    <Canvas style={{ width, height }}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={colors}
        />
      </Rect>
      {shape === 'circle' && (
        <Circle cx={width / 2} cy={height / 2} r={width / 3} color="rgba(255,255,255,0.3)" />
      )}
    </Canvas>
  );
}

/**
 * Silent audio placeholder
 * Returns null - AudioManager will handle gracefully
 */
export const getPlaceholderSound = (gameId: string, soundKey: string) => {
  console.warn(`Using placeholder for sound: ${gameId}:${soundKey}`);
  return null; // AudioManager will skip playback
};

