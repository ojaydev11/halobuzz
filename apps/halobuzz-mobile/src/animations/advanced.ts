/**
 * Advanced Animations Module
 * Premium animations for high-end devices
 */

import { Animated, Easing } from 'react-native';

/**
 * Advanced spring animation configuration
 */
export const advancedSpringConfig = {
  damping: 20,
  stiffness: 100,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
  useNativeDriver: true
};

/**
 * Smooth timing animation configuration
 */
export const smoothTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.4, 0, 0.2, 1),
  useNativeDriver: true
};

/**
 * Bounce animation configuration
 */
export const bounceConfig = {
  duration: 600,
  easing: Easing.bounce,
  useNativeDriver: true
};

/**
 * Elastic animation configuration
 */
export const elasticConfig = {
  duration: 800,
  easing: Easing.elastic(1),
  useNativeDriver: true
};

/**
 * Create a fade-in animation
 */
export const createFadeIn = (
  animatedValue: Animated.Value,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: Easing.ease,
    useNativeDriver: true
  });
};

/**
 * Create a fade-out animation
 */
export const createFadeOut = (
  animatedValue: Animated.Value,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Easing.ease,
    useNativeDriver: true
  });
};

/**
 * Create a scale animation
 */
export const createScale = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    ...advancedSpringConfig
  });
};

/**
 * Create a slide animation
 */
export const createSlide = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true
  });
};

/**
 * Create a pulse animation (loop)
 */
export const createPulse = (
  animatedValue: Animated.Value,
  minScale: number = 0.95,
  maxScale: number = 1.05,
  duration: number = 1000
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(animatedValue, {
        toValue: minScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ])
  );
};

/**
 * Create a rotation animation
 */
export const createRotation = (
  animatedValue: Animated.Value,
  duration: number = 1000,
  loop: boolean = false
): Animated.CompositeAnimation => {
  const animation = Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: Easing.linear,
    useNativeDriver: true
  });

  return loop ? Animated.loop(animation) : animation;
};

/**
 * Create a shake animation
 */
export const createShake = (
  animatedValue: Animated.Value,
  intensity: number = 10
): Animated.CompositeAnimation => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: 100,
      useNativeDriver: true
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: 100,
      useNativeDriver: true
    }),
    Animated.timing(animatedValue, {
      toValue: intensity / 2,
      duration: 100,
      useNativeDriver: true
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity / 2,
      duration: 100,
      useNativeDriver: true
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true
    })
  ]);
};

/**
 * Create a parallax animation
 */
export const createParallax = (
  animatedValue: Animated.Value,
  scrollY: Animated.Value,
  speed: number = 0.5
): Animated.AnimatedInterpolation<number> => {
  return scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, speed]
  });
};

/**
 * Create a stagger animation for multiple elements
 */
export const createStagger = (
  animations: Animated.CompositeAnimation[],
  staggerDelay: number = 100
): Animated.CompositeAnimation => {
  return Animated.stagger(staggerDelay, animations);
};

/**
 * Create a complex card flip animation
 */
export const createCardFlip = (
  animatedValue: Animated.Value,
  duration: number = 600
): {
  start: () => void;
  frontInterpolate: Animated.AnimatedInterpolation<string>;
  backInterpolate: Animated.AnimatedInterpolation<string>;
} => {
  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg']
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg']
  });

  const start = () => {
    Animated.timing(animatedValue, {
      toValue: 180,
      duration,
      easing: Easing.linear,
      useNativeDriver: true
    }).start();
  };

  return {
    start,
    frontInterpolate,
    backInterpolate
  };
};

/**
 * Create a wave animation for multiple items
 */
export const createWave = (
  items: number,
  animatedValue: Animated.Value,
  duration: number = 1000
): Animated.CompositeAnimation[] => {
  return Array.from({ length: items }, (_, index) => {
    const delay = (index * duration) / items;
    return Animated.sequence([
      Animated.delay(delay),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing: Easing.sin,
        useNativeDriver: true
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: duration / 2,
        easing: Easing.sin,
        useNativeDriver: true
      })
    ]);
  });
};

/**
 * Preload animation assets
 */
export const preloadAnimations = async (): Promise<void> => {
  console.log('[AdvancedAnimations] Preloading animation assets...');
  // Preload any animation-related assets here
  return Promise.resolve();
};

/**
 * Animation utilities
 */
export const AnimationUtils = {
  /**
   * Interpolate color values
   */
  interpolateColor: (
    animatedValue: Animated.Value,
    inputRange: number[],
    outputRange: string[]
  ): Animated.AnimatedInterpolation<string | number> => {
    return animatedValue.interpolate({
      inputRange,
      outputRange
    });
  },

  /**
   * Create delay
   */
  delay: (duration: number): Animated.CompositeAnimation => {
    return Animated.delay(duration);
  },

  /**
   * Create parallel animations
   */
  parallel: (
    animations: Animated.CompositeAnimation[],
    config?: Animated.ParallelConfig
  ): Animated.CompositeAnimation => {
    return Animated.parallel(animations, config);
  },

  /**
   * Create sequence animations
   */
  sequence: (
    animations: Animated.CompositeAnimation[]
  ): Animated.CompositeAnimation => {
    return Animated.sequence(animations);
  }
};

export default {
  createFadeIn,
  createFadeOut,
  createScale,
  createSlide,
  createPulse,
  createRotation,
  createShake,
  createParallax,
  createStagger,
  createCardFlip,
  createWave,
  preloadAnimations,
  AnimationUtils,
  advancedSpringConfig,
  smoothTimingConfig,
  bounceConfig,
  elasticConfig
};






