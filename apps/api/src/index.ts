import 'dotenv/config';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from '@primaria/database';
import { getRedis } from './shared/redis.js';
import { startCronJobs } from './cron/index.js';

// Prevent unhandled async rejections from crashing the process.
// Express 4 does not natively forward async route errors to the error handler;
// this ensures the process stays alive and the error is logged instead.
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[UnhandledRejection]', reason);
});

const PORT = parseInt(env.PORT, 10);

async function main() {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('PostgreSQL connected');

    // Test Redis connection
    const redis = getRedis();
    await redis.connect();
    console.log('Redis connected');

    app.listen(PORT, () => {
      console.log(`Primar-IA API running on http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      startCronJobs();
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

main();
