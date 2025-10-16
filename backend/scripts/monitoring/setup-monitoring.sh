#!/bin/bash

# HaloBuzz Monitoring Setup Script
# Comprehensive monitoring and alerting setup for production environment

set -e

# Configuration
MONITORING_DIR="./monitoring"
CONFIG_DIR="$MONITORING_DIR/config"
DASHBOARD_DIR="$MONITORING_DIR/dashboards"
ALERT_DIR="$MONITORING_DIR/alerts"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Create monitoring directory structure
create_monitoring_structure() {
    log "Creating monitoring directory structure..."
    
    mkdir -p "$MONITORING_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$DASHBOARD_DIR"
    mkdir -p "$ALERT_DIR"
    
    log "Monitoring directory structure created"
}

# Setup Prometheus configuration
setup_prometheus_config() {
    log "Setting up Prometheus configuration..."
    
    cat > "$CONFIG_DIR/prometheus.yml" << 'EOF'
# Prometheus configuration for HaloBuzz
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  # HaloBuzz Backend API
  - job_name: 'halobuzz-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  # HaloBuzz Admin Panel
  - job_name: 'halobuzz-admin'
    static_configs:
      - targets: ['admin:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # HaloBuzz Mobile API
  - job_name: 'halobuzz-mobile'
    static_configs:
      - targets: ['mobile:3002']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # HaloBuzz AI Engine
  - job_name: 'halobuzz-ai-engine'
    static_configs:
      - targets: ['ai-engine:3003']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # Node.js Exporter
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 15s

  # Redis Exporter
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 15s

  # MongoDB Exporter
  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['mongodb-exporter:9216']
    scrape_interval: 15s
EOF

    log "Prometheus configuration created"
}

# Setup Grafana dashboards
setup_grafana_dashboards() {
    log "Setting up Grafana dashboards..."
    
    # HaloBuzz Overview Dashboard
    cat > "$DASHBOARD_DIR/halobuzz-overview.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "HaloBuzz Overview",
    "tags": ["halobuzz", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (seconds)"
          }
        ]
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests per second"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ],
        "yAxes": [
          {
            "label": "Errors per second"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "singlestat",
        "targets": [
          {
            "expr": "sum(active_users_total)",
            "legendFormat": "Active Users"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    # HaloBuzz Performance Dashboard
    cat > "$DASHBOARD_DIR/halobuzz-performance.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "HaloBuzz Performance",
    "tags": ["halobuzz", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "{{instance}}"
          }
        ],
        "yAxes": [
          {
            "label": "CPU Usage %"
          }
        ]
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)",
            "legendFormat": "{{instance}}"
          }
        ],
        "yAxes": [
          {
            "label": "Memory Usage %"
          }
        ]
      },
      {
        "id": 3,
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100)",
            "legendFormat": "{{instance}} {{mountpoint}}"
          }
        ],
        "yAxes": [
          {
            "label": "Disk Usage %"
          }
        ]
      },
      {
        "id": 4,
        "title": "Network I/O",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(node_network_receive_bytes_total[5m])",
            "legendFormat": "{{instance}} {{device}} receive"
          },
          {
            "expr": "rate(node_network_transmit_bytes_total[5m])",
            "legendFormat": "{{instance}} {{device}} transmit"
          }
        ],
        "yAxes": [
          {
            "label": "Bytes per second"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    # HaloBuzz Database Dashboard
    cat > "$DASHBOARD_DIR/halobuzz-database.json" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "HaloBuzz Database",
    "tags": ["halobuzz", "database"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "MongoDB Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "mongodb_connections_current",
            "legendFormat": "Current Connections"
          }
        ],
        "yAxes": [
          {
            "label": "Connections"
          }
        ]
      },
      {
        "id": 2,
        "title": "MongoDB Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mongodb_operations_total[5m])",
            "legendFormat": "{{operation}}"
          }
        ],
        "yAxes": [
          {
            "label": "Operations per second"
          }
        ]
      },
      {
        "id": 3,
        "title": "Redis Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "redis_memory_used_bytes",
            "legendFormat": "Used Memory"
          }
        ],
        "yAxes": [
          {
            "label": "Bytes"
          }
        ]
      },
      {
        "id": 4,
        "title": "Redis Operations",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(redis_commands_total[5m])",
            "legendFormat": "{{command}}"
          }
        ],
        "yAxes": [
          {
            "label": "Commands per second"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

    log "Grafana dashboards created"
}

# Setup alerting rules
setup_alerting_rules() {
    log "Setting up alerting rules..."
    
    # Critical alerts
    cat > "$ALERT_DIR/critical.yml" << 'EOF'
groups:
  - name: halobuzz-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "Service {{ $labels.instance }} is down"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: 100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: 100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100) > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }} {{ $labels.mountpoint }}"
EOF

    # Warning alerts
    cat > "$ALERT_DIR/warning.yml" << 'EOF'
groups:
  - name: halobuzz-warning
    rules:
      - alert: ModerateErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Moderate error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: ModerateResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Moderate response time detected"
          description: "95th percentile response time is {{ $value }} seconds"

      - alert: ModerateCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 70
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Moderate CPU usage"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: ModerateMemoryUsage
        expr: 100 - ((node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100) > 75
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Moderate memory usage"
          description: "Memory usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: DiskSpaceWarning
        expr: 100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk space warning"
          description: "Disk usage is {{ $value }}% on {{ $labels.instance }} {{ $labels.mountpoint }}"
EOF

    # Info alerts
    cat > "$ALERT_DIR/info.yml" << 'EOF'
groups:
  - name: halobuzz-info
    rules:
      - alert: LowRequestRate
        expr: rate(http_requests_total[5m]) < 0.1
        for: 15m
        labels:
          severity: info
        annotations:
          summary: "Low request rate"
          description: "Request rate is {{ $value }} requests per second"

      - alert: HighRequestRate
        expr: rate(http_requests_total[5m]) > 100
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High request rate"
          description: "Request rate is {{ $value }} requests per second"

      - alert: DatabaseConnectionsHigh
        expr: mongodb_connections_current > 100
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High database connections"
          description: "Database connections: {{ $value }}"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes > 1000000000
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "High Redis memory usage"
          description: "Redis memory usage: {{ $value }} bytes"
EOF

    log "Alerting rules created"
}

# Setup Alertmanager configuration
setup_alertmanager_config() {
    log "Setting up Alertmanager configuration..."
    
    cat > "$CONFIG_DIR/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@halobuzz.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'email'
    email_configs:
      - to: 'admin@halobuzz.com'
        subject: 'HaloBuzz Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'HaloBuzz Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF

    log "Alertmanager configuration created"
}

# Setup Docker Compose for monitoring stack
setup_docker_compose() {
    log "Setting up Docker Compose for monitoring stack..."
    
    cat > "$MONITORING_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: halobuzz-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts:/etc/prometheus/alerts
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: halobuzz-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: halobuzz-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: halobuzz-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: halobuzz-redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis://redis:6379
    restart: unless-stopped

  mongodb-exporter:
    image: percona/mongodb_exporter:latest
    container_name: halobuzz-mongodb-exporter
    ports:
      - "9216:9216"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/halobuzz
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
EOF

    log "Docker Compose configuration created"
}

# Setup monitoring scripts
setup_monitoring_scripts() {
    log "Setting up monitoring scripts..."
    
    # Start monitoring stack
    cat > "$MONITORING_DIR/start-monitoring.sh" << 'EOF'
#!/bin/bash

# Start HaloBuzz monitoring stack

set -e

echo "Starting HaloBuzz monitoring stack..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

# Start monitoring services
docker-compose up -d

echo "Monitoring stack started successfully!"
echo ""
echo "Access URLs:"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana: http://localhost:3000 (admin/admin)"
echo "  Alertmanager: http://localhost:9093"
echo ""
echo "To stop the monitoring stack, run:"
echo "  docker-compose down"
EOF

    # Stop monitoring stack
    cat > "$MONITORING_DIR/stop-monitoring.sh" << 'EOF'
#!/bin/bash

# Stop HaloBuzz monitoring stack

set -e

echo "Stopping HaloBuzz monitoring stack..."

docker-compose down

echo "Monitoring stack stopped successfully!"
EOF

    # Check monitoring status
    cat > "$MONITORING_DIR/check-status.sh" << 'EOF'
#!/bin/bash

# Check HaloBuzz monitoring stack status

set -e

echo "Checking HaloBuzz monitoring stack status..."
echo ""

# Check Docker containers
echo "Docker Containers:"
docker-compose ps

echo ""
echo "Service Health:"

# Check Prometheus
if curl -s http://localhost:9090/-/healthy >/dev/null 2>&1; then
    echo "✅ Prometheus: Healthy"
else
    echo "❌ Prometheus: Unhealthy"
fi

# Check Grafana
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Grafana: Healthy"
else
    echo "❌ Grafana: Unhealthy"
fi

# Check Alertmanager
if curl -s http://localhost:9093/-/healthy >/dev/null 2>&1; then
    echo "✅ Alertmanager: Healthy"
else
    echo "❌ Alertmanager: Unhealthy"
fi

echo ""
echo "Monitoring stack status check completed!"
EOF

    # Make scripts executable
    chmod +x "$MONITORING_DIR"/*.sh

    log "Monitoring scripts created"
}

# Setup monitoring documentation
setup_monitoring_docs() {
    log "Setting up monitoring documentation..."
    
    cat > "$MONITORING_DIR/README.md" << 'EOF'
# HaloBuzz Monitoring Stack

This directory contains the complete monitoring stack for HaloBuzz production environment.

## Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization and dashboards
- **Alertmanager**: Alert routing and notification
- **Node Exporter**: System metrics collection
- **Redis Exporter**: Redis metrics collection
- **MongoDB Exporter**: MongoDB metrics collection

## Quick Start

1. **Start Monitoring Stack**:
   ```bash
   ./start-monitoring.sh
   ```

2. **Check Status**:
   ```bash
   ./check-status.sh
   ```

3. **Stop Monitoring Stack**:
   ```bash
   ./stop-monitoring.sh
   ```

## Access URLs

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Alertmanager**: http://localhost:9093

## Configuration

### Prometheus
- Configuration: `config/prometheus.yml`
- Alert rules: `alerts/*.yml`

### Grafana
- Dashboards: `dashboards/*.json`
- Data source: Prometheus (http://prometheus:9090)

### Alertmanager
- Configuration: `config/alertmanager.yml`
- Alert routing and notifications

## Dashboards

1. **HaloBuzz Overview**: High-level system overview
2. **HaloBuzz Performance**: System performance metrics
3. **HaloBuzz Database**: Database performance metrics

## Alerts

### Critical Alerts
- High error rate (>10% for 2 minutes)
- High response time (>2s for 5 minutes)
- Service down (1 minute)
- High CPU usage (>80% for 5 minutes)
- High memory usage (>85% for 5 minutes)
- Low disk space (>90% for 5 minutes)

### Warning Alerts
- Moderate error rate (>5% for 5 minutes)
- Moderate response time (>1s for 10 minutes)
- Moderate CPU usage (>70% for 10 minutes)
- Moderate memory usage (>75% for 10 minutes)
- Disk space warning (>80% for 10 minutes)

### Info Alerts
- Low request rate (<0.1 req/s for 15 minutes)
- High request rate (>100 req/s for 5 minutes)
- High database connections (>100 for 5 minutes)
- High Redis memory usage (>1GB for 5 minutes)

## Customization

### Adding New Metrics
1. Update `config/prometheus.yml` to scrape new targets
2. Create new dashboards in `dashboards/`
3. Add new alert rules in `alerts/`

### Adding New Alerts
1. Create new alert rule files in `alerts/`
2. Update `config/prometheus.yml` to include new rule files
3. Configure alert routing in `config/alertmanager.yml`

## Troubleshooting

### Common Issues

1. **Prometheus not scraping metrics**:
   - Check if targets are accessible
   - Verify scrape configuration
   - Check firewall settings

2. **Grafana not showing data**:
   - Verify Prometheus data source
   - Check dashboard queries
   - Verify time range

3. **Alerts not firing**:
   - Check alert rule syntax
   - Verify alert conditions
   - Check Alertmanager configuration

### Logs
```bash
# View container logs
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f alertmanager
```

## Maintenance

### Backup
- Prometheus data: `prometheus_data` volume
- Grafana data: `grafana_data` volume
- Alertmanager data: `alertmanager_data` volume

### Updates
```bash
# Update monitoring stack
docker-compose pull
docker-compose up -d
```

## Support

For issues and questions:
- Check logs for error messages
- Verify configuration files
- Test individual components
- Contact DevOps team
EOF

    log "Monitoring documentation created"
}

# Generate monitoring setup summary
generate_monitoring_summary() {
    log "Generating monitoring setup summary..."
    
    local summary_file="$MONITORING_DIR/setup-summary.md"
    
    cat > "$summary_file" << EOF
# HaloBuzz Monitoring Setup Summary

**Setup Date**: $(date)
**Environment**: Production
**Monitoring Directory**: $MONITORING_DIR

## Setup Components

### ✅ Configuration Files
- Prometheus configuration: \`config/prometheus.yml\`
- Alertmanager configuration: \`config/alertmanager.yml\`
- Docker Compose: \`docker-compose.yml\`

### ✅ Dashboards
- HaloBuzz Overview: \`dashboards/halobuzz-overview.json\`
- HaloBuzz Performance: \`dashboards/halobuzz-performance.json\`
- HaloBuzz Database: \`dashboards/halobuzz-database.json\`

### ✅ Alert Rules
- Critical alerts: \`alerts/critical.yml\`
- Warning alerts: \`alerts/warning.yml\`
- Info alerts: \`alerts/info.yml\`

### ✅ Scripts
- Start monitoring: \`start-monitoring.sh\`
- Stop monitoring: \`stop-monitoring.sh\`
- Check status: \`check-status.sh\`

### ✅ Documentation
- README: \`README.md\`
- Setup summary: \`setup-summary.md\`

## Next Steps

1. **Start Monitoring Stack**:
   \`\`\`bash
   cd $MONITORING_DIR
   ./start-monitoring.sh
   \`\`\`

2. **Verify Setup**:
   \`\`\`bash
   ./check-status.sh
   \`\`\`

3. **Access Dashboards**:
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000
   - Alertmanager: http://localhost:9093

4. **Configure Alerts**:
   - Update \`config/alertmanager.yml\` with your notification channels
   - Test alert rules

5. **Customize Dashboards**:
   - Import dashboards in Grafana
   - Customize queries and visualizations

## Monitoring Checklist

- [ ] Prometheus is collecting metrics
- [ ] Grafana dashboards are working
- [ ] Alert rules are firing correctly
- [ ] Alertmanager is routing alerts
- [ ] All services are healthy
- [ ] Documentation is up to date

---
**Setup Completed**: $(date)
**Monitoring Stack Version**: 1.0
EOF

    log "Monitoring setup summary generated"
}

# Main execution
main() {
    log "Starting HaloBuzz monitoring setup..."
    
    create_monitoring_structure
    setup_prometheus_config
    setup_grafana_dashboards
    setup_alerting_rules
    setup_alertmanager_config
    setup_docker_compose
    setup_monitoring_scripts
    setup_monitoring_docs
    generate_monitoring_summary
    
    log "Monitoring setup completed!"
    log "Monitoring directory: $MONITORING_DIR"
    
    # Show summary
    echo ""
    log "Monitoring Setup Summary:"
    log "  Configuration: $CONFIG_DIR"
    log "  Dashboards: $DASHBOARD_DIR"
    log "  Alerts: $ALERT_DIR"
    log "  Scripts: $MONITORING_DIR/*.sh"
    log "  Documentation: $MONITORING_DIR/README.md"
    
    echo ""
    log "Next Steps:"
    log "  1. cd $MONITORING_DIR"
    log "  2. ./start-monitoring.sh"
    log "  3. ./check-status.sh"
    log "  4. Access Grafana at http://localhost:3000"
    
    log "All monitoring setup completed! ✅"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --dir DIR          Monitoring directory (default: ./monitoring)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Setup monitoring in ./monitoring"
    echo "  $0 --dir /opt/monitoring             # Setup monitoring in custom directory"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            MONITORING_DIR="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        -*)
            error "Unknown option $1"
            show_usage
            exit 1
            ;;
        *)
            error "Unknown argument $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
