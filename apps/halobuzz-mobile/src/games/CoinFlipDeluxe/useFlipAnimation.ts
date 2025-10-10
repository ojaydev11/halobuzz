/**
 * Custom hook for coin flip animation and FPS tracking
 */

import { useEffect, useRef, useState } from 'react';

export interface FlipAnimationState {
  isFlipping: boolean;
  flipProgress: number;
  result: 'heads' | 'tails' | null;
}

export interface FPSMetrics {
  avgFPS: number;
  minFPS: number;
  maxFPS: number;
  p95FPS: number;
}

export function useFlipAnimation() {
  const [animationState, setAnimationState] = useState<FlipAnimationState>({
    isFlipping: false,
    flipProgress: 0,
    result: null,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(Date.now());
  const fpsHistory = useRef<number[]>([]);
  const animationFrame = useRef<number | null>(null);

  // FPS tracking
  useEffect(() => {
    const trackFPS = () => {
      const now = Date.now();
      const delta = now - lastTime.current;

      if (delta > 0) {
        const fps = 1000 / delta;
        fpsHistory.current.push(fps);

        // Keep only last 300 frames (~5 seconds at 60fps)
        if (fpsHistory.current.length > 300) {
          fpsHistory.current.shift();
        }
      }

      lastTime.current = now;
      frameCount.current++;

      if (animationState.isFlipping) {
        animationFrame.current = requestAnimationFrame(trackFPS);
      }
    };

    if (animationState.isFlipping) {
      animationFrame.current = requestAnimationFrame(trackFPS);
    }

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [animationState.isFlipping]);

  const getFPSMetrics = (): FPSMetrics => {
    if (fpsHistory.current.length === 0) {
      return { avgFPS: 60, minFPS: 60, maxFPS: 60, p95FPS: 60 };
    }

    const sorted = [...fpsHistory.current].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      avgFPS: Math.round(sum / sorted.length),
      minFPS: Math.round(sorted[0]),
      maxFPS: Math.round(sorted[sorted.length - 1]),
      p95FPS: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
    };
  };

  const startFlip = (targetSide: 'heads' | 'tails') => {
    setAnimationState({
      isFlipping: true,
      flipProgress: 0,
      result: targetSide,
    });

    // Reset FPS tracking
    frameCount.current = 0;
    fpsHistory.current = [];
  };

  const resetFlip = () => {
    setAnimationState({
      isFlipping: false,
      flipProgress: 0,
      result: null,
    });
  };

  return {
    animationState,
    startFlip,
    resetFlip,
    getFPSMetrics,
  };
}
