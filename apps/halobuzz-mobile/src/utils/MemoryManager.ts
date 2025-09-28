import { Platform, DeviceEventEmitter } from 'react-native';
import { PerformanceMonitor } from './performanceMonitor';

interface MemoryStats {
  used: number;
  total: number;
  available: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
}

interface CacheEntry<T> {
  data: T;
  size: number;
  lastAccessed: number;
  priority: 'low' | 'normal' | 'high';
  ttl?: number;
}

interface MemoryBudget {
  imageCache: number;
  dataCache: number;
  componentCache: number;
  total: number;
}

// Memory monitoring and pressure detection
class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryWarningListeners: Array<() => void> = [];
  private lastMemoryCheck = 0;
  private currentPressure: 'low' | 'medium' | 'high' | 'critical' = 'low';

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  initialize() {
    // Listen for platform memory warnings
    if (Platform.OS === 'ios') {
      DeviceEventEmitter.addListener('memoryWarning', () => {
        this.handleMemoryWarning('high');
      });
    }

    // Start periodic memory monitoring
    setInterval(() => {
      this.checkMemoryPressure();
    }, 10000); // Check every 10 seconds
  }

  getMemoryStats(): MemoryStats {
    if (Platform.OS === 'web') {
      const memory = (performance as any).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
          pressure: this.calculatePressure(memory.usedJSHeapSize, memory.jsHeapSizeLimit),
        };
      }
    }

    // Fallback for mobile - estimate based on cache sizes and performance
    const estimatedUsed = this.estimateMobileMemoryUsage();
    const estimatedTotal = Platform.OS === 'ios' ? 300 * 1024 * 1024 : 220 * 1024 * 1024; // 300MB iOS, 220MB Android

    return {
      used: estimatedUsed,
      total: estimatedTotal,
      available: estimatedTotal - estimatedUsed,
      pressure: this.calculatePressure(estimatedUsed, estimatedTotal),
    };
  }

  private checkMemoryPressure() {
    const now = Date.now();
    if (now - this.lastMemoryCheck < 5000) return; // Throttle checks

    this.lastMemoryCheck = now;
    const stats = this.getMemoryStats();

    if (stats.pressure !== this.currentPressure) {
      this.currentPressure = stats.pressure;
      this.handleMemoryWarning(stats.pressure);
    }
  }

  private calculatePressure(used: number, total: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = used / total;

    if (ratio > 0.9) return 'critical';
    if (ratio > 0.75) return 'high';
    if (ratio > 0.6) return 'medium';
    return 'low';
  }

  private estimateMobileMemoryUsage(): number {
    // Estimate based on component count, cache sizes, etc.
    const baseUsage = 50 * 1024 * 1024; // 50MB base

    // Add estimates for active caches
    let cacheEstimate = 0;
    if (global.__MEMORY_CACHES__) {
      cacheEstimate = Object.values(global.__MEMORY_CACHES__).reduce(
        (total: number, cache: any) => total + (cache.size || 0),
        0
      );
    }

    return baseUsage + cacheEstimate;
  }

  private handleMemoryWarning(pressure: 'low' | 'medium' | 'high' | 'critical') {
    console.warn(`Memory pressure: ${pressure}`);

    this.memoryWarningListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Memory warning listener error:', error);
      }
    });

    // Automatic cleanup based on pressure level
    switch (pressure) {
      case 'medium':
        this.performLightCleanup();
        break;
      case 'high':
        this.performAggressiveCleanup();
        break;
      case 'critical':
        this.performEmergencyCleanup();
        break;
    }
  }

  private performLightCleanup() {
    // Clear expired cache entries
    DeviceEventEmitter.emit('memory_cleanup', { level: 'light' });
  }

  private performAggressiveCleanup() {
    // Clear low-priority caches and unused components
    DeviceEventEmitter.emit('memory_cleanup', { level: 'aggressive' });

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  private performEmergencyCleanup() {
    // Clear all non-essential caches
    DeviceEventEmitter.emit('memory_cleanup', { level: 'emergency' });

    // Clear image caches
    DeviceEventEmitter.emit('clear_image_cache');

    // Force immediate garbage collection
    if (global.gc) {
      global.gc();
    }
  }

  addMemoryWarningListener(listener: () => void) {
    this.memoryWarningListeners.push(listener);
  }

  removeMemoryWarningListener(listener: () => void) {
    const index = this.memoryWarningListeners.indexOf(listener);
    if (index > -1) {
      this.memoryWarningListeners.splice(index, 1);
    }
  }
}

// LRU Cache with memory pressure awareness
export class MemoryAwareLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private currentSize = 0;
  private maxMemory: number;

  constructor(maxSize: number, maxMemoryMB: number = 50) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes

    // Listen for memory pressure events
    DeviceEventEmitter.addListener('memory_cleanup', this.handleMemoryCleanup.bind(this));
  }

  set(
    key: string,
    value: T,
    priority: 'low' | 'normal' | 'high' = 'normal',
    ttl?: number
  ): boolean {
    const size = this.estimateSize(value);

    // Check memory budget
    if (this.currentSize + size > this.maxMemory) {
      this.evictByMemoryPressure(size);
    }

    // Check size limits
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data: value,
      size,
      lastAccessed: Date.now(),
      priority,
      ttl: ttl ? Date.now() + ttl : undefined,
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    this.cache.set(key, entry);
    this.currentSize += size;

    return true;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (entry.ttl && Date.now() > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access time
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.delete(key));
  }

  private evictLRU() {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority !== 'high' && entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private evictByMemoryPressure(requiredSize: number) {
    // Sort by priority and access time
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const priorityWeight = { low: 1, normal: 2, high: 3 };
      const aPriority = priorityWeight[a[1].priority];
      const bPriority = priorityWeight[b[1].priority];

      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower priority first
      }

      return a[1].lastAccessed - b[1].lastAccessed; // Older first
    });

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSize) break;

      freedSpace += entry.size;
      this.delete(key);
    }
  }

  private handleMemoryCleanup({ level }: { level: string }) {
    switch (level) {
      case 'light':
        this.cleanup(); // Remove expired only
        break;
      case 'aggressive':
        // Remove low priority items
        const lowPriorityKeys: string[] = [];
        for (const [key, entry] of this.cache.entries()) {
          if (entry.priority === 'low') {
            lowPriorityKeys.push(key);
          }
        }
        lowPriorityKeys.forEach(key => this.delete(key));
        break;
      case 'emergency':
        // Keep only high priority items
        const toKeep = new Map();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.priority === 'high') {
            toKeep.set(key, entry);
          }
        }
        this.cache.clear();
        this.cache = toKeep;
        this.recalculateSize();
        break;
    }
  }

  private estimateSize(value: T): number {
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }

    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).length * 2;
      } catch {
        return 1024; // Default estimate
      }
    }

    return 64; // Default for primitives
  }

  private recalculateSize() {
    this.currentSize = 0;
    for (const entry of this.cache.values()) {
      this.currentSize += entry.size;
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.currentSize,
      maxMemory: this.maxMemory,
      memoryUtilization: this.currentSize / this.maxMemory,
    };
  }
}

// Component memory management
export class ComponentMemoryManager {
  private static instance: ComponentMemoryManager;
  private componentCache = new MemoryAwareLRUCache<any>(100, 20); // 20MB for components
  private retainCounts = new Map<string, number>();

  static getInstance(): ComponentMemoryManager {
    if (!ComponentMemoryManager.instance) {
      ComponentMemoryManager.instance = new ComponentMemoryManager();
    }
    return ComponentMemoryManager.instance;
  }

  // Cache computed component props/state
  cacheComponent(key: string, component: any, priority: 'low' | 'normal' | 'high' = 'normal') {
    this.componentCache.set(key, component, priority, 300000); // 5 minute TTL
  }

  getCachedComponent(key: string) {
    return this.componentCache.get(key);
  }

  // Reference counting for complex objects
  retain(key: string) {
    const current = this.retainCounts.get(key) || 0;
    this.retainCounts.set(key, current + 1);
  }

  release(key: string) {
    const current = this.retainCounts.get(key) || 0;
    if (current <= 1) {
      this.retainCounts.delete(key);
      this.componentCache.delete(key);
    } else {
      this.retainCounts.set(key, current - 1);
    }
  }

  cleanup() {
    this.componentCache.cleanup();
  }
}

// Main memory manager
export class MemoryManager {
  private static instance: MemoryManager;
  private monitor: MemoryMonitor;
  private componentManager: ComponentMemoryManager;
  private imageCaches = new Set<MemoryAwareLRUCache<any>>();
  private budget: MemoryBudget;

  private constructor() {
    this.monitor = MemoryMonitor.getInstance();
    this.componentManager = ComponentMemoryManager.getInstance();

    // Set memory budgets based on platform
    this.budget = {
      imageCache: Platform.OS === 'ios' ? 80 : 50, // MB
      dataCache: Platform.OS === 'ios' ? 60 : 40,  // MB
      componentCache: 20, // MB
      total: Platform.OS === 'ios' ? 300 : 220, // MB
    };

    // Initialize global cache registry
    global.__MEMORY_CACHES__ = {};
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  initialize() {
    this.monitor.initialize();

    // Set up cleanup interval
    setInterval(() => {
      this.performRoutineCleanup();
    }, 60000); // Every minute
  }

  // Create a managed cache
  createCache<T>(
    name: string,
    maxSize: number,
    maxMemoryMB: number,
    category: 'image' | 'data' | 'component' = 'data'
  ): MemoryAwareLRUCache<T> {
    const cache = new MemoryAwareLRUCache<T>(maxSize, maxMemoryMB);

    if (category === 'image') {
      this.imageCaches.add(cache);
    }

    // Register in global cache registry
    global.__MEMORY_CACHES__[name] = cache;

    return cache;
  }

  // Get memory statistics
  getMemoryStats() {
    const systemStats = this.monitor.getMemoryStats();
    const cacheStats = Object.entries(global.__MEMORY_CACHES__ || {}).reduce(
      (stats, [name, cache]: [string, any]) => {
        stats[name] = cache.getStats();
        return stats;
      },
      {} as any
    );

    return {
      system: systemStats,
      caches: cacheStats,
      budget: this.budget,
      component: this.componentManager,
    };
  }

  // Force cleanup
  forceCleanup(level: 'light' | 'aggressive' | 'emergency' = 'aggressive') {
    DeviceEventEmitter.emit('memory_cleanup', { level });

    if (level === 'emergency') {
      DeviceEventEmitter.emit('clear_image_cache');
    }

    this.performRoutineCleanup();
  }

  private performRoutineCleanup() {
    // Clean up component cache
    this.componentManager.cleanup();

    // Clean up all registered caches
    Object.values(global.__MEMORY_CACHES__ || {}).forEach((cache: any) => {
      if (cache && typeof cache.cleanup === 'function') {
        cache.cleanup();
      }
    });

    // Suggest garbage collection
    if (global.gc) {
      global.gc();
    }
  }
}

// React hooks for memory management
export const useMemoryManagement = () => {
  const memoryManager = MemoryManager.getInstance();

  React.useEffect(() => {
    memoryManager.initialize();
  }, []);

  return {
    createCache: memoryManager.createCache.bind(memoryManager),
    getStats: memoryManager.getMemoryStats.bind(memoryManager),
    forceCleanup: memoryManager.forceCleanup.bind(memoryManager),
  };
};

// HOC for memory-aware components
export const withMemoryManagement = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.memo(React.forwardRef<any, P>((props, ref) => {
    const componentKey = `component_${Component.displayName || Component.name}`;
    const componentManager = ComponentMemoryManager.getInstance();

    React.useEffect(() => {
      componentManager.retain(componentKey);
      return () => {
        componentManager.release(componentKey);
      };
    }, [componentKey]);

    return React.createElement(Component, { ...props, ref });
  }));
};