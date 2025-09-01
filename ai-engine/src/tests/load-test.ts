import { ModerationService } from '../services/ModerationService';
import { EngagementService } from '../services/EngagementService';
import { ReputationShield } from '../services/ReputationShield';
import { BoredomEvent, ReputationEvent } from '../models/types';
import logger from '../utils/logger';

export class LoadTestSuite {
  private moderationService: ModerationService;
  private engagementService: EngagementService;
  private reputationShield: ReputationShield;

  constructor() {
    this.moderationService = ModerationService.getInstance();
    this.engagementService = EngagementService.getInstance();
    this.reputationShield = ReputationShield.getInstance();
  }

  /**
   * Load test for NSFW frame scanning
   */
  async testNSFWScanLoad(concurrentRequests: number = 10, totalRequests: number = 100): Promise<void> {
    logger.info('Starting NSFW scan load test', { concurrentRequests, totalRequests });
    
    const startTime = Date.now();
    const results: number[] = [];
    
    for (let i = 0; i < totalRequests; i += concurrentRequests) {
      const batch = Array(concurrentRequests).fill(null).map((_, index) => {
        const mockFrames = [Buffer.from(`frame-${i + index}`)];
        return this.moderationService.nsfw_frame_scan(undefined, mockFrames);
      });
      
      const batchStart = Date.now();
      await Promise.all(batch);
      const batchEnd = Date.now();
      
      results.push(batchEnd - batchStart);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxResponseTime = Math.max(...results);
    const minResponseTime = Math.min(...results);
    
    logger.info('NSFW scan load test completed', {
      totalRequests,
      concurrentRequests,
      totalTime: `${totalTime}ms`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      maxResponseTime: `${maxResponseTime}ms`,
      minResponseTime: `${minResponseTime}ms`,
      requestsPerSecond: (totalRequests / (totalTime / 1000)).toFixed(2)
    });
  }

  /**
   * Load test for boredom detection
   */
  async testBoredomDetectionLoad(concurrentRequests: number = 10, totalRequests: number = 100): Promise<void> {
    logger.info('Starting boredom detection load test', { concurrentRequests, totalRequests });
    
    const startTime = Date.now();
    const results: number[] = [];
    
    for (let i = 0; i < totalRequests; i += concurrentRequests) {
      const batch = Array(concurrentRequests).fill(null).map((_, index) => {
        const viewerEvents: BoredomEvent[] = [
          {
            viewerId: `user-${i + index}`,
            timestamp: Date.now() - 60000,
            eventType: 'view',
            duration: 300
          },
          {
            viewerId: `user-${i + index}`,
            timestamp: Date.now() - 30000,
            eventType: 'leave'
          }
        ];
        return this.engagementService.boredom_detector(viewerEvents);
      });
      
      const batchStart = Date.now();
      await Promise.all(batch);
      const batchEnd = Date.now();
      
      results.push(batchEnd - batchStart);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxResponseTime = Math.max(...results);
    const minResponseTime = Math.min(...results);
    
    logger.info('Boredom detection load test completed', {
      totalRequests,
      concurrentRequests,
      totalTime: `${totalTime}ms`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      maxResponseTime: `${maxResponseTime}ms`,
      minResponseTime: `${minResponseTime}ms`,
      requestsPerSecond: (totalRequests / (totalTime / 1000)).toFixed(2)
    });
  }

  /**
   * Load test for reputation events
   */
  async testReputationEventLoad(concurrentRequests: number = 10, totalRequests: number = 100): Promise<void> {
    logger.info('Starting reputation event load test', { concurrentRequests, totalRequests });
    
    const startTime = Date.now();
    const results: number[] = [];
    
    for (let i = 0; i < totalRequests; i += concurrentRequests) {
      const batch = Array(concurrentRequests).fill(null).map((_, index) => {
        const event: ReputationEvent = {
          userId: `load-test-user-${i + index}`,
          eventType: Math.random() > 0.5 ? 'positive' : 'negative',
          score: Math.random() > 0.5 ? 10 : -10,
          reason: `Load test event ${i + index}`,
          timestamp: Date.now(),
          source: 'system'
        };
        return this.reputationShield.addReputationEvent(event);
      });
      
      const batchStart = Date.now();
      await Promise.all(batch);
      const batchEnd = Date.now();
      
      results.push(batchEnd - batchStart);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxResponseTime = Math.max(...results);
    const minResponseTime = Math.min(...results);
    
    logger.info('Reputation event load test completed', {
      totalRequests,
      concurrentRequests,
      totalTime: `${totalTime}ms`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      maxResponseTime: `${maxResponseTime}ms`,
      minResponseTime: `${minResponseTime}ms`,
      requestsPerSecond: (totalRequests / (totalTime / 1000)).toFixed(2)
    });
  }

  /**
   * Load test for cohost suggestions
   */
  async testCohostSuggestionLoad(concurrentRequests: number = 10, totalRequests: number = 100): Promise<void> {
    logger.info('Starting cohost suggestion load test', { concurrentRequests, totalRequests });
    
    const startTime = Date.now();
    const results: number[] = [];
    
    for (let i = 0; i < totalRequests; i += concurrentRequests) {
      const batch = Array(concurrentRequests).fill(null).map((_, index) => {
        const hostId = `host-${i + index}`;
        const country = ['US', 'BR', 'IN', 'MX', 'CA'][Math.floor(Math.random() * 5)];
        return this.engagementService.cohost_suggester(hostId, country);
      });
      
      const batchStart = Date.now();
      await Promise.all(batch);
      const batchEnd = Date.now();
      
      results.push(batchEnd - batchStart);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxResponseTime = Math.max(...results);
    const minResponseTime = Math.min(...results);
    
    logger.info('Cohost suggestion load test completed', {
      totalRequests,
      concurrentRequests,
      totalTime: `${totalTime}ms`,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      maxResponseTime: `${maxResponseTime}ms`,
      minResponseTime: `${minResponseTime}ms`,
      requestsPerSecond: (totalRequests / (totalTime / 1000)).toFixed(2)
    });
  }

  /**
   * Comprehensive load test for all services
   */
  async runComprehensiveLoadTest(): Promise<void> {
    logger.info('Starting comprehensive load test suite');
    
    const testConfigs = [
      { name: 'NSFW Scan', concurrent: 5, total: 50 },
      { name: 'Boredom Detection', concurrent: 10, total: 100 },
      { name: 'Reputation Events', concurrent: 15, total: 150 },
      { name: 'Cohost Suggestions', concurrent: 8, total: 80 }
    ];
    
    for (const config of testConfigs) {
      logger.info(`Running ${config.name} load test`);
      
      switch (config.name) {
        case 'NSFW Scan':
          await this.testNSFWScanLoad(config.concurrent, config.total);
          break;
        case 'Boredom Detection':
          await this.testBoredomDetectionLoad(config.concurrent, config.total);
          break;
        case 'Reputation Events':
          await this.testReputationEventLoad(config.concurrent, config.total);
          break;
        case 'Cohost Suggestions':
          await this.testCohostSuggestionLoad(config.concurrent, config.total);
          break;
      }
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    logger.info('Comprehensive load test suite completed');
  }

  /**
   * Memory usage monitoring
   */
  async monitorMemoryUsage(): Promise<void> {
    const startMemory = process.memoryUsage();
    logger.info('Memory usage at start', {
      rss: `${(startMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(startMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(startMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(startMemory.external / 1024 / 1024).toFixed(2)} MB`
    });
    
    // Run some load tests
    await this.runComprehensiveLoadTest();
    
    const endMemory = process.memoryUsage();
    logger.info('Memory usage at end', {
      rss: `${(endMemory.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(endMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(endMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(endMemory.external / 1024 / 1024).toFixed(2)} MB`
    });
    
    const memoryDiff = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };
    
    logger.info('Memory usage difference', {
      rss: `${(memoryDiff.rss / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryDiff.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryDiff.external / 1024 / 1024).toFixed(2)} MB`
    });
  }
}

// Export for use in test scripts
export default LoadTestSuite;
