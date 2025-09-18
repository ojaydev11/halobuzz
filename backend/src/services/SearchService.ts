import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Reel } from '../models/Reel';
import { logger } from '../config/logger';
import { QuerySanitizer } from '../utils/querySanitizer';
import { Readable } from 'stream';
import { Stream } from 'stream';

export interface SearchResult {
  users: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    followers: number;
    isVerified: boolean;
    ogLevel: number;
  }[];
  streams: {
    id: string;
    title: string;
    host: {
      id: string;
      username: string;
      avatar: string;
    };
    category: string;
    currentViewers: number;
    thumbnail: string;
    isLive: boolean;
  }[];
  reels: {
    id: string;
    title: string;
    description: string;
    user: {
      id: string;
      username: string;
      avatar: string;
    };
    category: string;
    viewCount: number;
    thumbnail: string;
    createdAt: Date;
  }[];
  hashtags: {
    tag: string;
    count: number;
    trending: boolean;
  }[];
  totalResults: number;
}

export interface SearchFilters {
  type?: 'all' | 'users' | 'streams' | 'reels' | 'hashtags';
  category?: string;
  isLive?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
  sortBy?: 'relevance' | 'popularity' | 'date' | 'followers';
  limit?: number;
  offset?: number;
}

export class SearchService {
  private static instance: SearchService;

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async search(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
    try {
      // Sanitize input parameters
      const sanitizedQuery = QuerySanitizer.sanitizeString(query);
      const sanitizedFilters = QuerySanitizer.sanitizeSearchParams(filters);
      
      logger.info('Performing search', { query: sanitizedQuery, filters: sanitizedFilters });

      const {
        type = 'all',
        category,
        isLive,
        minFollowers,
        maxFollowers,
        dateRange = 'all',
        sortBy = 'relevance',
        limit = 20,
        offset = 0
      } = sanitizedFilters;

      const searchResults: SearchResult = {
        users: [],
        streams: [],
        reels: [],
        hashtags: [],
        totalResults: 0
      };

      // Build search conditions
      const searchConditions = this.buildSearchConditions(query, {
        category,
        isLive,
        minFollowers,
        maxFollowers,
        dateRange
      });

      // Search users
      if (type === 'all' || type === 'users') {
        searchResults.users = await this.searchUsers(sanitizedQuery, searchConditions, sortBy, limit, offset);
      }

      // Search streams
      if (type === 'all' || type === 'streams') {
        searchResults.streams = await this.searchStreams(sanitizedQuery, searchConditions, sortBy, limit, offset);
      }

      // Search reels
      if (type === 'all' || type === 'reels') {
        searchResults.reels = await this.searchReels(sanitizedQuery, searchConditions, sortBy, limit, offset);
      }

      // Search hashtags
      if (type === 'all' || type === 'hashtags') {
        searchResults.hashtags = await this.searchHashtags(sanitizedQuery, limit, offset);
      }

      // Calculate total results
      searchResults.totalResults = 
        searchResults.users.length +
        searchResults.streams.length +
        searchResults.reels.length +
        searchResults.hashtags.length;

      logger.info('Search completed', { 
        query, 
        totalResults: searchResults.totalResults,
        users: searchResults.users.length,
        streams: searchResults.streams.length,
        reels: searchResults.reels.length,
        hashtags: searchResults.hashtags.length
      });

      return searchResults;
    } catch (error) {
      logger.error('Search failed:', error);
      throw new Error('Search operation failed');
    }
  }

  private buildSearchConditions(query: string, filters: any) {
    const conditions: any = {};

    // Text search conditions
    if (query) {
      conditions.$or = [
        { $text: { $search: query } },
        { username: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }

    // Category filter
    if (filters.category) {
      conditions.category = filters.category;
    }

    // Live stream filter
    if (filters.isLive !== undefined) {
      conditions.isLive = filters.isLive;
    }

    // Follower count filters
    if (filters.minFollowers || filters.maxFollowers) {
      conditions.followers = {};
      if (filters.minFollowers) {
        conditions.followers.$gte = filters.minFollowers;
      }
      if (filters.maxFollowers) {
        conditions.followers.$lte = filters.maxFollowers;
      }
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const dateFilter = this.getDateFilter(filters.dateRange);
      conditions.createdAt = dateFilter;
    }

    return conditions;
  }

  private getDateFilter(dateRange: string) {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return {};
    }

    return { $gte: startDate };
  }

  private async searchUsers(query: string, conditions: any, sortBy: string, limit: number, offset: number) {
    try {
      const sortCriteria = this.getSortCriteria(sortBy, 'users');
      
      const users = await User.find(conditions)
        .select('username displayName avatar followers isVerified ogLevel createdAt')
        .sort(sortCriteria as any)
        .limit(limit)
        .skip(offset);

      return users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || '',
        followers: user.followers || 0,
        isVerified: user.isVerified || false,
        ogLevel: user.ogLevel || 0
      }));
    } catch (error) {
      logger.error('User search failed:', error);
      return [];
    }
  }

  private async searchStreams(query: string, conditions: any, sortBy: string, limit: number, offset: number) {
    try {
      const sortCriteria = this.getSortCriteria(sortBy, 'streams');
      
      const streams = await LiveStream.find(conditions)
        .populate('userId', 'username avatar')
        .select('title category currentViewers thumbnail isLive createdAt userId')
        .sort(sortCriteria as any)
        .limit(limit)
        .skip(offset);

      return streams.map(stream => ({
        id: stream._id.toString(),
        title: stream.title,
        host: {
          id: (stream as any).userId?._id?.toString?.() || '',
          username: (stream as any).userId?.username || '',
          avatar: (stream as any).userId?.avatar || ''
        },
        category: stream.category,
        currentViewers: stream.currentViewers || 0,
        thumbnail: stream.thumbnail || '',
        isLive: stream.status === 'live'
      }));
    } catch (error) {
      logger.error('Stream search failed:', error);
      return [];
    }
  }

  private async searchReels(query: string, conditions: any, sortBy: string, limit: number, offset: number) {
    try {
      const sortCriteria = this.getSortCriteria(sortBy, 'reels');
      
      const reels = await Reel.find(conditions)
        .populate('userId', 'username avatar')
        .select('title description category viewCount createdAt')
        .sort(sortCriteria as any)
        .limit(limit)
        .skip(offset);

      return reels.map(reel => ({
        id: reel._id.toString(),
        title: reel.title,
        description: reel.description,
        user: {
          id: (reel.userId as any)._id.toString(),
          username: (reel.userId as any).username,
          avatar: (reel.userId as any).avatar || ''
        },
        category: reel.category,
        viewCount: reel.metadata.views || 0,
        thumbnail: '', // Will be generated from video
        createdAt: reel.createdAt
      }));
    } catch (error) {
      logger.error('Reel search failed:', error);
      return [];
    }
  }

  private async searchHashtags(query: string, limit: number, offset: number) {
    try {
      // Extract hashtags from query
      const hashtags = query.match(/#\w+/g) || [];
      
      if (hashtags.length === 0) {
        return [];
      }

      // Search for hashtags in streams and reels
      const streamHashtags = await LiveStream.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: { $regex: query.replace('#', ''), $options: 'i' } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      const reelHashtags = await Reel.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: { $regex: query.replace('#', ''), $options: 'i' } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      // Combine and deduplicate hashtags
      const allHashtags = new Map();
      
      [...streamHashtags, ...reelHashtags].forEach(hashtag => {
        const tag = hashtag._id;
        if (allHashtags.has(tag)) {
          allHashtags.set(tag, allHashtags.get(tag) + hashtag.count);
        } else {
          allHashtags.set(tag, hashtag.count);
        }
      });

      return Array.from(allHashtags.entries())
        .map(([tag, count]) => ({
          tag: `#${tag}`,
          count: count as number,
          trending: count > 100 // Simple trending logic
        }))
        .sort((a, b) => b.count - a.count)
        .slice(offset, offset + limit);
    } catch (error) {
      logger.error('Hashtag search failed:', error);
      return [];
    }
  }

  private getSortCriteria(sortBy: string, type: string) {
    switch (sortBy) {
      case 'popularity':
        if (type === 'users') return { followers: -1 };
        if (type === 'streams') return { currentViewers: -1 };
        if (type === 'reels') return { viewCount: -1 };
        return { createdAt: -1 };
      
      case 'date':
        return { createdAt: -1 };
      
      case 'followers':
        return { followers: -1 };
      
      case 'relevance':
      default:
        // For relevance, we'll use a combination of factors
        if (type === 'users') return { followers: -1, createdAt: -1 };
        if (type === 'streams') return { currentViewers: -1, createdAt: -1 };
        if (type === 'reels') return { viewCount: -1, createdAt: -1 };
        return { createdAt: -1 };
    }
  }

  async getTrendingHashtags(limit: number = 10): Promise<{ tag: string; count: number; trending: boolean }[]> {
    try {
      const trendingHashtags = await LiveStream.aggregate([
        { $unwind: '$tags' },
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }, // Last 24 hours
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return trendingHashtags.map(hashtag => ({
        tag: `#${hashtag._id}`,
        count: hashtag.count,
        trending: hashtag.count > 50
      }));
    } catch (error) {
      logger.error('Failed to get trending hashtags:', error);
      return [];
    }
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const suggestions: string[] = [];

      // Get username suggestions
      const usernameSuggestions = await User.find({
        username: { $regex: query, $options: 'i' }
      })
        .select('username')
        .limit(limit)
        .sort({ followers: -1 });

      suggestions.push(...usernameSuggestions.map(user => `@${user.username}`));

      // Get hashtag suggestions
      const hashtagSuggestions = await LiveStream.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: { $regex: query.replace('#', ''), $options: 'i' } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      suggestions.push(...hashtagSuggestions.map(hashtag => `#${hashtag._id}`));

      return suggestions.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get search suggestions:', error);
      return [];
    }
  }
}

export const searchService = SearchService.getInstance();
