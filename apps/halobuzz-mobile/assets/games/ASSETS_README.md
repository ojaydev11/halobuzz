# Game Assets Guide

This directory contains all game assets including images, sprites, sounds, and textures.

## Asset Requirements

### Cover Images (512x512 PNG)
All game cover images should be:
- 512x512 pixels
- PNG format with transparency
- Optimized for mobile (<100KB)
- Use Skia-generated gradients or CC0 assets from Kenney.nl

### Sound Effects (MP3/WAV)
- Sample rate: 44.1kHz
- Mono channel (stereo for music only)
- Duration: <2 seconds for SFX
- Royalty-free sources: freesound.org, zapsplat.com (CC0 license)

### Sprites & Textures
- Power-ups: 128x128 PNG
- Obstacles: 256x256 PNG
- UI elements: SVG preferred, PNG fallback
- Use texture atlases for multiple sprites

## Per-Game Assets

### CoinFlip Deluxe
- **cover.png** - 3D coin with metallic gradient
- **coin-texture.png** - Gold/silver texture map
- **particle-spark.png** - Sparkle particle (32x32)
- **Sounds**: flip.mp3, land.mp3, win-chime.mp3, lose-buzz.mp3

### TapDuel
- **cover.png** - Countdown timer visual
- **countdown-bg.png** - Background gradient
- **Sounds**: tick.mp3, air-horn.mp3, tap-correct.mp3, tap-wrong.mp3

### BuzzRunner
- **cover.png** - Runner character in motion
- **player.png** - Character sprite (128x128)
- **obstacle-1.png, obstacle-2.png** - Obstacles (256x256)
- **coin.png** - Collectible coin (64x64)
- **powerup-magnet.png, powerup-shield.png, powerup-multiplier.png** - Power-ups (128x128)
- **Sounds**: jump.mp3, coin-pickup.mp3, power-up.mp3, crash.mp3

### TriviaRoyale
- **cover.png** - Quiz brain/lightning bolt
- **category-*.png** - Category icons (128x128) for General, Sports, Entertainment, Science
- **Sounds**: tick.mp3, correct-answer.mp3, wrong-answer.mp3, time-up.mp3

### StackStorm
- **cover.png** - Stacked blocks with wind effect
- **block-1.png, block-2.png, block-3.png** - Block textures with gradients
- **Sounds**: drop.mp3, land.mp3, stack-perfect.mp3, collapse.mp3

### BuzzArena
- **cover.png** - 1v1 battle arena
- **projectile.png** - Energy projectile sprite (64x64)
- **health-bar.png, health-bar-bg.png** - HP bar components
- **Sounds**: shoot.mp3, hit-damage.mp3, victory.mp3, defeat.mp3

## Temporary Skia Placeholders

Until final assets are ready, use Skia-generated placeholders:
- Gradients for backgrounds
- Simple shapes for game objects
- Programmatic particles
- Silent audio files (can be replaced later)

All placeholder files are prefixed with `placeholder-` and should be replaced before production release.

