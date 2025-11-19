/**
 * PM2 Ecosystem Configuration
 * Supports horizontal scaling with cluster mode
 */

module.exports = {
  apps: [
    // Auth Service - 3 instances
    {
      name: 'auth-service-1',
      cwd: './auth',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '500M',
      error_file: './logs/auth-1-error.log',
      out_file: './logs/auth-1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'auth-service-2',
      cwd: './auth',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3010
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010
      },
      max_memory_restart: '500M',
      error_file: './logs/auth-2-error.log',
      out_file: './logs/auth-2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    },
    {
      name: 'auth-service-3',
      cwd: './auth',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3020
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3020
      },
      max_memory_restart: '500M',
      error_file: './logs/auth-3-error.log',
      out_file: './logs/auth-3-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true
    },

    // Products Service - 3 instances
    {
      name: 'products-service-1',
      cwd: './products',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      max_memory_restart: '500M',
      autorestart: true
    },
    {
      name: 'products-service-2',
      cwd: './products',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3011
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      max_memory_restart: '500M',
      autorestart: true
    },
    {
      name: 'products-service-3',
      cwd: './products',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3021
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3021
      },
      max_memory_restart: '500M',
      autorestart: true
    },

    // Categories Service - 2 instances
    {
      name: 'categories-service-1',
      cwd: './categories',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      max_memory_restart: '500M',
      autorestart: true
    },
    {
      name: 'categories-service-2',
      cwd: './categories',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3012
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3012
      },
      max_memory_restart: '500M',
      autorestart: true
    },

    // Users Service - 2 instances
    {
      name: 'users-service-1',
      cwd: './users',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      max_memory_restart: '500M',
      autorestart: true
    },
    {
      name: 'users-service-2',
      cwd: './users',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3013
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3013
      },
      max_memory_restart: '500M',
      autorestart: true
    },

    // Orders Service - 3 instances (high load expected)
    {
      name: 'orders-service-1',
      cwd: './orders',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3004
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      max_memory_restart: '500M',
      autorestart: true
    },
    {
      name: 'orders-service-2',
      cwd: './orders',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3014
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3014
      },
      max_memory_restart: '500M',
      autorestart: true
    },
    {
      name: 'orders-service-3',
      cwd: './orders',
      script: 'server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3024
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3024
      },
      max_memory_restart: '500M',
      autorestart: true
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:username/repo.git',
      path: '/var/www/services',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
