/**
 * Games Platform Store
 * Centralized state management for all games
 */

import { create } from 'zustand';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export type GameTier = 'noob' | 'casual' | 'core' | 'pro';
export type GameStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'completed' | 'error';

export interface GameConfig {
  id: string;
  name: string;
  tier: GameTier;
  entryFee: { min: number; max: number };
  rewardMultiplier: number;
  rake: number; // Platform fee percentage
  description: string;
  rules: string[];
  maxPlayers: number;
  duration?: number; // seconds
  icon: string; // Icon name from @expo/vector-icons
  coverImage?: string;
  trailerUrl?: string;
}

export interface GameSession {
  sessionId: string;
  gameId: string;
  userId: string;
  entryFee: number;
  startTime: number;
  endTime?: number;
  score: number;
  reward: number;
  status: GameStatus;
  fps: number[]; // FPS samples for analytics
  metadata?: Record<string, any>;
}

export interface TournamentInfo {
  id: string;
  gameId: string;
  name: string;
  prizePool: number;
  entryFee: number;
  startTime: number;
  endTime: number;
  maxParticipants: number;
  currentParticipants: number;
  status: 'upcoming' | 'active' | 'completed';
}

interface GamesState {
  // Game catalog
  games: GameConfig[];

  // Current session
  currentSession: GameSession | null;
  currentGameId: string | null;

  // UI state
  isPaused: boolean;
  isLoading: boolean;
  error: string | null;

  // Audio settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;

  // Haptics
  hapticsEnabled: boolean;

  // Performance
  fpsData: number[];
  targetFPS: number;

  // Tournaments
  tournaments: TournamentInfo[];
  activeTournament: TournamentInfo | null;

  // Actions
  setGames: (games: GameConfig[]) => void;
  startSession: (gameId: string, entryFee: number, userId: string) => void;
  endSession: (score: number, reward: number) => void;
  updateSessionScore: (score: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setError: (error: string | null) => void;

  // Audio actions
  toggleSound: () => void;
  toggleMusic: () => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;

  // Haptics actions
  toggleHaptics: () => void;
  triggerHaptic: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;

  // Performance tracking
  recordFPS: (fps: number) => void;
  getFPSStats: () => { min: number; max: number; avg: number; p95: number };

  // Tournament actions
  setTournaments: (tournaments: TournamentInfo[]) => void;
  joinTournament: (tournamentId: string) => void;
  leaveTournament: () => void;

  // Cleanup
  reset: () => void;
}

export const useGamesStore = create<GamesState>((set, get) => ({
  // Initial state
  games: [],
  currentSession: null,
  currentGameId: null,
  isPaused: false,
  isLoading: false,
  error: null,
  soundEnabled: true,
  musicEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 1.0,
  hapticsEnabled: true,
  fpsData: [],
  targetFPS: 60,
  tournaments: [],
  activeTournament: null,

  // Game catalog
  setGames: (games) => set({ games }),

  // Session management
  startSession: (gameId, entryFee, userId) => {
    const sessionId = `${gameId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    set({
      currentSession: {
        sessionId,
        gameId,
        userId,
        entryFee,
        startTime: Date.now(),
        score: 0,
        reward: 0,
        status: 'playing',
        fps: [],
      },
      currentGameId: gameId,
      isPaused: false,
      fpsData: [],
    });
  },

  endSession: (score, reward) => {
    const session = get().currentSession;
    if (!session) return;

    set({
      currentSession: {
        ...session,
        score,
        reward,
        endTime: Date.now(),
        status: 'completed',
        fps: get().fpsData,
      },
    });
  },

  updateSessionScore: (score) => {
    const session = get().currentSession;
    if (!session) return;

    set({
      currentSession: {
        ...session,
        score,
      },
    });
  },

  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  setError: (error) => set({ error }),

  // Audio
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
  setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
  setSfxVolume: (volume) => set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),

  // Haptics
  toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),

  triggerHaptic: async (type) => {
    const { hapticsEnabled } = get();
    if (!hapticsEnabled) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  },

  // Performance tracking
  recordFPS: (fps) => {
    const fpsData = get().fpsData;
    const maxSamples = 1000; // Keep last 1000 samples

    set({
      fpsData: [...fpsData, fps].slice(-maxSamples),
    });
  },

  getFPSStats: () => {
    const fpsData = get().fpsData;
    if (fpsData.length === 0) {
      return { min: 0, max: 0, avg: 0, p95: 0 };
    }

    const sorted = [...fpsData].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avg = fpsData.reduce((sum, fps) => sum + fps, 0) / fpsData.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index];

    return { min, max, avg, p95 };
  },

  // Tournaments
  setTournaments: (tournaments) => set({ tournaments }),

  joinTournament: (tournamentId) => {
    const tournament = get().tournaments.find(t => t.id === tournamentId);
    if (tournament) {
      set({ activeTournament: tournament });
    }
  },

  leaveTournament: () => set({ activeTournament: null }),

  // Cleanup
  reset: () => set({
    currentSession: null,
    currentGameId: null,
    isPaused: false,
    isLoading: false,
    error: null,
    fpsData: [],
    activeTournament: null,
  }),
}));

// Game catalog - Production-ready game configs
export const GAME_CATALOG: GameConfig[] = [
  // NOOB TIER
  {
    id: 'coin-flip-deluxe',
    name: '3D Coin Flip Deluxe',
    tier: 'noob',
    entryFee: { min: 25, max: 250 },
    rewardMultiplier: 2,
    rake: 0.10,
    description: 'Swipe to flip a 3D coin with physics. Guess heads or tails to win!',
    rules: [
      'Swipe up to flip the coin',
      'Choose heads or tails before landing',
      'Win 2x your bet on correct guess',
      'Unlock 2x/3x boost moments randomly',
    ],
    maxPlayers: 1,
    duration: 30,
    icon: 'cash',
    coverImage: 'coin-flip-cover.png',
  },
  {
    id: 'tap-duel',
    name: 'Tap Duel',
    tier: 'noob',
    entryFee: { min: 25, max: 250 },
    rewardMultiplier: 2,
    rake: 0.10,
    description: 'Test your reaction time! Tap when the light turns green.',
    rules: [
      'Wait for countdown',
      'Tap immediately when GO appears',
      'Fastest tap wins',
      'Early tap = penalty',
      'OG members get visual cues',
    ],
    maxPlayers: 2,
    duration: 15,
    icon: 'flash',
  },

  // CASUAL TIER
  {
    id: 'buzz-runner',
    name: 'Buzz Runner',
    tier: 'casual',
    entryFee: { min: 50, max: 500 },
    rewardMultiplier: 3,
    rake: 0.15,
    description: 'Endless runner with obstacles, magnets, and power-ups!',
    rules: [
      'Swipe to dodge obstacles',
      'Collect coins and power-ups',
      'Survive as long as possible',
      'Distance = score',
      'OG members get 1 extra life',
    ],
    maxPlayers: 1,
    icon: 'rocket',
  },
  {
    id: 'trivia-royale',
    name: 'Trivia Royale',
    tier: 'casual',
    entryFee: { min: 50, max: 500 },
    rewardMultiplier: 3,
    rake: 0.15,
    description: 'Live quiz battle! Answer 8-12 questions to win.',
    rules: [
      '8-12 multiple choice questions',
      'Faster correct answers = more points',
      'Categories: General, Sports, Entertainment, Science',
      'Anti-cheat timing enforced',
      'OG members get 1 revive',
    ],
    maxPlayers: 100,
    duration: 180,
    icon: 'bulb',
  },

  // CORE TIER
  {
    id: 'stack-storm',
    name: 'StackStorm',
    tier: 'core',
    entryFee: { min: 100, max: 1000 },
    rewardMultiplier: 5,
    rake: 0.20,
    description: 'Stack moving blocks perfectly. Physics-based challenge!',
    rules: [
      'Tap to drop moving blocks',
      'Perfect stacks = bonus points',
      'Overhang gets cut off',
      'Wind modifier increases difficulty',
      'Stack as high as possible',
    ],
    maxPlayers: 1,
    icon: 'layers',
  },

  // PRO TIER
  {
    id: 'buzz-arena',
    name: 'Buzz Arena',
    tier: 'pro',
    entryFee: { min: 500, max: 5000 },
    rewardMultiplier: 10,
    rake: 0.25,
    description: '1v1 competitive skill match with MMR ranking!',
    rules: [
      'Lane-aim + timing mechanics',
      'Best of 3 rounds',
      'MMR-based matchmaking',
      'Ranked seasons',
      'Server-adjudicated results',
    ],
    maxPlayers: 2,
    duration: 300,
    icon: 'trophy',
  },
];
