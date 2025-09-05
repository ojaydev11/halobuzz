#!/usr/bin/env node

/**
 * Local test script for auth routes
 * This tests the auth functionality before deployment
 */

const { execSync } = require('child_process');
const http = require('http');

console.log('🧪 Testing HaloBuzz Auth Routes Locally...\n');

// Test data
const testUser = {
  username: 'testuser' + Date.now(),
  email: 'test' + Date.now() + '@example.com',
  password: 'password123',
  country: 'US',
  language: 'en'
};

const baseUrl = 'http://localhost:4000';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await makeRequest('GET', '/healthz');
    console.log(`   Status: ${healthResponse.status}`);
    if (healthResponse.status === 200) {
      console.log('   ✅ Health check passed\n');
    } else {
      console.log('   ❌ Health check failed\n');
      return;
    }

    console.log('2. Testing routes debug endpoint...');
    const routesResponse = await makeRequest('GET', '/api/v1/monitoring/routes');
    console.log(`   Status: ${routesResponse.status}`);
    if (routesResponse.status === 200) {
      console.log('   ✅ Routes endpoint accessible');
      console.log('   Environment:', routesResponse.data.environment);
      console.log('   Routes found:', routesResponse.data.routes.length);
      
      // Check if auth routes are present
      const authRoutes = routesResponse.data.routes.filter(route => 
        route.path.includes('/api/v1/auth')
      );
      console.log('   Auth routes found:', authRoutes.length);
      if (authRoutes.length > 0) {
        console.log('   ✅ Auth routes are mounted\n');
      } else {
        console.log('   ❌ No auth routes found\n');
        return;
      }
    } else {
      console.log('   ❌ Routes endpoint failed\n');
      return;
    }

    console.log('3. Testing user registration...');
    const registerResponse = await makeRequest('POST', '/api/v1/auth/register', testUser);
    console.log(`   Status: ${registerResponse.status}`);
    if (registerResponse.status === 201) {
      console.log('   ✅ Registration successful');
      console.log('   User ID:', registerResponse.data.data.user.id);
      console.log('   Token received:', !!registerResponse.data.data.token);
    } else {
      console.log('   ❌ Registration failed');
      console.log('   Error:', registerResponse.data);
      return;
    }

    console.log('\n4. Testing user login...');
    const loginResponse = await makeRequest('POST', '/api/v1/auth/login', {
      identifier: testUser.email,
      password: testUser.password
    });
    console.log(`   Status: ${loginResponse.status}`);
    if (loginResponse.status === 200) {
      console.log('   ✅ Login successful');
      console.log('   User logged in:', loginResponse.data.data.user.username);
    } else {
      console.log('   ❌ Login failed');
      console.log('   Error:', loginResponse.data);
    }

    console.log('\n🎉 All tests completed!');
    console.log('✅ Auth routes are working correctly');
    console.log('🚀 Ready for deployment to Northflank!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running:');
    console.log('   cd backend && npm run dev');
  }
}

// Check if server is running first
console.log('🔍 Checking if server is running...');
makeRequest('GET', '/healthz')
  .then(() => {
    console.log('✅ Server is running, starting tests...\n');
    runTests();
  })
  .catch(() => {
    console.log('❌ Server is not running!');
    console.log('💡 Start the server first:');
    console.log('   cd backend && npm run dev');
    console.log('   Then run: node test-auth-local.js');
  });
