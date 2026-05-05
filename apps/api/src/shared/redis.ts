import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      reconnectOnError(err: Error) {
        return err.message.includes('READONLY');
      },
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }
  return redis;
}
