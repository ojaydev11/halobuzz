// Development server helper for HaloBuzz Mobile
import { Platform } from 'react-native';

export interface DevServerConfig {
  host: string;
  port: number;
  protocol: 'http' | 'https';
  enabled: boolean;
}

export class DevServerManager {
  private static instance: DevServerManager;
  private config: DevServerConfig;
  private isServerRunning: boolean = false;

  constructor() {
    this.config = {
      host: Platform.OS === 'ios' ? 'localhost' : '10.0.2.2', // Android emulator uses 10.0.2.2
      port: 3001,
      protocol: 'http',
      enabled: __DEV__
    };
  }

  static getInstance(): DevServerManager {
    if (!DevServerManager.instance) {
      DevServerManager.instance = new DevServerManager();
    }
    return DevServerManager.instance;
  }

  getServerUrl(): string {
    return `${this.config.protocol}://${this.config.host}:${this.config.port}`;
  }

  getApiUrl(): string {
    return `${this.getServerUrl()}/api/v1`;
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getApiUrl()}/health`, {
        method: 'GET',
        timeout: 5000
      });
      this.isServerRunning = response.ok;
      return this.isServerRunning;
    } catch (error) {
      this.isServerRunning = false;
      if (__DEV__) {
        console.warn('🔍 Development server not running:', error);
        console.warn(`🔗 Expected server at: ${this.getApiUrl()}`);
        console.warn('💡 To start the backend server, run: npm run dev in the backend directory');
      }
      return false;
    }
  }

  async startServer(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Try to ping the server
      const isHealthy = await this.checkServerHealth();
      if (isHealthy) {
        if (__DEV__) {
          console.log('✅ Development server is running');
        }
        return true;
      }

      // Server is not running, show helpful message
      if (__DEV__) {
        console.warn('⚠️ Development server is not running');
        console.warn('📋 To start the backend server:');
        console.warn('   1. Open terminal in the backend directory');
        console.warn('   2. Run: npm install');
        console.warn('   3. Run: npm run dev');
        console.warn(`   4. Server should start on: ${this.getServerUrl()}`);
      }
      return false;
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Failed to start development server:', error);
      }
      return false;
    }
  }

  getConfig(): DevServerConfig {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }

  // Get network-friendly configuration for different platforms
  getNetworkConfig() {
    const baseConfig = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000
    };

    if (Platform.OS === 'android') {
      return {
        ...baseConfig,
        // Android emulator specific settings
        host: '10.0.2.2',
        timeout: 15000 // Longer timeout for emulator
      };
    }

    if (Platform.OS === 'ios') {
      return {
        ...baseConfig,
        // iOS simulator specific settings
        host: 'localhost',
        timeout: 10000
      };
    }

    return baseConfig;
  }
}

// Export singleton instance
export const devServerManager = DevServerManager.getInstance();

// Helper function to get the appropriate API URL
export function getApiUrl(): string {
  if (__DEV__) {
    return devServerManager.getApiUrl();
  }
  
  // Production URL
  return 'https://halo-api-production.up.railway.app/api/v1';
}

// Helper function to check if we should use offline mode
export async function shouldUseOfflineMode(): Promise<boolean> {
  if (!__DEV__) {
    return false; // Always try online in production
  }

  const isServerRunning = await devServerManager.checkServerHealth();
  return !isServerRunning;
}

export default DevServerManager;


