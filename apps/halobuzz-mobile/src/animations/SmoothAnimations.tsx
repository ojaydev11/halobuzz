import React from 'react';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDecay,
  runOnUI,
  interpolate,
  Extrapolation,
  AnimationCallback,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  PanGestureHandler,
} from 'react-native-gesture-handler';

// Animation configuration presets optimized for 60/120fps
export const AnimationPresets = {
  // Lightning fast for micro-interactions (button press, etc.)
  instant: {
    duration: 50,
    easing: 'linear' as const,
  },

  // Quick feedback animations
  quick: {
    duration: 150,
    easing: 'ease-out' as const,
  },

  // Standard UI transitions
  smooth: {
    duration: 250,
    easing: 'ease-in-out' as const,
  },

  // Bouncy interactions
  bouncy: {
    damping: 15,
    stiffness: 400,
    mass: 0.8,
  },

  // Gentle spring for large movements
  gentle: {
    damping: 20,
    stiffness: 300,
    mass: 1,
  },

  // High-performance spring (minimal computation)
  performant: {
    damping: 25,
    stiffness: 500,
    mass: 0.6,
  },
} as const;

// Frame-budget aware animation timing
export const createTimingConfig = (
  targetFPS: 60 | 120 = 60,
  duration: number = 250
) => {
  const frameBudget = 1000 / targetFPS; // ms per frame
  const totalFrames = Math.ceil(duration / frameBudget);

  return {
    duration,
    // Ensure animations complete on frame boundaries
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' as const,
    // Reduce computation for high frame rates
    reducedMotion: targetFPS > 60 ? 0.7 : 1.0,
  };
};

// Optimized spring configuration
export const createSpringConfig = (
  stiffness: number = 400,
  damping: number = 15,
  mass: number = 1
) => {
  // Calculate overdamped vs underdamped for optimal performance
  const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));

  return {
    stiffness,
    damping,
    mass,
    // Optimize for performance on low-end devices
    restSpeedThreshold: dampingRatio > 1 ? 0.01 : 0.001,
    restDisplacementThreshold: dampingRatio > 1 ? 0.01 : 0.001,
  };
};

// High-performance fade animation
export const FadeInOut: React.FC<{
  children: React.ReactNode;
  visible: boolean;
  duration?: number;
  delay?: number;
  onComplete?: () => void;
}> = ({ children, visible, duration = 250, delay = 0, onComplete }) => {
  const opacity = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    opacity.value = withTiming(
      visible ? 1 : 0,
      {
        duration,
        easing: 'ease-in-out',
      },
      (finished) => {
        'worklet';
        if (finished && onComplete) {
          runOnUI(() => {
            onComplete();
          })();
        }
      }
    );
  }, [visible, duration, opacity, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    // Optimize for native driver
    transform: [{ scale: interpolate(opacity.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) }],
  }), []);

  return (
    <Animated.View style={animatedStyle} pointerEvents={visible ? 'auto' : 'none'}>
      {children}
    </Animated.View>
  );
};

// Optimized slide animation with gesture support
export const SlideTransition: React.FC<{
  children: React.ReactNode;
  visible: boolean;
  direction: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  enableGesture?: boolean;
  onSwipe?: (direction: string) => void;
}> = ({
  children,
  visible,
  direction,
  distance = 100,
  enableGesture = false,
  onSwipe,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Initialize position based on direction
  React.useEffect(() => {
    const targetX = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
    const targetY = direction === 'up' ? -distance : direction === 'down' ? distance : 0;

    translateX.value = visible ? 0 : targetX;
    translateY.value = visible ? 0 : targetY;

    // Animate to final position
    translateX.value = withSpring(visible ? 0 : targetX, AnimationPresets.performant);
    translateY.value = withSpring(visible ? 0 : targetY, AnimationPresets.performant);
  }, [visible, direction, distance]);

  // Pan gesture for interactive dismissal
  const panGesture = Gesture.Pan()
    .enabled(enableGesture)
    .onUpdate((event) => {
      'worklet';
      if (direction === 'left' || direction === 'right') {
        translateX.value = event.translationX;
      } else {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      const isHorizontal = direction === 'left' || direction === 'right';
      const translation = isHorizontal ? event.translationX : event.translationY;
      const velocity = isHorizontal ? event.velocityX : event.velocityY;

      // Determine if gesture should trigger dismissal
      const threshold = distance * 0.3;
      const shouldDismiss = Math.abs(translation) > threshold || Math.abs(velocity) > 500;

      if (shouldDismiss && onSwipe) {
        // Animate out with decay
        if (isHorizontal) {
          translateX.value = withDecay({ velocity: velocity, deceleration: 0.998 });
        } else {
          translateY.value = withDecay({ velocity: velocity, deceleration: 0.998 });
        }

        runOnUI(() => {
          onSwipe(direction);
        })();
      } else {
        // Spring back to original position
        translateX.value = withSpring(0, AnimationPresets.bouncy);
        translateY.value = withSpring(0, AnimationPresets.bouncy);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }), []);

  const content = (
    <Animated.View style={[animatedStyle, { flex: 1 }]}>
      {children}
    </Animated.View>
  );

  return enableGesture ? (
    <GestureDetector gesture={panGesture}>
      {content}
    </GestureDetector>
  ) : content;
};

// Optimized scale animation with press feedback
export const ScaleButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  scale?: number;
  duration?: number;
  disabled?: boolean;
  style?: any;
}> = ({
  children,
  onPress,
  scale = 0.95,
  duration = 100,
  disabled = false,
  style,
}) => {
  const scaleValue = useSharedValue(1);
  const opacity = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onTouchesDown(() => {
      'worklet';
      scaleValue.value = withTiming(scale, { duration: duration / 2 });
      opacity.value = withTiming(0.8, { duration: duration / 2 });
    })
    .onTouchesUp(() => {
      'worklet';
      scaleValue.value = withSpring(1, AnimationPresets.bouncy);
      opacity.value = withTiming(1, { duration });
    })
    .onEnd(() => {
      'worklet';
      if (onPress) {
        runOnUI(() => {
          onPress();
        })();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacity.value,
  }), []);

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// High-performance list item animation
export const ListItemAnimation: React.FC<{
  children: React.ReactNode;
  index: number;
  staggerDelay?: number;
  animationType: 'fade' | 'slide' | 'scale';
}> = ({ children, index, staggerDelay = 50, animationType }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    const delay = index * staggerDelay;

    // Staggered entrance animation
    opacity.value = withTiming(1, {
      duration: 300,
      easing: 'ease-out',
    });

    if (animationType === 'slide' || animationType === 'fade') {
      translateY.value = withTiming(0, {
        duration: 400,
        easing: 'ease-out',
      });
    }

    if (animationType === 'scale' || animationType === 'fade') {
      scale.value = withSpring(1, {
        ...AnimationPresets.gentle,
        // Add slight delay for scale to create cascading effect
        // delay: delay * 0.5,
      });
    }
  }, [index, staggerDelay, animationType]);

  const animatedStyle = useAnimatedStyle(() => {
    const style: any = { opacity: opacity.value };

    if (animationType === 'slide' || animationType === 'fade') {
      style.transform = [{ translateY: translateY.value }];
    }

    if (animationType === 'scale') {
      style.transform = [{ scale: scale.value }];
    }

    if (animationType === 'fade' && (translateY.value !== 0 || scale.value !== 1)) {
      style.transform = [
        { translateY: translateY.value },
        { scale: scale.value },
      ];
    }

    return style;
  }, [animationType]);

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// Optimized scroll-driven animations
export const useScrollAnimation = (scrollY: Animated.SharedValue<number>) => {
  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }), []);

  const headerTranslate = useAnimatedStyle(() => ({
    transform: [{
      translateY: interpolate(
        scrollY.value,
        [0, 100],
        [0, -50],
        Extrapolation.CLAMP
      ),
    }],
  }), []);

  const backgroundScale = useAnimatedStyle(() => ({
    transform: [{
      scale: interpolate(
        scrollY.value,
        [0, 200],
        [1, 1.2],
        Extrapolation.CLAMP
      ),
    }],
  }), []);

  return {
    headerOpacity,
    headerTranslate,
    backgroundScale,
  };
};

// Performance monitoring for animations
export const AnimationPerformanceMonitor = {
  startTracking: (animationName: string) => {
    if (__DEV__) {
      console.time(`Animation_${animationName}`);
    }
  },

  endTracking: (animationName: string) => {
    if (__DEV__) {
      console.timeEnd(`Animation_${animationName}`);
    }
  },

  // Monitor frame drops during animations
  monitorFrameRate: (callback: (fps: number) => void) => {
    let frameCount = 0;
    let lastTime = Date.now();

    const monitor = () => {
      frameCount++;
      const currentTime = Date.now();

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        callback(fps);

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(monitor);
    };

    requestAnimationFrame(monitor);
  },
};

// Export utility functions
export const AnimationUtils = {
  // Reduce motion for accessibility
  respectsReducedMotion: () => {
    if (Platform.OS === 'web') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    // On mobile, check system settings (would need native module)
    return false;
  },

  // Optimize animation for device capabilities
  optimizeForDevice: (baseConfig: any) => {
    const isLowEnd = Platform.OS === 'android'; // Simplified check

    if (isLowEnd) {
      return {
        ...baseConfig,
        duration: Math.min(baseConfig.duration * 0.7, 200),
        easing: 'linear',
      };
    }

    return baseConfig;
  },

  // Calculate spring physics for optimal performance
  calculateSpringPhysics: (distance: number, targetDuration: number) => {
    // Approximate spring values for desired duration
    const stiffness = Math.max(100, Math.min(1000, (distance * 4) / targetDuration));
    const damping = Math.sqrt(stiffness) * 2 * 0.7; // ~70% damping ratio

    return { stiffness, damping, mass: 1 };
  },
};