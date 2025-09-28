// HaloBuzz Load Testing Suite
// Comprehensive load testing for scalability validation

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';
// import WebSocket from 'ws'; // Commented out for now
import { Worker } from 'worker_threads';

interface LoadTestConfig {
  testName: string;
  targetUrl: string;
  concurrentUsers: number;
  rampUpDuration: number; // milliseconds
  testDuration: number; // milliseconds
  gameMode: 'halo-arena' | 'halo-royale' | 'halo-rally' | 'halo-raids' | 'halo-tactics';
  scenarios: TestScenario[];
  performance: {
    targetResponseTime: number; // P95 response time target
    maxErrorRate: number; // Max acceptable error rate
    targetThroughput: number; // Requests per second
  };
}

interface TestScenario {
  name: string;
  weight: number; // Percentage of users running this scenario
  actions: TestAction[];
  duration: number;
  loops?: number; // How many times to repeat the scenario
}

interface TestAction {
  type: 'connect' | 'send_message' | 'wait' | 'disconnect' | 'validate_response';
  delay?: number; // Delay before action in milliseconds
  data?: any; // Data for the action
  validation?: (response: any) => boolean;
  timeout?: number;
}

interface TestResult {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalUsers: number;
  successfulConnections: number;
  failedConnections: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // Requests per second
  errorRate: number;
  memoryUsage: {
    peak: number;
    average: number;
  };
  cpuUsage: {
    peak: number;
    average: number;
  };
  networkStats: {
    bytesReceived: number;
    bytesSent: number;
    packetsLost: number;
  };
  errors: Array<{
    timestamp: number;
    error: string;
    userId?: string;
    action?: string;
  }>;
  scenarios: Array<{
    name: string;
    completionRate: number;
    averageTime: number;
    errorCount: number;
  }>;
}

interface VirtualUser {
  id: string;
  websocket?: WebSocket;
  scenario: TestScenario;
  currentActionIndex: number;
  startTime: number;
  lastActionTime: number;
  requestCount: number;
  responseCount: number;
  errors: string[];
  isActive: boolean;
  responseTimes: number[];
}

// Predefined test configurations
const LOAD_TEST_CONFIGS: Record<string, LoadTestConfig> = {
  'halo-arena-stress': {
    testName: 'HaloArena Stress Test',
    targetUrl: 'ws://localhost:8080',
    concurrentUsers: 100,
    rampUpDuration: 30000, // 30 seconds
    testDuration: 300000, // 5 minutes
    gameMode: 'halo-arena',
    scenarios: [
      {
        name: 'Normal Gameplay',
        weight: 80,
        duration: 300000,
        loops: -1, // Infinite loops
        actions: [
          { type: 'connect', timeout: 5000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-arena' } },
          { type: 'wait', delay: 1000 },
          { type: 'send_message', data: { type: 'move', direction: { x: 1, y: 0 }, magnitude: 1 } },
          { type: 'wait', delay: 100 },
          { type: 'send_message', data: { type: 'attack', target: 'enemy_player' } },
          { type: 'wait', delay: 500 },
          { type: 'send_message', data: { type: 'ability', abilityId: 'q', position: { x: 100, y: 100 } } },
          { type: 'wait', delay: 2000 }
        ]
      },
      {
        name: 'Heavy Combat',
        weight: 15,
        duration: 60000,
        loops: -1,
        actions: [
          { type: 'connect', timeout: 5000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-arena' } },
          { type: 'wait', delay: 500 },
          { type: 'send_message', data: { type: 'attack', target: 'enemy_player' } },
          { type: 'wait', delay: 100 },
          { type: 'send_message', data: { type: 'attack', target: 'enemy_player' } },
          { type: 'wait', delay: 100 },
          { type: 'send_message', data: { type: 'ability', abilityId: 'w' } },
          { type: 'wait', delay: 200 }
        ]
      },
      {
        name: 'Connection Churn',
        weight: 5,
        duration: 30000,
        loops: 5,
        actions: [
          { type: 'connect', timeout: 5000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-arena' } },
          { type: 'wait', delay: 5000 },
          { type: 'disconnect' },
          { type: 'wait', delay: 2000 }
        ]
      }
    ],
    performance: {
      targetResponseTime: 120, // 120ms P95
      maxErrorRate: 0.01, // 1% error rate
      targetThroughput: 1000 // 1000 RPS
    }
  },

  'halo-royale-capacity': {
    testName: 'HaloRoyale Capacity Test',
    targetUrl: 'ws://localhost:8080',
    concurrentUsers: 1000,
    rampUpDuration: 60000, // 1 minute
    testDuration: 600000, // 10 minutes
    gameMode: 'halo-royale',
    scenarios: [
      {
        name: 'Battle Royale Gameplay',
        weight: 90,
        duration: 600000,
        loops: -1,
        actions: [
          { type: 'connect', timeout: 10000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-royale' } },
          { type: 'wait', delay: 2000 },
          { type: 'send_message', data: { type: 'jump', targetPosition: { x: 500, y: 500 } } },
          { type: 'wait', delay: 10000 }, // Parachute time
          { type: 'send_message', data: { type: 'move', direction: { x: 1, y: 1 }, magnitude: 0.8 } },
          { type: 'wait', delay: 1000 },
          { type: 'send_message', data: { type: 'interact', targetId: 'loot_item', action: 'pickup_loot' } },
          { type: 'wait', delay: 3000 },
          { type: 'send_message', data: { type: 'attack', position: { x: 600, y: 600 } } },
          { type: 'wait', delay: 1500 }
        ]
      },
      {
        name: 'High Mobility',
        weight: 10,
        duration: 300000,
        loops: -1,
        actions: [
          { type: 'connect', timeout: 10000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-royale' } },
          { type: 'wait', delay: 1000 },
          { type: 'send_message', data: { type: 'move', direction: { x: 1, y: 0 }, magnitude: 1, sprint: true } },
          { type: 'wait', delay: 200 },
          { type: 'send_message', data: { type: 'move', direction: { x: 0, y: 1 }, magnitude: 1, sprint: true } },
          { type: 'wait', delay: 200 },
          { type: 'send_message', data: { type: 'vehicle', action: 'enter_vehicle', vehicleId: 'nearest' } },
          { type: 'wait', delay: 5000 }
        ]
      }
    ],
    performance: {
      targetResponseTime: 200, // 200ms P95 for BR
      maxErrorRate: 0.005, // 0.5% error rate
      targetThroughput: 500 // 500 RPS
    }
  },

  'matchmaking-spike': {
    testName: 'Matchmaking Spike Test',
    targetUrl: 'ws://localhost:8080',
    concurrentUsers: 500,
    rampUpDuration: 5000, // 5 seconds - rapid spike
    testDuration: 120000, // 2 minutes
    gameMode: 'halo-arena',
    scenarios: [
      {
        name: 'Queue Flood',
        weight: 100,
        duration: 120000,
        loops: -1,
        actions: [
          { type: 'connect', timeout: 3000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-arena' } },
          { type: 'wait', delay: 15000 }, // Wait for match
          { type: 'send_message', data: { action: 'leave_queue' } },
          { type: 'wait', delay: 1000 },
          { type: 'send_message', data: { action: 'join_queue', gameMode: 'halo-royale' } },
          { type: 'wait', delay: 10000 },
          { type: 'disconnect' },
          { type: 'wait', delay: 5000 }
        ]
      }
    ],
    performance: {
      targetResponseTime: 18000, // 18s matchmaking target
      maxErrorRate: 0.02, // 2% error rate during spike
      targetThroughput: 100 // 100 RPS
    }
  }
};

export class LoadTestRunner extends EventEmitter {
  private logger = new Logger('LoadTestRunner');
  private virtualUsers: Map<string, VirtualUser> = new Map();
  private testResults: TestResult = this.createEmptyResult();
  private isRunning = false;
  private workers: Worker[] = [];
  private metricsCollector: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  // Run a predefined load test
  public async runTest(testConfigName: string): Promise<TestResult> {
    const config = LOAD_TEST_CONFIGS[testConfigName];
    if (!config) {
      throw new Error(`Unknown test configuration: ${testConfigName}`);
    }

    return this.executeTest(config);
  }

  // Run a custom load test
  public async runCustomTest(config: LoadTestConfig): Promise<TestResult> {
    return this.executeTest(config);
  }

  // Execute load test
  private async executeTest(config: LoadTestConfig): Promise<TestResult> {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }

    this.isRunning = true;
    this.testResults = this.createEmptyResult();
    this.testResults.testName = config.testName;
    this.testResults.startTime = Date.now();
    this.testResults.totalUsers = config.concurrentUsers;

    this.logger.info(`Starting load test: ${config.testName}`);
    this.logger.info(`Target: ${config.targetUrl}`);
    this.logger.info(`Concurrent users: ${config.concurrentUsers}`);
    this.logger.info(`Duration: ${config.testDuration}ms`);

    try {
      // Start metrics collection
      this.startMetricsCollection();

      // Create virtual users with ramp-up
      await this.createVirtualUsers(config);

      // Wait for test duration
      await this.waitForTestCompletion(config.testDuration);

      // Cleanup
      await this.cleanup();

      // Calculate final results
      this.calculateFinalResults(config);

      this.logger.info(`Load test completed: ${config.testName}`);
      this.emit('test_completed', this.testResults);

      return this.testResults;

    } catch (error) {
      this.logger.error('Load test failed:', error);
      await this.cleanup();
      throw error;

    } finally {
      this.isRunning = false;
    }
  }

  // Create virtual users with ramp-up
  private async createVirtualUsers(config: LoadTestConfig): Promise<void> {
    const rampUpInterval = config.rampUpDuration / config.concurrentUsers;

    for (let i = 0; i < config.concurrentUsers; i++) {
      // Select scenario based on weight
      const scenario = this.selectScenario(config.scenarios);

      const user: VirtualUser = {
        id: `user_${i + 1}`,
        scenario,
        currentActionIndex: 0,
        startTime: Date.now(),
        lastActionTime: 0,
        requestCount: 0,
        responseCount: 0,
        errors: [],
        isActive: true,
        responseTimes: []
      };

      this.virtualUsers.set(user.id, user);

      // Start user scenario
      this.startUserScenario(user, config);

      // Ramp-up delay
      if (i < config.concurrentUsers - 1) {
        await this.sleep(rampUpInterval);
      }

      // Emit progress
      if (i % 10 === 0 || i === config.concurrentUsers - 1) {
        this.emit('ramp_up_progress', {
          created: i + 1,
          total: config.concurrentUsers,
          percentage: ((i + 1) / config.concurrentUsers) * 100
        });
      }
    }

    this.logger.info(`All ${config.concurrentUsers} virtual users created`);
  }

  // Start user scenario execution
  private async startUserScenario(user: VirtualUser, config: LoadTestConfig): Promise<void> {
    const executeAction = async (action: TestAction): Promise<void> => {
      try {
        PerformanceMonitor.markStart(`action_${action.type}_${user.id}`);

        // Apply delay if specified
        if (action.delay) {
          await this.sleep(action.delay);
        }

        const startTime = Date.now();

        switch (action.type) {
          case 'connect':
            await this.connectUser(user, config.targetUrl, action.timeout);
            break;

          case 'send_message':
            await this.sendMessage(user, action.data);
            break;

          case 'wait':
            await this.sleep(action.delay || 1000);
            break;

          case 'disconnect':
            await this.disconnectUser(user);
            break;

          case 'validate_response':
            // Response validation would be implemented here
            break;
        }

        const responseTime = Date.now() - startTime;
        user.responseTimes.push(responseTime);
        user.responseCount++;
        user.lastActionTime = Date.now();

        PerformanceMonitor.markEnd(`action_${action.type}_${user.id}`);

      } catch (error) {
        user.errors.push(`${action.type}: ${error.message}`);
        this.testResults.errors.push({
          timestamp: Date.now(),
          error: error.message,
          userId: user.id,
          action: action.type
        });

        this.logger.warn(`User ${user.id} action ${action.type} failed:`, error.message);
      }
    };

    // Execute scenario actions
    const runScenario = async (): Promise<void> => {
      const scenario = user.scenario;
      let loopCount = 0;

      while (user.isActive && (scenario.loops === -1 || loopCount < scenario.loops!)) {
        for (let i = 0; i < scenario.actions.length && user.isActive; i++) {
          user.currentActionIndex = i;
          await executeAction(scenario.actions[i]);
          user.requestCount++;
        }

        loopCount++;
        user.currentActionIndex = 0;

        // Check if scenario duration has elapsed
        if (Date.now() - user.startTime > scenario.duration) {
          break;
        }
      }

      // Disconnect if still connected
      if (user.websocket && user.websocket.readyState === WebSocket.OPEN) {
        await this.disconnectUser(user);
      }

      user.isActive = false;
    };

    // Start scenario execution asynchronously
    runScenario().catch((error) => {
      this.logger.error(`User ${user.id} scenario failed:`, error);
      user.isActive = false;
    });
  }

  // Connect virtual user
  private async connectUser(user: VirtualUser, targetUrl: string, timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      try {
        user.websocket = new WebSocket(targetUrl);

        user.websocket.on('open', () => {
          clearTimeout(timer);
          this.testResults.successfulConnections++;
          resolve();
        });

        user.websocket.on('error', (error) => {
          clearTimeout(timer);
          this.testResults.failedConnections++;
          reject(error);
        });

        user.websocket.on('message', (data) => {
          // Handle incoming messages
          try {
            const message = JSON.parse(data.toString());
            this.handleUserMessage(user, message);
          } catch (error) {
            // Ignore parsing errors for now
          }
        });

        user.websocket.on('close', () => {
          // Connection closed
        });

      } catch (error) {
        clearTimeout(timer);
        this.testResults.failedConnections++;
        reject(error);
      }
    });
  }

  // Send message from virtual user
  private async sendMessage(user: VirtualUser, data: any): Promise<void> {
    if (!user.websocket || user.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const message = JSON.stringify({
          ...data,
          userId: user.id,
          timestamp: Date.now(),
          sequence: user.requestCount + 1
        });

        user.websocket!.send(message, (error) => {
          if (error) {
            this.testResults.failedRequests++;
            reject(error);
          } else {
            this.testResults.successfulRequests++;
            this.testResults.totalRequests++;
            resolve();
          }
        });

      } catch (error) {
        this.testResults.failedRequests++;
        reject(error);
      }
    });
  }

  // Disconnect virtual user
  private async disconnectUser(user: VirtualUser): Promise<void> {
    if (user.websocket) {
      user.websocket.close();
      user.websocket = undefined;
    }
  }

  // Handle incoming message for user
  private handleUserMessage(user: VirtualUser, message: any): void {
    // Process server responses and update test metrics
    if (message.type === 'match_found') {
      // User found a match
    } else if (message.type === 'game_state') {
      // Game state update
    } else if (message.type === 'error') {
      user.errors.push(`Server error: ${message.error}`);
    }
  }

  // Select scenario based on weight
  private selectScenario(scenarios: TestScenario[]): TestScenario {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const scenario of scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }

    return scenarios[scenarios.length - 1]; // Fallback
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    this.metricsCollector = setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect metrics every second
  }

  // Collect performance metrics
  private collectMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Update memory stats
    this.testResults.memoryUsage.peak = Math.max(
      this.testResults.memoryUsage.peak,
      memoryUsage.heapUsed
    );

    // Calculate response time percentiles
    const allResponseTimes = Array.from(this.virtualUsers.values())
      .flatMap(user => user.responseTimes)
      .sort((a, b) => a - b);

    if (allResponseTimes.length > 0) {
      const p95Index = Math.floor(allResponseTimes.length * 0.95);
      const p99Index = Math.floor(allResponseTimes.length * 0.99);

      this.testResults.p95ResponseTime = allResponseTimes[p95Index] || 0;
      this.testResults.p99ResponseTime = allResponseTimes[p99Index] || 0;
      this.testResults.averageResponseTime = allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length;
    }

    // Calculate throughput
    const elapsedSeconds = (Date.now() - this.testResults.startTime) / 1000;
    this.testResults.throughput = this.testResults.totalRequests / elapsedSeconds;

    // Calculate error rate
    this.testResults.errorRate = this.testResults.failedRequests / Math.max(this.testResults.totalRequests, 1);

    // Emit metrics update
    this.emit('metrics_update', {
      activeUsers: Array.from(this.virtualUsers.values()).filter(u => u.isActive).length,
      totalRequests: this.testResults.totalRequests,
      throughput: this.testResults.throughput,
      errorRate: this.testResults.errorRate,
      p95ResponseTime: this.testResults.p95ResponseTime,
      memoryUsage: memoryUsage.heapUsed
    });
  }

  // Wait for test completion
  private async waitForTestCompletion(duration: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      await this.sleep(1000);

      // Check if all users have finished
      const activeUsers = Array.from(this.virtualUsers.values()).filter(u => u.isActive);
      if (activeUsers.length === 0) {
        this.logger.info('All users completed scenarios early');
        break;
      }

      // Emit progress
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / duration) * 100;
      this.emit('test_progress', {
        elapsed,
        duration,
        progress,
        activeUsers: activeUsers.length
      });
    }
  }

  // Cleanup resources
  private async cleanup(): Promise<void> {
    this.logger.info('Cleaning up load test resources...');

    // Stop metrics collection
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
      this.metricsCollector = null;
    }

    // Disconnect all users
    const disconnectPromises = Array.from(this.virtualUsers.values()).map(async (user) => {
      user.isActive = false;
      if (user.websocket) {
        try {
          user.websocket.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    await Promise.all(disconnectPromises);

    // Clean up workers
    const workerCleanup = this.workers.map(worker => new Promise<void>((resolve) => {
      worker.terminate().then(() => resolve());
    }));

    await Promise.all(workerCleanup);
    this.workers = [];

    this.logger.info('Cleanup completed');
  }

  // Calculate final test results
  private calculateFinalResults(config: LoadTestConfig): void {
    this.testResults.endTime = Date.now();
    this.testResults.duration = this.testResults.endTime - this.testResults.startTime;

    // Calculate scenario completion rates
    this.testResults.scenarios = config.scenarios.map(scenario => {
      const scenarioUsers = Array.from(this.virtualUsers.values())
        .filter(user => user.scenario.name === scenario.name);

      const completedUsers = scenarioUsers.filter(user => !user.isActive || user.errors.length === 0);
      const totalErrors = scenarioUsers.reduce((sum, user) => sum + user.errors.length, 0);
      const totalTime = scenarioUsers.reduce((sum, user) => sum + (Date.now() - user.startTime), 0);

      return {
        name: scenario.name,
        completionRate: scenarioUsers.length > 0 ? completedUsers.length / scenarioUsers.length : 0,
        averageTime: scenarioUsers.length > 0 ? totalTime / scenarioUsers.length : 0,
        errorCount: totalErrors
      };
    });

    // Final calculations
    const elapsedSeconds = this.testResults.duration / 1000;
    this.testResults.throughput = this.testResults.totalRequests / elapsedSeconds;

    this.logger.info(`Test Results Summary:`);
    this.logger.info(`- Duration: ${this.testResults.duration}ms`);
    this.logger.info(`- Total Requests: ${this.testResults.totalRequests}`);
    this.logger.info(`- Success Rate: ${((1 - this.testResults.errorRate) * 100).toFixed(2)}%`);
    this.logger.info(`- Throughput: ${this.testResults.throughput.toFixed(2)} RPS`);
    this.logger.info(`- P95 Response Time: ${this.testResults.p95ResponseTime}ms`);
    this.logger.info(`- Peak Memory: ${(this.testResults.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`);

    // Check if test passed performance criteria
    const passed = this.evaluateTestResults(config);
    this.testResults.memoryUsage.average = this.testResults.memoryUsage.peak; // Simplified

    this.emit('test_evaluated', { passed, results: this.testResults });
  }

  // Evaluate test results against performance criteria
  private evaluateTestResults(config: LoadTestConfig): boolean {
    const { performance } = config;
    let passed = true;

    if (this.testResults.p95ResponseTime > performance.targetResponseTime) {
      this.logger.warn(`P95 response time exceeded target: ${this.testResults.p95ResponseTime}ms > ${performance.targetResponseTime}ms`);
      passed = false;
    }

    if (this.testResults.errorRate > performance.maxErrorRate) {
      this.logger.warn(`Error rate exceeded target: ${(this.testResults.errorRate * 100).toFixed(2)}% > ${(performance.maxErrorRate * 100).toFixed(2)}%`);
      passed = false;
    }

    if (this.testResults.throughput < performance.targetThroughput) {
      this.logger.warn(`Throughput below target: ${this.testResults.throughput.toFixed(2)} RPS < ${performance.targetThroughput} RPS`);
      passed = false;
    }

    return passed;
  }

  // Create empty test result
  private createEmptyResult(): TestResult {
    return {
      testName: '',
      startTime: 0,
      endTime: 0,
      duration: 0,
      totalUsers: 0,
      successfulConnections: 0,
      failedConnections: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: { peak: 0, average: 0 },
      cpuUsage: { peak: 0, average: 0 },
      networkStats: { bytesReceived: 0, bytesSent: 0, packetsLost: 0 },
      errors: [],
      scenarios: []
    };
  }

  // Utility method for delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get available test configurations
  public getAvailableTests(): string[] {
    return Object.keys(LOAD_TEST_CONFIGS);
  }

  // Get test configuration
  public getTestConfig(name: string): LoadTestConfig | undefined {
    return LOAD_TEST_CONFIGS[name];
  }

  // Stop running test
  public async stopTest(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Stopping load test...');

    // Mark all users as inactive
    for (const user of this.virtualUsers.values()) {
      user.isActive = false;
    }

    // Cleanup will be handled by the main test loop
    await this.cleanup();
    this.isRunning = false;

    this.emit('test_stopped', this.testResults);
  }
}

// Factory function for creating test runner
export function createLoadTestRunner(): LoadTestRunner {
  return new LoadTestRunner();
}

// Export test configurations for external use
export { LOAD_TEST_CONFIGS };

// CLI interface for running tests
if (require.main === module) {
  const testName = process.argv[2] || 'halo-arena-stress';
  const runner = createLoadTestRunner();

  runner.on('test_progress', (progress) => {
    console.log(`Progress: ${progress.progress.toFixed(1)}% (${progress.activeUsers} active users)`);
  });

  runner.on('metrics_update', (metrics) => {
    console.log(`Metrics: ${metrics.totalRequests} reqs, ${metrics.throughput.toFixed(1)} RPS, ${(metrics.errorRate * 100).toFixed(2)}% errors`);
  });

  runner.on('test_completed', (results) => {
    console.log('\n=== Test Completed ===');
    console.log(JSON.stringify(results, null, 2));
  });

  console.log(`Starting load test: ${testName}`);
  runner.runTest(testName)
    .then(() => {
      console.log('Load test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Load test failed:', error);
      process.exit(1);
    });
}