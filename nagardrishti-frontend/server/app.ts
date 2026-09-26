import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }));

  // Body Parsing Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 requests per `window` (here, per minute)
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' }
  });

  app.use('/api/', apiLimiter);

  // Mount API Routes
  app.use('/api', apiRoutes);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ success: true, data: 'OK', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/db', async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`select 1`);
      res.json({ success: true, data: { database: 'reachable' }, timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ success: false, error: 'Database unavailable' });
    }
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist/public')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../dist/public/index.html'));
    });
  }

  // 404 handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
