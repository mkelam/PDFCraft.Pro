module.exports = {
  apps: [
    {
      name: 'pdflab-api',
      script: './dist/server.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logging
      log_file: '/var/log/pdflab/combined.log',
      out_file: '/var/log/pdflab/out.log',
      error_file: '/var/log/pdflab/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'temp'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',

      // Memory management
      max_memory_restart: '500M',

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Environment specific settings
      node_args: '--max-old-space-size=512',

      // Graceful shutdown
      kill_timeout: 5000,
      shutdown_with_message: true,
    },
    {
      name: 'pdflab-worker',
      script: './dist/workers/conversion.worker.js',
      instances: 2, // Separate worker processes
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'conversion',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'conversion',
      },
      // Worker-specific logging
      log_file: '/var/log/pdflab/worker.log',
      out_file: '/var/log/pdflab/worker-out.log',
      error_file: '/var/log/pdflab/worker-error.log',

      // Worker management
      watch: false,
      restart_delay: 5000,
      max_restarts: 5,
      min_uptime: '30s',
      max_memory_restart: '1G', // Workers may use more memory for PDF processing
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'pdflab',
      host: 'your-hostinger-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/pdflab-pro.git',
      path: '/var/www/pdflab',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/log/pdflab /var/www/pdflab/uploads /var/www/pdflab/temp'
    }
  }
};