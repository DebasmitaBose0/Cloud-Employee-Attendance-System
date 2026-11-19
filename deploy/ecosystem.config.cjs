module.exports = {
  apps: [
    {
      name: 'attendcloud-server',
      script: 'npx',
      args: 'tsx server.ts',
      cwd: '/var/www/attendcloud',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
