import logger from '../../utils/logger';
import { aiModelManager } from '../../utils/ai-models';

export interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'gift' | 'system';
  metadata?: {
    sentiment?: number;
    language?: string;
    culturalContext?: string;
  };
}

export interface ConversationInsights {
  mood: string;
  engagementLevel: 'low' | 'medium' | 'high';
  dominantTopics: string[];
  culturalContext: string;
  suggestedActions: string[];
  conversationFlow: 'stagnant' | 'active' | 'declining' | 'growing';
  participantActivity: {
    activeUsers: number;
    silentUsers: number;
    newUsers: number;
  };
  nextBestActions: Array<{
    action: string;
    confidence: number;
    reasoning: string;
  }>;
}

export interface IcebreakerRequest {
  streamContext: {
    streamId: string;
    hostId: string;
    category: string;
    currentViewers: number;
    duration: number;
    topics: string[];
  };
  userProfile: {
    userId: string;
    interests: string[];
    culturalBackground: string;
    language: string;
    interactionHistory: any[];
    personalityType?: string;
  };
  targetAudience: {
    ageRange: string;
    interests: string[];
    culturalDiversity: string[];
  };
}

export interface CulturalResponse {
  response: string;
  culturalContext: string;
  appropriateness: number;
  expectedEngagement: number;
  alternatives: string[];
}

export class ConversationAIService {
  private static instance: ConversationAIService;
  private conversationCache: Map<string, Message[]> = new Map();
  private culturalContexts: Map<string, any> = new Map();
  private personalityProfiles: Map<string, any> = new Map();

  private constructor() {
    this.initializeCulturalContexts();
    this.initializePersonalityProfiles();
    logger.info('ConversationAIService initialized');
  }

  static getInstance(): ConversationAIService {
    if (!ConversationAIService.instance) {
      ConversationAIService.instance = new ConversationAIService();
    }
    return ConversationAIService.instance;
  }

  /**
   * Generate conversation starters for shy users
   */
  async generateIcebreakers(request: IcebreakerRequest): Promise<string[]> {
    try {
      const { streamContext, userProfile, targetAudience } = request;
      
      // Analyze stream context and user profile
      const contextAnalysis = await this.analyzeStreamContext(streamContext);
      const userAnalysis = await this.analyzeUserProfile(userProfile);
      const audienceAnalysis = await this.analyzeTargetAudience(targetAudience);

      // Generate icebreakers based on analysis
      const icebreakers = await this.generateContextualIcebreakers(
        contextAnalysis,
        userAnalysis,
        audienceAnalysis
      );

      // Filter and rank icebreakers
      const rankedIcebreakers = await this.rankIcebreakers(icebreakers, userProfile);

      logger.info(`Generated ${rankedIcebreakers.length} icebreakers for user ${userProfile.userId}`, {
        streamCategory: streamContext.category,
        currentViewers: streamContext.currentViewers,
        userInterests: userProfile.interests.length
      });

      return rankedIcebreakers.slice(0, 5); // Return top 5
    } catch (error) {
      logger.error('Error generating icebreakers:', error);
      return this.getDefaultIcebreakers();
    }
  }

  /**
   * Real-time conversation analysis and suggestions
   */
  async analyzeConversationFlow(chatHistory: Message[]): Promise<ConversationInsights> {
    try {
      if (chatHistory.length === 0) {
        return this.getDefaultInsights();
      }

      // Analyze conversation patterns
      const moodAnalysis = await this.analyzeConversationMood(chatHistory);
      const topicAnalysis = await this.extractDominantTopics(chatHistory);
      const engagementAnalysis = await this.analyzeEngagementLevel(chatHistory);
      const flowAnalysis = await this.analyzeConversationFlow(chatHistory);
      const participantAnalysis = await this.analyzeParticipantActivity(chatHistory);

      // Generate insights
      const insights: ConversationInsights = {
        mood: moodAnalysis.mood,
        engagementLevel: engagementAnalysis.level,
        dominantTopics: topicAnalysis.topics,
        culturalContext: await this.detectCulturalContext(chatHistory),
        suggestedActions: await this.generateSuggestedActions(chatHistory, moodAnalysis),
        conversationFlow: flowAnalysis.flow,
        participantActivity: participantAnalysis,
        nextBestActions: await this.generateNextBestActions(chatHistory, moodAnalysis)
      };

      logger.info('Conversation analysis completed', {
        messageCount: chatHistory.length,
        mood: insights.mood,
        engagementLevel: insights.engagementLevel,
        dominantTopics: insights.dominantTopics.length,
        participantActivity: insights.participantActivity.activeUsers
      });

      return insights;
    } catch (error) {
      logger.error('Error analyzing conversation flow:', error);
      return this.getDefaultInsights();
    }
  }

  /**
   * Cultural context-aware responses
   */
  async generateCulturallyAppropriateResponses(context: any): Promise<string[]> {
    try {
      const { message, userCulturalBackground, streamCulturalContext, targetAudience } = context;
      
      // Analyze cultural context
      const culturalAnalysis = await this.analyzeCulturalContext(
        message,
        userCulturalBackground,
        streamCulturalContext
      );

      // Generate culturally appropriate responses
      const responses = await this.generateCulturalResponses(culturalAnalysis, targetAudience);

      // Validate cultural appropriateness
      const validatedResponses = await this.validateCulturalAppropriateness(responses, targetAudience);

      logger.info('Generated culturally appropriate responses', {
        originalMessage: message.substring(0, 50) + '...',
        culturalContext: culturalAnalysis.context,
        responseCount: validatedResponses.length
      });

      return validatedResponses.map(r => r.response);
    } catch (error) {
      logger.error('Error generating culturally appropriate responses:', error);
      return ['Thank you for your message!', 'Great point!', 'I appreciate your input!'];
    }
  }

  /**
   * Generate conversation prompts for stream hosts
   */
  async generateHostPrompts(streamContext: any, conversationInsights: ConversationInsights): Promise<string[]> {
    try {
      const prompts = [];

      // Generate prompts based on conversation state
      if (conversationInsights.engagementLevel === 'low') {
        prompts.push(...await this.generateEngagementPrompts(streamContext));
      }

      if (conversationInsights.conversationFlow === 'stagnant') {
        prompts.push(...await this.generateFlowPrompts(streamContext, conversationInsights.dominantTopics));
      }

      if (conversationInsights.participantActivity.silentUsers > conversationInsights.participantActivity.activeUsers) {
        prompts.push(...await this.generateInclusionPrompts(streamContext));
      }

      // Generate mood-specific prompts
      prompts.push(...await this.generateMoodPrompts(streamContext, conversationInsights.mood));

      logger.info(`Generated ${prompts.length} host prompts`, {
        streamId: streamContext.streamId,
        engagementLevel: conversationInsights.engagementLevel,
        conversationFlow: conversationInsights.conversationFlow
      });

      return prompts.slice(0, 8); // Return top 8 prompts
    } catch (error) {
      logger.error('Error generating host prompts:', error);
      return this.getDefaultHostPrompts();
    }
  }

  /**
   * Detect and suggest conversation topics
   */
  async suggestConversationTopics(streamContext: any, userInterests: string[]): Promise<string[]> {
    try {
      const prompt = `
        Suggest 10 engaging conversation topics for a live stream with these details:
        Stream Category: ${streamContext.category}
        Current Viewers: ${streamContext.currentViewers}
        Stream Duration: ${streamContext.duration} minutes
        User Interests: ${userInterests.join(', ')}
        
        Topics should be:
        - Relevant to the stream category
        - Engaging for the audience size
        - Appropriate for the stream duration
        - Match user interests
        - Encourage interaction
        
        Return only the topics, one per line.
      `;

      const response = await aiModelManager.generateText(prompt);
      const topics = response.split('\n')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0)
        .slice(0, 10);

      logger.info(`Generated ${topics.length} conversation topics`, {
        streamCategory: streamContext.category,
        userInterests: userInterests.length
      });

      return topics;
    } catch (error) {
      logger.error('Error suggesting conversation topics:', error);
      return this.getDefaultTopics(streamContext.category);
    }
  }

  // Private helper methods
  private async analyzeStreamContext(streamContext: any): Promise<any> {
    return {
      category: streamContext.category,
      viewerCount: streamContext.currentViewers,
      duration: streamContext.duration,
      topics: streamContext.topics,
      engagementLevel: this.calculateStreamEngagement(streamContext),
      culturalDiversity: await this.analyzeStreamCulturalDiversity(streamContext)
    };
  }

  private async analyzeUserProfile(userProfile: any): Promise<any> {
    return {
      interests: userProfile.interests,
      culturalBackground: userProfile.culturalBackground,
      language: userProfile.language,
      personalityType: userProfile.personalityType || 'balanced',
      interactionHistory: userProfile.interactionHistory,
      engagementPattern: this.analyzeUserEngagementPattern(userProfile.interactionHistory)
    };
  }

  private async analyzeTargetAudience(targetAudience: any): Promise<any> {
    return {
      ageRange: targetAudience.ageRange,
      interests: targetAudience.interests,
      culturalDiversity: targetAudience.culturalDiversity,
      communicationStyle: this.determineCommunicationStyle(targetAudience),
      preferredTopics: this.identifyPreferredTopics(targetAudience)
    };
  }

  private async generateContextualIcebreakers(
    contextAnalysis: any,
    userAnalysis: any,
    audienceAnalysis: any
  ): Promise<string[]> {
    const prompt = `
      Generate 8 engaging icebreaker messages for a shy user in this context:
      
      Stream Context:
      - Category: ${contextAnalysis.category}
      - Viewers: ${contextAnalysis.viewerCount}
      - Duration: ${contextAnalysis.duration} minutes
      - Topics: ${contextAnalysis.topics.join(', ')}
      
      User Profile:
      - Interests: ${userAnalysis.interests.join(', ')}
      - Cultural Background: ${userAnalysis.culturalBackground}
      - Language: ${userAnalysis.language}
      - Personality: ${userAnalysis.personalityType}
      
      Target Audience:
      - Age Range: ${audienceAnalysis.ageRange}
      - Interests: ${audienceAnalysis.interests.join(', ')}
      - Cultural Diversity: ${audienceAnalysis.culturalDiversity.join(', ')}
      
      Icebreakers should be:
      - Easy to respond to
      - Culturally appropriate
      - Relevant to the stream
      - Encourage interaction
      - Not too personal or invasive
      
      Return only the icebreaker messages, one per line.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.split('\n')
      .map(icebreaker => icebreaker.trim())
      .filter(icebreaker => icebreaker.length > 0)
      .slice(0, 8);
  }

  private async rankIcebreakers(icebreakers: string[], userProfile: any): Promise<string[]> {
    const ranked = await Promise.all(
      icebreakers.map(async (icebreaker, index) => {
        const score = await this.scoreIcebreaker(icebreaker, userProfile);
        return { icebreaker, score, index };
      })
    );

    return ranked
      .sort((a, b) => b.score - a.score)
      .map(item => item.icebreaker);
  }

  private async scoreIcebreaker(icebreaker: string, userProfile: any): Promise<number> {
    const prompt = `
      Score this icebreaker message (0-1) for a user with these characteristics:
      
      Icebreaker: "${icebreaker}"
      
      User Profile:
      - Interests: ${userProfile.interests.join(', ')}
      - Cultural Background: ${userProfile.culturalBackground}
      - Language: ${userProfile.language}
      - Personality: ${userProfile.personalityType}
      
      Consider:
      - Relevance to user interests
      - Cultural appropriateness
      - Ease of response
      - Engagement potential
      - Language clarity
      
      Return only a number between 0 and 1.
    `;

    try {
      const response = await aiModelManager.generateText(prompt);
      const score = parseFloat(response.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      logger.error('Error scoring icebreaker:', error);
      return 0.5;
    }
  }

  private async analyzeConversationMood(chatHistory: Message[]): Promise<any> {
    const recentMessages = chatHistory.slice(-20); // Last 20 messages
    const messageTexts = recentMessages.map(msg => msg.content).join(' ');

    const prompt = `
      Analyze the mood of this conversation from recent messages:
      "${messageTexts}"
      
      Determine:
      1. Overall mood (positive, negative, neutral, excited, calm, confused, etc.)
      2. Energy level (low, medium, high)
      3. Sentiment score (0-1, where 1 is very positive)
      
      Return in format:
      MOOD: [mood]
      ENERGY: [level]
      SENTIMENT: [score]
    `;

    try {
      const response = await aiModelManager.generateText(prompt);
      const lines = response.split('\n');
      
      const mood = lines.find(line => line.startsWith('MOOD:'))?.replace('MOOD:', '').trim() || 'neutral';
      const energy = lines.find(line => line.startsWith('ENERGY:'))?.replace('ENERGY:', '').trim() || 'medium';
      const sentimentLine = lines.find(line => line.startsWith('SENTIMENT:'))?.replace('SENTIMENT:', '').trim() || '0.5';
      const sentiment = parseFloat(sentimentLine) || 0.5;

      return { mood, energy, sentiment };
    } catch (error) {
      logger.error('Error analyzing conversation mood:', error);
      return { mood: 'neutral', energy: 'medium', sentiment: 0.5 };
    }
  }

  private async extractDominantTopics(chatHistory: Message[]): Promise<any> {
    const recentMessages = chatHistory.slice(-30); // Last 30 messages
    const messageTexts = recentMessages.map(msg => msg.content).join(' ');

    const prompt = `
      Extract the 5 most dominant topics from this conversation:
      "${messageTexts}"
      
      Return only the topics, one per line, in order of importance.
    `;

    try {
      const response = await aiModelManager.generateText(prompt);
      const topics = response.split('\n')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0)
        .slice(0, 5);

      return { topics };
    } catch (error) {
      logger.error('Error extracting dominant topics:', error);
      return { topics: ['general', 'entertainment'] };
    }
  }

  private async analyzeEngagementLevel(chatHistory: Message[]): Promise<any> {
    const recentMessages = chatHistory.slice(-10); // Last 10 messages
    const timeWindow = 5; // 5 minutes
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeWindow * 60 * 1000);
    
    const recentActivity = recentMessages.filter(msg => msg.timestamp >= cutoffTime);
    const messageRate = recentActivity.length / timeWindow; // messages per minute
    
    let level: 'low' | 'medium' | 'high';
    if (messageRate < 1) level = 'low';
    else if (messageRate < 3) level = 'medium';
    else level = 'high';

    return { level, messageRate, recentMessageCount: recentActivity.length };
  }

  private async analyzeConversationFlow(chatHistory: Message[]): Promise<any> {
    const messageCounts = this.getRecentMessageCounts(chatHistory);
    const trend = this.calculateTrend(messageCounts);
    
    let flow: 'stagnant' | 'active' | 'declining' | 'growing';
    if (trend > 0.1) flow = 'growing';
    else if (trend < -0.1) flow = 'declining';
    else if (messageCounts[messageCounts.length - 1] > 2) flow = 'active';
    else flow = 'stagnant';

    return { flow, trend, messageCounts };
  }

  private async analyzeParticipantActivity(chatHistory: Message[]): Promise<any> {
    const recentMessages = chatHistory.slice(-20);
    const uniqueUsers = new Set(recentMessages.map(msg => msg.userId));
    const userMessageCounts = new Map<string, number>();
    
    recentMessages.forEach(msg => {
      const count = userMessageCounts.get(msg.userId) || 0;
      userMessageCounts.set(msg.userId, count + 1);
    });

    const activeUsers = Array.from(userMessageCounts.entries())
      .filter(([_, count]) => count >= 2).length;
    
    const silentUsers = uniqueUsers.size - activeUsers;
    const newUsers = 0; // Would need to track user join times

    return { activeUsers, silentUsers, newUsers };
  }

  private async detectCulturalContext(chatHistory: Message[]): Promise<string> {
    const recentMessages = chatHistory.slice(-15);
    const messageTexts = recentMessages.map(msg => msg.content).join(' ');

    const prompt = `
      Detect the cultural context of this conversation:
      "${messageTexts}"
      
      Identify the dominant cultural background (e.g., Western, Eastern, Latin, African, etc.)
      Return only the cultural context.
    `;

    try {
      const response = await aiModelManager.generateText(prompt);
      return response.trim() || 'global';
    } catch (error) {
      logger.error('Error detecting cultural context:', error);
      return 'global';
    }
  }

  private async generateSuggestedActions(chatHistory: Message[], moodAnalysis: any): Promise<string[]> {
    const actions = [];
    
    if (moodAnalysis.mood === 'negative' || moodAnalysis.sentiment < 0.3) {
      actions.push('Encourage positive discussion', 'Change topic to something uplifting', 'Acknowledge concerns');
    }
    
    if (moodAnalysis.energy === 'low') {
      actions.push('Ask engaging questions', 'Share exciting content', 'Encourage participation');
    }
    
    if (chatHistory.length < 5) {
      actions.push('Welcome new participants', 'Ask for introductions', 'Start with easy questions');
    }

    return actions;
  }

  private async generateNextBestActions(chatHistory: Message[], moodAnalysis: any): Promise<Array<{
    action: string;
    confidence: number;
    reasoning: string;
  }>> {
    const actions = [];
    
    if (moodAnalysis.sentiment < 0.4) {
      actions.push({
        action: 'Redirect to positive topic',
        confidence: 0.8,
        reasoning: 'Low sentiment detected, need to improve mood'
      });
    }
    
    if (chatHistory.length > 50) {
      actions.push({
        action: 'Summarize key points',
        confidence: 0.7,
        reasoning: 'Long conversation, good time to summarize'
      });
    }

    return actions;
  }

  private async analyzeCulturalContext(
    message: string,
    userCulturalBackground: string,
    streamCulturalContext: string
  ): Promise<any> {
    const prompt = `
      Analyze the cultural context for this message:
      
      Message: "${message}"
      User Cultural Background: ${userCulturalBackground}
      Stream Cultural Context: ${streamCulturalContext}
      
      Determine:
      1. Primary cultural context
      2. Potential cultural sensitivities
      3. Appropriate response style
      4. Expected cultural norms
      
      Return in format:
      CONTEXT: [primary context]
      SENSITIVITIES: [any sensitivities]
      STYLE: [response style]
      NORMS: [cultural norms]
    `;

    try {
      const response = await aiModelManager.generateText(prompt);
      const lines = response.split('\n');
      
      return {
        context: lines.find(line => line.startsWith('CONTEXT:'))?.replace('CONTEXT:', '').trim() || 'global',
        sensitivities: lines.find(line => line.startsWith('SENSITIVITIES:'))?.replace('SENSITIVITIES:', '').trim() || 'none',
        style: lines.find(line => line.startsWith('STYLE:'))?.replace('STYLE:', '').trim() || 'neutral',
        norms: lines.find(line => line.startsWith('NORMS:'))?.replace('NORMS:', '').trim() || 'standard'
      };
    } catch (error) {
      logger.error('Error analyzing cultural context:', error);
      return { context: 'global', sensitivities: 'none', style: 'neutral', norms: 'standard' };
    }
  }

  private async generateCulturalResponses(culturalAnalysis: any, targetAudience: any): Promise<CulturalResponse[]> {
    const responses = [];
    
    // Generate responses based on cultural context
    const baseResponses = [
      'Thank you for sharing that perspective!',
      'That\'s an interesting point of view.',
      'I appreciate your input on this topic.',
      'Great question! Let me think about that.',
      'That\'s a thoughtful observation.'
    ];

    for (const baseResponse of baseResponses) {
      const response: CulturalResponse = {
        response: baseResponse,
        culturalContext: culturalAnalysis.context,
        appropriateness: 0.8,
        expectedEngagement: 0.6,
        alternatives: [baseResponse]
      };
      responses.push(response);
    }

    return responses;
  }

  private async validateCulturalAppropriateness(responses: CulturalResponse[], targetAudience: any): Promise<CulturalResponse[]> {
    // Filter responses based on cultural appropriateness
    return responses.filter(response => response.appropriateness >= 0.7);
  }

  private async generateEngagementPrompts(streamContext: any): Promise<string[]> {
    return [
      'What\'s everyone thinking about this topic?',
      'I\'d love to hear your thoughts!',
      'Anyone have experience with this?',
      'What questions do you have?',
      'Let\'s discuss this together!'
    ];
  }

  private async generateFlowPrompts(streamContext: any, dominantTopics: string[]): Promise<string[]> {
    return [
      `Let's dive deeper into ${dominantTopics[0] || 'this topic'}`,
      'I have a different angle on this...',
      'What if we looked at it this way?',
      'Here\'s something that might surprise you...',
      'Let me share a related story...'
    ];
  }

  private async generateInclusionPrompts(streamContext: any): Promise<string[]> {
    return [
      'I want to hear from everyone!',
      'Don\'t be shy, share your thoughts!',
      'All perspectives are welcome here!',
      'Let\'s make this interactive!',
      'Your voice matters in this discussion!'
    ];
  }

  private async generateMoodPrompts(streamContext: any, mood: string): Promise<string[]> {
    const moodPrompts: Record<string, string[]> = {
      positive: ['This energy is amazing!', 'I love this positive vibe!', 'Keep the good energy flowing!'],
      negative: ['Let\'s turn this around!', 'I believe we can find a solution!', 'Let\'s focus on the positive!'],
      excited: ['I\'m feeling this energy too!', 'This is getting exciting!', 'Let\'s keep this momentum!'],
      calm: ['I love this peaceful discussion', 'This is such a thoughtful conversation', 'Let\'s maintain this calm energy']
    };

    return moodPrompts[mood] || moodPrompts.positive;
  }

  // Utility methods
  private calculateStreamEngagement(streamContext: any): number {
    const viewerEngagement = streamContext.currentViewers / 100; // Normalize
    const durationEngagement = Math.min(1, streamContext.duration / 60); // 1 hour = max
    return (viewerEngagement + durationEngagement) / 2;
  }

  private async analyzeStreamCulturalDiversity(streamContext: any): Promise<string[]> {
    // Mock cultural diversity analysis
    return ['global', 'western', 'eastern'];
  }

  private analyzeUserEngagementPattern(interactionHistory: any[]): any {
    if (interactionHistory.length === 0) {
      return { pattern: 'new', frequency: 0, type: 'observer' };
    }

    const recentInteractions = interactionHistory.slice(-10);
    const frequency = recentInteractions.length / 7; // interactions per week
    
    let type: 'observer' | 'participant' | 'active' | 'superuser';
    if (frequency < 1) type = 'observer';
    else if (frequency < 3) type = 'participant';
    else if (frequency < 7) type = 'active';
    else type = 'superuser';

    return { pattern: 'established', frequency, type };
  }

  private determineCommunicationStyle(targetAudience: any): string {
    if (targetAudience.ageRange.includes('13-17')) return 'casual';
    if (targetAudience.ageRange.includes('18-25')) return 'trendy';
    if (targetAudience.ageRange.includes('26-35')) return 'professional';
    return 'balanced';
  }

  private identifyPreferredTopics(targetAudience: any): string[] {
    return targetAudience.interests || ['general', 'entertainment'];
  }

  private getRecentMessageCounts(chatHistory: Message[]): number[] {
    const now = new Date();
    const counts = [];
    
    for (let i = 4; i >= 0; i--) {
      const startTime = new Date(now.getTime() - (i + 1) * 60 * 1000);
      const endTime = new Date(now.getTime() - i * 60 * 1000);
      
      const count = chatHistory.filter(msg => 
        msg.timestamp >= startTime && msg.timestamp < endTime
      ).length;
      
      counts.push(count);
    }
    
    return counts;
  }

  private calculateTrend(counts: number[]): number {
    if (counts.length < 2) return 0;
    
    const first = counts[0];
    const last = counts[counts.length - 1];
    return (last - first) / Math.max(1, first);
  }

  private initializeCulturalContexts(): void {
    this.culturalContexts.set('western', {
      communicationStyle: 'direct',
      humorStyle: 'sarcastic',
      formality: 'casual',
      topics: ['technology', 'entertainment', 'lifestyle']
    });
    
    this.culturalContexts.set('eastern', {
      communicationStyle: 'indirect',
      humorStyle: 'subtle',
      formality: 'respectful',
      topics: ['family', 'tradition', 'education']
    });
    
    this.culturalContexts.set('latin', {
      communicationStyle: 'expressive',
      humorStyle: 'playful',
      formality: 'warm',
      topics: ['family', 'music', 'celebration']
    });
  }

  private initializePersonalityProfiles(): void {
    this.personalityProfiles.set('introverted', {
      preferredIcebreakers: ['thoughtful questions', 'personal interests', 'quiet topics'],
      communicationStyle: 'thoughtful',
      engagementLevel: 'moderate'
    });
    
    this.personalityProfiles.set('extroverted', {
      preferredIcebreakers: ['group activities', 'energetic topics', 'social questions'],
      communicationStyle: 'enthusiastic',
      engagementLevel: 'high'
    });
    
    this.personalityProfiles.set('balanced', {
      preferredIcebreakers: ['general topics', 'moderate questions', 'flexible approach'],
      communicationStyle: 'adaptive',
      engagementLevel: 'variable'
    });
  }

  private getDefaultIcebreakers(): string[] {
    return [
      'Hi everyone! How\'s your day going?',
      'What\'s everyone up to today?',
      'Anyone have any fun plans for the weekend?',
      'What\'s your favorite thing about this stream?',
      'How did you discover this content?'
    ];
  }

  private getDefaultInsights(): ConversationInsights {
    return {
      mood: 'neutral',
      engagementLevel: 'medium',
      dominantTopics: ['general'],
      culturalContext: 'global',
      suggestedActions: ['encourage participation'],
      conversationFlow: 'active',
      participantActivity: { activeUsers: 0, silentUsers: 0, newUsers: 0 },
      nextBestActions: []
    };
  }

  private getDefaultHostPrompts(): string[] {
    return [
      'What do you all think about this?',
      'I\'d love to hear your thoughts!',
      'Anyone have questions?',
      'Let\'s keep this conversation going!',
      'What\'s on your mind?'
    ];
  }

  private getDefaultTopics(category: string): string[] {
    const topicMap: Record<string, string[]> = {
      gaming: ['favorite games', 'gaming tips', 'upcoming releases', 'gaming setup'],
      music: ['favorite artists', 'music genres', 'concerts', 'instruments'],
      lifestyle: ['daily routines', 'hobbies', 'travel', 'food'],
      education: ['learning tips', 'study methods', 'career advice', 'skills'],
      entertainment: ['movies', 'TV shows', 'books', 'events']
    };

    return topicMap[category] || ['general discussion', 'current events', 'hobbies', 'interests'];
  }
}

export default ConversationAIService;
