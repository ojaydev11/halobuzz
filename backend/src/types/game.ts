export interface MatchmakingPlayer {
  userId: string;
  socketId: string;
  gameId: string;
  mode: 'casual' | 'ranked' | 'tournament';
  mmr?: number;
  queuedAt?: number;
  tournamentId?: string;
  username?: string;
}

export interface GamePlayer {
  userId: string;
  socketId: string;
  ready: boolean;
  score: number;
  disconnected: boolean;
  joinedAt: Date;
}

export interface GameAction {
  userId: string;
  actionId: string;
  type: string;
  timestamp: Date;
  data?: any;
  payload?: any;
  validated: boolean;
}

export interface GameRoomState {
  roomId: string;
  gameId: string;
  mode: string;
  matchId?: string;
  players: GamePlayer[];
  status: 'waiting' | 'in-progress' | 'ended';
  createdAt: Date;
  updatedAt: Date;
  actions: GameAction[];
  results: GameResult | null;
  metadata?: any;
}

export interface GameResult {
  roomId: string;
  gameId: string;
  completedAt: Date;
  playerResults: PlayerResult[];
  metadata?: any;
}

export interface PlayerResult {
  userId: string;
  score?: number;
  rank?: number;
  rewardCoins?: number;
  metadata?: any;
}

export interface Match {
  id: string;
  gameId: string;
  mode: string;
  players: { userId: string; socketId: string }[];
  createdAt: Date;
}

