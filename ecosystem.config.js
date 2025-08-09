module.exports = {
  apps: [
    {
      name: 'gpt-proxy',
      script: 'dist/index.js',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
