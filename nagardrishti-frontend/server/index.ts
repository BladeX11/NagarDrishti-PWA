import { config } from './config.js';
import { createApp } from './app.js';
import http from 'http';
import { adversarialService } from './services/adversarialService.js';

const startServer = async () => {
  try {
    const app = createApp();
    const server = http.createServer(app);

    server.listen(config.PORT, () => {
      console.log(`Server is running on http://localhost:${config.PORT} in ${config.NODE_ENV} mode`);
    });

    // Run bulk closure anomaly detection periodically (every 24h)
    const bulkClosureCron = setInterval(() => {
      console.log('[cron] Running bulk closure anomaly check...');
      adversarialService.checkBulkClosureAnomaly().catch(err => {
        console.error('[cron] Bulk closure check failed:', err);
      });
    }, 24 * 60 * 60 * 1000);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        clearInterval(bulkClosureCron);
        console.log('HTTP server closed');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
