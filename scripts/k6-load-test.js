/**
 * k6 Load Test Script for HaloBuzz
 * Tests: Stream operations, payments, gifts at scale
 * Target: 10k concurrent users
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const streamJoinLatency = new Trend('stream_join_latency');
const paymentLatency = new Trend('payment_latency');
const giftSendLatency = new Trend('gift_send_latency');
const reconnectLatency = new Trend('reconnect_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const API_VERSION = 'v1';

// Test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up to 10k users
    main_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Warm up
        { duration: '5m', target: 1000 },  // Ramp to 1k users
        { duration: '10m', target: 5000 }, // Ramp to 5k users
        { duration: '10m', target: 10000 },// Ramp to 10k users
        { duration: '10m', target: 10000 },// Sustain 10k users
        { duration: '5m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '2m',
    },
    // Scenario 2: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '30m',
      stages: [
        { duration: '10s', target: 2000 }, // Sudden spike
        { duration: '1m', target: 2000 },  // Hold
        { duration: '10s', target: 0 },    // Drop
      ],
    },
    // Scenario 3: Constant payment load
    payment_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '42m',
    },
  },
  thresholds: {
    // Performance requirements
    http_req_duration: ['p(95)<300'], // 95% of requests < 300ms
    'http_req_duration{scenario:main_load}': ['p(95)<300'],
    stream_join_latency: ['p(95)<300'], // Stream join < 300ms
    reconnect_latency: ['p(100)<5000'], // Reconnect < 5s
    payment_latency: ['p(100)<10000'], // Wallet credit < 10s
    errors: ['rate<0.01'], // Error rate < 1%
    http_req_failed: ['rate<0.01'], // HTTP failure rate < 1%
  },
};

// Test data
const TEST_USERS = [];
const TEST_STREAMS = [];
const TEST_GIFTS = [
  { id: 'gift_1', price: 10 },
  { id: 'gift_2', price: 50 },
  { id: 'gift_3', price: 100 },
];

// Setup: Create test users and streams
export function setup() {
  console.log('Setting up test data...');
  
  // Create test users
  for (let i = 0; i < 100; i++) {
    const username = `loadtest_${randomString(8)}`;
    const res = http.post(`${BASE_URL}/api/${API_VERSION}/auth/register`, JSON.stringify({
      username,
      email: `${username}@test.com`,
      password: 'Test123!',
      country: 'NP',
      language: 'en'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (res.status === 201) {
      const data = JSON.parse(res.body);
      TEST_USERS.push({
        id: data.data.user.id,
        username,
        token: data.data.token
      });
    }
  }
  
  console.log(`Created ${TEST_USERS.length} test users`);
  
  // Start some test streams
  for (let i = 0; i < 10; i++) {
    const user = TEST_USERS[i];
    if (user) {
      const res = http.post(`${BASE_URL}/api/${API_VERSION}/streams/start`, JSON.stringify({
        title: `Load Test Stream ${i}`,
        category: 'entertainment'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (res.status === 200) {
        const data = JSON.parse(res.body);
        TEST_STREAMS.push({
          id: data.data.streamId,
          hostToken: user.token
        });
      }
    }
  }
  
  console.log(`Started ${TEST_STREAMS.length} test streams`);
  
  return { users: TEST_USERS, streams: TEST_STREAMS };
}

// Main test function
export default function(data) {
  const scenario = __ENV.SCENARIO || 'mixed';
  
  // Get random test user
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  if (!user) return;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`
  };
  
  // Test scenarios based on virtual user behavior
  const vuId = __VU;
  const scenario_choice = vuId % 10;
  
  if (scenario_choice < 6) {
    // 60% - Viewers joining streams
    testStreamViewing(data, headers);
  } else if (scenario_choice < 8) {
    // 20% - Gift senders
    testGiftSending(data, headers);
  } else if (scenario_choice < 9) {
    // 10% - Payment users
    testPaymentFlow(headers);
  } else {
    // 10% - Content creators
    testStreamHosting(headers);
  }
  
  sleep(Math.random() * 3 + 1); // Random think time
}

// Test: Stream viewing
function testStreamViewing(data, headers) {
  if (data.streams.length === 0) return;
  
  const stream = data.streams[Math.floor(Math.random() * data.streams.length)];
  
  // Join stream
  const startTime = Date.now();
  const joinRes = http.post(
    `${BASE_URL}/api/${API_VERSION}/streams/join`,
    JSON.stringify({ streamId: stream.id }),
    { headers, timeout: '10s' }
  );
  const joinLatency = Date.now() - startTime;
  
  check(joinRes, {
    'stream join successful': (r) => r.status === 200,
    'stream join latency < 300ms': () => joinLatency < 300,
  });
  
  streamJoinLatency.add(joinLatency);
  errorRate.add(joinRes.status !== 200);
  
  if (joinRes.status === 200) {
    // Simulate watching for 30-120 seconds
    sleep(Math.random() * 90 + 30);
    
    // Test reconnection (5% chance)
    if (Math.random() < 0.05) {
      testReconnection(stream.id, headers);
    }
    
    // Leave stream
    http.post(
      `${BASE_URL}/api/${API_VERSION}/streams/leave`,
      JSON.stringify({ streamId: stream.id }),
      { headers }
    );
  }
}

// Test: Reconnection
function testReconnection(streamId, headers) {
  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/${API_VERSION}/streams/reconnect`,
    JSON.stringify({ streamId, role: 'viewer' }),
    { headers, timeout: '10s' }
  );
  const latency = Date.now() - startTime;
  
  check(res, {
    'reconnection successful': (r) => r.status === 200,
    'reconnection < 5s': () => latency < 5000,
  });
  
  reconnectLatency.add(latency);
}

// Test: Gift sending
function testGiftSending(data, headers) {
  if (data.streams.length === 0) return;
  
  const stream = data.streams[Math.floor(Math.random() * data.streams.length)];
  const gift = TEST_GIFTS[Math.floor(Math.random() * TEST_GIFTS.length)];
  
  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/api/${API_VERSION}/gifts/send`,
    JSON.stringify({
      streamId: stream.id,
      giftId: gift.id,
      quantity: 1
    }),
    { headers, timeout: '5s' }
  );
  const latency = Date.now() - startTime;
  
  check(res, {
    'gift send successful': (r) => r.status === 200 || r.status === 400, // 400 for insufficient balance is ok
    'gift send latency < 500ms': () => latency < 500,
  });
  
  giftSendLatency.add(latency);
  
  // Check if rate limited (429)
  if (res.status === 429) {
    console.log('Gift rate limit hit - expected behavior');
  }
}

// Test: Payment flow
function testPaymentFlow(headers) {
  // Initiate top-up
  const startTime = Date.now();
  const topupRes = http.post(
    `${BASE_URL}/api/${API_VERSION}/wallet/topup/stripe`,
    JSON.stringify({
      amount: 10,
      coins: 500,
      currency: 'USD'
    }),
    { headers, timeout: '15s' }
  );
  
  if (topupRes.status === 200) {
    // Simulate payment webhook (would be from Stripe in real scenario)
    const webhookRes = http.post(
      `${BASE_URL}/api/${API_VERSION}/payments/stripe/webhook`,
      JSON.stringify({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_' + randomString(16),
            metadata: {
              userId: headers.userId,
              coins: 500
            }
          }
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const totalLatency = Date.now() - startTime;
    
    check(webhookRes, {
      'payment webhook processed': (r) => r.status === 200,
      'wallet credit < 10s': () => totalLatency < 10000,
    });
    
    paymentLatency.add(totalLatency);
  }
  
  // Check if rate limited (expected: 3/min)
  if (topupRes.status === 429) {
    console.log('Payment rate limit hit - expected behavior');
  }
}

// Test: Stream hosting
function testStreamHosting(headers) {
  // Start stream
  const startRes = http.post(
    `${BASE_URL}/api/${API_VERSION}/streams/start`,
    JSON.stringify({
      title: `Stress Test Stream ${__VU}`,
      category: 'entertainment',
      isAudioOnly: Math.random() < 0.3 // 30% audio-only
    }),
    { headers }
  );
  
  if (startRes.status === 200) {
    const data = JSON.parse(startRes.body);
    const streamId = data.data.streamId;
    
    // Stream for 1-3 minutes
    sleep(Math.random() * 120 + 60);
    
    // End stream
    http.post(
      `${BASE_URL}/api/${API_VERSION}/streams/end`,
      JSON.stringify({ streamId }),
      { headers }
    );
  }
}

// Teardown: Clean up test data
export function teardown(data) {
  console.log('Cleaning up test data...');
  
  // End all test streams
  data.streams.forEach(stream => {
    http.post(
      `${BASE_URL}/api/${API_VERSION}/streams/end`,
      JSON.stringify({ streamId: stream.id }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stream.hostToken}`
        }
      }
    );
  });
  
  console.log('Teardown complete');
}

// Handle summary
export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data, null, 2),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}

// Generate HTML report
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>HaloBuzz Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #FF6B6B; }
    .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <h1>HaloBuzz Load Test Report</h1>
  <div class="metric">
    <h3>Test Configuration</h3>
    <p>Peak Virtual Users: 10,000</p>
    <p>Test Duration: ${data.state.testRunDurationMs / 1000}s</p>
  </div>
  <div class="metric">
    <h3>Key Metrics</h3>
    <p>Total Requests: ${data.metrics.http_reqs.values.count}</p>
    <p>Failed Requests: ${data.metrics.http_req_failed.values.passes}</p>
    <p>Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%</p>
    <p>P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms</p>
  </div>
  <div class="metric">
    <h3>Performance Requirements</h3>
    <p class="${data.metrics.stream_join_latency.values['p(95)'] < 300 ? 'pass' : 'fail'}">
      Stream Join P95: ${data.metrics.stream_join_latency.values['p(95)'].toFixed(0)}ms (target: <300ms)
    </p>
    <p class="${data.metrics.reconnect_latency.values['p(100)'] < 5000 ? 'pass' : 'fail'}">
      Reconnect Max: ${data.metrics.reconnect_latency.values['p(100)'].toFixed(0)}ms (target: <5000ms)
    </p>
    <p class="${data.metrics.payment_latency.values['p(100)'] < 10000 ? 'pass' : 'fail'}">
      Payment Max: ${data.metrics.payment_latency.values['p(100)'].toFixed(0)}ms (target: <10000ms)
    </p>
  </div>
</body>
</html>
  `;
}