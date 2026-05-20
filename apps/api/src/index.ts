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

    // Phase 14M v3.8 — Redis no es bloqueante. Si la instancia de Redis
    // está caída o reiniciándose, antes el API entero crashea en bucle
    // (Startup failed: Connection is closed). Ahora intentamos conectar
    // y, si falla, logueamos un warning y seguimos. Las funcionalidades
    // que usan Redis (rate limit, caché) tienen fallbacks o degradan
    // graciosamente; mejor servir el resto que tumbar todo.
    try {
      const redis = getRedis();
      await redis.connect();
      console.log('Redis connected');
    } catch (err) {
      console.warn('[startup] Redis no disponible, arrancando sin caché/rate-limit:', err);
    }

    const server = app.listen(PORT, () => {
      console.log(`Primar-IA API running on http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      startCronJobs();
    });

    async function shutdown() {
      console.log('[shutdown] Graceful shutdown initiated...');
      server.close(() => {
        console.log('[shutdown] HTTP server closed');
      });
      try {
        await prisma.$disconnect();
        console.log('[shutdown] Database disconnected');
      } catch {}
      try {
        const redis = getRedis();
        await redis.quit();
        console.log('[shutdown] Redis disconnected');
      } catch {}
      process.exit(0);
    }
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

main();
