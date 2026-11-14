import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://nd_dev:nd_dev_password@localhost:5432/nagardrishti',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SESSION_SECRET: process.env.SESSION_SECRET || 'super_secret_session_key_for_dev',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
  AI_CATEGORY_PROVIDER: process.env.AI_CATEGORY_PROVIDER === 'gemini' ? 'gemini' : 'local-ml',
  GEMINI_TIMEOUT_MS: Math.min(30000, Math.max(1000, Number.parseInt(process.env.GEMINI_TIMEOUT_MS || '8000', 10) || 8000)),
  MINIO: {
    ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    PORT: parseInt(process.env.MINIO_PORT || '9000', 10),
    ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
    USE_SSL: process.env.MINIO_USE_SSL === 'true'
  }
};
