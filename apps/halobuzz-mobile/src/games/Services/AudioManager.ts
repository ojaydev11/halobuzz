/**
 * Audio Manager for Game Sounds
 * Handles SFX playback with expo-av
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { GAME_ASSETS } from './assetsMap';

interface SoundInstance {
  sound: Audio.Sound;
  isLoaded: boolean;
}

class AudioManager {
  private static instance: AudioManager;
  private soundPool: Map<string, SoundInstance> = new Map();
  private isEnabled: boolean = true;
  private volume: number = 1.0;
  private maxConcurrentSounds: number = 5;
  private activeSounds: Set<Audio.Sound> = new Set();

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize audio system
   */
  async init(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      console.log('✅ Audio Manager initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  /**
   * Preload sounds for a specific game
   */
  async preloadGameSounds(gameId: string): Promise<void> {
    const assets = GAME_ASSETS[gameId];
    if (!assets?.sounds) {
      console.warn(`No sounds found for game: ${gameId}`);
      return;
    }

    const loadPromises = Object.entries(assets.sounds).map(async ([key, soundModule]) => {
      const soundKey = `${gameId}:${key}`;
      
      if (this.soundPool.has(soundKey)) {
        return; // Already loaded
      }

      try {
        const { sound } = await Audio.Sound.createAsync(soundModule, {
          shouldPlay: false,
          volume: this.volume,
        });

        this.soundPool.set(soundKey, {
          sound,
          isLoaded: true,
        });
      } catch (error) {
        console.error(`Failed to load sound ${soundKey}:`, error);
      }
    });

    await Promise.all(loadPromises);
    console.log(`✅ Preloaded sounds for ${gameId}`);
  }

  /**
   * Play a sound
   */
  async playSound(gameId: string, soundKey: string, options?: { loop?: boolean; volume?: number }): Promise<void> {
    if (!this.isEnabled) return;

    const fullKey = `${gameId}:${soundKey}`;
    let soundInstance = this.soundPool.get(fullKey);

    // Lazy load if not preloaded
    if (!soundInstance) {
      const assets = GAME_ASSETS[gameId];
      if (!assets?.sounds?.[soundKey]) {
        console.warn(`Sound not found: ${fullKey}`);
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(assets.sounds[soundKey], {
          shouldPlay: false,
          volume: options?.volume ?? this.volume,
          isLooping: options?.loop ?? false,
        });

        soundInstance = { sound, isLoaded: true };
        this.soundPool.set(fullKey, soundInstance);
      } catch (error) {
        console.error(`Failed to load sound ${fullKey}:`, error);
        return;
      }
    }

    try {
      const { sound } = soundInstance;

      // Check if we've reached max concurrent sounds
      if (this.activeSounds.size >= this.maxConcurrentSounds) {
        // Stop oldest active sound
        const oldestSound = this.activeSounds.values().next().value;
        await oldestSound.stopAsync();
        this.activeSounds.delete(oldestSound);
      }

      // Set playback options
      await sound.setVolumeAsync(options?.volume ?? this.volume);
      await sound.setIsLoopingAsync(options?.loop ?? false);
      
      // Rewind to start
      await sound.setPositionAsync(0);
      
      // Play sound
      await sound.playAsync();
      this.activeSounds.add(sound);

      // Remove from active sounds when finished (if not looping)
      if (!options?.loop) {
        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded && status.didJustFinish) {
            this.activeSounds.delete(sound);
          }
        });
      }
    } catch (error) {
      console.error(`Failed to play sound ${fullKey}:`, error);
    }
  }

  /**
   * Stop a specific sound
   */
  async stopSound(gameId: string, soundKey: string): Promise<void> {
    const fullKey = `${gameId}:${soundKey}`;
    const soundInstance = this.soundPool.get(fullKey);

    if (soundInstance?.isLoaded) {
      try {
        await soundInstance.sound.stopAsync();
        this.activeSounds.delete(soundInstance.sound);
      } catch (error) {
        console.error(`Failed to stop sound ${fullKey}:`, error);
      }
    }
  }

  /**
   * Stop all playing sounds
   */
  async stopAllSounds(): Promise<void> {
    const stopPromises = Array.from(this.activeSounds).map(async (sound) => {
      try {
        await sound.stopAsync();
      } catch (error) {
        console.error('Failed to stop sound:', error);
      }
    });

    await Promise.all(stopPromises);
    this.activeSounds.clear();
  }

  /**
   * Unload sounds for a specific game
   */
  async unloadGameSounds(gameId: string): Promise<void> {
    const keysToUnload = Array.from(this.soundPool.keys()).filter((key) => key.startsWith(`${gameId}:`));

    const unloadPromises = keysToUnload.map(async (key) => {
      const soundInstance = this.soundPool.get(key);
      if (soundInstance?.isLoaded) {
        try {
          await soundInstance.sound.unloadAsync();
          this.soundPool.delete(key);
        } catch (error) {
          console.error(`Failed to unload sound ${key}:`, error);
        }
      }
    });

    await Promise.all(unloadPromises);
    console.log(`✅ Unloaded sounds for ${gameId}`);
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAllSounds();
    }
  }

  /**
   * Set global volume (0.0 - 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, volume));

    // Update volume for all loaded sounds
    const updatePromises = Array.from(this.soundPool.values()).map(async (instance) => {
      if (instance.isLoaded) {
        try {
          await instance.sound.setVolumeAsync(this.volume);
        } catch (error) {
          console.error('Failed to update sound volume:', error);
        }
      }
    });

    await Promise.all(updatePromises);
  }

  /**
   * Cleanup all audio resources
   */
  async cleanup(): Promise<void> {
    await this.stopAllSounds();

    const unloadPromises = Array.from(this.soundPool.values()).map(async (instance) => {
      if (instance.isLoaded) {
        try {
          await instance.sound.unloadAsync();
        } catch (error) {
          console.error('Failed to unload sound:', error);
        }
      }
    });

    await Promise.all(unloadPromises);
    this.soundPool.clear();
    console.log('✅ Audio Manager cleaned up');
  }

  /**
   * Get audio enabled state
   */
  isAudioEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
}

export const audioManager = AudioManager.getInstance();
export default audioManager;

