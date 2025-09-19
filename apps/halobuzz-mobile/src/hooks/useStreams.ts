import { useState, useEffect } from 'react';
import { Stream, CreateStreamRequest } from '@/types/stream';
import { apiClient } from '@/lib/api';

export function useStreams() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = async (params?: {
    category?: string;
    country?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.getStreams(params);
      if (response.success && response.data) {
        setStreams(response.data.streams);
      } else {
        // Fallback to mock data if API fails
        console.log('API failed, using mock streams data');
        setStreams(getMockStreams());
      }
    } catch (err) {
      console.log('Streams API error:', err);
      // Fallback to mock data
      setStreams(getMockStreams());
    } finally {
      setLoading(false);
    }
  };

  const getMockStreams = (): Stream[] => [
    {
      id: '1',
      title: 'Epic Gaming Session!',
      description: 'Playing the latest games and having fun with viewers',
      hostId: 'user_1',
      hostName: 'GamerPro',
      hostAvatar: 'https://i.pravatar.cc/150?img=1',
      category: 'gaming',
      thumbnail: 'https://picsum.photos/400/300?random=1',
      isLive: true,
      viewerCount: 1250,
      likes: 890,
      comments: 156,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      duration: 7200,
      tags: ['gaming', 'fun', 'interactive'],
      quality: '1080p',
      language: 'en',
      isPublic: true,
      allowComments: true,
      allowGifts: true,
      minLevel: 1,
      maxViewers: 10000,
    },
    {
      id: '2',
      title: 'Music Production Live',
      description: 'Creating beats and making music with the community',
      hostId: 'user_2',
      hostName: 'MusicMaker',
      hostAvatar: 'https://i.pravatar.cc/150?img=2',
      category: 'music',
      thumbnail: 'https://picsum.photos/400/300?random=2',
      isLive: true,
      viewerCount: 450,
      likes: 320,
      comments: 89,
      startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      duration: 3600,
      tags: ['music', 'production', 'creative'],
      quality: '720p',
      language: 'en',
      isPublic: true,
      allowComments: true,
      allowGifts: true,
      minLevel: 1,
      maxViewers: 5000,
    },
    {
      id: '3',
      title: 'Digital Art Creation',
      description: 'Drawing and painting digitally with viewers',
      hostId: 'user_3',
      hostName: 'ArtistLife',
      hostAvatar: 'https://i.pravatar.cc/150?img=3',
      category: 'art',
      thumbnail: 'https://picsum.photos/400/300?random=3',
      isLive: true,
      viewerCount: 780,
      likes: 560,
      comments: 234,
      startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      duration: 1800,
      tags: ['art', 'digital', 'creative'],
      quality: '1080p',
      language: 'en',
      isPublic: true,
      allowComments: true,
      allowGifts: true,
      minLevel: 1,
      maxViewers: 3000,
    },
  ];

  const createStream = async (streamData: CreateStreamRequest): Promise<Stream | null> => {
    try {
      const response = await apiClient.createStream(streamData);
      if (response.success && response.data) {
        return response.data.stream;
      } else {
        throw new Error(response.error || 'Failed to create stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
      return null;
    }
  };

  const getStreamById = async (id: string): Promise<Stream | null> => {
    try {
      const response = await apiClient.getStreamById(id);
      if (response.success && response.data) {
        return response.data.stream;
      } else {
        throw new Error(response.error || 'Failed to get stream');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get stream');
      return null;
    }
  };

  const likeStream = async (streamId: string): Promise<boolean> => {
    try {
      const response = await apiClient.likeStream(streamId);
      return response.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to like stream');
      return false;
    }
  };

  const followUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await apiClient.followUser(userId);
      return response.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow user');
      return false;
    }
  };

  const refresh = () => fetchStreams();

  useEffect(() => {
    fetchStreams();
  }, []);

  return {
    streams,
    loading,
    error,
    fetchStreams,
    createStream,
    getStreamById,
    likeStream,
    followUser,
    refresh,
  };
}
