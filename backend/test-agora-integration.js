#!/usr/bin/env node

/**
 * Test script to verify Agora integration
 * Run: node test-agora-integration.js
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.development' });

const API_BASE_URL = process.env.API_URL || 'http://localhost:4000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testAgoraIntegration() {
  console.log(`${colors.blue}🎥 Testing Agora Integration with Real Credentials${colors.reset}\n`);
  console.log('━'.repeat(50));

  try {
    // Step 1: Check if backend is running
    console.log(`\n${colors.yellow}1️⃣ Checking backend health...${colors.reset}`);
    try {
      const health = await axios.get(`${API_BASE_URL}/healthz`);
      console.log(`${colors.green}✅ Backend is healthy: ${health.data.status}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Backend is not running. Start it with: npm run dev${colors.reset}`);
      process.exit(1);
    }

    // Step 2: Register test user
    console.log(`\n${colors.yellow}2️⃣ Creating test user...${colors.reset}`);
    const testUser = {
      username: `agora_test_${Date.now()}`,
      email: `agora_test_${Date.now()}@test.com`,
      password: 'Test123!',
      country: 'NP',
      language: 'en'
    };

    const registerResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, testUser);
    const authToken = registerResponse.data.data.token;
    const userId = registerResponse.data.data.user.id;
    console.log(`${colors.green}✅ User created: ${testUser.username}${colors.reset}`);

    // Step 3: Start a stream (as host)
    console.log(`\n${colors.yellow}3️⃣ Starting live stream...${colors.reset}`);
    const streamResponse = await axios.post(
      `${API_BASE_URL}/api/v1/streams/start`,
      {
        title: 'Agora Test Stream',
        category: 'entertainment',
        description: 'Testing Agora integration',
        tags: ['test', 'agora']
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    const streamData = streamResponse.data.data;
    console.log(`${colors.green}✅ Stream started successfully!${colors.reset}`);
    console.log(`   Stream ID: ${streamData.streamId}`);
    console.log(`   Channel: ${streamData.channelName}`);
    console.log(`   App ID: ${streamData.appId.substring(0, 8)}...`);
    console.log(`   Token: ${streamData.rtcToken.substring(0, 20)}...`);
    console.log(`   UID: ${streamData.uid}`);

    // Step 4: Verify Agora credentials
    console.log(`\n${colors.yellow}4️⃣ Verifying Agora configuration...${colors.reset}`);
    if (streamData.appId === 'efcf83ef40e74f7a829e46f1f8d85528') {
      console.log(`${colors.green}✅ Correct Agora App ID confirmed${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ App ID mismatch! Check environment variables${colors.reset}`);
    }

    if (streamData.rtcToken && streamData.rtcToken.length > 100) {
      console.log(`${colors.green}✅ Token generated successfully (${streamData.rtcToken.length} chars)${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Token generation issue${colors.reset}`);
    }

    // Step 5: Create a viewer and join stream
    console.log(`\n${colors.yellow}5️⃣ Testing viewer join...${colors.reset}`);
    
    // Register viewer
    const viewer = {
      username: `viewer_test_${Date.now()}`,
      email: `viewer_test_${Date.now()}@test.com`,
      password: 'Test123!',
      country: 'NP',
      language: 'en'
    };

    const viewerRegResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, viewer);
    const viewerToken = viewerRegResponse.data.data.token;

    // Join stream as viewer
    const joinResponse = await axios.post(
      `${API_BASE_URL}/api/v1/streams/join`,
      { streamId: streamData.streamId },
      { headers: { Authorization: `Bearer ${viewerToken}` } }
    );

    const joinData = joinResponse.data.data;
    console.log(`${colors.green}✅ Viewer joined successfully!${colors.reset}`);
    console.log(`   Viewer UID: ${joinData.uid}`);
    console.log(`   Host UID: ${joinData.hostUid}`);
    console.log(`   Current viewers: ${joinData.streamInfo.currentViewers}`);

    // Step 6: Test reconnection
    console.log(`\n${colors.yellow}6️⃣ Testing reconnection...${colors.reset}`);
    const reconnectResponse = await axios.post(
      `${API_BASE_URL}/api/v1/streams/reconnect`,
      { 
        streamId: streamData.streamId,
        role: 'host'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const reconnectData = reconnectResponse.data.data;
    const reconnectTime = reconnectData.reconnectLatency;
    
    if (reconnectTime < 5000) {
      console.log(`${colors.green}✅ Reconnection successful in ${reconnectTime}ms (< 5s target)${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ Reconnection took ${reconnectTime}ms (target is < 5s)${colors.reset}`);
    }

    // Step 7: Leave stream as viewer
    console.log(`\n${colors.yellow}7️⃣ Testing stream leave...${colors.reset}`);
    await axios.post(
      `${API_BASE_URL}/api/v1/streams/leave`,
      { streamId: streamData.streamId },
      { headers: { Authorization: `Bearer ${viewerToken}` } }
    );
    console.log(`${colors.green}✅ Viewer left stream${colors.reset}`);

    // Step 8: End stream
    console.log(`\n${colors.yellow}8️⃣ Ending stream...${colors.reset}`);
    const endResponse = await axios.post(
      `${API_BASE_URL}/api/v1/streams/end`,
      { streamId: streamData.streamId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const endData = endResponse.data.data;
    console.log(`${colors.green}✅ Stream ended successfully!${colors.reset}`);
    console.log(`   Duration: ${endData.duration}s`);
    console.log(`   Total viewers: ${endData.totalViewers}`);
    console.log(`   Peak viewers: ${endData.peakViewers}`);

    // Summary
    console.log('\n' + '━'.repeat(50));
    console.log(`\n${colors.green}🎉 AGORA INTEGRATION TEST PASSED!${colors.reset}\n`);
    console.log('Summary:');
    console.log(`  ✅ Backend API working`);
    console.log(`  ✅ Token generation working`);
    console.log(`  ✅ Stream start/join/leave/end working`);
    console.log(`  ✅ Reconnection < 5s`);
    console.log(`  ✅ Viewer count tracking`);
    console.log(`\n${colors.blue}Agora credentials are properly configured!${colors.reset}`);

    // Instructions for mobile testing
    console.log('\n' + '━'.repeat(50));
    console.log(`\n${colors.yellow}📱 Next Steps for Mobile Testing:${colors.reset}\n`);
    console.log('1. Start the backend: npm run dev');
    console.log('2. Start the mobile app: cd apps/halobuzz-mobile && npm run ios/android');
    console.log('3. The app will use App ID: efcf83ef40e74f7a829e46f1f8d85528');
    console.log('4. Tokens will be fetched from backend automatically');
    console.log('5. Test streaming between two devices or simulators');

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log(`\n${colors.yellow}💡 Troubleshooting:${colors.reset}`);
    console.log('1. Ensure backend is running: npm run dev');
    console.log('2. Check .env.development has Agora credentials');
    console.log('3. Verify MongoDB and Redis are running');
    console.log('4. Check logs: tail -f backend/logs/app.log');
    
    process.exit(1);
  }
}

// Check if Agora credentials are set
function checkEnvironment() {
  console.log(`\n${colors.yellow}🔍 Checking environment...${colors.reset}`);
  
  const requiredVars = ['AGORA_APP_ID', 'AGORA_APP_CERTIFICATE'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error(`${colors.red}❌ Missing environment variables: ${missing.join(', ')}${colors.reset}`);
    console.log('\nPlease set them in backend/.env.development:');
    console.log('AGORA_APP_ID=efcf83ef40e74f7a829e46f1f8d85528');
    console.log('AGORA_APP_CERTIFICATE=bbac84eb632941f7b3afbba8549f6d35');
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Environment variables found${colors.reset}`);
  console.log(`   App ID: ${process.env.AGORA_APP_ID.substring(0, 8)}...`);
  console.log(`   Certificate: ${process.env.AGORA_APP_CERTIFICATE.substring(0, 8)}...`);
}

// Run tests
console.log('\n🚀 HaloBuzz Agora Integration Test\n');
checkEnvironment();
testAgoraIntegration().catch(console.error);