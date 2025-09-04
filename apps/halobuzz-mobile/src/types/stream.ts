export interface Stream {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  host: {
    id: string;
    username: string;
    avatar?: string;
    followers: number;
    ogLevel: number;
    trust: {
      score: number;
    };
  };
  status: 'live' | 'ended' | 'scheduled';
  currentViewers: number;
  totalViewers: number;
  totalCoins: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  metrics: {
    engagementScore: number;
    aiEngagementScore: number;
    giftsCoins: number;
    viewerCount: number;
  };
  thumbnail?: string;
  isAudioOnly: boolean;
  isPrivate: boolean;
  agoraChannel: string;
  agoraToken: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export interface CreateStreamRequest {
  title: string;
  description?: string;
  category: string;
  tags?: string[];
  isAudioOnly?: boolean;
  isPrivate?: boolean;
}

export interface StreamsResponse {
  streams: Stream[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
