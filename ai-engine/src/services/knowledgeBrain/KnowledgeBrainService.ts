import mongoose, { Document, Schema } from 'mongoose';
import logger from '../../utils/logger';
import { aiModelManager } from '../../utils/ai-models';

// Interfaces for Knowledge Brain
export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'entity' | 'relationship' | 'event' | 'skill';
  label: string;
  description: string;
  domain: string;
  confidence: number;
  sources: string[];
  relationships: KnowledgeRelationship[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeRelationship {
  targetId: string;
  type: 'is_a' | 'part_of' | 'related_to' | 'causes' | 'enables' | 'conflicts_with';
  strength: number; // 0-1 scale
  bidirectional: boolean;
  context?: string;
}

export interface KnowledgeGraph {
  nodes: Map<string, KnowledgeNode>;
  relationships: Map<string, KnowledgeRelationship[]>;
  domains: Set<string>;
  lastUpdated: Date;
  version: number;
}

export interface LearningSession {
  sessionId: string;
  userId: string;
  topic: string;
  interactions: LearningInteraction[];
  knowledgeGained: string[];
  skillsImproved: string[];
  confidence: number;
  duration: number;
  effectiveness: number;
}

export interface LearningInteraction {
  timestamp: Date;
  type: 'question' | 'explanation' | 'example' | 'practice' | 'feedback';
  content: string;
  response: string;
  satisfaction: number;
  learningOutcome: string;
}

export interface KnowledgeSynthesisRequest {
  topics: string[];
  domains: string[];
  depth: 'shallow' | 'moderate' | 'deep';
  format: 'summary' | 'detailed' | 'visual' | 'interactive';
  userContext?: Record<string, any>;
}

export interface KnowledgeSynthesisResponse {
  synthesis: string;
  keyConcepts: string[];
  relationships: string[];
  gaps: string[];
  recommendations: string[];
  confidence: number;
  sources: string[];
}

export interface CrossDomainLearningRequest {
  sourceDomain: string;
  targetDomain: string;
  concepts: string[];
  learningGoal: string;
}

export interface CrossDomainLearningResponse {
  transferableConcepts: string[];
  adaptations: string[];
  newInsights: string[];
  applications: string[];
  confidence: number;
}

// MongoDB Schemas
const KnowledgeRelationshipSchema = new Schema({
  targetId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['is_a', 'part_of', 'related_to', 'causes', 'enables', 'conflicts_with'],
    required: true 
  },
  strength: { type: Number, min: 0, max: 1, required: true },
  bidirectional: { type: Boolean, default: false },
  context: { type: String }
});

const KnowledgeNodeSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['concept', 'entity', 'relationship', 'event', 'skill'],
    required: true 
  },
  label: { type: String, required: true },
  description: { type: String, required: true },
  domain: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  sources: [{ type: String }],
  relationships: [KnowledgeRelationshipSchema],
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

const LearningInteractionSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['question', 'explanation', 'example', 'practice', 'feedback'],
    required: true 
  },
  content: { type: String, required: true },
  response: { type: String, required: true },
  satisfaction: { type: Number, min: 0, max: 1, required: true },
  learningOutcome: { type: String, required: true }
});

const LearningSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  topic: { type: String, required: true },
  interactions: [LearningInteractionSchema],
  knowledgeGained: [{ type: String }],
  skillsImproved: [{ type: String }],
  confidence: { type: Number, min: 0, max: 1, required: true },
  duration: { type: Number, required: true }, // in minutes
  effectiveness: { type: Number, min: 0, max: 1, required: true }
}, {
  timestamps: true
});

// Create models
const KnowledgeNodeModel = mongoose.model<KnowledgeNode & Document>('KnowledgeNode', KnowledgeNodeSchema);
const LearningSessionModel = mongoose.model<LearningSession & Document>('LearningSession', LearningSessionSchema);

export class KnowledgeBrainService {
  private static instance: KnowledgeBrainService;
  private knowledgeGraph: KnowledgeGraph;
  private learningCache: Map<string, any> = new Map();
  private synthesisCache: Map<string, KnowledgeSynthesisResponse> = new Map();

  private constructor() {
    this.knowledgeGraph = {
      nodes: new Map(),
      relationships: new Map(),
      domains: new Set(),
      lastUpdated: new Date(),
      version: 1
    };
    logger.info('KnowledgeBrainService initialized');
  }

  static getInstance(): KnowledgeBrainService {
    if (!KnowledgeBrainService.instance) {
      KnowledgeBrainService.instance = new KnowledgeBrainService();
    }
    return KnowledgeBrainService.instance;
  }

  /**
   * Synthesize knowledge across multiple topics and domains
   */
  async synthesizeKnowledge(request: KnowledgeSynthesisRequest): Promise<KnowledgeSynthesisResponse> {
    try {
      logger.info('Synthesizing knowledge', { topics: request.topics, domains: request.domains });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.synthesisCache.has(cacheKey)) {
        return this.synthesisCache.get(cacheKey)!;
      }

      // Gather relevant knowledge nodes
      const relevantNodes = await this.gatherRelevantNodes(request.topics, request.domains);
      
      // Analyze relationships
      const relationships = await this.analyzeRelationships(relevantNodes);
      
      // Generate synthesis
      const synthesis = await this.generateSynthesis(relevantNodes, relationships, request);
      
      // Identify knowledge gaps
      const gaps = await this.identifyKnowledgeGaps(relevantNodes, request);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(relevantNodes, gaps, request);
      
      const response: KnowledgeSynthesisResponse = {
        synthesis: synthesis.text,
        keyConcepts: synthesis.concepts,
        relationships: synthesis.relationships,
        gaps,
        recommendations,
        confidence: synthesis.confidence,
        sources: synthesis.sources
      };

      // Cache the response
      this.synthesisCache.set(cacheKey, response);

      return response;

    } catch (error) {
      logger.error('Error synthesizing knowledge:', error);
      throw error;
    }
  }

  /**
   * Enable cross-domain learning and knowledge transfer
   */
  async enableCrossDomainLearning(request: CrossDomainLearningRequest): Promise<CrossDomainLearningResponse> {
    try {
      logger.info('Enabling cross-domain learning', { 
        sourceDomain: request.sourceDomain, 
        targetDomain: request.targetDomain 
      });

      // Find transferable concepts
      const transferableConcepts = await this.findTransferableConcepts(
        request.sourceDomain, 
        request.targetDomain, 
        request.concepts
      );
      
      // Generate adaptations
      const adaptations = await this.generateAdaptations(
        transferableConcepts, 
        request.targetDomain
      );
      
      // Create new insights
      const newInsights = await this.createNewInsights(
        transferableConcepts, 
        adaptations, 
        request.learningGoal
      );
      
      // Suggest applications
      const applications = await this.suggestApplications(
        newInsights, 
        request.targetDomain
      );

      return {
        transferableConcepts,
        adaptations,
        newInsights,
        applications,
        confidence: this.calculateConfidence(transferableConcepts, adaptations)
      };

    } catch (error) {
      logger.error('Error enabling cross-domain learning:', error);
      throw error;
    }
  }

  /**
   * Learn from user interactions and update knowledge graph
   */
  async learnFromInteraction(sessionId: string, interaction: LearningInteraction): Promise<void> {
    try {
      logger.info('Learning from interaction', { sessionId, type: interaction.type });

      // Extract knowledge from interaction
      const extractedKnowledge = await this.extractKnowledgeFromInteraction(interaction);
      
      // Update knowledge graph
      await this.updateKnowledgeGraph(extractedKnowledge);
      
      // Update learning session
      await this.updateLearningSession(sessionId, interaction, extractedKnowledge);

    } catch (error) {
      logger.error('Error learning from interaction:', error);
    }
  }

  /**
   * Real-time knowledge integration from external sources
   */
  async integrateRealTimeKnowledge(source: string, data: any): Promise<void> {
    try {
      logger.info('Integrating real-time knowledge', { source });

      // Process and validate data
      const processedData = await this.processExternalData(data);
      
      // Extract knowledge nodes
      const knowledgeNodes = await this.extractKnowledgeNodes(processedData, source);
      
      // Update knowledge graph
      await this.updateKnowledgeGraphWithNodes(knowledgeNodes);
      
      // Update cache
      this.invalidateRelevantCache(source);

    } catch (error) {
      logger.error('Error integrating real-time knowledge:', error);
    }
  }

  /**
   * Get knowledge insights for a specific user or topic
   */
  async getKnowledgeInsights(userId?: string, topic?: string): Promise<any> {
    try {
      const insights: any = {
        totalNodes: this.knowledgeGraph.nodes.size,
        domains: Array.from(this.knowledgeGraph.domains),
        lastUpdated: this.knowledgeGraph.lastUpdated,
        version: this.knowledgeGraph.version
      };

      if (userId) {
        // Get user-specific learning insights
        const userSessions = await LearningSessionModel.find({ userId }).lean();
        insights.userLearning = {
          totalSessions: userSessions.length,
          averageConfidence: userSessions.reduce((sum, s) => sum + s.confidence, 0) / userSessions.length,
          topicsLearned: [...new Set(userSessions.map(s => s.topic))],
          averageEffectiveness: userSessions.reduce((sum, s) => sum + s.effectiveness, 0) / userSessions.length
        };
      }

      if (topic) {
        // Get topic-specific insights
        const topicNodes = Array.from(this.knowledgeGraph.nodes.values())
          .filter(node => node.label.toLowerCase().includes(topic.toLowerCase()));
        
        insights.topicInsights = {
          nodeCount: topicNodes.length,
          domains: [...new Set(topicNodes.map(n => n.domain))],
          averageConfidence: topicNodes.reduce((sum, n) => sum + n.confidence, 0) / topicNodes.length
        };
      }

      return insights;

    } catch (error) {
      logger.error('Error getting knowledge insights:', error);
      throw error;
    }
  }

  // Private helper methods
  private async gatherRelevantNodes(topics: string[], domains: string[]): Promise<KnowledgeNode[]> {
    try {
      const query: any = {};
      
      if (topics.length > 0) {
        query.label = { $regex: topics.join('|'), $options: 'i' };
      }
      
      if (domains.length > 0) {
        query.domain = { $in: domains };
      }

      const nodes = await KnowledgeNodeModel.find(query).lean();
      return nodes;

    } catch (error) {
      logger.error('Error gathering relevant nodes:', error);
      return [];
    }
  }

  private async analyzeRelationships(nodes: KnowledgeNode[]): Promise<any[]> {
    try {
      const relationships: any[] = [];
      
      for (const node of nodes) {
        for (const rel of node.relationships) {
          relationships.push({
            source: node.label,
            target: rel.targetId,
            type: rel.type,
            strength: rel.strength
          });
        }
      }

      return relationships;

    } catch (error) {
      logger.error('Error analyzing relationships:', error);
      return [];
    }
  }

  private async generateSynthesis(nodes: KnowledgeNode[], relationships: any[], request: KnowledgeSynthesisRequest): Promise<any> {
    try {
      const nodeLabels = nodes.map(n => n.label).join(', ');
      const relationshipTypes = relationships.map(r => `${r.source} ${r.type} ${r.target}`).join(', ');

      const prompt = `
        Synthesize knowledge about: ${request.topics.join(', ')}
        
        Key concepts: ${nodeLabels}
        Relationships: ${relationshipTypes}
        
        User context: ${JSON.stringify(request.userContext || {})}
        Depth: ${request.depth}
        Format: ${request.format}
        
        Provide synthesis in JSON format:
        {
          "text": "comprehensive synthesis",
          "concepts": ["concept1", "concept2"],
          "relationships": ["relationship1", "relationship2"],
          "confidence": 0.0-1.0,
          "sources": ["source1", "source2"]
        }
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.5,
        maxTokens: 500
      });

      return JSON.parse(response);

    } catch (error) {
      logger.error('Error generating synthesis:', error);
      return {
        text: "Knowledge synthesis unavailable",
        concepts: [],
        relationships: [],
        confidence: 0.0,
        sources: []
      };
    }
  }

  private async identifyKnowledgeGaps(nodes: KnowledgeNode[], request: KnowledgeSynthesisRequest): Promise<string[]> {
    try {
      const prompt = `
        Identify knowledge gaps for topics: ${request.topics.join(', ')}
        
        Available knowledge: ${nodes.map(n => n.label).join(', ')}
        Domains: ${request.domains.join(', ')}
        
        List potential knowledge gaps that would enhance understanding.
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      return response.split('\n').filter(line => line.trim().length > 0);

    } catch (error) {
      logger.error('Error identifying knowledge gaps:', error);
      return [];
    }
  }

  private async generateRecommendations(nodes: KnowledgeNode[], gaps: string[], request: KnowledgeSynthesisRequest): Promise<string[]> {
    try {
      const recommendations: string[] = [];

      // Learning recommendations based on gaps
      if (gaps.length > 0) {
        recommendations.push(`Explore these knowledge gaps: ${gaps.slice(0, 3).join(', ')}`);
      }

      // Related concept recommendations
      const relatedConcepts = nodes
        .flatMap(n => n.relationships.map(r => r.targetId))
        .filter((id, index, arr) => arr.indexOf(id) === index)
        .slice(0, 5);
      
      if (relatedConcepts.length > 0) {
        recommendations.push(`Explore related concepts: ${relatedConcepts.join(', ')}`);
      }

      // Domain expansion recommendations
      const currentDomains = [...new Set(nodes.map(n => n.domain))];
      if (currentDomains.length < 3) {
        recommendations.push('Consider exploring additional domains for broader perspective');
      }

      return recommendations;

    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [];
    }
  }

  private async findTransferableConcepts(sourceDomain: string, targetDomain: string, concepts: string[]): Promise<string[]> {
    try {
      const prompt = `
        Find concepts from ${sourceDomain} that can be transferred to ${targetDomain}.
        
        Source concepts: ${concepts.join(', ')}
        
        Identify transferable concepts and explain why they apply to both domains.
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.4,
        maxTokens: 300
      });

      return response.split('\n').filter(line => line.trim().length > 0);

    } catch (error) {
      logger.error('Error finding transferable concepts:', error);
      return [];
    }
  }

  private async generateAdaptations(concepts: string[], targetDomain: string): Promise<string[]> {
    try {
      const prompt = `
        Adapt these concepts for ${targetDomain}: ${concepts.join(', ')}
        
        Explain how each concept needs to be modified or applied differently in the target domain.
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.5,
        maxTokens: 300
      });

      return response.split('\n').filter(line => line.trim().length > 0);

    } catch (error) {
      logger.error('Error generating adaptations:', error);
      return [];
    }
  }

  private async createNewInsights(concepts: string[], adaptations: string[], learningGoal: string): Promise<string[]> {
    try {
      const prompt = `
        Create new insights by combining concepts: ${concepts.join(', ')}
        With adaptations: ${adaptations.join(', ')}
        
        Learning goal: ${learningGoal}
        
        Generate novel insights that emerge from this combination.
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.7,
        maxTokens: 300
      });

      return response.split('\n').filter(line => line.trim().length > 0);

    } catch (error) {
      logger.error('Error creating new insights:', error);
      return [];
    }
  }

  private async suggestApplications(insights: string[], targetDomain: string): Promise<string[]> {
    try {
      const prompt = `
        Suggest practical applications for these insights in ${targetDomain}: ${insights.join(', ')}
        
        Provide specific, actionable applications.
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.6,
        maxTokens: 300
      });

      return response.split('\n').filter(line => line.trim().length > 0);

    } catch (error) {
      logger.error('Error suggesting applications:', error);
      return [];
    }
  }

  private async extractKnowledgeFromInteraction(interaction: LearningInteraction): Promise<any> {
    try {
      const prompt = `
        Extract knowledge from this learning interaction:
        
        Type: ${interaction.type}
        Content: ${interaction.content}
        Response: ${interaction.response}
        Learning Outcome: ${interaction.learningOutcome}
        
        Extract key concepts, relationships, and insights.
      `;

      const response = await aiModelManager.generateResponse(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      return {
        concepts: response.split('\n').filter(line => line.trim().length > 0),
        timestamp: interaction.timestamp,
        type: interaction.type
      };

    } catch (error) {
      logger.error('Error extracting knowledge from interaction:', error);
      return { concepts: [], timestamp: interaction.timestamp, type: interaction.type };
    }
  }

  private async updateKnowledgeGraph(extractedKnowledge: any): Promise<void> {
    try {
      for (const concept of extractedKnowledge.concepts) {
        const nodeId = this.generateNodeId(concept);
        
        const existingNode = await KnowledgeNodeModel.findOne({ id: nodeId });
        
        if (existingNode) {
          // Update existing node
          existingNode.confidence = Math.min(1.0, existingNode.confidence + 0.1);
          await existingNode.save();
        } else {
          // Create new node
          const newNode = new KnowledgeNodeModel({
            id: nodeId,
            type: 'concept',
            label: concept,
            description: `Knowledge extracted from ${extractedKnowledge.type} interaction`,
            domain: 'general',
            confidence: 0.5,
            sources: ['user_interaction'],
            relationships: [],
            metadata: {
              extractedFrom: extractedKnowledge.type,
              timestamp: extractedKnowledge.timestamp
            }
          });
          
          await newNode.save();
        }
      }

    } catch (error) {
      logger.error('Error updating knowledge graph:', error);
    }
  }

  private async updateLearningSession(sessionId: string, interaction: LearningInteraction, extractedKnowledge: any): Promise<void> {
    try {
      await LearningSessionModel.findOneAndUpdate(
        { sessionId },
        {
          $push: { interactions: interaction },
          $addToSet: { knowledgeGained: { $each: extractedKnowledge.concepts } },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );

    } catch (error) {
      logger.error('Error updating learning session:', error);
    }
  }

  private async processExternalData(data: any): Promise<any> {
    // Process and validate external data
    return data;
  }

  private async extractKnowledgeNodes(data: any, source: string): Promise<KnowledgeNode[]> {
    // Extract knowledge nodes from processed data
    return [];
  }

  private async updateKnowledgeGraphWithNodes(nodes: KnowledgeNode[]): Promise<void> {
    // Update knowledge graph with new nodes
  }

  private invalidateRelevantCache(source: string): void {
    // Invalidate cache entries related to the source
    this.synthesisCache.clear();
  }

  private generateCacheKey(request: KnowledgeSynthesisRequest): string {
    return `${request.topics.join('_')}_${request.domains.join('_')}_${request.depth}_${request.format}`;
  }

  private generateNodeId(concept: string): string {
    return concept.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private calculateConfidence(concepts: string[], adaptations: string[]): number {
    return Math.min(1.0, (concepts.length + adaptations.length) / 10);
  }
}
