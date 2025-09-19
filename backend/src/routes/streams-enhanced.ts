import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

// Mock streams data
const mockStreams = [
  {
    id: 'stream_1',
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
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    duration: 7200, // 2 hours in seconds
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
    id: 'stream_2',
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
    startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
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
    id: 'stream_3',
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
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
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

// Mock events data
const mockEvents = [
  {
    id: 'event_1',
    title: 'Gaming Tournament Finals',
    description: 'Watch the final matches of our biggest gaming tournament',
    thumbnail: 'https://picsum.photos/400/300?random=4',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
    category: 'gaming',
    isFeatured: true,
    maxViewers: 50000,
    currentViewers: 0,
  },
  {
    id: 'event_2',
    title: 'Music Festival Live',
    description: 'Live performances from top artists',
    thumbnail: 'https://picsum.photos/400/300?random=5',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // 26 hours from now
    category: 'music',
    isFeatured: true,
    maxViewers: 100000,
    currentViewers: 0,
  },
];

// Mock continue watching data
const mockContinueWatching = [
  {
    id: 'stream_4',
    title: 'Cooking Show - Italian Cuisine',
    description: 'Learn to cook authentic Italian dishes',
    hostName: 'ChefMaster',
    thumbnail: 'https://picsum.photos/400/300?random=6',
    watchedDuration: 1800, // 30 minutes
    totalDuration: 3600, // 1 hour
    lastWatched: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isLive: false,
  },
  {
    id: 'stream_5',
    title: 'Fitness Workout Session',
    description: 'High-intensity workout for all fitness levels',
    hostName: 'FitnessGuru',
    thumbnail: 'https://picsum.photos/400/300?random=7',
    watchedDuration: 900, // 15 minutes
    totalDuration: 2700, // 45 minutes
    lastWatched: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isLive: false,
  },
];

// GET /streams/active - Get active live streams
router.get('/active', async (req: Request, res: Response) => {
  try {
    const { category, limit = 20, offset = 0, sort = 'viewers' } = req.query;
    
    logger.info('Fetching active streams', { category, limit, offset, sort });
    
    let filteredStreams = mockStreams.filter(stream => stream.isLive);
    
    // Apply category filter
    if (category && category !== 'all') {
      filteredStreams = filteredStreams.filter(stream => stream.category === category);
    }
    
    // Apply sorting
    switch (sort) {
      case 'viewers':
        filteredStreams.sort((a, b) => b.viewerCount - a.viewerCount);
        break;
      case 'likes':
        filteredStreams.sort((a, b) => b.likes - a.likes);
        break;
      case 'newest':
        filteredStreams.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        break;
      case 'oldest':
        filteredStreams.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        break;
    }
    
    // Apply pagination
    const paginatedStreams = filteredStreams.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      streams: paginatedStreams,
      total: filteredStreams.length,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < filteredStreams.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching active streams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active streams',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /events/featured - Get featured events
router.get('/events/featured', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching featured events');
    
    const featuredEvents = mockEvents.filter(event => event.isFeatured);
    
    res.json({
      success: true,
      events: featuredEvents,
      total: featuredEvents.length,
    });
  } catch (error) {
    logger.error('Error fetching featured events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured events',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /personal/continue-watching - Get continue watching content
router.get('/personal/continue-watching', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    logger.info('Fetching continue watching content', { userId });
    
    // In a real app, this would be filtered by userId
    res.json({
      success: true,
      content: mockContinueWatching,
      total: mockContinueWatching.length,
    });
  } catch (error) {
    logger.error('Error fetching continue watching content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch continue watching content',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /rewards/checkin - Daily check-in reward
router.post('/rewards/checkin', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    logger.info('Processing daily check-in', { userId });
    
    // Mock check-in logic
    const today = new Date().toDateString();
    const lastCheckIn = new Date().toDateString(); // In real app, get from database
    
    // Check if already checked in today
    if (lastCheckIn === today) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today',
      });
    }
    
    // Calculate reward based on streak
    const streak = 1; // In real app, calculate from database
    const baseReward = 10;
    const streakBonus = Math.min(streak * 2, 50); // Max 50 bonus
    const totalReward = baseReward + streakBonus;
    
    res.json({
      success: true,
      reward: {
        coins: totalReward,
        xp: 25,
        streak: streak + 1,
        nextReward: {
          coins: baseReward + Math.min((streak + 1) * 2, 50),
          xp: 25,
        },
      },
      message: `Check-in successful! Earned ${totalReward} coins and 25 XP`,
    });
  } catch (error) {
    logger.error('Error processing check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process check-in',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /streams/start - Start a new stream
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { 
      title, 
      description, 
      category, 
      isPublic = true, 
      allowComments = true, 
      allowGifts = true,
      userId 
    } = req.body;
    
    logger.info('Starting new stream', { title, category, userId });
    
    // Validate required fields
    if (!title || !category || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, category, userId',
      });
    }
    
    // Create new stream
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newStream = {
      id: streamId,
      title,
      description: description || '',
      hostId: userId,
      hostName: 'CurrentUser', // In real app, get from user data
      hostAvatar: 'https://i.pravatar.cc/150?img=5',
      category,
      thumbnail: 'https://picsum.photos/400/300?random=8',
      isLive: true,
      viewerCount: 0,
      likes: 0,
      comments: 0,
      startTime: new Date().toISOString(),
      duration: 0,
      tags: [],
      quality: '1080p',
      language: 'en',
      isPublic,
      allowComments,
      allowGifts,
      minLevel: 1,
      maxViewers: 10000,
    };
    
    // Add to mock data
    mockStreams.push(newStream);
    
    res.json({
      success: true,
      stream: newStream,
      message: 'Stream started successfully',
    });
  } catch (error) {
    logger.error('Error starting stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start stream',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /streams/:streamId/end - End a stream
router.post('/:streamId/end', async (req: Request, res: Response) => {
  try {
    const { streamId } = req.params;
    const { finalStats } = req.body;
    
    logger.info('Ending stream', { streamId });
    
    const stream = mockStreams.find(s => s.id === streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }
    
    // Update stream status
    stream.isLive = false;
    stream.duration = Math.floor((Date.now() - new Date(stream.startTime).getTime()) / 1000);
    
    // Update final stats if provided
    if (finalStats) {
      stream.viewerCount = finalStats.viewerCount || stream.viewerCount;
      stream.likes = finalStats.likes || stream.likes;
      stream.comments = finalStats.comments || stream.comments;
    }
    
    res.json({
      success: true,
      stream,
      message: 'Stream ended successfully',
    });
  } catch (error) {
    logger.error('Error ending stream:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end stream',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /streams/:streamId - Get specific stream details
router.get('/:streamId', async (req: Request, res: Response) => {
  try {
    const { streamId } = req.params;
    
    logger.info('Fetching stream details', { streamId });
    
    const stream = mockStreams.find(s => s.id === streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found',
      });
    }
    
    res.json({
      success: true,
      stream,
    });
  } catch (error) {
    logger.error('Error fetching stream details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stream details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

