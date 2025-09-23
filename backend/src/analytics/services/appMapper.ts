import { logger } from '../../config/logger';

export interface AppMappingConfig {
  defaultAppId: string;
  appMappings: Record<string, string>;
}

export class AppMapper {
  private config: AppMappingConfig;

  constructor() {
    this.config = {
      defaultAppId: 'halobuzz',
      appMappings: {
        'halobuzz': 'halobuzz',
        'sewago': 'sewago',
        'solsnipepro': 'solsnipepro',
        'nepvest': 'nepvest'
      }
    };
    
    logger.info('AppMapper initialized with default app ID:', this.config.defaultAppId);
  }

  /**
   * Maps a request context to an app ID
   * @param context Request context (headers, query params, etc.)
   * @returns The mapped app ID
   */
  public mapToAppId(context?: any): string {
    // Check for explicit app ID in context
    if (context?.appId && this.config.appMappings[context.appId]) {
      return context.appId;
    }

    // Check for app ID in headers
    if (context?.headers?.['x-app-id'] && this.config.appMappings[context.headers['x-app-id']]) {
      return context.headers['x-app-id'];
    }

    // Check for app ID in query parameters
    if (context?.query?.appId && this.config.appMappings[context.query.appId]) {
      return context.query.appId;
    }

    // Check for subdomain-based mapping
    if (context?.headers?.host) {
      const host = context.headers.host.toLowerCase();
      if (host.includes('sewago')) return 'sewago';
      if (host.includes('solsnipepro')) return 'solsnipepro';
      if (host.includes('nepvest')) return 'nepvest';
    }

    // Default to halobuzz
    return this.config.defaultAppId;
  }

  /**
   * Ensures all analytics documents have the correct app ID
   * @param document The analytics document
   * @param context Request context
   * @returns Document with app ID set
   */
  public ensureAppId<T extends { appId?: string }>(document: T, context?: any): T {
    if (!document.appId) {
      document.appId = this.mapToAppId(context);
    }
    return document;
  }

  /**
   * Creates a filter object for querying by app ID
   * @param appId Optional app ID to filter by
   * @param context Request context
   * @returns Filter object
   */
  public createAppFilter(appId?: string, context?: any): { appId: string } {
    const resolvedAppId = appId || this.mapToAppId(context);
    return { appId: resolvedAppId };
  }

  /**
   * Gets all available app IDs
   * @returns Array of app IDs
   */
  public getAvailableAppIds(): string[] {
    return Object.keys(this.config.appMappings);
  }

  /**
   * Validates if an app ID is valid
   * @param appId App ID to validate
   * @returns True if valid, false otherwise
   */
  public isValidAppId(appId: string): boolean {
    return appId in this.config.appMappings;
  }

  /**
   * Updates the app mapping configuration
   * @param newConfig New configuration
   */
  public updateConfig(newConfig: Partial<AppMappingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('AppMapper configuration updated', { newConfig });
  }
}

// Singleton instance
export const appMapper = new AppMapper();
