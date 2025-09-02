import { logger } from '@/config/logger';
import { setCache, getCache } from '@/config/redis';
import crypto from 'crypto';

export interface AISecurityThreat {
  id: string;
  type: 'prompt_injection' | 'jailbreak' | 'manipulation' | 'deepfake' | 'bias_exploitation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  userId?: string;
  sessionId: string;
  content: string;
  mitigationAction: string;
  blocked: boolean;
}

export interface AIIntegrityCheck {
  isValid: boolean;
  confidence: number;
  threats: string[];
  sanitizedContent?: string;
  warnings: string[];
}

export class AISecurityService {
  private static readonly DANGEROUS_PATTERNS = [
    // Prompt injection attempts
    /ignore\s+(previous|all)\s+(instructions|prompts)/i,
    /act\s+as\s+(if\s+you\s+are|a|an)\s+(?!helpful)/i,
    /forget\s+(everything|all|previous)/i,
    /system\s*:\s*you\s+are/i,
    /jailbreak/i,
    /DAN\s+mode/i,
    
    // Role manipulation
    /you\s+are\s+no\s+longer/i,
    /new\s+instructions/i,
    /override\s+(security|safety)/i,
    /disable\s+(filters|safety|moderation)/i,
    
    // Information extraction attempts
    /what\s+is\s+your\s+(system\s+prompt|instructions)/i,
    /tell\s+me\s+your\s+(prompt|instructions)/i,
    /reveal\s+your\s+(code|algorithm)/i,
    
    // Harmful content generation
    /create\s+(virus|malware|hack)/i,
    /how\s+to\s+(hack|break\s+into|steal)/i,
    /generate\s+(illegal|harmful|dangerous)/i
  ];

  private static readonly SENSITIVE_TOPICS = [
    'personal_information', 'financial_data', 'medical_records',
    'government_secrets', 'private_communications', 'authentication_credentials'
  ];

  private static readonly MANIPULATION_INDICATORS = [
    'emotional_pressure', 'authority_claims', 'urgency_tactics',
    'trust_exploitation', 'fear_mongering', 'false_expertise'
  ];

  // Main AI security validation
  static async validateAIInteraction(input: {
    userId?: string;
    sessionId: string;
    content: string;
    context: 'chat' | 'content_generation' | 'recommendation' | 'moderation';
  }): Promise<AIIntegrityCheck> {
    try {
      const threats: string[] = [];
      const warnings: string[] = [];
      let confidence = 1.0;

      // 1. Check for dangerous patterns
      const patternThreats = this.detectDangerousPatterns(input.content);
      threats.push(...patternThreats);

      // 2. Check for prompt injection
      const injectionCheck = await this.detectPromptInjection(input.content);
      if (!injectionCheck.isValid) {
        threats.push('prompt_injection');
        confidence -= 0.3;
      }

      // 3. Check for manipulation attempts
      const manipulationCheck = this.detectManipulationAttempts(input.content);
      if (manipulationCheck.detected) {
        threats.push('manipulation_attempt');
        warnings.push(...manipulationCheck.indicators);
        confidence -= 0.2;
      }

      // 4. Check for sensitive information requests
      const sensitivityCheck = this.checkSensitiveContent(input.content);
      if (sensitivityCheck.containsSensitive) {
        threats.push('sensitive_information_request');
        warnings.push(...sensitivityCheck.topics);
        confidence -= 0.2;
      }

      // 5. Context-specific validation
      const contextCheck = await this.validateContext(input.context, input.content);
      if (!contextCheck.isValid) {
        threats.push('context_violation');
        warnings.push(...contextCheck.violations);
        confidence -= 0.1;
      }

      // 6. Semantic analysis for hidden meanings
      const semanticCheck = await this.analyzeSemanticIntention(input.content);
      if (semanticCheck.suspiciousIntent) {
        threats.push('suspicious_semantic_intent');
        confidence -= 0.1;
      }

      const isValid = threats.length === 0 && confidence > 0.5;

      // Log threat if detected
      if (!isValid) {
        await this.logSecurityThreat({
          id: crypto.randomUUID(),
          type: this.categorizeThreats(threats)[0] || 'manipulation',
          severity: this.calculateSeverity(threats, confidence),
          detectedAt: new Date(),
          userId: input.userId,
          sessionId: input.sessionId,
          content: input.content,
          mitigationAction: this.determineMitigation(threats, confidence),
          blocked: !isValid
        });
      }

      return {
        isValid,
        confidence: Math.max(0, Math.min(1, confidence)),
        threats,
        sanitizedContent: isValid ? input.content : this.sanitizeContent(input.content),
        warnings
      };

    } catch (error) {
      logger.error('AI security validation error:', error);
      // Fail secure - block when error occurs
      return {
        isValid: false,
        confidence: 0,
        threats: ['validation_error'],
        warnings: ['Security validation failed - request blocked for safety']
      };
    }
  }

  // Detect dangerous patterns in input
  private static detectDangerousPatterns(content: string): string[] {
    const threats: string[] = [];
    
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(content)) {
        threats.push('dangerous_pattern');
        break;
      }
    }

    return threats;
  }

  // Advanced prompt injection detection
  private static async detectPromptInjection(content: string): Promise<{
    isValid: boolean;
    confidence: number;
    injectionType?: string;
  }> {
    try {
      // Check for common injection markers
      const injectionMarkers = [
        '\\n\\nHuman:', '\\n\\nAssistant:', 'User:', 'System:',
        '```', '---', '***', '###', 'INSTRUCTION:', 'PROMPT:'
      ];

      let suspiciousMarkers = 0;
      for (const marker of injectionMarkers) {
        if (content.toLowerCase().includes(marker.toLowerCase())) {
          suspiciousMarkers++;
        }
      }

      // Check for instruction-like language
      const instructionWords = ['must', 'should', 'will', 'shall', 'do', 'don\'t', 'never', 'always'];
      const instructionCount = instructionWords.reduce((count, word) => {
        return count + (content.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      }, 0);

      // Check for role definitions
      const roleDefinitions = /(?:you|i|we)\s+(?:are|am|is)\s+(?:a|an|the)?\s*(?:ai|assistant|bot|human|user|admin|developer)/i;
      const hasRoleDefinition = roleDefinitions.test(content);

      // Calculate injection probability
      const confidence = Math.max(0, 1 - (
        (suspiciousMarkers * 0.3) +
        (Math.min(instructionCount, 10) * 0.05) +
        (hasRoleDefinition ? 0.4 : 0)
      ));

      return {
        isValid: confidence > 0.6,
        confidence,
        injectionType: confidence <= 0.6 ? 'structured_injection' : undefined
      };

    } catch (error) {
      logger.error('Prompt injection detection error:', error);
      return { isValid: false, confidence: 0, injectionType: 'detection_error' };
    }
  }

  // Detect manipulation attempts
  private static detectManipulationAttempts(content: string): {
    detected: boolean;
    indicators: string[];
    confidence: number;
  } {
    const indicators: string[] = [];
    const lowerContent = content.toLowerCase();

    // Emotional pressure tactics
    const emotionalTriggers = [
      'urgent', 'emergency', 'immediately', 'right now', 'asap',
      'please help', 'i\'m desperate', 'i need', 'you must'
    ];

    if (emotionalTriggers.some(trigger => lowerContent.includes(trigger))) {
      indicators.push('emotional_pressure');
    }

    // Authority claims
    const authorityClaims = [
      'i\'m your', 'as your', 'i am the', 'i work for',
      'official', 'authorized', 'administrator', 'developer'
    ];

    if (authorityClaims.some(claim => lowerContent.includes(claim))) {
      indicators.push('false_authority');
    }

    // Trust exploitation
    const trustExploitation = [
      'trust me', 'believe me', 'i promise', 'i guarantee',
      'you can trust', 'i would never', 'honest'
    ];

    if (trustExploitation.some(phrase => lowerContent.includes(phrase))) {
      indicators.push('trust_exploitation');
    }

    // Fear tactics
    const fearTactics = [
      'dangerous', 'harmful', 'bad things will happen',
      'you\'ll regret', 'something terrible', 'warning'
    ];

    if (fearTactics.some(tactic => lowerContent.includes(tactic))) {
      indicators.push('fear_mongering');
    }

    const confidence = indicators.length * 0.25;
    return {
      detected: indicators.length > 0,
      indicators,
      confidence: Math.min(1, confidence)
    };
  }

  // Check for sensitive content requests
  private static checkSensitiveContent(content: string): {
    containsSensitive: boolean;
    topics: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const detectedTopics: string[] = [];
    const lowerContent = content.toLowerCase();

    // Financial information
    if (/(?:credit card|bank account|password|ssn|social security|pin|cvv)/i.test(content)) {
      detectedTopics.push('financial_data');
    }

    // Personal identification
    if (/(?:address|phone number|email|full name|date of birth|id number)/i.test(content)) {
      detectedTopics.push('personal_information');
    }

    // Medical information
    if (/(?:medical record|health|diagnosis|prescription|doctor|hospital)/i.test(content)) {
      detectedTopics.push('medical_records');
    }

    // System information
    if (/(?:api key|token|secret|configuration|system|database|server)/i.test(content)) {
      detectedTopics.push('system_information');
    }

    const riskLevel: 'low' | 'medium' | 'high' = 
      detectedTopics.length >= 3 ? 'high' :
      detectedTopics.length >= 1 ? 'medium' : 'low';

    return {
      containsSensitive: detectedTopics.length > 0,
      topics: detectedTopics,
      riskLevel
    };
  }

  // Context-specific validation
  private static async validateContext(context: string, content: string): Promise<{
    isValid: boolean;
    violations: string[];
  }> {
    const violations: string[] = [];

    switch (context) {
      case 'content_generation':
        if (/(?:generate|create|make|write).*(?:illegal|harmful|dangerous|explicit)/i.test(content)) {
          violations.push('harmful_content_generation_request');
        }
        break;

      case 'moderation':
        if (/(?:ignore|bypass|disable|turn off).*(?:moderation|filter|safety)/i.test(content)) {
          violations.push('moderation_bypass_attempt');
        }
        break;

      case 'recommendation':
        if (/(?:recommend|suggest|advise).*(?:illegal|harmful|dangerous)/i.test(content)) {
          violations.push('harmful_recommendation_request');
        }
        break;

      case 'chat':
        // General chat validation
        if (/(?:role\s*play|pretend|act\s+as).*(?:admin|developer|system)/i.test(content)) {
          violations.push('unauthorized_role_play');
        }
        break;
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  // Analyze semantic intention
  private static async analyzeSemanticIntention(content: string): Promise<{
    suspiciousIntent: boolean;
    intentionType?: string;
    confidence: number;
  }> {
    try {
      // Simple semantic analysis - in production, use advanced NLP
      const suspiciousPatterns = [
        /(?:trick|fool|deceive|manipulate)\s+(?:you|ai|system)/i,
        /(?:bypass|circumvent|avoid|get around)\s+(?:safety|security|rules)/i,
        /(?:extract|get|obtain|reveal)\s+(?:information|data|secrets)/i
      ];

      let suspiciousScore = 0;
      let intentionType = '';

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          suspiciousScore += 0.4;
          if (!intentionType) {
            if (pattern.source.includes('trick|fool')) intentionType = 'deception';
            else if (pattern.source.includes('bypass')) intentionType = 'circumvention';
            else if (pattern.source.includes('extract')) intentionType = 'information_extraction';
          }
        }
      }

      // Check for indirect manipulation through storytelling
      if (/(?:imagine|suppose|what if|hypothetically)/i.test(content) && 
          /(?:you were|you could|you would)/i.test(content)) {
        suspiciousScore += 0.3;
        intentionType = intentionType || 'hypothetical_manipulation';
      }

      return {
        suspiciousIntent: suspiciousScore > 0.5,
        intentionType: suspiciousScore > 0.5 ? intentionType : undefined,
        confidence: Math.min(1, suspiciousScore)
      };

    } catch (error) {
      logger.error('Semantic intention analysis error:', error);
      return { suspiciousIntent: true, confidence: 0, intentionType: 'analysis_error' };
    }
  }

  // Categorize threats by type
  private static categorizeThreats(threats: string[]): ('prompt_injection' | 'jailbreak' | 'manipulation' | 'deepfake' | 'bias_exploitation')[] {
    const categories = new Set<'prompt_injection' | 'jailbreak' | 'manipulation' | 'deepfake' | 'bias_exploitation'>();

    for (const threat of threats) {
      switch (threat) {
        case 'dangerous_pattern':
        case 'prompt_injection':
        case 'structured_injection':
          categories.add('prompt_injection');
          break;
        case 'manipulation_attempt':
        case 'emotional_pressure':
        case 'trust_exploitation':
          categories.add('manipulation');
          break;
        case 'context_violation':
        case 'unauthorized_role_play':
          categories.add('jailbreak');
          break;
        default:
          categories.add('manipulation');
      }
    }

    return Array.from(categories);
  }

  // Calculate threat severity
  private static calculateSeverity(threats: string[], confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence < 0.2 || threats.includes('dangerous_pattern')) return 'critical';
    if (confidence < 0.4 || threats.length >= 3) return 'high';
    if (confidence < 0.6 || threats.length >= 2) return 'medium';
    return 'low';
  }

  // Determine mitigation action
  private static determineMitigation(threats: string[], confidence: number): string {
    if (confidence < 0.2) return 'immediate_block_and_escalate';
    if (confidence < 0.4) return 'block_and_log';
    if (confidence < 0.6) return 'sanitize_and_warn';
    return 'log_and_monitor';
  }

  // Sanitize content by removing dangerous elements
  private static sanitizeContent(content: string): string {
    let sanitized = content;

    // Remove potential injection markers
    const injectionMarkers = [
      /\\n\\n(?:Human|Assistant|User|System):\s*/gi,
      /```[\s\S]*?```/g,
      /---+/g,
      /\*{3,}/g,
      /##{2,}/g
    ];

    for (const marker of injectionMarkers) {
      sanitized = sanitized.replace(marker, '');
    }

    // Remove instruction-like language
    sanitized = sanitized.replace(/\b(?:you must|you should|you will|you shall)\b/gi, 'you might consider');
    sanitized = sanitized.replace(/\b(?:ignore|forget|disregard)\s+(?:previous|all|everything)\b/gi, 'consider');

    return sanitized.trim();
  }

  // Log security threat
  private static async logSecurityThreat(threat: AISecurityThreat): Promise<void> {
    try {
      // Store in cache for immediate access
      await setCache(`ai_threat:${threat.id}`, threat, 86400); // 24 hours

      // Log to security monitoring system
      logger.warn('AI Security Threat Detected', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        userId: threat.userId,
        sessionId: threat.sessionId,
        blocked: threat.blocked,
        timestamp: threat.detectedAt
      });

      // Update threat statistics
      await this.updateThreatStatistics(threat);

      // Alert security team for high severity threats
      if (threat.severity === 'critical' || threat.severity === 'high') {
        await this.alertSecurityTeam(threat);
      }

    } catch (error) {
      logger.error('Error logging AI security threat:', error);
    }
  }

  // Update threat statistics
  private static async updateThreatStatistics(threat: AISecurityThreat): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsKey = `ai_threat_stats:${today}`;
      
      const currentStats = (await getCache(statsKey) || {
        total: 0,
        byType: {},
        bySeverity: {},
        blocked: 0
      }) as {
        total: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        blocked: number;
      };

      currentStats.total++;
      currentStats.byType[threat.type] = (currentStats.byType[threat.type] || 0) + 1;
      currentStats.bySeverity[threat.severity] = (currentStats.bySeverity[threat.severity] || 0) + 1;
      
      if (threat.blocked) {
        currentStats.blocked++;
      }

      await setCache(statsKey, currentStats, 86400 * 7); // Keep for 7 days

    } catch (error) {
      logger.error('Error updating threat statistics:', error);
    }
  }

  // Alert security team for critical threats
  private static async alertSecurityTeam(threat: AISecurityThreat): Promise<void> {
    try {
      // In production, integrate with alerting system (Slack, email, SMS)
      logger.error('CRITICAL AI SECURITY THREAT', {
        threatId: threat.id,
        type: threat.type,
        severity: threat.severity,
        userId: threat.userId,
        contentPreview: threat.content.substring(0, 100) + '...',
        immediateAction: threat.mitigationAction
      });

      // Could integrate with:
      // - Slack webhook
      // - Email alerts
      // - SMS notifications
      // - Security incident management system

    } catch (error) {
      logger.error('Error alerting security team:', error);
    }
  }

  // Get threat statistics for monitoring
  static async getThreatStatistics(days: number = 7): Promise<{
    totalThreats: number;
    threatsByType: { [key: string]: number };
    threatsBySeverity: { [key: string]: number };
    blockedThreats: number;
    dailyBreakdown: { [date: string]: number };
  }> {
    try {
      const stats = {
        totalThreats: 0,
        threatsByType: {},
        threatsBySeverity: {},
        blockedThreats: 0,
        dailyBreakdown: {}
      };

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const statsKey = `ai_threat_stats:${dateStr}`;
        
        const dayStats = await getCache(statsKey) as {
          total: number;
          byType: Record<string, number>;
          bySeverity: Record<string, number>;
          blocked: number;
        } | null;
        if (dayStats) {
          stats.totalThreats += dayStats.total;
          stats.blockedThreats += dayStats.blocked;
          stats.dailyBreakdown[dateStr] = dayStats.total;

          // Aggregate by type and severity
          for (const [type, count] of Object.entries(dayStats.byType)) {
            stats.threatsByType[type] = (stats.threatsByType[type] || 0) + (count as number);
          }
          
          for (const [severity, count] of Object.entries(dayStats.bySeverity)) {
            stats.threatsBySeverity[severity] = (stats.threatsBySeverity[severity] || 0) + (count as number);
          }
        }
      }

      return stats;

    } catch (error) {
      logger.error('Error getting threat statistics:', error);
      return {
        totalThreats: 0,
        threatsByType: {},
        threatsBySeverity: {},
        blockedThreats: 0,
        dailyBreakdown: {}
      };
    }
  }

  // Emergency AI shutdown system
  static async emergencyShutdown(reason: string, adminUserId: string): Promise<{
    success: boolean;
    shutdownId: string;
    affectedSystems: string[];
  }> {
    try {
      const shutdownId = crypto.randomUUID();
      const timestamp = new Date();

      // Set emergency shutdown flag
      await setCache('ai_emergency_shutdown', {
        id: shutdownId,
        reason,
        adminUserId,
        timestamp,
        active: true
      }, 3600); // 1 hour

      logger.error('AI EMERGENCY SHUTDOWN ACTIVATED', {
        shutdownId,
        reason,
        adminUserId,
        timestamp
      });

      const affectedSystems = [
        'ai_recommendations',
        'content_generation',
        'ai_moderation',
        'conversation_ai',
        'cultural_intelligence'
      ];

      return {
        success: true,
        shutdownId,
        affectedSystems
      };

    } catch (error) {
      logger.error('Error in emergency AI shutdown:', error);
      return {
        success: false,
        shutdownId: '',
        affectedSystems: []
      };
    }
  }

  // Check if AI systems are under emergency shutdown
  static async isEmergencyShutdownActive(): Promise<boolean> {
    try {
      const shutdown = await getCache('ai_emergency_shutdown') as { active: boolean } | null;
      return shutdown && shutdown.active;
    } catch (error) {
      logger.error('Error checking emergency shutdown status:', error);
      return false; // Default to allowing operations
    }
  }
}