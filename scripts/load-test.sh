#!/bin/bash

# HaloBuzz Load Testing Script
# This script performs comprehensive load testing on the HaloBuzz API

API_BASE_URL="https://p01--halo-api--6jbmvhzxwv4y.code.run"
TEST_DURATION="60s"
CONCURRENT_USERS=50

echo "🚀 Starting HaloBuzz Load Testing..."
echo "API URL: $API_BASE_URL"
echo "Duration: $TEST_DURATION"
echo "Concurrent Users: $CONCURRENT_USERS"

# Test 1: Health Check Load Test
echo "📊 Testing Health Check Endpoint..."
artillery run --config load-tests.yml --target $API_BASE_URL --duration $TEST_DURATION --count $CONCURRENT_USERS << EOF
config:
  target: '$API_BASE_URL'
  phases:
    - duration: $TEST_DURATION
      arrivalRate: $CONCURRENT_USERS
scenarios:
  - name: "Health Check Load Test"
    weight: 100
    flow:
      - get:
          url: "/api/v1/health"
EOF

# Test 2: User Registration Load Test
echo "👥 Testing User Registration Load Test..."
artillery run --config load-tests.yml --target $API_BASE_URL --duration $TEST_DURATION --count $CONCURRENT_USERS << EOF
config:
  target: '$API_BASE_URL'
  phases:
    - duration: $TEST_DURATION
      arrivalRate: $CONCURRENT_USERS
scenarios:
  - name: "User Registration Load Test"
    weight: 100
    flow:
      - post:
          url: "/api/v1/auth/register"
          json:
            username: "loadtest{{ $randomString() }}"
            email: "loadtest{{ $randomString() }}@example.com"
            password: "LoadTest123!"
            country: "US"
            language: "en"
EOF

# Test 3: Mixed Workload Test
echo "🔄 Testing Mixed Workload..."
artillery run --config load-tests.yml --target $API_BASE_URL --duration $TEST_DURATION --count $CONCURRENT_USERS << EOF
config:
  target: '$API_BASE_URL'
  phases:
    - duration: $TEST_DURATION
      arrivalRate: $CONCURRENT_USERS
scenarios:
  - name: "Mixed Workload Test"
    weight: 100
    flow:
      - get:
          url: "/api/v1/health"
      - post:
          url: "/api/v1/auth/register"
          json:
            username: "mixedtest{{ $randomString() }}"
            email: "mixedtest{{ $randomString() }}@example.com"
            password: "MixedTest123!"
            country: "US"
            language: "en"
      - get:
          url: "/api/v1/games"
EOF

echo "✅ Load testing completed!"
echo "📈 Check the results above for performance metrics"
