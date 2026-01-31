module.exports = {
  apps: [
    {
      name: 'torrentstream-server',
      script: './server/index.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0'
      },
      // Logging
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Environment
      source_map_support: true,
      instance_var: 'INSTANCE_ID',
      
      // Performance monitoring
      pmx: true,
      
      // Advanced features
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health monitoring
      health_check_grace_period: 3000,
      
      // Auto-restart conditions
      ignore_watch: [
        'node_modules',
        'uploads',
        'logs',
        'data'
      ]
    }
  ],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/torrentstream.git',
      path: '/var/www/torrentstream',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};