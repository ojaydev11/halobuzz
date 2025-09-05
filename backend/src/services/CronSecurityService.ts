import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

export interface CronJobConfig {
  name: string;
  schedule: string;
  timezone: string;
  enabled: boolean;
  maxExecutionTime: number; // in milliseconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  lockTimeout: number; // in milliseconds
}

export interface CronJobExecution {
  jobName: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  error?: string;
  retryCount: number;
  executionId: string;
}

export class CronSecurityService {
  private static instance: CronSecurityService;
  private activeExecutions: Map<string, CronJobExecution> = new Map();
  private jobConfigs: Map<string, CronJobConfig> = new Map();
  private defaultConfig: CronJobConfig = {
    name: 'default',
    schedule: '0 0 * * *',
    timezone: 'UTC',
    enabled: true,
    maxExecutionTime: 300000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 60000, // 1 minute
    lockTimeout: 600000 // 10 minutes
  };

  public static getInstance(): CronSecurityService {
    if (!CronSecurityService.instance) {
      CronSecurityService.instance = new CronSecurityService();
    }
    return CronSecurityService.instance;
  }

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default job configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfigs: CronJobConfig[] = [
      {
        name: 'ogDailyBonus',
        schedule: '5 0 * * *',
        timezone: 'Australia/Sydney',
        enabled: true,
        maxExecutionTime: 600000, // 10 minutes
        retryAttempts: 3,
        retryDelay: 300000, // 5 minutes
        lockTimeout: 1800000 // 30 minutes
      },
      {
        name: 'throneExpiry',
        schedule: '*/5 * * * *',
        timezone: 'UTC',
        enabled: true,
        maxExecutionTime: 120000, // 2 minutes
        retryAttempts: 2,
        retryDelay: 60000, // 1 minute
        lockTimeout: 600000 // 10 minutes
      },
      {
        name: 'festivalActivation',
        schedule: '0 * * * *',
        timezone: 'UTC',
        enabled: true,
        maxExecutionTime: 300000, // 5 minutes
        retryAttempts: 3,
        retryDelay: 120000, // 2 minutes
        lockTimeout: 900000 // 15 minutes
      },
      {
        name: 'streamRanking',
        schedule: '*/10 * * * *',
        timezone: 'UTC',
        enabled: true,
        maxExecutionTime: 180000, // 3 minutes
        retryAttempts: 2,
        retryDelay: 60000, // 1 minute
        lockTimeout: 600000 // 10 minutes
      },
      {
        name: 'trustScore',
        schedule: '*/30 * * * *',
        timezone: 'UTC',
        enabled: true,
        maxExecutionTime: 600000, // 10 minutes
        retryAttempts: 3,
        retryDelay: 180000, // 3 minutes
        lockTimeout: 1800000 // 30 minutes
      }
    ];

    defaultConfigs.forEach(config => {
      this.jobConfigs.set(config.name, config);
    });
  }

  /**
   * Check if a job can be executed
   */
  async canExecuteJob(jobName: string): Promise<{
    allowed: boolean;
    reason?: string;
    config?: CronJobConfig;
  }> {
    try {
      const config = this.jobConfigs.get(jobName) || this.defaultConfig;
      
      // Check if job is enabled
      if (!config.enabled) {
        return { allowed: false, reason: 'Job is disabled', config };
      }

      // Check for existing execution lock
      const lockKey = `cron_lock:${jobName}`;
      const existingLock = await getCache(lockKey);
      if (existingLock) {
        const lockData = JSON.parse(existingLock as string);
        const lockAge = Date.now() - lockData.timestamp;
        
        if (lockAge < config.lockTimeout) {
          return { 
            allowed: false, 
            reason: `Job is already running (lock age: ${Math.round(lockAge / 1000)}s)`,
            config 
          };
        } else {
          // Lock expired, remove it
          await this.releaseLock(jobName);
        }
      }

      // Check for active execution
      const activeExecution = this.activeExecutions.get(jobName);
      if (activeExecution && activeExecution.status === 'running') {
        const executionAge = Date.now() - activeExecution.startTime.getTime();
        if (executionAge < config.maxExecutionTime) {
          return { 
            allowed: false, 
            reason: `Job is already running (execution age: ${Math.round(executionAge / 1000)}s)`,
            config 
          };
        } else {
          // Execution timeout, mark as failed
          activeExecution.status = 'timeout';
          activeExecution.endTime = new Date();
          activeExecution.error = 'Execution timeout';
          this.activeExecutions.delete(jobName);
        }
      }

      return { allowed: true, config };
    } catch (error) {
      logger.error('Cron job execution check failed:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Start job execution
   */
  async startJobExecution(jobName: string): Promise<{
    executionId: string;
    config: CronJobConfig;
  }> {
    const config = this.jobConfigs.get(jobName) || this.defaultConfig;
    const executionId = `${jobName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create execution record
    const execution: CronJobExecution = {
      jobName,
      startTime: new Date(),
      status: 'running',
      retryCount: 0,
      executionId
    };
    
    this.activeExecutions.set(jobName, execution);
    
    // Set execution lock
    await this.setLock(jobName, executionId);
    
    logger.info(`Started cron job execution: ${jobName} (${executionId})`);
    
    return { executionId, config };
  }

  /**
   * Complete job execution
   */
  async completeJobExecution(jobName: string, executionId: string, success: boolean, error?: string): Promise<void> {
    const execution = this.activeExecutions.get(jobName);
    if (execution && execution.executionId === executionId) {
      execution.endTime = new Date();
      execution.status = success ? 'completed' : 'failed';
      if (error) {
        execution.error = error;
      }
      
      // Store execution history
      await this.storeExecutionHistory(execution);
      
      // Clean up
      this.activeExecutions.delete(jobName);
      await this.releaseLock(jobName);
      
      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      logger.info(`Completed cron job execution: ${jobName} (${executionId}) - ${execution.status} in ${duration}ms`);
    }
  }

  /**
   * Set execution lock
   */
  private async setLock(jobName: string, executionId: string): Promise<void> {
    const lockKey = `cron_lock:${jobName}`;
    const lockData = {
      executionId,
      timestamp: Date.now(),
      jobName
    };
    
    await setCache(lockKey, JSON.stringify(lockData), 3600); // 1 hour TTL
  }

  /**
   * Release execution lock
   */
  private async releaseLock(jobName: string): Promise<void> {
    const lockKey = `cron_lock:${jobName}`;
    // Lock will expire automatically, but we can also delete it explicitly
    // await deleteCache(lockKey);
  }

  /**
   * Store execution history
   */
  private async storeExecutionHistory(execution: CronJobExecution): Promise<void> {
    try {
      const historyKey = `cron_history:${execution.jobName}:${execution.executionId}`;
      await setCache(historyKey, JSON.stringify(execution), 86400 * 7); // 7 days
    } catch (error) {
      logger.error('Failed to store execution history:', error);
    }
  }

  /**
   * Get job configuration
   */
  getJobConfig(jobName: string): CronJobConfig | undefined {
    return this.jobConfigs.get(jobName);
  }

  /**
   * Update job configuration
   */
  updateJobConfig(jobName: string, config: Partial<CronJobConfig>): void {
    const existingConfig = this.jobConfigs.get(jobName) || this.defaultConfig;
    const updatedConfig = { ...existingConfig, ...config, name: jobName };
    this.jobConfigs.set(jobName, updatedConfig);
    logger.info(`Updated cron job configuration: ${jobName}`, config);
  }

  /**
   * Get all job configurations
   */
  getAllJobConfigs(): CronJobConfig[] {
    return Array.from(this.jobConfigs.values());
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): CronJobExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get execution history for a job
   */
  async getExecutionHistory(jobName: string, limit: number = 10): Promise<CronJobExecution[]> {
    try {
      // This would typically query Redis for stored execution history
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get execution history:', error);
      return [];
    }
  }

  /**
   * Force stop a job execution
   */
  async forceStopJob(jobName: string): Promise<boolean> {
    const execution = this.activeExecutions.get(jobName);
    if (execution && execution.status === 'running') {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = 'Force stopped by admin';
      
      await this.storeExecutionHistory(execution);
      this.activeExecutions.delete(jobName);
      await this.releaseLock(jobName);
      
      logger.warn(`Force stopped cron job execution: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable a job
   */
  toggleJob(jobName: string, enabled: boolean): boolean {
    const config = this.jobConfigs.get(jobName);
    if (config) {
      config.enabled = enabled;
      logger.info(`${enabled ? 'Enabled' : 'Disabled'} cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Validate timezone
   */
  validateTimezone(timezone: string): boolean {
    try {
      // Test if timezone is valid by creating a date
      new Date().toLocaleString('en-US', { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get supported timezones
   */
  getSupportedTimezones(): string[] {
    return [
      'UTC',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Brisbane',
      'Australia/Perth',
      'Asia/Kathmandu',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Europe/London',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'Pacific/Auckland'
    ];
  }
}

export const cronSecurityService = CronSecurityService.getInstance();
