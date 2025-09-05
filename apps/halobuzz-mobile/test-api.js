// Simple test script to verify API client and route discovery
const { apiClient } = require('./src/lib/api');

async function testApiClient() {
  console.log('🧪 Testing HaloBuzz API Client...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await apiClient.healthCheck();
    console.log('✅ Health check:', health);

    // Test route discovery
    console.log('\n2. Testing route discovery...');
    const routes = apiClient.getDiscoveredRoutes();
    console.log('✅ Discovered routes:', routes);

    // Test login with invalid credentials (should show 404 error handling)
    console.log('\n3. Testing error handling with invalid login...');
    try {
      await apiClient.login({
        identifier: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Error handling works:', error.message);
    }

    console.log('\n🎉 API client test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testApiClient();
