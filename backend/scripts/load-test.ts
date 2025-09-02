import { performance } from 'perf_hooks';
import axios, { AxiosResponse } from 'axios';
import { setupLogger } from '../src/config/logger';

const logger = setupLogger();

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  duration: number; // seconds
  rampUpTime: number; // seconds
  endpoints: Array<{
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    weight: number; // relative frequency
    headers?: Record<string, string>;
    body?: any;
  }>;
}

interface TestResult {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

interface LoadTestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  statusCodeDistribution: Record<number, number>;
  endpointBreakdown: Record<string, {
    requests: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
}

class LoadTester {
  private config: LoadTestConfig;
  private results: TestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  public async runLoadTest(): Promise<LoadTestSummary> {
    logger.info('Starting load test...', {
      concurrentUsers: this.config.concurrentUsers,
      duration: this.config.duration,
      endpoints: this.config.endpoints.length
    });

    this.startTime = performance.now();
    const promises: Promise<void>[] = [];

    // Create concurrent users
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const userPromise = this.simulateUser(i);
      promises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(promises);
    this.endTime = performance.now();

    return this.generateSummary();
  }

  private async simulateUser(userId: number): Promise<void> {
    const userStartTime = performance.now();
    const userEndTime = userStartTime + (this.config.duration * 1000);

    // Ramp up delay
    const rampUpDelay = (userId / this.config.concurrentUsers) * (this.config.rampUpTime * 1000);
    await this.sleep(rampUpDelay);

    while (performance.now() < userEndTime) {
      try {
        const endpoint = this.selectRandomEndpoint();
        const result = await this.makeRequest(endpoint);
        this.results.push(result);

        // Random delay between requests (100-500ms)
        const delay = Math.random() * 400 + 100;
        await this.sleep(delay);

      } catch (error) {
        logger.error(`User ${userId} error:`, error);
        this.results.push({
          endpoint: 'unknown',
          method: 'GET',
          responseTime: 0,
          statusCode: 0,
          success: false,
          timestamp: performance.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private selectRandomEndpoint() {
    const totalWeight = this.config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return this.config.endpoints[0];
  }

  private async makeRequest(endpoint: any): Promise<TestResult> {
    const startTime = performance.now();
    const url = `${this.config.baseUrl}${endpoint.path}`;

    try {
      let response: AxiosResponse;

      switch (endpoint.method) {
        case 'GET':
          response = await axios.get(url, { 
            headers: endpoint.headers,
            timeout: 10000 
          });
          break;
        case 'POST':
          response = await axios.post(url, endpoint.body, { 
            headers: endpoint.headers,
            timeout: 10000 
          });
          break;
        case 'PUT':
          response = await axios.put(url, endpoint.body, { 
            headers: endpoint.headers,
            timeout: 10000 
          });
          break;
        case 'DELETE':
          response = await axios.delete(url, { 
            headers: endpoint.headers,
            timeout: 10000 
          });
          break;
        default:
          throw new Error(`Unsupported method: ${endpoint.method}`);
      }

      const responseTime = performance.now() - startTime;

      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        responseTime,
        statusCode: response.status,
        success: response.status >= 200 && response.status < 400,
        timestamp: performance.now()
      };

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        responseTime,
        statusCode: error.response?.status || 0,
        success: false,
        timestamp: performance.now(),
        error: error.message
      };
    }
  }

  private generateSummary(): LoadTestSummary {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.results.map(r => r.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
    const minResponseTime = responseTimes[0] || 0;
    const maxResponseTime = responseTimes[responseTimes.length - 1] || 0;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

    const testDuration = (this.endTime - this.startTime) / 1000; // seconds
    const requestsPerSecond = totalRequests / testDuration;
    const errorRate = (failedRequests / totalRequests) * 100;

    // Status code distribution
    const statusCodeDistribution: Record<number, number> = {};
    this.results.forEach(result => {
      statusCodeDistribution[result.statusCode] = (statusCodeDistribution[result.statusCode] || 0) + 1;
    });

    // Endpoint breakdown
    const endpointBreakdown: Record<string, { requests: number; avgResponseTime: number; errorRate: number }> = {};
    const endpointGroups = this.results.reduce((groups, result) => {
      const key = `${result.method} ${result.endpoint}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);

    Object.entries(endpointGroups).forEach(([endpoint, results]) => {
      const endpointRequests = results.length;
      const endpointSuccessful = results.filter(r => r.success).length;
      const endpointErrorRate = ((endpointRequests - endpointSuccessful) / endpointRequests) * 100;
      const endpointAvgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / endpointRequests;

      endpointBreakdown[endpoint] = {
        requests: endpointRequests,
        avgResponseTime: Math.round(endpointAvgResponseTime * 100) / 100,
        errorRate: Math.round(endpointErrorRate * 100) / 100
      };
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      minResponseTime: Math.round(minResponseTime * 100) / 100,
      maxResponseTime: Math.round(maxResponseTime * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
      p99ResponseTime: Math.round(p99ResponseTime * 100) / 100,
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      statusCodeDistribution,
      endpointBreakdown
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Predefined test scenarios
export const testScenarios = {
  // Basic API endpoints test
  basic: {
    baseUrl: 'http://localhost:3000/api/v1',
    concurrentUsers: 10,
    duration: 60,
    rampUpTime: 10,
    endpoints: [
      { path: '/health', method: 'GET' as const, weight: 20 },
      { path: '/config', method: 'GET' as const, weight: 15 },
      { path: '/users/profile', method: 'GET' as const, weight: 10 },
      { path: '/streams', method: 'GET' as const, weight: 25 },
      { path: '/gifts', method: 'GET' as const, weight: 15 },
      { path: '/games', method: 'GET' as const, weight: 15 }
    ]
  },

  // High load test
  highLoad: {
    baseUrl: 'http://localhost:3000/api/v1',
    concurrentUsers: 100,
    duration: 300,
    rampUpTime: 30,
    endpoints: [
      { path: '/health', method: 'GET' as const, weight: 30 },
      { path: '/streams', method: 'GET' as const, weight: 40 },
      { path: '/chat/messages', method: 'GET' as const, weight: 20 },
      { path: '/gifts', method: 'GET' as const, weight: 10 }
    ]
  },

  // Stress test
  stress: {
    baseUrl: 'http://localhost:3000/api/v1',
    concurrentUsers: 500,
    duration: 600,
    rampUpTime: 60,
    endpoints: [
      { path: '/health', method: 'GET' as const, weight: 50 },
      { path: '/streams', method: 'GET' as const, weight: 30 },
      { path: '/chat/messages', method: 'GET' as const, weight: 20 }
    ]
  }
};

// CLI interface
async function main() {
  const scenario = process.argv[2] || 'basic';
  const config = testScenarios[scenario as keyof typeof testScenarios];

  if (!config) {
    logger.error('Invalid scenario. Available scenarios:', Object.keys(testScenarios));
    process.exit(1);
  }

  const tester = new LoadTester(config);
  
  try {
    const summary = await tester.runLoadTest();
    
    logger.info('Load test completed!');
    logger.info('Summary:', summary);
    
    // Save results to file
    const resultsFile = `load-test-results-${scenario}-${Date.now()}.json`;
    await require('fs/promises').writeFile(resultsFile, JSON.stringify(summary, null, 2));
    logger.info(`Results saved to: ${resultsFile}`);
    
  } catch (error) {
    logger.error('Load test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { LoadTester, LoadTestConfig, LoadTestSummary };
