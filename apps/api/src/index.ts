import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from '@primaria/database';
import { getRedis } from './shared/redis.js';

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
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

main();
