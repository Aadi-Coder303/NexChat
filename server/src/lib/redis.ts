import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

let isRedisConnected = false;

redisClient.on('error', (err) => {
  if (isRedisConnected) {
    console.error('[Redis] Connection lost:', err.message);
    isRedisConnected = false;
  }
});

redisClient.on('connect', () => {
  console.log('🚀 Connecting to Redis...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Client Ready');
  isRedisConnected = true;
});

// Auto-connect with retry logic or silent failure
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('⚠️ Could not connect to Redis. Presence features will be limited.');
  }
})();

export default redisClient;
