import { createApp } from './app.js';
import { config } from './config.js';
import http from 'http';

const startServer = async () => {
  try {
    const app = createApp();
    const server = http.createServer(app);

    server.listen(config.PORT, () => {
      console.log(`Server is running on http://localhost:${config.PORT} in ${config.NODE_ENV} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
