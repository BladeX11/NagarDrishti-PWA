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
  app.set('trust proxy', 1);

  // Security Middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https:'],
        connectSrc: ["'self'", 'https:'],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
      },
    },
  }));
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // Serve uploaded media files
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
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

  // 404 handler for API routes (must be registered before production SPA fallback)
  app.use(['/api', '/api/*'], (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist/public')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../dist/public/index.html'));
    });
  }

  // Fallback for root in dev mode so users don't see "Cannot GET /"
  if (process.env.NODE_ENV !== 'production') {
    app.get('/', (req, res) => {
      res.redirect('http://localhost:3000');
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
