const axios = require('axios');
const fs = require('fs');

// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const API_VERSION = process.env.API_VERSION || 'v1';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || 'test-token';

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to make API calls
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}/api/${API_VERSION}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testPaymentGateways() {
  console.log('🧪 Testing Payment Gateways...');
  
  const tests = [
    {
      name: 'eSewa Payment Creation',
      endpoint: '/wallet/recharge',
      method: 'POST',
      data: {
        amount: 100,
        coins: 500,
        paymentMethod: 'esewa',
        currency: 'NPR'
      }
    },
    {
      name: 'Khalti Payment Creation',
      endpoint: '/wallet/recharge',
      method: 'POST',
      data: {
        amount: 100,
        coins: 500,
        paymentMethod: 'khalti',
        currency: 'NPR'
      }
    },
    {
      name: 'Stripe Payment Intent',
      endpoint: '/wallet/recharge',
      method: 'POST',
      data: {
        amount: 10,
        coins: 500,
        paymentMethod: 'stripe',
        currency: 'USD'
      }
    },
    {
      name: 'PayPal Order Creation',
      endpoint: '/wallet/recharge',
      method: 'POST',
      data: {
        amount: 10,
        coins: 500,
        paymentMethod: 'paypal',
        currency: 'USD'
      }
    }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.method, test.endpoint, test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
      testResults.passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${result.error}`);
    }
  }
}

async function testAIModeration() {
  console.log('🧪 Testing AI Moderation...');
  
  const tests = [
    {
      name: 'Text Moderation',
      endpoint: '/moderation/analyze',
      method: 'POST',
      data: {
        content: 'This is a test message',
        type: 'text'
      }
    },
    {
      name: 'Age Verification',
      endpoint: '/moderation/verify-age',
      method: 'POST',
      data: {}
    },
    {
      name: 'Moderation Stats',
      endpoint: '/moderation/stats',
      method: 'GET'
    },
    {
      name: 'User Flags',
      endpoint: '/moderation/flags',
      method: 'GET'
    }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.method, test.endpoint, test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
      testResults.passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${result.error}`);
    }
  }
}

async function testHaloAI() {
  console.log('🧪 Testing HaloAI Assistant...');
  
  const tests = [
    {
      name: 'Engagement Boost',
      endpoint: '/haloai/engage',
      method: 'POST',
      data: {
        requestType: 'boost',
        context: { streamId: 'test-stream' }
      }
    },
    {
      name: 'AI Suggestions',
      endpoint: '/haloai/engage',
      method: 'POST',
      data: {
        requestType: 'suggestions'
      }
    },
    {
      name: 'Engagement Analysis',
      endpoint: '/haloai/engage',
      method: 'POST',
      data: {
        requestType: 'analysis'
      }
    },
    {
      name: 'Active Festivals',
      endpoint: '/haloai/festivals',
      method: 'GET'
    },
    {
      name: 'AI Recommendations',
      endpoint: '/haloai/recommendations',
      method: 'GET'
    }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.method, test.endpoint, test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
      testResults.passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${result.error}`);
    }
  }
}

async function testWebRTC() {
  console.log('🧪 Testing WebRTC Fallback...');
  
  const tests = [
    {
      name: 'WebRTC Status',
      endpoint: '/webrtc/status',
      method: 'GET'
    },
    {
      name: 'WebRTC Offer Creation',
      endpoint: '/webrtc/offer',
      method: 'POST',
      data: {
        streamId: 'test-stream',
        quality: 'medium'
      }
    },
    {
      name: 'Active Peers',
      endpoint: '/webrtc/peers',
      method: 'GET'
    }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.method, test.endpoint, test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
      testResults.passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${result.error}`);
    }
  }
}

async function testSubtitles() {
  console.log('🧪 Testing AI Subtitles...');
  
  const tests = [
    {
      name: 'Supported Languages',
      endpoint: '/subtitles/languages',
      method: 'GET'
    },
    {
      name: 'Language Detection',
      endpoint: '/subtitles/detect-language',
      method: 'POST',
      data: {
        text: 'Hello, how are you?'
      }
    },
    {
      name: 'Text Translation',
      endpoint: '/subtitles/translate',
      method: 'POST',
      data: {
        text: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'es'
      }
    },
    {
      name: 'Subtitle Generation',
      endpoint: '/subtitles/generate',
      method: 'POST',
      data: {
        streamId: 'test-stream',
        text: 'Welcome to HaloBuzz live streaming!',
        language: 'en'
      }
    }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.method, test.endpoint, test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
      testResults.passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${result.error}`);
    }
  }
}

async function testAdminDashboard() {
  console.log('🧪 Testing Admin Dashboard...');
  
  const tests = [
    {
      name: 'Admin Moderation Flags',
      endpoint: '/admin/moderation/flags',
      method: 'GET'
    },
    {
      name: 'Admin Moderation Stats',
      endpoint: '/admin/moderation/stats',
      method: 'GET'
    }
  ];

  for (const test of tests) {
    const result = await makeRequest(test.method, test.endpoint, test.data);
    if (result.success) {
      console.log(`✅ ${test.name}: PASSED`);
      testResults.passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED - ${result.error}`);
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${result.error}`);
    }
  }
}

async function testHealthCheck() {
  console.log('🧪 Testing Health Check...');
  
  const result = await makeRequest('GET', '/monitoring/health');
  if (result.success) {
    console.log('✅ Health Check: PASSED');
    testResults.passed++;
  } else {
    console.log(`❌ Health Check: FAILED - ${result.error}`);
    testResults.failed++;
    testResults.errors.push(`Health Check: ${result.error}`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting HaloBuzz Integration Tests...\n');
  console.log(`Testing against: ${BASE_URL}/api/${API_VERSION}\n`);

  try {
    await testHealthCheck();
    console.log('');
    
    await testPaymentGateways();
    console.log('');
    
    await testAIModeration();
    console.log('');
    
    await testHaloAI();
    console.log('');
    
    await testWebRTC();
    console.log('');
    
    await testSubtitles();
    console.log('');
    
    await testAdminDashboard();
    console.log('');

    // Print summary
    console.log('📊 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      testResults.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      apiVersion: API_VERSION,
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)
      },
      errors: testResults.errors
    };

    fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Test results saved to test-results.json');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();

