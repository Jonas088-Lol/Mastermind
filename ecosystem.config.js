module.exports = {
  apps: [
    {
      name: "mastermind",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/jonass/Development/mastermind",
      env_file: "/home/jonass/Development/mastermind/.env.production.local",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
