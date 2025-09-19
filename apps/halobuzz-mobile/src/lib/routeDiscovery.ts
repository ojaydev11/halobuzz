import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface RouteCache {
  [endpoint: string]: string;
}

const ROUTE_CACHE_KEY = 'halobuzz_route_cache';
const DISCOVERY_TIMEOUT = 5000; // 5 seconds per attempt

// Common route patterns to try for each endpoint
const ROUTE_PATTERNS = {
  auth: {
    register: ['/api/v1/auth/register', '/auth/register', '/api/auth/register', '/v1/auth/register', '/users/register'],
    login: ['/api/v1/auth/login', '/auth/login', '/api/auth/login', '/v1/auth/login', '/users/login'],
    me: ['/api/v1/auth/me', '/auth/me', '/api/auth/me', '/v1/auth/me', '/users/me'],
    refresh: ['/api/v1/auth/refresh', '/auth/refresh', '/api/auth/refresh', '/v1/auth/refresh', '/users/refresh'],
    logout: ['/api/v1/auth/logout', '/auth/logout', '/api/auth/logout', '/v1/auth/logout', '/users/logout']
  },
  streams: {
    list: ['/streams', '/api/streams', '/v1/streams', '/live/streams'],
    trending: ['/streams/trending', '/api/streams/trending', '/v1/streams/trending', '/live/trending'],
    create: ['/streams', '/api/streams', '/v1/streams', '/live/streams'],
    get: ['/streams', '/api/streams', '/v1/streams', '/live/streams']
  },
  health: {
    check: ['/api/v1/health', '/health', '/api/health', '/v1/health', '/monitoring/health', '/healthz']
  }
};

class RouteDiscovery {
  private cache: RouteCache = {};
  private isDiscovering: Set<string> = new Set();

  constructor() {
    this.loadCache();
  }

  private async loadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(ROUTE_CACHE_KEY);
      if (cached) {
        this.cache = JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load route cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save route cache:', error);
    }
  }

  /**
   * Discover the correct route for an endpoint
   */
  async discoverRoute(
    baseUrl: string,
    category: keyof typeof ROUTE_PATTERNS,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    testData?: any,
    apiPrefix: string = ''
  ): Promise<string> {
    const cacheKey = `${baseUrl}:${apiPrefix}:${category}:${endpoint}:${method}`;
    
    // Return cached route if available
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    // Prevent multiple discovery attempts for the same route
    if (this.isDiscovering.has(cacheKey)) {
      // Wait for ongoing discovery
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.cache[cacheKey]) {
            resolve(this.cache[cacheKey]);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.isDiscovering.add(cacheKey);

    try {
      const patterns = ROUTE_PATTERNS[category]?.[endpoint as keyof typeof ROUTE_PATTERNS[typeof category]];
      if (!patterns) {
        throw new Error(`No patterns defined for ${category}.${endpoint}`);
      }

      for (const pattern of patterns as string[]) {
        try {
          // Add the API prefix to the full URL
          const fullUrl = `${baseUrl}${apiPrefix}${pattern}`;
          
          if (__DEV__) {
            console.log(`🔍 Testing route: ${method} ${fullUrl}`);
          }

          const response = await this.testRoute(fullUrl, method, testData);
          
          if (response.status < 400) {
            // Found working route
            this.cache[cacheKey] = pattern;
            await this.saveCache();
            
            if (__DEV__) {
              console.log(`✅ Discovered route: ${pattern} (${response.status})`);
            }
            
            return pattern;
          }
        } catch (error) {
          // Continue to next pattern
          if (__DEV__) {
            console.log(`❌ Route failed: ${pattern} - ${(error as Error).message}`);
          }
        }
      }

      // No working route found
      throw new Error(`No working route found for ${category}.${endpoint}`);
    } finally {
      this.isDiscovering.delete(cacheKey);
    }
  }

  private async testRoute(url: string, method: 'GET' | 'POST', testData?: any): Promise<{ status: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT);

    try {
      const config = {
        method,
        url,
        signal: controller.signal,
        timeout: DISCOVERY_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HaloBuzz-Mobile/1.0.0'
        }
      };

      if (method === 'POST' && testData) {
        (config as any).data = testData;
      }

      const response = await axios(config);
      clearTimeout(timeoutId);
      return { status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any).response) {
        return { status: (error as any).response.status };
      }
      throw error;
    }
  }

  /**
   * Get a discovered route or return a default
   */
  getRoute(
    baseUrl: string,
    category: keyof typeof ROUTE_PATTERNS,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): string {
    const cacheKey = `${baseUrl}:${category}:${endpoint}:${method}`;
    const cached = this.cache[cacheKey];
    
    if (cached) {
      return cached;
    }

    // Return first pattern as fallback
    const patterns = ROUTE_PATTERNS[category]?.[endpoint as keyof typeof ROUTE_PATTERNS[typeof category]];
    return patterns?.[0] || `/${category}/${endpoint}`;
  }

  /**
   * Clear the route cache
   */
  async clearCache(): Promise<void> {
    this.cache = {};
    await AsyncStorage.removeItem(ROUTE_CACHE_KEY);
  }

  /**
   * Get all discovered routes
   */
  getDiscoveredRoutes(): RouteCache {
    return { ...this.cache };
  }
}

export const routeDiscovery = new RouteDiscovery();
export default routeDiscovery;
