/**
 * Central Asset Registry for Games
 * Maps game IDs to their asset paths (images, sounds, etc.)
 * Uses Skia placeholders until final assets are ready
 */

import { Image } from 'react-native';

export interface GameAssets {
  coverImage?: any;
  sprites?: Record<string, any>;
  sounds?: Record<string, any>;
  textures?: Record<string, any>;
}

// Helper to safely require assets
function safeRequire(path: string): any {
  try {
    // For now, return null - assets will be Skia-generated placeholders
    return null;
  } catch {
    console.warn(`Asset not found: ${path}`);
    return null;
  }
}

export const GAME_ASSETS: Record<string, GameAssets> = {
  'coin-flip-deluxe': {
    coverImage: safeRequire('@/assets/games/coin-flip/cover.png'),
    textures: {
      coin: safeRequire('@/assets/games/coin-flip/coin-texture.png'),
      spark: safeRequire('@/assets/games/coin-flip/particle-spark.png'),
    },
    sounds: {
      flip: safeRequire('@/assets/games/audio/sfx/coin-flip.mp3'),
      landing: safeRequire('@/assets/games/audio/sfx/coin-land.mp3'),
      win: safeRequire('@/assets/games/audio/sfx/win-chime.mp3'),
      lose: safeRequire('@/assets/games/audio/sfx/lose-buzz.mp3'),
    },
  },
  'tap-duel': {
    coverImage: safeRequire('@/assets/games/tap-duel/cover.png'),
    textures: {
      background: safeRequire('@/assets/games/tap-duel/countdown-bg.png'),
    },
    sounds: {
      tick: safeRequire('@/assets/games/audio/sfx/countdown-tick.mp3'),
      go: safeRequire('@/assets/games/audio/sfx/air-horn.mp3'),
      tapCorrect: safeRequire('@/assets/games/audio/sfx/tap-correct.mp3'),
      tapWrong: safeRequire('@/assets/games/audio/sfx/tap-wrong.mp3'),
    },
  },
  'buzz-runner': {
    coverImage: safeRequire('@/assets/games/buzz-runner/cover.png'),
    sprites: {
      player: safeRequire('@/assets/games/buzz-runner/player.png'),
      obstacle1: safeRequire('@/assets/games/buzz-runner/obstacle-1.png'),
      obstacle2: safeRequire('@/assets/games/buzz-runner/obstacle-2.png'),
      coin: safeRequire('@/assets/games/buzz-runner/coin.png'),
      magnetPowerup: safeRequire('@/assets/games/buzz-runner/powerup-magnet.png'),
      shieldPowerup: safeRequire('@/assets/games/buzz-runner/powerup-shield.png'),
      multiplierPowerup: safeRequire('@/assets/games/buzz-runner/powerup-multiplier.png'),
    },
    sounds: {
      jump: safeRequire('@/assets/games/audio/sfx/jump.mp3'),
      coinPickup: safeRequire('@/assets/games/audio/sfx/coin-pickup.mp3'),
      powerup: safeRequire('@/assets/games/audio/sfx/power-up.mp3'),
      crash: safeRequire('@/assets/games/audio/sfx/crash.mp3'),
    },
  },
  'trivia-royale': {
    coverImage: safeRequire('@/assets/games/trivia-royale/cover.png'),
    textures: {
      generalIcon: safeRequire('@/assets/games/trivia-royale/category-general.png'),
      sportsIcon: safeRequire('@/assets/games/trivia-royale/category-sports.png'),
      entertainmentIcon: safeRequire('@/assets/games/trivia-royale/category-entertainment.png'),
      scienceIcon: safeRequire('@/assets/games/trivia-royale/category-science.png'),
    },
    sounds: {
      tick: safeRequire('@/assets/games/audio/sfx/countdown-tick.mp3'),
      correctAnswer: safeRequire('@/assets/games/audio/sfx/correct-answer.mp3'),
      wrongAnswer: safeRequire('@/assets/games/audio/sfx/wrong-answer.mp3'),
      timeUp: safeRequire('@/assets/games/audio/sfx/time-up.mp3'),
    },
  },
  'stack-storm': {
    coverImage: safeRequire('@/assets/games/stack-storm/cover.png'),
    textures: {
      block1: safeRequire('@/assets/games/stack-storm/block-1.png'),
      block2: safeRequire('@/assets/games/stack-storm/block-2.png'),
      block3: safeRequire('@/assets/games/stack-storm/block-3.png'),
    },
    sounds: {
      drop: safeRequire('@/assets/games/audio/sfx/block-drop.mp3'),
      land: safeRequire('@/assets/games/audio/sfx/block-land.mp3'),
      perfect: safeRequire('@/assets/games/audio/sfx/stack-perfect.mp3'),
      collapse: safeRequire('@/assets/games/audio/sfx/collapse.mp3'),
    },
  },
  'buzz-arena': {
    coverImage: safeRequire('@/assets/games/buzz-arena/cover.png'),
    sprites: {
      projectile: safeRequire('@/assets/games/buzz-arena/projectile.png'),
      healthBar: safeRequire('@/assets/games/buzz-arena/health-bar.png'),
      healthBarBg: safeRequire('@/assets/games/buzz-arena/health-bar-bg.png'),
    },
    sounds: {
      shoot: safeRequire('@/assets/games/audio/sfx/shoot.mp3'),
      hit: safeRequire('@/assets/games/audio/sfx/hit-damage.mp3'),
      victory: safeRequire('@/assets/games/audio/sfx/victory.mp3'),
      defeat: safeRequire('@/assets/games/audio/sfx/defeat.mp3'),
    },
  },
};

/**
 * Prefetch all assets for a specific game
 */
export async function prefetchGameAssets(gameId: string): Promise<void> {
  const assets = GAME_ASSETS[gameId];
  if (!assets) {
    console.warn(`No assets found for game: ${gameId}`);
    return;
  }

  const prefetchPromises: Promise<boolean>[] = [];

  // Prefetch cover image
  if (assets.coverImage) {
    prefetchPromises.push(Image.prefetch(Image.resolveAssetSource(assets.coverImage).uri));
  }

  // Prefetch sprites
  if (assets.sprites) {
    Object.values(assets.sprites).forEach((sprite) => {
      prefetchPromises.push(Image.prefetch(Image.resolveAssetSource(sprite).uri));
    });
  }

  // Prefetch textures
  if (assets.textures) {
    Object.values(assets.textures).forEach((texture) => {
      prefetchPromises.push(Image.prefetch(Image.resolveAssetSource(texture).uri));
    });
  }

  try {
    await Promise.all(prefetchPromises);
    console.log(`✅ Prefetched assets for ${gameId}`);
  } catch (error) {
    console.error(`Failed to prefetch assets for ${gameId}:`, error);
  }
}

/**
 * Prefetch all game assets (for Hub screen)
 */
export async function prefetchAllGameAssets(): Promise<void> {
  const gameIds = Object.keys(GAME_ASSETS);
  await Promise.all(gameIds.map(prefetchGameAssets));
}

