import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://nd_dev:nd_dev_password@localhost:5432/nagardrishti',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SESSION_SECRET: process.env.SESSION_SECRET || 'super_secret_session_key_for_dev',
  MINIO: {
    ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    PORT: parseInt(process.env.MINIO_PORT || '9000', 10),
    ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    SECRET_KEY: process.env.MINIO_SECRET_KEY || 'minioadmin',
    USE_SSL: process.env.MINIO_USE_SSL === 'true'
  }
};
