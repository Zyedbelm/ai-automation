module.exports = {
  apps: [{
    name: 'blueprint-store',
    script: 'server.js',

    // Production configuration
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Development configuration
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },

    // PM2 options
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',

    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Advanced options
    node_args: '--max-old-space-size=512',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 8000,

    // Security
    uid: process.getuid && process.getuid() || undefined,
    gid: process.getgid && process.getgid() || undefined
  }]
};