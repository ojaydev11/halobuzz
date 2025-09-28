module.exports = {
  apps: [
    {
      name: 'halobuzz-backend',
      script: 'dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        INSTANCE_ID: 'backend-cluster'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        INSTANCE_ID: 'backend-cluster'
      },
      // Enhanced PM2 configuration for massive scaling
      max_memory_restart: '1G', // Restart if memory usage exceeds 1GB
      min_uptime: '10s', // Minimum uptime before considering stable
      max_restarts: 10, // Maximum restarts in 1 minute
      restart_delay: 4000, // Delay between restarts
      
      // Logging configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Advanced clustering options
      kill_timeout: 5000, // Time to wait before force killing
      listen_timeout: 10000, // Time to wait for app to listen
      wait_ready: true, // Wait for ready event
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Process management
      autorestart: true,
      watch: false, // Disable file watching in production
      ignore_watch: ['node_modules', 'logs'],
      
      // Environment-specific overrides
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        REDIS_URL: 'redis://localhost:6379',
        MONGODB_URI: 'mongodb://localhost:27017/halobuzz_dev',
        AGORA_ADAPTIVE_BITRATE: 'true',
        AGORA_GLOBAL_CDN: 'true',
        AGORA_AUTO_SCALING: 'true'
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz_staging',
        AGORA_ADAPTIVE_BITRATE: 'true',
        AGORA_GLOBAL_CDN: 'true',
        AGORA_AUTO_SCALING: 'true'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3000,
        REDIS_URL: process.env.REDIS_URL,
        MONGODB_URI: process.env.MONGODB_URI,
        AGORA_ADAPTIVE_BITRATE: 'true',
        AGORA_GLOBAL_CDN: 'true',
        AGORA_AUTO_SCALING: 'true',
        // Production-specific settings
        MAX_CONNECTIONS_PER_USER: 5,
        RATE_LIMIT_WINDOW: 60000,
        RATE_LIMIT_MAX_REQUESTS: 100
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'https://github.com/ojaydev11/halobuzz.git',
      path: '/var/www/halobuzz',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/ojaydev11/halobuzz.git',
      path: '/var/www/halobuzz-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': ''
    }
  }
};
