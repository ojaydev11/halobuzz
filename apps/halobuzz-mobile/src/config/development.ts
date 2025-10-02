// Development configuration for HaloBuzz Mobile
export const DEV_CONFIG = {
  // Use production backend for global testing
  API_BASE_URL: 'https://halo-api-production.up.railway.app',
  API_PREFIX: '/api/v1',
  WS_URL: 'wss://halo-api-production.up.railway.app',
  
  // Development flags
  DEV_MODE: true,
  USE_MOCK_DATA: false, // Use real production data for global testing
  
  // Network settings
  NETWORK_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 3,
  
  // Debug settings
  DEBUG_NETWORK: true,
  LOG_LEVEL: 'debug'
};

// Production configuration
export const PROD_CONFIG = {
  API_BASE_URL: 'https://halo-api-production.up.railway.app',
  API_PREFIX: '/api/v1',
  WS_URL: 'wss://halo-api-production.up.railway.app',
  
  DEV_MODE: false,
  USE_MOCK_DATA: false,
  
  NETWORK_TIMEOUT: 15000,
  RETRY_ATTEMPTS: 2,
  
  DEBUG_NETWORK: false,
  LOG_LEVEL: 'error'
};

// Get current configuration based on environment
export const getConfig = () => {
  const isDev = __DEV__ || process.env.EXPO_PUBLIC_DEV_MODE === 'true';
  return isDev ? DEV_CONFIG : PROD_CONFIG;
};

export default getConfig;
