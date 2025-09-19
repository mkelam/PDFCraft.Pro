module.exports = {
  apps: [
    {
      name: 'pdfcraft-api',
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
      log_file: '/var/log/pdfcraft/combined.log',
      out_file: '/var/log/pdfcraft/out.log',
      error_file: '/var/log/pdfcraft/error.log',
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
      name: 'pdfcraft-worker',
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
      log_file: '/var/log/pdfcraft/worker.log',
      out_file: '/var/log/pdfcraft/worker-out.log',
      error_file: '/var/log/pdfcraft/worker-error.log',

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
      user: 'pdfcraft',
      host: 'your-hostinger-vps-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/pdfcraft-pro.git',
      path: '/var/www/pdfcraft',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/log/pdfcraft /var/www/pdfcraft/uploads /var/www/pdfcraft/temp'
    }
  }
};