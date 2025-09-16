import mongoose, { Document, Schema } from 'mongoose';
import logger from '../../utils/logger';
import { aiModelManager } from '../../utils/ai-models';

// Interfaces for Personal Brain
export interface UserContext {
  userId: string;
  sessionId: string;
  currentTopic?: string;
  conversationHistory: ConversationEntry[];
  emotionalState: EmotionalState;
  preferences: UserPreferences;
  learningProfile: LearningProfile;
  lastInteraction: Date;
  contextDepth: number;
}

export interface ConversationEntry {
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  topic: string;
  emotionalTone: string;
  satisfaction: number; // 0-1 scale
  context: Record<string, any>;
}

export interface EmotionalState {
  current: string;
  intensity: number; // 0-1 scale
  history: EmotionalSnapshot[];
  triggers: string[];
  patterns: EmotionalPattern[];
}

export interface EmotionalSnapshot {
  timestamp: Date;
  emotion: string;
  intensity: number;
  context: string;
  trigger?: string;
}

export interface EmotionalPattern {
  pattern: string;
  frequency: number;
  triggers: string[];
  responses: string[];
  confidence: number;
}

export interface UserPreferences {
  communicationStyle: {
    formality: number; // 0-1 scale
    humor: number;
    directness: number;
    empathy: number;
  };
  contentPreferences: {
    topics: string[];
    formats: string[];
    length: 'short' | 'medium' | 'long';
    complexity: 'simple' | 'moderate' | 'complex';
  };
  culturalContext: {
    language: string;
    region: string;
    culturalValues: string[];
    traditions: string[];
  };
  learningStyle: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    reading: number;
  };
}

export interface LearningProfile {
  strengths: string[];
  interests: string[];
  knowledgeGaps: string[];
  learningVelocity: number;
  retentionRate: number;
  preferredLearningTimes: number[];
  difficultyPreference: 'easy' | 'moderate' | 'challenging';
}

export interface PersonalBrainRequest {
  userId: string;
  sessionId: string;
  message: string;
  context?: Record<string, any>;
  metadata?: {
    platform: string;
    device: string;
    location?: string;
  };
}

export interface PersonalBrainResponse {
  response: string;
  emotionalTone: string;
  contextUpdate: Record<string, any>;
  learningInsights: string[];
  recommendations: string[];
  confidence: number;
}

// MongoDB Schemas
const ConversationEntrySchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  userMessage: { type: String, required: true },
  aiResponse: { type: String, required: true },
  topic: { type: String, required: true },
  emotionalTone: { type: String, required: true },
  satisfaction: { type: Number, min: 0, max: 1, default: 0.5 },
  context: { type: Schema.Types.Mixed, default: {} }
});

const EmotionalSnapshotSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  emotion: { type: String, required: true },
  intensity: { type: Number, min: 0, max: 1, required: true },
  context: { type: String, required: true },
  trigger: { type: String }
});

const EmotionalPatternSchema = new Schema({
  pattern: { type: String, required: true },
  frequency: { type: Number, required: true },
  triggers: [{ type: String }],
  responses: [{ type: String }],
  confidence: { type: Number, min: 0, max: 1, required: true }
});

const EmotionalStateSchema = new Schema({
  current: { type: String, required: true },
  intensity: { type: Number, min: 0, max: 1, required: true },
  history: [EmotionalSnapshotSchema],
  triggers: [{ type: String }],
  patterns: [EmotionalPatternSchema]
});

const UserPreferencesSchema = new Schema({
  communicationStyle: {
    formality: { type: Number, min: 0, max: 1, default: 0.5 },
    humor: { type: Number, min: 0, max: 1, default: 0.5 },
    directness: { type: Number, min: 0, max: 1, default: 0.5 },
    empathy: { type: Number, min: 0, max: 1, default: 0.5 }
  },
  contentPreferences: {
    topics: [{ type: String }],
    formats: [{ type: String }],
    length: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    complexity: { type: String, enum: ['simple', 'moderate', 'complex'], default: 'moderate' }
  },
  culturalContext: {
    language: { type: String, default: 'en' },
    region: { type: String, default: 'global' },
    culturalValues: [{ type: String }],
    traditions: [{ type: String }]
  },
  learningStyle: {
    visual: { type: Number, min: 0, max: 1, default: 0.25 },
    auditory: { type: Number, min: 0, max: 1, default: 0.25 },
    kinesthetic: { type: Number, min: 0, max: 1, default: 0.25 },
    reading: { type: Number, min: 0, max: 1, default: 0.25 }
  }
});

const LearningProfileSchema = new Schema({
  strengths: [{ type: String }],
  interests: [{ type: String }],
  knowledgeGaps: [{ type: String }],
  learningVelocity: { type: Number, min: 0, max: 1, default: 0.5 },
  retentionRate: { type: Number, min: 0, max: 1, default: 0.5 },
  preferredLearningTimes: [{ type: Number, min: 0, max: 23 }],
  difficultyPreference: { type: String, enum: ['easy', 'moderate', 'challenging'], default: 'moderate' }
});

const UserContextSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  currentTopic: { type: String },
  conversationHistory: [ConversationEntrySchema],
  emotionalState: EmotionalStateSchema,
  preferences: UserPreferencesSchema,
  learningProfile: LearningProfileSchema,
  lastInteraction: { type: Date, default: Date.now },
  contextDepth: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Create models
const UserContextModel = mongoose.model<UserContext & Document>('UserContext', UserContextSchema);

export class PersonalBrainService {
  private static instance: PersonalBrainService;
  private contextCache: Map<string, UserContext> = new Map();
  private learningCache: Map<string, any> = new Map();

  private constructor() {
    logger.info('PersonalBrainService initialized');
  }

  static getInstance(): PersonalBrainService {
    if (!PersonalBrainService.instance) {
      PersonalBrainService.instance = new PersonalBrainService();
    }
    return PersonalBrainService.instance;
  }

  /**
   * Process user message and generate personalized response
   */
  async processMessage(request: PersonalBrainRequest): Promise<PersonalBrainResponse> {
    try {
      logger.info('Processing message for Personal Brain', { userId: request.userId });

      // Get or create user context
      const userContext = await this.getUserContext(request.userId, request.sessionId);
      
      // Analyze emotional state
      const emotionalAnalysis = await this.analyzeEmotionalState(request.message, userContext);
      
      // Update user preferences based on interaction
      await this.updateUserPreferences(userContext, request.message, emotionalAnalysis);
      
      // Generate personalized response
      const response = await this.generatePersonalizedResponse(userContext, request.message, emotionalAnalysis);
      
      // Update conversation history
      await this.updateConversationHistory(userContext, request.message, response);
      
      // Learn from interaction
      const learningInsights = await this.extractLearningInsights(userContext, request.message, response);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(userContext, learningInsights);
      
      // Save updated context
      await this.saveUserContext(userContext);

      return {
        response: response.text,
        emotionalTone: response.emotionalTone,
        contextUpdate: response.contextUpdate,
        learningInsights,
        recommendations,
        confidence: response.confidence
      };

    } catch (error) {
      logger.error('Error processing message in Personal Brain:', error);
      throw error;
    }
  }

  /**
   * Get or create user context
   */
  private async getUserContext(userId: string, sessionId: string): Promise<UserContext> {
    try {
      // Check cache first
      const cacheKey = `${userId}_${sessionId}`;
      if (this.contextCache.has(cacheKey)) {
        return this.contextCache.get(cacheKey)!;
      }

      // Try to load from database
      let userContext = await UserContextModel.findOne({ userId }).lean();
      
      if (!userContext) {
        // Create new context
        userContext = {
          userId,
          sessionId,
          conversationHistory: [],
          emotionalState: {
            current: 'neutral',
            intensity: 0.5,
            history: [],
            triggers: [],
            patterns: []
          },
          preferences: {
            communicationStyle: {
              formality: 0.5,
              humor: 0.5,
              directness: 0.5,
              empathy: 0.5
            },
            contentPreferences: {
              topics: [],
              formats: [],
              length: 'medium',
              complexity: 'moderate'
            },
            culturalContext: {
              language: 'en',
              region: 'global',
              culturalValues: [],
              traditions: []
            },
            learningStyle: {
              visual: 0.25,
              auditory: 0.25,
              kinesthetic: 0.25,
              reading: 0.25
            }
          },
          learningProfile: {
            strengths: [],
            interests: [],
            knowledgeGaps: [],
            learningVelocity: 0.5,
            retentionRate: 0.5,
            preferredLearningTimes: [],
            difficultyPreference: 'moderate'
          },
          lastInteraction: new Date(),
          contextDepth: 0
        };
      }

      // Update session ID
      userContext.sessionId = sessionId;
      userContext.lastInteraction = new Date();

      // Cache the context
      this.contextCache.set(cacheKey, userContext as UserContext);

      return userContext as UserContext;

    } catch (error) {
      logger.error('Error getting user context:', error);
      throw error;
    }
  }

  /**
   * Analyze emotional state from message
   */
  private async analyzeEmotionalState(message: string, context: UserContext): Promise<any> {
    try {
      const prompt = `
        Analyze the emotional state of this message: "${message}"
        
        Context:
        - Previous emotional state: ${context.emotionalState.current}
        - Recent conversation topics: ${context.conversationHistory.slice(-3).map(c => c.topic).join(', ')}
        - User preferences: ${JSON.stringify(context.preferences.communicationStyle)}
        
        Provide analysis in JSON format:
        {
          "emotion": "primary emotion",
          "intensity": 0.0-1.0,
          "secondary_emotions": ["emotion1", "emotion2"],
          "triggers": ["trigger1", "trigger2"],
          "confidence": 0.0-1.0
        }
      `;

      const analysis = await aiModelManager.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      return JSON.parse(analysis);

    } catch (error) {
      logger.error('Error analyzing emotional state:', error);
      return {
        emotion: 'neutral',
        intensity: 0.5,
        secondary_emotions: [],
        triggers: [],
        confidence: 0.5
      };
    }
  }

  /**
   * Update user preferences based on interaction
   */
  private async updateUserPreferences(context: UserContext, message: string, emotionalAnalysis: any): Promise<void> {
    try {
      // Analyze communication style preferences
      const styleAnalysis = await this.analyzeCommunicationStyle(message, context);
      
      // Update preferences based on analysis
      context.preferences.communicationStyle.formality = this.updatePreference(
        context.preferences.communicationStyle.formality,
        styleAnalysis.formality,
        0.1
      );
      
      context.preferences.communicationStyle.humor = this.updatePreference(
        context.preferences.communicationStyle.humor,
        styleAnalysis.humor,
        0.1
      );
      
      context.preferences.communicationStyle.directness = this.updatePreference(
        context.preferences.communicationStyle.directness,
        styleAnalysis.directness,
        0.1
      );

      // Update emotional state
      context.emotionalState.current = emotionalAnalysis.emotion;
      context.emotionalState.intensity = emotionalAnalysis.intensity;
      
      // Add to emotional history
      context.emotionalState.history.push({
        timestamp: new Date(),
        emotion: emotionalAnalysis.emotion,
        intensity: emotionalAnalysis.intensity,
        context: message.substring(0, 100),
        trigger: emotionalAnalysis.triggers[0]
      });

      // Keep only last 50 emotional snapshots
      if (context.emotionalState.history.length > 50) {
        context.emotionalState.history = context.emotionalState.history.slice(-50);
      }

    } catch (error) {
      logger.error('Error updating user preferences:', error);
    }
  }

  /**
   * Generate personalized response
   */
  private async generatePersonalizedResponse(context: UserContext, message: string, emotionalAnalysis: any): Promise<any> {
    try {
      const conversationContext = context.conversationHistory.slice(-5).map(c => 
        `User: ${c.userMessage}\nAI: ${c.aiResponse}`
      ).join('\n');

      const prompt = `
        Generate a personalized response to: "${message}"
        
        User Context:
        - Emotional state: ${emotionalAnalysis.emotion} (${emotionalAnalysis.intensity})
        - Communication style: ${JSON.stringify(context.preferences.communicationStyle)}
        - Recent conversation: ${conversationContext}
        - Cultural context: ${context.preferences.culturalContext.language}, ${context.preferences.culturalContext.region}
        
        Guidelines:
        - Match the user's communication style preferences
        - Respond appropriately to their emotional state
        - Maintain conversation continuity
        - Be culturally sensitive
        - Provide value and engagement
        
        Response format:
        {
          "text": "your response",
          "emotionalTone": "matching tone",
          "contextUpdate": {"key": "value"},
          "confidence": 0.0-1.0
        }
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.7,
        maxTokens: 300
      });

      return JSON.parse(response);

    } catch (error) {
      logger.error('Error generating personalized response:', error);
      return {
        text: "I understand. How can I help you further?",
        emotionalTone: "supportive",
        contextUpdate: {},
        confidence: 0.5
      };
    }
  }

  /**
   * Update conversation history
   */
  private async updateConversationHistory(context: UserContext, message: string, response: any): Promise<void> {
    try {
      const entry: ConversationEntry = {
        timestamp: new Date(),
        userMessage: message,
        aiResponse: response.text,
        topic: this.extractTopic(message),
        emotionalTone: response.emotionalTone,
        satisfaction: 0.5, // Will be updated based on user feedback
        context: response.contextUpdate
      };

      context.conversationHistory.push(entry);
      
      // Keep only last 100 conversation entries
      if (context.conversationHistory.length > 100) {
        context.conversationHistory = context.conversationHistory.slice(-100);
      }

      // Update context depth
      context.contextDepth = Math.min(context.contextDepth + 1, 10);

    } catch (error) {
      logger.error('Error updating conversation history:', error);
    }
  }

  /**
   * Extract learning insights from interaction
   */
  private async extractLearningInsights(context: UserContext, message: string, response: any): Promise<string[]> {
    try {
      const insights: string[] = [];

      // Analyze topic interests
      const topic = this.extractTopic(message);
      if (!context.learningProfile.interests.includes(topic)) {
        insights.push(`User showing interest in: ${topic}`);
      }

      // Analyze communication patterns
      if (message.length > 100 && context.preferences.communicationStyle.directness < 0.3) {
        insights.push('User prefers detailed explanations');
      }

      // Analyze emotional patterns
      if (context.emotionalState.history.length > 5) {
        const recentEmotions = context.emotionalState.history.slice(-5).map(h => h.emotion);
        const mostCommon = this.getMostCommon(recentEmotions);
        if (mostCommon !== context.emotionalState.current) {
          insights.push(`Emotional pattern shift detected: ${mostCommon}`);
        }
      }

      return insights;

    } catch (error) {
      logger.error('Error extracting learning insights:', error);
      return [];
    }
  }

  /**
   * Generate recommendations based on user context
   */
  private async generateRecommendations(context: UserContext, insights: string[]): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      // Content recommendations based on interests
      if (context.learningProfile.interests.length > 0) {
        recommendations.push(`Explore more content about: ${context.learningProfile.interests.slice(-3).join(', ')}`);
      }

      // Communication style recommendations
      if (context.preferences.communicationStyle.humor > 0.7) {
        recommendations.push('Consider adding more humor to interactions');
      }

      // Learning recommendations
      if (context.learningProfile.knowledgeGaps.length > 0) {
        recommendations.push(`Address knowledge gaps in: ${context.learningProfile.knowledgeGaps.slice(-2).join(', ')}`);
      }

      return recommendations;

    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Save user context to database
   */
  private async saveUserContext(context: UserContext): Promise<void> {
    try {
      await UserContextModel.findOneAndUpdate(
        { userId: context.userId },
        context,
        { upsert: true, new: true }
      );

      // Update cache
      const cacheKey = `${context.userId}_${context.sessionId}`;
      this.contextCache.set(cacheKey, context);

    } catch (error) {
      logger.error('Error saving user context:', error);
    }
  }

  // Helper methods
  private updatePreference(current: number, newValue: number, learningRate: number): number {
    return Math.max(0, Math.min(1, current + (newValue - current) * learningRate));
  }

  private extractTopic(message: string): string {
    // Simple topic extraction - can be enhanced with NLP
    const words = message.toLowerCase().split(' ');
    const commonTopics = ['technology', 'music', 'art', 'science', 'sports', 'food', 'travel', 'education'];
    
    for (const topic of commonTopics) {
      if (words.includes(topic)) {
        return topic;
      }
    }
    
    return 'general';
  }

  private analyzeCommunicationStyle(message: string, context: UserContext): any {
    // Simple analysis - can be enhanced with NLP
    return {
      formality: message.includes('please') || message.includes('thank you') ? 0.8 : 0.3,
      humor: message.includes('!') || message.includes('haha') ? 0.8 : 0.3,
      directness: message.length < 50 ? 0.8 : 0.4
    };
  }

  private getMostCommon(arr: string[]): string {
    const counts: Record<string, number> = {};
    arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Get user insights for analytics
   */
  async getUserInsights(userId: string): Promise<any> {
    try {
      const context = await UserContextModel.findOne({ userId }).lean();
      if (!context) {
        return { error: 'User context not found' };
      }

      return {
        userId,
        totalInteractions: context.conversationHistory.length,
        currentEmotionalState: context.emotionalState.current,
        communicationStyle: context.preferences.communicationStyle,
        interests: context.learningProfile.interests,
        learningVelocity: context.learningProfile.learningVelocity,
        lastInteraction: context.lastInteraction,
        contextDepth: context.contextDepth
      };

    } catch (error) {
      logger.error('Error getting user insights:', error);
      throw error;
    }
  }

  /**
   * Clear user context (for privacy/GDPR compliance)
   */
  async clearUserContext(userId: string): Promise<void> {
    try {
      await UserContextModel.deleteOne({ userId });
      
      // Clear from cache
      for (const [key, context] of this.contextCache.entries()) {
        if (context.userId === userId) {
          this.contextCache.delete(key);
        }
      }

      logger.info('User context cleared', { userId });

    } catch (error) {
      logger.error('Error clearing user context:', error);
      throw error;
    }
  }
}
