export interface Tournament {
  _id?: string;
  id: string;
  name?: string;
  gameId?: string;
  entryFee: number;
  prizePool?: number;
  prizeDistribution?: number[];
  minPlayers?: number;
  maxPlayers?: number;
  currentPlayers?: number;
  registeredPlayers?: TournamentPlayer[];
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startTime?: Date;
  endTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: any;
}

export interface TournamentPlayer {
  userId: string;
  joinedAt: Date;
  bestScore?: number;
  sessionId?: string;
  rank?: number;
}

export interface TournamentEntry {
  tournamentId: string;
  userId: string;
  sessionId: string;
  score: number;
  signature: string;
  timestamp?: number;
  submittedAt?: Date;
}

export interface TournamentLeaderboardEntry {
  userId: string;
  username?: string;
  score: number;
  rank: number;
  prize?: number;
  timestamp: Date;
}

