/**
 * Particle Effects for Coin Flip
 * Using Skia for high-performance 2D particles
 */

import React, { useEffect, useMemo } from 'react';
import { Canvas, Circle, Group, useValue, runTiming, Easing } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

interface ParticleEffectsProps {
  type: 'trail' | 'landing' | 'win' | 'loss' | null;
  coinPosition?: { x: number; y: number };
}

export function ParticleEffects({ type, coinPosition }: ParticleEffectsProps) {
  const particles = useMemo(() => {
    if (!type || !coinPosition) return [];

    switch (type) {
      case 'trail':
        // Gold sparkles trailing the coin
        return generateTrailParticles(coinPosition);
      case 'landing':
        // Dust cloud on impact
        return generateLandingParticles(coinPosition);
      case 'win':
        // Confetti explosion
        return generateConfetti(coinPosition);
      case 'loss':
        // Sad particles
        return generateLossParticles(coinPosition);
      default:
        return [];
    }
  }, [type, coinPosition]);

  if (!type || particles.length === 0) return null;

  return (
    <Canvas style={{ position: 'absolute', width, height, pointerEvents: 'none' }}>
      <Group>
        {particles.map(particle => (
          <AnimatedParticle key={particle.id} particle={particle} />
        ))}
      </Group>
    </Canvas>
  );
}

function AnimatedParticle({ particle }: { particle: Particle }) {
  const x = useValue(particle.x);
  const y = useValue(particle.y);
  const opacity = useValue(1);
  const size = useValue(particle.size);

  useEffect(() => {
    // Animate particle movement
    runTiming(x, particle.x + particle.vx * 60, {
      duration: particle.life,
      easing: Easing.out(Easing.quad),
    });

    runTiming(y, particle.y + particle.vy * 60, {
      duration: particle.life,
      easing: Easing.in(Easing.quad),
    });

    // Fade out
    runTiming(opacity, 0, {
      duration: particle.life,
      easing: Easing.out(Easing.quad),
    });

    // Shrink
    runTiming(size, 0, {
      duration: particle.life,
      easing: Easing.in(Easing.quad),
    });
  }, []);

  return (
    <Circle
      cx={x}
      cy={y}
      r={size}
      color={particle.color}
      opacity={opacity}
    />
  );
}

function generateTrailParticles(position: { x: number; y: number }): Particle[] {
  const particles: Particle[] = [];
  const particleCount = 8;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      id: Math.random(),
      x: position.x + (Math.random() - 0.5) * 40,
      y: position.y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 2 + 1,
      size: Math.random() * 4 + 2,
      color: `rgba(255, 215, 0, ${Math.random() * 0.5 + 0.5})`, // Gold
      life: 800,
    });
  }

  return particles;
}

function generateLandingParticles(position: { x: number; y: number }): Particle[] {
  const particles: Particle[] = [];
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI / particleCount) * i;
    const speed = Math.random() * 3 + 2;

    particles.push({
      id: Math.random(),
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: -Math.abs(Math.sin(angle)) * speed * 0.5,
      size: Math.random() * 6 + 3,
      color: `rgba(139, 139, 139, ${Math.random() * 0.4 + 0.3})`, // Gray dust
      life: 600,
    });
  }

  return particles;
}

function generateConfetti(position: { x: number; y: number }): Particle[] {
  const particles: Particle[] = [];
  const particleCount = 40;
  const colors = [
    'rgba(255, 215, 0, 0.9)',    // Gold
    'rgba(255, 165, 0, 0.9)',    // Orange
    'rgba(16, 185, 129, 0.9)',   // Green
    'rgba(59, 130, 246, 0.9)',   // Blue
    'rgba(236, 72, 153, 0.9)',   // Pink
  ];

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 / particleCount) * i;
    const speed = Math.random() * 5 + 3;

    particles.push({
      id: Math.random(),
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2, // Initial upward bias
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1200,
    });
  }

  return particles;
}

function generateLossParticles(position: { x: number; y: number }): Particle[] {
  const particles: Particle[] = [];
  const particleCount = 15;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      id: Math.random(),
      x: position.x + (Math.random() - 0.5) * 60,
      y: position.y - Math.random() * 40,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2 + 2, // Downward
      size: Math.random() * 6 + 3,
      color: `rgba(239, 68, 68, ${Math.random() * 0.4 + 0.4})`, // Red/sad
      life: 1000,
    });
  }

  return particles;
}

export default ParticleEffects;
