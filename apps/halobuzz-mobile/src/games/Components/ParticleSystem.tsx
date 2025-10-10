/**
 * Skia-based Particle System
 * Optimized for 60 FPS performance
 */

import React, { useEffect } from 'react';
import { Canvas, Circle, Group, useValue, runTiming, Easing } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withTiming, withRepeat, withSequence } from 'react-native-reanimated';

export type ParticleType = 'trail' | 'explosion' | 'confetti' | 'landing' | 'sparkle' | 'smoke';

export interface ParticleConfig {
  type: ParticleType;
  x: number;
  y: number;
  count?: number;
  color?: string;
  colors?: string[];
  size?: number;
  duration?: number;
  velocity?: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export function ParticleSystem({ config, onComplete }: { config: ParticleConfig; onComplete?: () => void }) {
  const { type, x, y, count = 20, color = '#FFD700', colors, size = 8, duration = 1000, velocity = 5 } = config;

  const particles = React.useMemo(() => {
    const particleArray: Particle[] = [];
    const particleColors = colors || [color];

    for (let i = 0; i < count; i++) {
      const angle = type === 'explosion' 
        ? (Math.PI * 2 * i) / count 
        : Math.random() * Math.PI * 2;
      
      const speed = type === 'trail' 
        ? velocity * 0.5 
        : velocity * (0.5 + Math.random() * 0.5);

      particleArray.push({
        id: `particle-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (type === 'confetti' ? -velocity * 2 : 0),
        color: particleColors[i % particleColors.length],
        size: size * (0.7 + Math.random() * 0.6),
        life: 1,
        maxLife: duration,
      });
    }

    return particleArray;
  }, [type, x, y, count, color, colors, size, duration, velocity]);

  const animationProgress = useSharedValue(0);

  useEffect(() => {
    animationProgress.value = withTiming(1, { duration }, (finished) => {
      if (finished && onComplete) {
        onComplete();
      }
    });
  }, [duration, onComplete]);

  return (
    <Canvas style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Group>
        {particles.map((particle) => {
          const progress = animationProgress;
          
          // Calculate particle position based on physics
          const particleX = useDerivedValue(() => {
            const t = progress.value;
            return particle.x + particle.vx * t * 100;
          });

          const particleY = useDerivedValue(() => {
            const t = progress.value;
            const gravity = type === 'confetti' || type === 'explosion' ? 9.8 : 0;
            return particle.y + particle.vy * t * 100 + 0.5 * gravity * t * t * 100;
          });

          const opacity = useDerivedValue(() => {
            const t = progress.value;
            return Math.max(0, 1 - t);
          });

          const particleSize = useDerivedValue(() => {
            const t = progress.value;
            if (type === 'sparkle') {
              // Pulsating effect
              return particle.size * (1 + Math.sin(t * Math.PI * 4) * 0.3);
            }
            return particle.size * (1 - t * 0.5);
          });

          return (
            <Circle
              key={particle.id}
              cx={particleX}
              cy={particleY}
              r={particleSize}
              color={particle.color}
              opacity={opacity}
            />
          );
        })}
      </Group>
    </Canvas>
  );
}

/**
 * Trail Particles - Follow moving object
 */
export function TrailParticles({ x, y, color = '#FFD700', active = true }: { x: number; y: number; color?: string; active?: boolean }) {
  if (!active) return null;

  return (
    <ParticleSystem
      config={{
        type: 'trail',
        x,
        y,
        count: 5,
        color,
        size: 6,
        duration: 500,
        velocity: 2,
      }}
    />
  );
}

/**
 * Explosion Particles - Burst outward
 */
export function ExplosionParticles({ x, y, colors, onComplete }: { x: number; y: number; colors?: string[]; onComplete?: () => void }) {
  return (
    <ParticleSystem
      config={{
        type: 'explosion',
        x,
        y,
        count: 30,
        colors: colors || ['#FF6B6B', '#FFD93D', '#6BCB77'],
        size: 8,
        duration: 800,
        velocity: 8,
      }}
      onComplete={onComplete}
    />
  );
}

/**
 * Confetti Particles - Celebratory shower
 */
export function ConfettiParticles({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  return (
    <ParticleSystem
      config={{
        type: 'confetti',
        x,
        y,
        count: 50,
        colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
        size: 10,
        duration: 2000,
        velocity: 6,
      }}
      onComplete={onComplete}
    />
  );
}

/**
 * Landing Particles - Impact effect
 */
export function LandingParticles({ x, y, color = '#FFFFFF', onComplete }: { x: number; y: number; color?: string; onComplete?: () => void }) {
  return (
    <ParticleSystem
      config={{
        type: 'landing',
        x,
        y,
        count: 15,
        color,
        size: 6,
        duration: 600,
        velocity: 5,
      }}
      onComplete={onComplete}
    />
  );
}

/**
 * Sparkle Particles - Magical twinkle
 */
export function SparkleParticles({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  return (
    <ParticleSystem
      config={{
        type: 'sparkle',
        x,
        y,
        count: 12,
        colors: ['#FFD700', '#FFA500', '#FFFFFF'],
        size: 8,
        duration: 1000,
        velocity: 3,
      }}
      onComplete={onComplete}
    />
  );
}

/**
 * Smoke Particles - Dissipating cloud
 */
export function SmokeParticles({ x, y, onComplete }: { x: number; y: number; onComplete?: () => void }) {
  return (
    <ParticleSystem
      config={{
        type: 'smoke',
        x,
        y,
        count: 20,
        colors: ['#666666', '#999999', '#AAAAAA'],
        size: 15,
        duration: 1500,
        velocity: 1,
      }}
      onComplete={onComplete}
    />
  );
}

