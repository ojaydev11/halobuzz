import { Schema, model, Document } from 'mongoose';
import { logger } from '@/config/logger';
import { getRedisClient } from '@/config/redis';
import { getSocketIO } from '@/config/socket';

// Interfaces
export interface Story {
  storyId: string;
  creatorId: string;
  title: string;
  description: string;
  genre: 'adventure' | 'romance' | 'mystery' | 'horror' | 'comedy' | 'drama' | 'fantasy' | 'sci-fi';
  status: 'draft' | 'active' | 'completed' | 'archived';
  settings: {
    allowUserChoices: boolean;
    allowUserContent: boolean;
    maxParticipants: number;
    votingEnabled: boolean;
    timeLimit?: number; // minutes per chapter
  };
  chapters: StoryChapter[];
  participants: string[];
  currentChapter: number;
  totalViews: number;
  totalInteractions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryChapter {
  chapterId: string;
  chapterNumber: number;
  title: string;
  content: string;
  mediaUrl?: string;
  choices: StoryChoice[];
  userContent: UserGeneratedContent[];
  votes: ChapterVote[];
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface StoryChoice {
  choiceId: string;
  text: string;
  consequence: string;
  nextChapterId?: string;
  votes: number;
  voters: string[];
  createdBy: string;
  createdAt: Date;
}

export interface UserGeneratedContent {
  contentId: string;
  userId: string;
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
  mediaUrl?: string;
  votes: number;
  voters: string[];
  approved: boolean;
  createdAt: Date;
}

export interface ChapterVote {
  userId: string;
  choiceId?: string;
  contentId?: string;
  timestamp: Date;
}

export interface StoryProgress {
  userId: string;
  storyId: string;
  currentChapter: number;
  choices: { chapterId: string; choiceId: string }[];
  contentSubmitted: string[];
  totalTimeSpent: number;
  lastActivity: Date;
}

export interface StoryAnalytics {
  storyId: string;
  totalViews: number;
  totalParticipants: number;
  averageEngagement: number;
  chapterAnalytics: {
    chapterId: string;
    views: number;
    interactions: number;
    averageTimeSpent: number;
    popularChoices: { choiceId: string; votes: number }[];
  }[];
  userDemographics: {
    ageGroups: { [key: string]: number };
    locations: { [key: string]: number };
    devices: { [key: string]: number };
  };
}

// Mongoose Schemas
const StoryChoiceSchema = new Schema<StoryChoice>({
  choiceId: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  consequence: { type: String, required: true },
  nextChapterId: { type: String },
  votes: { type: Number, default: 0 },
  voters: [{ type: String }],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const UserGeneratedContentSchema = new Schema<UserGeneratedContent>({
  contentId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'video', 'audio'], required: true },
  content: { type: String, required: true },
  mediaUrl: { type: String },
  votes: { type: Number, default: 0 },
  voters: [{ type: String }],
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const ChapterVoteSchema = new Schema<ChapterVote>({
  userId: { type: String, required: true },
  choiceId: { type: String },
  contentId: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const StoryChapterSchema = new Schema<StoryChapter>({
  chapterId: { type: String, required: true, unique: true },
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  mediaUrl: { type: String },
  choices: [StoryChoiceSchema],
  userContent: [UserGeneratedContentSchema],
  votes: [ChapterVoteSchema],
  status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const StorySchema = new Schema<Story>({
  storyId: { type: String, required: true, unique: true },
  creatorId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  genre: { type: String, enum: ['adventure', 'romance', 'mystery', 'horror', 'comedy', 'drama', 'fantasy', 'sci-fi'], required: true },
  status: { type: String, enum: ['draft', 'active', 'completed', 'archived'], default: 'draft' },
  settings: {
    allowUserChoices: { type: Boolean, default: true },
    allowUserContent: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 1000 },
    votingEnabled: { type: Boolean, default: true },
    timeLimit: { type: Number } // minutes
  },
  chapters: [StoryChapterSchema],
  participants: [{ type: String }],
  currentChapter: { type: Number, default: 0 },
  totalViews: { type: Number, default: 0 },
  totalInteractions: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const StoryProgressSchema = new Schema<StoryProgress>({
  userId: { type: String, required: true },
  storyId: { type: String, required: true },
  currentChapter: { type: Number, default: 0 },
  choices: [{
    chapterId: { type: String, required: true },
    choiceId: { type: String, required: true }
  }],
  contentSubmitted: [{ type: String }],
  totalTimeSpent: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Models
const StoryModel = model<Story>('Story', StorySchema);
const StoryProgressModel = model<StoryProgress>('StoryProgress', StoryProgressSchema);

export class InteractiveStorytellingService {
  private static instance: InteractiveStorytellingService;

  public static getInstance(): InteractiveStorytellingService {
    if (!InteractiveStorytellingService.instance) {
      InteractiveStorytellingService.instance = new InteractiveStorytellingService();
    }
    return InteractiveStorytellingService.instance;
  }

  /**
   * Create a new interactive story
   */
  async createStory(
    creatorId: string,
    title: string,
    description: string,
    genre: 'adventure' | 'romance' | 'mystery' | 'horror' | 'comedy' | 'drama' | 'fantasy' | 'sci-fi',
    settings: {
      allowUserChoices?: boolean;
      allowUserContent?: boolean;
      maxParticipants?: number;
      votingEnabled?: boolean;
      timeLimit?: number;
    }
  ): Promise<Story> {
    try {
      const storyId = this.generateStoryId();
      
      const story: Story = {
        storyId,
        creatorId,
        title,
        description,
        genre,
        status: 'draft',
        settings: {
          allowUserChoices: settings.allowUserChoices ?? true,
          allowUserContent: settings.allowUserContent ?? true,
          maxParticipants: settings.maxParticipants ?? 1000,
          votingEnabled: settings.votingEnabled ?? true,
          timeLimit: settings.timeLimit
        },
        chapters: [],
        participants: [creatorId],
        currentChapter: 0,
        totalViews: 0,
        totalInteractions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdStory = await StoryModel.create(story);
      
      // Cache story for quick access
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `story:${storyId}`,
        3600,
        JSON.stringify(story)
      );

      logger.info('Interactive story created', { storyId, creatorId, genre });
      return createdStory;
    } catch (error) {
      logger.error('Error creating interactive story', { error, creatorId, genre });
      throw error;
    }
  }

  /**
   * Add a chapter to the story
   */
  async addChapter(
    storyId: string,
    creatorId: string,
    title: string,
    content: string,
    mediaUrl?: string,
    timeLimit?: number
  ): Promise<StoryChapter> {
    try {
      const story = await this.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      if (story.creatorId !== creatorId) {
        throw new Error('Only the creator can add chapters');
      }

      const chapterId = this.generateChapterId();
      const chapterNumber = story.chapters.length + 1;
      const expiresAt = timeLimit ? new Date(Date.now() + timeLimit * 60 * 1000) : undefined;

      const chapter: StoryChapter = {
        chapterId,
        chapterNumber,
        title,
        content,
        mediaUrl,
        choices: [],
        userContent: [],
        votes: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt
      };

      story.chapters.push(chapter);
      story.updatedAt = new Date();
      await StoryModel.findByIdAndUpdate((story as any)._id, story);

      // Update cache
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `story:${storyId}`,
        3600,
        JSON.stringify(story)
      );

      logger.info('Chapter added to story', { storyId, chapterId, chapterNumber });
      return chapter;
    } catch (error) {
      logger.error('Error adding chapter', { error, storyId, creatorId });
      throw error;
    }
  }

  /**
   * Add a choice to a chapter
   */
  async addChoice(
    storyId: string,
    chapterId: string,
    userId: string,
    text: string,
    consequence: string,
    nextChapterId?: string
  ): Promise<StoryChoice> {
    try {
      const story = await this.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      const chapter = story.chapters.find(c => c.chapterId === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      if (!story.settings.allowUserChoices && story.creatorId !== userId) {
        throw new Error('User choices are not allowed for this story');
      }

      const choiceId = this.generateChoiceId();
      const choice: StoryChoice = {
        choiceId,
        text,
        consequence,
        nextChapterId,
        votes: 0,
        voters: [],
        createdBy: userId,
        createdAt: new Date()
      };

      chapter.choices.push(choice);
      story.updatedAt = new Date();
      await StoryModel.findByIdAndUpdate((story as any)._id, story);

      // Update cache
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `story:${storyId}`,
        3600,
        JSON.stringify(story)
      );

      // Emit real-time update
      const io = getSocketIO();
      if (io) {
        io.to(`story:${storyId}`).emit('choice_added', {
          chapterId,
          choiceId,
          text,
          createdBy: userId
        });
      }

      logger.info('Choice added to chapter', { storyId, chapterId, choiceId });
      return choice;
    } catch (error) {
      logger.error('Error adding choice', { error, storyId, chapterId, userId });
      throw error;
    }
  }

  /**
   * Vote on a choice or user content
   */
  async vote(
    storyId: string,
    chapterId: string,
    userId: string,
    choiceId?: string,
    contentId?: string
  ): Promise<void> {
    try {
      const story = await this.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      if (!story.settings.votingEnabled) {
        throw new Error('Voting is disabled for this story');
      }

      const chapter = story.chapters.find(c => c.chapterId === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      // Check if user already voted
      const existingVote = chapter.votes.find(v => v.userId === userId);
      if (existingVote) {
        throw new Error('User has already voted on this chapter');
      }

      if (choiceId) {
        const choice = chapter.choices.find(c => c.choiceId === choiceId);
        if (!choice) {
          throw new Error('Choice not found');
        }

        choice.votes += 1;
        choice.voters.push(userId);
      }

      if (contentId) {
        const content = chapter.userContent.find(c => c.contentId === contentId);
        if (!content) {
          throw new Error('User content not found');
        }

        content.votes += 1;
        content.voters.push(userId);
      }

      // Add vote record
      chapter.votes.push({
        userId,
        choiceId,
        contentId,
        timestamp: new Date()
      });

      story.totalInteractions += 1;
      story.updatedAt = new Date();
      await StoryModel.findByIdAndUpdate((story as any)._id, story);

      // Update cache
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `story:${storyId}`,
        3600,
        JSON.stringify(story)
      );

      // Emit real-time update
      const io = getSocketIO();
      if (io) {
        io.to(`story:${storyId}`).emit('vote_cast', {
          chapterId,
          userId,
          choiceId,
          contentId
        });
      }

      logger.info('Vote cast', { storyId, chapterId, userId, choiceId, contentId });
    } catch (error) {
      logger.error('Error casting vote', { error, storyId, chapterId, userId });
      throw error;
    }
  }

  /**
   * Submit user-generated content
   */
  async submitUserContent(
    storyId: string,
    chapterId: string,
    userId: string,
    type: 'text' | 'image' | 'video' | 'audio',
    content: string,
    mediaUrl?: string
  ): Promise<UserGeneratedContent> {
    try {
      const story = await this.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      if (!story.settings.allowUserContent) {
        throw new Error('User content is not allowed for this story');
      }

      const chapter = story.chapters.find(c => c.chapterId === chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }

      const contentId = this.generateContentId();
      const userContent: UserGeneratedContent = {
        contentId,
        userId,
        type,
        content,
        mediaUrl,
        votes: 0,
        voters: [],
        approved: false,
        createdAt: new Date()
      };

      chapter.userContent.push(userContent);
      story.totalInteractions += 1;
      story.updatedAt = new Date();
      await StoryModel.findByIdAndUpdate((story as any)._id, story);

      // Update cache
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `story:${storyId}`,
        3600,
        JSON.stringify(story)
      );

      // Emit real-time update
      const io = getSocketIO();
      if (io) {
        io.to(`story:${storyId}`).emit('user_content_submitted', {
          chapterId,
          contentId,
          userId,
          type,
          content
        });
      }

      logger.info('User content submitted', { storyId, chapterId, contentId, userId });
      return userContent;
    } catch (error) {
      logger.error('Error submitting user content', { error, storyId, chapterId, userId });
      throw error;
    }
  }

  /**
   * Progress to next chapter
   */
  async progressToNextChapter(storyId: string, userId: string): Promise<StoryChapter | null> {
    try {
      const story = await this.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      const currentChapter = story.chapters[story.currentChapter];
      if (!currentChapter) {
        throw new Error('Current chapter not found');
      }

      // Find the most popular choice
      const popularChoice = currentChapter.choices.reduce((prev, current) => 
        (prev.votes > current.votes) ? prev : current
      );

      if (!popularChoice || popularChoice.votes === 0) {
        throw new Error('No choices have been voted on');
      }

      // Update user progress
      await this.updateUserProgress(userId, storyId, story.currentChapter, popularChoice.choiceId);

      // Move to next chapter
      story.currentChapter += 1;
      story.updatedAt = new Date();
      await StoryModel.findByIdAndUpdate((story as any)._id, story);

      // Update cache
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `story:${storyId}`,
        3600,
        JSON.stringify(story)
      );

      const nextChapter = story.chapters[story.currentChapter];
      if (nextChapter) {
        // Emit real-time update
        const io = getSocketIO();
        if (io) {
          io.to(`story:${storyId}`).emit('chapter_progressed', {
            storyId,
            newChapter: story.currentChapter,
            popularChoice: popularChoice.choiceId,
            nextChapter: nextChapter.chapterId
          });
        }
      }

      logger.info('Progressed to next chapter', { storyId, userId, newChapter: story.currentChapter });
      return nextChapter || null;
    } catch (error) {
      logger.error('Error progressing to next chapter', { error, storyId, userId });
      throw error;
    }
  }

  /**
   * Get story with current chapter
   */
  async getStory(storyId: string): Promise<Story | null> {
    try {
      // Try cache first
      const redisClient = getRedisClient();
      const cached = await redisClient.get(`story:${storyId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const story = await StoryModel.findOne({ storyId });
      if (story) {
        // Cache for future requests
        await redisClient.setEx(
          `story:${storyId}`,
          3600,
          JSON.stringify(story)
        );
      }

      return story;
    } catch (error) {
      logger.error('Error getting story', { error, storyId });
      throw error;
    }
  }

  /**
   * Get user's story progress
   */
  async getUserProgress(userId: string, storyId: string): Promise<StoryProgress | null> {
    try {
      const progress = await StoryProgressModel.findOne({ userId, storyId });
      return progress;
    } catch (error) {
      logger.error('Error getting user progress', { error, userId, storyId });
      throw error;
    }
  }

  /**
   * Update user progress
   */
  private async updateUserProgress(
    userId: string,
    storyId: string,
    chapterNumber: number,
    choiceId: string
  ): Promise<void> {
    try {
      const progress = await StoryProgressModel.findOne({ userId, storyId });
      
      if (progress) {
        progress.currentChapter = chapterNumber;
        progress.choices.push({ chapterId: storyId, choiceId });
        progress.lastActivity = new Date();
        await StoryProgressModel.findByIdAndUpdate(progress._id, progress);
      } else {
        const newProgress: StoryProgress = {
          userId,
          storyId,
          currentChapter: chapterNumber,
          choices: [{ chapterId: storyId, choiceId }],
          contentSubmitted: [],
          totalTimeSpent: 0,
          lastActivity: new Date()
        };
        await StoryProgressModel.create(newProgress);
      }
    } catch (error) {
      logger.error('Error updating user progress', { error, userId, storyId });
      throw error;
    }
  }

  /**
   * Get story analytics
   */
  async getStoryAnalytics(storyId: string): Promise<StoryAnalytics> {
    try {
      const story = await this.getStory(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      const chapterAnalytics = story.chapters.map(chapter => ({
        chapterId: chapter.chapterId,
        views: chapter.votes.length,
        interactions: chapter.choices.length + chapter.userContent.length,
        averageTimeSpent: 0, // Would need to track this separately
        popularChoices: chapter.choices
          .sort((a, b) => b.votes - a.votes)
          .slice(0, 3)
          .map(choice => ({ choiceId: choice.choiceId, votes: choice.votes }))
      }));

      const analytics: StoryAnalytics = {
        storyId,
        totalViews: story.totalViews,
        totalParticipants: story.participants.length,
        averageEngagement: story.totalInteractions / Math.max(story.participants.length, 1),
        chapterAnalytics,
        userDemographics: {
          ageGroups: {}, // Would need user data
          locations: {}, // Would need user data
          devices: {} // Would need user data
        }
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting story analytics', { error, storyId });
      throw error;
    }
  }

  /**
   * Get trending stories
   */
  async getTrendingStories(limit: number = 10): Promise<Story[]> {
    try {
      const stories = await StoryModel.find({ status: 'active' })
        .sort({ totalInteractions: -1, totalViews: -1 })
        .limit(limit);

      return stories;
    } catch (error) {
      logger.error('Error getting trending stories', { error });
      throw error;
    }
  }

  // Helper methods
  private generateStoryId(): string {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChapterId(): string {
    return `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChoiceId(): string {
    return `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateContentId(): string {
    return `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default InteractiveStorytellingService;
