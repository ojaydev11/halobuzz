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
        setError(response.error || 'Failed to fetch streams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
