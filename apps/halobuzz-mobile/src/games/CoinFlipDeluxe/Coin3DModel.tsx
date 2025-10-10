/**
 * 3D Coin Model with React Three Fiber
 * Realistic coin with physics-based animations
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface Coin3DModelProps {
  isFlipping: boolean;
  result: 'heads' | 'tails' | null;
  onFlipComplete?: () => void;
  selectedSide?: 'heads' | 'tails' | null;
}

export default function Coin3DModel({
  isFlipping,
  result,
  onFlipComplete,
  selectedSide
}: Coin3DModelProps) {
  const coinRef = useRef<THREE.Group>(null);
  const flipProgress = useRef(0);
  const flipSpeed = useRef(0);
  const verticalPosition = useRef(0);
  const verticalVelocity = useRef(0);
  const targetRotation = useRef(0);
  const bounceCount = useRef(0);

  // Calculate target rotation based on result
  useMemo(() => {
    if (result) {
      // Heads: 0° or 360° (face up)
      // Tails: 180° (face down)
      const baseRotation = result === 'heads' ? 0 : Math.PI;
      // Add multiple spins for dramatic effect (5-8 full rotations)
      const fullSpins = Math.floor(Math.random() * 4) + 5;
      targetRotation.current = baseRotation + (fullSpins * Math.PI * 2);
    }
  }, [result]);

  useFrame((state, delta) => {
    if (!coinRef.current) return;

    if (isFlipping && result) {
      // Coin flip animation
      flipProgress.current += delta * 0.8; // Animation speed

      if (flipProgress.current < 1) {
        // Ascending phase (0 - 0.3)
        if (flipProgress.current < 0.3) {
          verticalVelocity.current = 5;
          flipSpeed.current = 12;
        }
        // Tumbling phase (0.3 - 0.7)
        else if (flipProgress.current < 0.7) {
          verticalVelocity.current -= 12 * delta; // Gravity
          flipSpeed.current = 10;
        }
        // Descending & landing phase (0.7 - 1.0)
        else {
          verticalVelocity.current -= 15 * delta; // Stronger gravity
          flipSpeed.current = 8;
        }

        // Update vertical position
        verticalPosition.current += verticalVelocity.current * delta;

        // Bounce on landing
        if (verticalPosition.current <= 0 && bounceCount.current < 3) {
          verticalPosition.current = 0;
          verticalVelocity.current = Math.abs(verticalVelocity.current) * 0.5; // Bounce damping
          bounceCount.current++;
          flipSpeed.current *= 0.6; // Slow rotation on bounce
        }

        // Rotation with easing
        const t = flipProgress.current;
        const easeOutCubic = 1 - Math.pow(1 - t, 3);
        coinRef.current.rotation.x = targetRotation.current * easeOutCubic;

        // Add wobble for realism
        coinRef.current.rotation.y = Math.sin(t * Math.PI * 6) * 0.3;
        coinRef.current.rotation.z = Math.cos(t * Math.PI * 4) * 0.2;

        // Position
        coinRef.current.position.y = verticalPosition.current;

      } else {
        // Animation complete
        flipProgress.current = 0;
        bounceCount.current = 0;
        verticalVelocity.current = 0;
        verticalPosition.current = 0;

        // Settle to final position
        coinRef.current.rotation.x = result === 'heads' ? 0 : Math.PI;
        coinRef.current.rotation.y = 0;
        coinRef.current.rotation.z = 0;
        coinRef.current.position.y = 0;

        if (onFlipComplete) {
          onFlipComplete();
        }
      }
    } else if (!isFlipping) {
      // Idle animation - gentle hover and rotation
      const time = state.clock.getElapsedTime();
      coinRef.current.position.y = Math.sin(time * 2) * 0.1;
      coinRef.current.rotation.y = Math.sin(time * 0.5) * 0.3;

      // Show preview of selected side
      if (selectedSide === 'heads') {
        coinRef.current.rotation.x = 0;
      } else if (selectedSide === 'tails') {
        coinRef.current.rotation.x = Math.PI;
      }
    }
  });

  return (
    <group ref={coinRef} position={[0, 0, 0]}>
      {/* Front face (Heads) */}
      <mesh position={[0, 0, 0.05]}>
        <cylinderGeometry args={[1, 1, 0.1, 64]} />
        <meshStandardMaterial
          color="#FFD700"
          metalness={0.9}
          roughness={0.2}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Back face (Tails) */}
      <mesh position={[0, 0, -0.05]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.1, 64]} />
        <meshStandardMaterial
          color="#C0C0C0"
          metalness={0.8}
          roughness={0.3}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Edge of coin */}
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 0.1, 64, 1, true]} />
        <meshStandardMaterial
          color="#FFA500"
          metalness={0.7}
          roughness={0.4}
        />
      </mesh>

      {/* "H" for Heads */}
      <Text
        position={[0, 0, 0.06]}
        fontSize={0.6}
        color="#8B4513"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf" // Make sure to add this font
      >
        H
      </Text>

      {/* "T" for Tails */}
      <Text
        position={[0, 0, -0.06]}
        rotation={[Math.PI, 0, 0]}
        fontSize={0.6}
        color="#4A5568"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.ttf"
      >
        T
      </Text>

      {/* Glow effect on win */}
      {result && !isFlipping && (
        <pointLight
          color={result === 'heads' ? '#FFD700' : '#C0C0C0'}
          intensity={2}
          distance={5}
        />
      )}
    </group>
  );
}
