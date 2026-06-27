// apps/worker/src/lib/redis.ts
// IORedis singleton. Used for OTP rate limiting.
// Env: REDIS_URL (e.g. redis://localhost:6379 or rediss://... for TLS)
import Redis from 'ioredis';

let redisInstance: Redis | null = null;

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  const instance = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  instance.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  instance.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return instance;
}

export const redis: Redis = (() => {
  if (!redisInstance) {
    redisInstance = createRedis();
  }
  return redisInstance;
})();
