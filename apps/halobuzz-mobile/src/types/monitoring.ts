export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }>;
}

export interface SystemMetrics {
  timestamp: string;
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    connections: number;
    operations: number;
    responseTime: number;
  };
  redis: {
    memory: string;
    connectedClients: number;
    keyspace: string;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  socket: {
    connectedUsers: number;
    rooms: number;
    messagesPerMinute: number;
  };
}

export interface PerformanceSummary {
  current: {
    memory: number;
    cpu: number;
    responseTime: number;
    errorRate: number;
    databaseConnections: number;
  };
  averages: {
    memory: number;
    cpu: number;
    responseTime: number;
  };
  trends: {
    memory: 'increasing' | 'decreasing' | 'stable';
  };
  dataPoints: number;
  timeRange: {
    start: string;
    end: string;
  };
}
