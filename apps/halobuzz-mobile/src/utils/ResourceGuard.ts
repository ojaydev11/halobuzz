import { Platform, AppState, DeviceEventEmitter } from 'react-native';
import { PerformanceMonitor } from './performanceMonitor';

interface DeviceCapabilities {
  isLowEnd: boolean;
  cpuCores: number;
  memoryGB: number;
  batteryOptimized: boolean;
}

interface ResourceLimits {
  maxConcurrentTasks: number;
  maxTimers: number;
  maxWebSockets: number;
  backgroundTaskLimit: number;
  animationBudget: number;
}

// Device capability detection
class DeviceProfiler {
  private static capabilities: DeviceCapabilities | null = null;

  static async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    // Basic capability detection
    const isLowEnd = await this.detectLowEndDevice();
    const cpuCores = this.estimateCpuCores();
    const memoryGB = this.estimateMemory();
    const batteryOptimized = this.isBatteryOptimized();

    this.capabilities = {
      isLowEnd,
      cpuCores,
      memoryGB,
      batteryOptimized,
    };

    return this.capabilities;
  }

  private static async detectLowEndDevice(): Promise<boolean> {
    if (Platform.OS === 'web') {
      // Web detection based on navigator
      return navigator.hardwareConcurrency <= 2 && navigator.deviceMemory <= 2;
    }

    // Mobile heuristics
    const startTime = Date.now();

    // Simple CPU benchmark
    let iterations = 0;
    const endTime = startTime + 100; // 100ms test

    while (Date.now() < endTime) {
      Math.random() * Math.random();
      iterations++;
    }

    // Low-end devices typically complete < 1M iterations in 100ms
    return iterations < 1000000;
  }

  private static estimateCpuCores(): number {
    if (Platform.OS === 'web') {
      return navigator.hardwareConcurrency || 2;
    }

    // Mobile estimation based on performance
    const startTime = Date.now();
    let count = 0;

    while (Date.now() - startTime < 10) {
      count++;
    }

    // Rough estimation: higher count = more cores
    return count > 500000 ? 8 : count > 200000 ? 4 : 2;
  }

  private static estimateMemory(): number {
    if (Platform.OS === 'web' && 'deviceMemory' in navigator) {
      return (navigator as any).deviceMemory;
    }

    // Conservative mobile estimates
    return Platform.OS === 'ios' ? 3 : 2; // iOS typically has more RAM
  }

  private static isBatteryOptimized(): boolean {
    // Check for battery saver mode indicators
    return Platform.OS === 'android' && global.__DEV__ === false;
  }
}

// Task queue with priority and resource limits
class ResourceAwareTaskQueue {
  private tasks: Array<{
    id: string;
    task: () => Promise<void>;
    priority: 'high' | 'normal' | 'low';
    category: 'animation' | 'network' | 'computation' | 'background';
    resourceCost: number;
  }> = [];

  private activeTasks = 0;
  private limits: ResourceLimits;
  private isProcessing = false;

  constructor(capabilities: DeviceCapabilities) {
    this.limits = this.calculateLimits(capabilities);
  }

  async addTask(
    id: string,
    task: () => Promise<void>,
    priority: 'high' | 'normal' | 'low' = 'normal',
    category: 'animation' | 'network' | 'computation' | 'background' = 'background',
    resourceCost: number = 1
  ) {
    // Check if we can accept this task
    if (this.shouldRejectTask(category, resourceCost)) {
      console.warn(`Task ${id} rejected due to resource limits`);
      return;
    }

    this.tasks.push({ id, task, priority, category, resourceCost });
    this.sortTasks();

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.tasks.length === 0) return;

    this.isProcessing = true;

    while (this.tasks.length > 0 && this.activeTasks < this.limits.maxConcurrentTasks) {
      const taskItem = this.tasks.shift()!;

      this.activeTasks++;

      try {
        PerformanceMonitor.markStart(`task_${taskItem.id}`);
        await taskItem.task();
        PerformanceMonitor.markEnd(`task_${taskItem.id}`);
      } catch (error) {
        console.error(`Task ${taskItem.id} failed:`, error);
      } finally {
        this.activeTasks--;
      }

      // Yield control to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.isProcessing = false;

    // Continue processing if there are more tasks
    if (this.tasks.length > 0) {
      setTimeout(() => this.processQueue(), 10);
    }
  }

  private shouldRejectTask(category: string, resourceCost: number): boolean {
    // Critical tasks (animations) are never rejected
    if (category === 'animation') return false;

    // Check overall resource limit
    if (this.activeTasks + resourceCost > this.limits.maxConcurrentTasks) {
      return true;
    }

    // Background tasks have strict limits
    if (category === 'background' && this.activeTasks >= this.limits.backgroundTaskLimit) {
      return true;
    }

    return false;
  }

  private sortTasks() {
    this.tasks.sort((a, b) => {
      const priorityWeight = { high: 3, normal: 2, low: 1 };
      const categoryWeight = { animation: 4, network: 3, computation: 2, background: 1 };

      const aScore = priorityWeight[a.priority] + categoryWeight[a.category];
      const bScore = priorityWeight[b.priority] + categoryWeight[b.category];

      return bScore - aScore;
    });
  }

  private calculateLimits(capabilities: DeviceCapabilities): ResourceLimits {
    if (capabilities.isLowEnd) {
      return {
        maxConcurrentTasks: 2,
        maxTimers: 5,
        maxWebSockets: 1,
        backgroundTaskLimit: 1,
        animationBudget: 30, // 30fps for low-end
      };
    } else {
      return {
        maxConcurrentTasks: capabilities.cpuCores,
        maxTimers: 10,
        maxWebSockets: 3,
        backgroundTaskLimit: 3,
        animationBudget: 60, // 60fps for capable devices
      };
    }
  }

  getStats() {
    return {
      activeTasks: this.activeTasks,
      queuedTasks: this.tasks.length,
      limits: this.limits,
    };
  }
}

// Timer management with automatic cleanup
class TimerGuard {
  private timers = new Map<string, NodeJS.Timeout>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private maxTimers: number;

  constructor(maxTimers: number) {
    this.maxTimers = maxTimers;
  }

  setTimeout(id: string, callback: () => void, delay: number): boolean {
    if (this.timers.size >= this.maxTimers) {
      console.warn('Timer limit reached, rejecting setTimeout');
      return false;
    }

    this.clearTimeout(id); // Clear existing if any

    const timer = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);

    this.timers.set(id, timer);
    return true;
  }

  setInterval(id: string, callback: () => void, delay: number): boolean {
    if (this.intervals.size >= this.maxTimers) {
      console.warn('Timer limit reached, rejecting setInterval');
      return false;
    }

    this.clearInterval(id); // Clear existing if any

    const interval = setInterval(callback, delay);
    this.intervals.set(id, interval);
    return true;
  }

  clearTimeout(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  clearInterval(id: string) {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  clearAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }

  getStats() {
    return {
      activeTimeouts: this.timers.size,
      activeIntervals: this.intervals.size,
      maxTimers: this.maxTimers,
    };
  }
}

// Background task throttling
class BackgroundTaskThrottler {
  private isAppInBackground = false;
  private throttledTasks = new Set<string>();
  private originalIntervals = new Map<string, number>();

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  private handleAppStateChange(nextAppState: string) {
    const wasInBackground = this.isAppInBackground;
    this.isAppInBackground = nextAppState === 'background' || nextAppState === 'inactive';

    if (!wasInBackground && this.isAppInBackground) {
      this.throttleBackgroundTasks();
    } else if (wasInBackground && !this.isAppInBackground) {
      this.restoreBackgroundTasks();
    }
  }

  private throttleBackgroundTasks() {
    // Increase intervals for background tasks to save battery
    this.throttledTasks.forEach(taskId => {
      const originalInterval = this.originalIntervals.get(taskId);
      if (originalInterval) {
        // Increase interval by 4x in background
        const newInterval = originalInterval * 4;
        DeviceEventEmitter.emit('throttle_task', { taskId, newInterval });
      }
    });
  }

  private restoreBackgroundTasks() {
    // Restore original intervals when app becomes active
    this.throttledTasks.forEach(taskId => {
      const originalInterval = this.originalIntervals.get(taskId);
      if (originalInterval) {
        DeviceEventEmitter.emit('restore_task', { taskId, originalInterval });
      }
    });
  }

  registerTask(taskId: string, originalInterval: number) {
    this.throttledTasks.add(taskId);
    this.originalIntervals.set(taskId, originalInterval);
  }

  unregisterTask(taskId: string) {
    this.throttledTasks.delete(taskId);
    this.originalIntervals.delete(taskId);
  }
}

// Main resource guard class
export class ResourceGuard {
  private static instance: ResourceGuard;
  private taskQueue: ResourceAwareTaskQueue | null = null;
  private timerGuard: TimerGuard | null = null;
  private backgroundThrottler: BackgroundTaskThrottler;
  private capabilities: DeviceCapabilities | null = null;

  private constructor() {
    this.backgroundThrottler = new BackgroundTaskThrottler();
  }

  static getInstance(): ResourceGuard {
    if (!ResourceGuard.instance) {
      ResourceGuard.instance = new ResourceGuard();
    }
    return ResourceGuard.instance;
  }

  async initialize() {
    this.capabilities = await DeviceProfiler.getDeviceCapabilities();
    this.taskQueue = new ResourceAwareTaskQueue(this.capabilities);
    this.timerGuard = new TimerGuard(
      this.capabilities.isLowEnd ? 5 : 10
    );

    console.log('ResourceGuard initialized with capabilities:', this.capabilities);
  }

  // Lite mode toggle for weak devices
  enableLiteMode(): boolean {
    if (!this.capabilities) return false;

    return this.capabilities.isLowEnd || this.capabilities.memoryGB < 3;
  }

  // Task scheduling with resource awareness
  async scheduleTask(
    id: string,
    task: () => Promise<void>,
    options: {
      priority?: 'high' | 'normal' | 'low';
      category?: 'animation' | 'network' | 'computation' | 'background';
      resourceCost?: number;
    } = {}
  ) {
    if (!this.taskQueue) {
      console.warn('ResourceGuard not initialized');
      return task();
    }

    return this.taskQueue.addTask(
      id,
      task,
      options.priority,
      options.category,
      options.resourceCost
    );
  }

  // Safe timer creation
  createTimeout(id: string, callback: () => void, delay: number): boolean {
    if (!this.timerGuard) {
      setTimeout(callback, delay);
      return true;
    }

    return this.timerGuard.setTimeout(id, callback, delay);
  }

  createInterval(id: string, callback: () => void, delay: number): boolean {
    if (!this.timerGuard) {
      setInterval(callback, delay);
      return true;
    }

    // Register for background throttling
    this.backgroundThrottler.registerTask(id, delay);

    return this.timerGuard.setInterval(id, callback, delay);
  }

  // Cleanup utilities
  cleanup() {
    this.timerGuard?.clearAll();
  }

  // Get comprehensive resource stats
  getResourceStats() {
    return {
      capabilities: this.capabilities,
      taskQueue: this.taskQueue?.getStats(),
      timers: this.timerGuard?.getStats(),
      performance: PerformanceMonitor.getMetrics(),
    };
  }
}

// Utility hooks and functions for React components
export const useResourceGuard = () => {
  const guard = ResourceGuard.getInstance();

  React.useEffect(() => {
    guard.initialize();
    return () => guard.cleanup();
  }, []);

  return {
    scheduleTask: guard.scheduleTask.bind(guard),
    createTimeout: guard.createTimeout.bind(guard),
    createInterval: guard.createInterval.bind(guard),
    enableLiteMode: guard.enableLiteMode(),
    getStats: guard.getResourceStats.bind(guard),
  };
};

// Battery-aware component wrapper
export const withBatteryOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.memo((props: P) => {
    const guard = ResourceGuard.getInstance();
    const [liteMode, setLiteMode] = React.useState(false);

    React.useEffect(() => {
      guard.initialize().then(() => {
        setLiteMode(guard.enableLiteMode());
      });
    }, []);

    return React.createElement(Component, {
      ...props,
      liteMode,
    });
  });
};